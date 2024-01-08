import { Map } from './map';
import { Unit } from './map/tile/unit';
import { Civilization, CivilizationData } from './civilization';
import { Event } from '../utils';
import { Random } from '../utils/random';
import { Leader, LeaderData, leaderTemplates } from './leader';
import { NoStartLocation } from '../utils/error';

export interface Coords {
  x: number;
  y: number;
}

const DAMAGE_MULTIPLIER = 20;

export class World {
  map: Map;
  civs: { [civID: number]: Civilization };
  civsCount: number;
  leaderPool: { [leaderID: number]: Leader };
  updates: { (civID: number): Event }[];
  random: Random;

  public currentTurn: number;

  constructor(map?: Map, civsCount?: number) {
    this.updates = [];

    if (!(map && civsCount)) {
      return
    }

    this.random = new Random(map.seed);
    this.map = map;

    this.civsCount = civsCount;
    this.civs = {};
    this.leaderPool = {};

    for (let civID = 0; civID < this.civsCount; civID++) {
      this.civs[civID] = new Civilization();

      this.getStartLocaltion(([settlerCoords, builderCoords, scoutCoords]) => {
        this.addUnit(new Unit('settler', settlerCoords, civID));
        this.addUnit(new Unit('builder', builderCoords, civID));
        this.addUnit(new Unit('scout', scoutCoords, civID));
      });

      this.updateCivTileVisibility(civID);
    }

    const barbarianTribes = Math.ceil(map.height * map.width / 1500);
    for (let i = 0; i < barbarianTribes; i++) {
      this.getStartLocaltion(([settlerCoords, _, scoutCoords]) => {
        const cityID = this.map.newBarbarianCampAt(settlerCoords);
        if (cityID !== null) this.addUnit(new Unit('scout', scoutCoords, undefined, cityID));
      });
    }

    for (let i = 0; i < leaderTemplates.length; i++) {
      this.leaderPool[i] = new Leader(i);
    }

    this.currentTurn = 1;


    // this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});
  }

  getStartLocaltion(callback: (coords: [Coords, Coords, Coords]) => void): void {
    for (let i = 0; i < 1000; i++) {
      const x = this.random.randInt(0, this.map.width-1);
      const y = this.random.randInt(0, this.map.height-1);

      const settlerCoords = { x, y };
      const builderCoords = { x: x + 1, y: y + 1 };
      const   scoutCoords = { x: x - 1, y: y + 1 };

      let legal_start_location = true;
      for (const coords of [settlerCoords, builderCoords, scoutCoords]) {
        const tile = this.map.getTile(coords);
        if (!tile || tile.unit || !this.map.canSettleOn(tile)) {
          legal_start_location = false;
          break;
        }
      }

      if (legal_start_location) {
        callback([settlerCoords, builderCoords, scoutCoords]);
        return;
      }
    }

    throw new NoStartLocation('Error: couldn\'t find legal start location! (gave up after 1000 tries)');
  }

  export() {
    const exportedCivs = {};
    for (const civID in this.civs) {
      const civ = this.civs[civID];
      exportedCivs[civID] = civ.export();
    }

    return {
      map: this.map.export(),
      civs: exportedCivs,
      civsCount: this.civsCount,
      leaderPool: this.leaderPool,
      currentTurn: this.currentTurn,
    };
  }

  static import(data: any): World {
    const world = new World();
    world.currentTurn = data.currentTurn;
    world.map = Map.import(world, data.map);
    world.civs = {};
    for (const civID in data.civs) {
      const civData = data.civs[civID];
      world.civs[civID] = Civilization.import(civData);
      const units = civData.units.map(unitData => Unit.import(unitData));
      for (const unit of units) {
        world.addUnit(unit);
      }
      world.updateCivTileVisibility(Number(civID));
    }
    world.civsCount = data.civsCount;
    world.leaderPool = {};
    for (const leaderID in data.leaderPool) {
      const leaderData = data.leaderPool[leaderID];
      world.leaderPool[leaderID] = Leader.import(leaderData);
      if (leaderData.civID !== null) {
        world.setCivLeader(leaderData.civID, Number(leaderID));
      }
    }
    return world;
  }

  getUpdates(): { (civID: number): Event }[] {
    // TODO: more updates?
    return this.map.getUpdates().concat(this.updates.splice(0));
  }

  // leaders
  getLeaderPool(): [LeaderData[], LeaderData[]] {
    const leaderList: LeaderData[] = [];
    const takenLeaderList: LeaderData[] = [];

    for (const id in this.leaderPool) {
      const leader = this.leaderPool[id];
      if (leader.isTaken()) {
        takenLeaderList.push(leader.getData());
      } else {
        leaderList.push(leader.getData());
      }
    }

    return [leaderList, takenLeaderList];
  }

  // leaders, civs
  setCivLeader(civID: number, leaderID: number): boolean {
    const leader = this.leaderPool[leaderID];
    if (!leader || leader.isTaken()) {
      return false;
    }

    if (this.civs[civID].leader) {
      this.civs[civID].leader?.unselect();
    }
    this.civs[civID].leader = leader;
    leader.select(civID);
    for (const unit of this.civs[civID].getUnits()) {
      unit.knowledge = {};
      unit.updateKnowledge(leader.startingKnowledge);
    }

    return true;
  }

  // civs
  getCiv(civID: number): Civilization {
    return this.civs[civID];
  }

  // civs
  getAllCivsData(): { [civID: number]: CivilizationData } {
    const data = {};

    for (const civID in this.civs) {
      const civ = this.civs[civID];
      data[civID] = civ.getData();
    }

    return data;
  }

  // map, civs
  updateCivTileVisibility(civID: number): void {
    const cityTiles: Coords[] = [];
    this.map.forEachTile((tile, coords) => {
      tile.clearVisibility(civID);
      if (tile.owner?.civID === civID) {
        tile.setVisibility(civID, true);
        cityTiles.push(coords)
      }
    });
    for (const coords of cityTiles) {
      for (const neighbor of this.map.getNeighborsCoords(coords, 1, { filter: (tile) => {
        return tile.owner?.civID !== civID;
      } })) {
        const tile = this.map.getTileOrThrow(neighbor);
        tile.setVisibility(civID, true);
      }
    }
    const civ = this.civs[civID];
    for (const unit of civ.units) {
      for (const coords of this.map.getVisibleTilesCoords(unit)) {
        const tile = this.map.getTileOrThrow(coords);
        tile.setVisibility(civID, true);
      }
    }
  }

  // civs
  getCivUnits(civID: number): Unit[] {
    return this.civs[civID].getUnits();
  }

  // civs
  getCivUnitPositions(civID: number): Coords[] {
    return this.civs[civID].getUnitPositions();
  }

  // map, civs
  addUnit(unit: Unit): void {
    if (this.map.isInBounds(unit.coords)) {
      if (unit.civID !== undefined) this.civs[unit.civID].addUnit(unit);
      else if (unit.cityID !== undefined) this.map.cities[unit.cityID].addUnit(unit);
      this.map.getTileOrThrow(unit.coords).setUnit(unit);
    }
  }

  // map, civs
  removeUnit(unit: Unit): void {
    if (unit.civID !== undefined) this.civs[unit.civID].removeUnit(unit);
    else if (unit.cityID !== undefined) this.map.cities[unit.cityID].removeUnit(unit);
    this.updates.push(() => ['unitKilled', [ unit.coords, unit ]]);
    this.map.getTileOrThrow(unit.coords).setUnit(undefined);
    // TODO: make this more intelligent
    if (unit.civID !== undefined) this.updateCivTileVisibility(unit.civID)
    this.updates.push((civID) => ['setMap', [this.map.getCivMap(civID)]]);
  }

  rangedCombat(attacker: Unit, defender: Unit): void {
    const [attackerOffense, attackerDefense, attackerAwareness] = attacker.combatStats;
    const [defenderOffense, defenderDefense, defenderAwareness] = defender.combatStats;
    const attackerInitiative = Math.random() * (attackerAwareness * 6);
    const defenderInitiative = Math.random() * (defenderAwareness);

    const defenderCanAttack = this.map.canUnitAttack(defender, attacker);

    if (attackerInitiative > defenderInitiative || !defenderCanAttack) {

      const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
      defender.hurt(attackerDamage);

      if (defenderCanAttack) {
        const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
        attacker.hurt(defenderDamage);
      }

    } else {

      const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
      attacker.hurt(defenderDamage);

      const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
      defender.hurt(attackerDamage);

    }

    if (attacker.isDead()) this.removeUnit(attacker);
    if (defender.isDead()) this.removeUnit(defender);

    this.map.tileUpdate(attacker.coords);
    this.map.tileUpdate(defender.coords);
  }

  // unit, map, civs
  meleeCombat(attacker: Unit, defender: Unit): void {
    const [attackerOffense, attackerDefense, attackerAwareness] = attacker.combatStats;
    const [defenderOffense, defenderDefense, defenderAwareness] = defender.combatStats;
    const attackerInitiative = Math.random() * (attackerAwareness * 1.5);
    const defenderInitiative = Math.random() * (defenderAwareness);

    if (attackerInitiative > defenderInitiative) {

      const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
      defender.hurt(attackerDamage);

      const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
      attacker.hurt(defenderDamage);

    } else {

      const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
      attacker.hurt(defenderDamage);

      const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
      defender.hurt(attackerDamage);

    }

    if (attacker.isDead()) this.removeUnit(attacker);
    if (defender.isDead()) this.removeUnit(defender);

    this.map.tileUpdate(attacker.coords);
    this.map.tileUpdate(defender.coords);
  }

  turn(): void {
    const startTime = new Date().getTime();
    this.map.turn(this);

    // TODO - maybe make a world.log for actual non-debug logs?
    console.log(`Turn ${this.currentTurn} finished in ${new Date().getTime() - startTime}ms`);
    this.currentTurn++;
  }
}
