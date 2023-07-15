import { Map } from './map';
import { Unit } from './map/tile/unit';
import { Civilization, CivilizationData } from './civilization';
import { Event } from '../utils';
import { Random } from '../utils/random';
import { Leader, LeaderData, leaderTemplates } from './leader';

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

  constructor(map?: Map, civsCount?: number) {
    this.updates = [];

    if (!(map && civsCount)) {
      return
    }
    this.map = map;

    this.civsCount = civsCount;
    this.civs = {};
    this.leaderPool = {};

    for (let civID = 0; civID < this.civsCount; civID++) {
      this.civs[civID] = new Civilization();

      const random = new Random(42);
      let start_location_successful = false;
      for (let i = 0; i < 1000; i++) {
        const x = random.randInt(0, map.width-1);
        const y = random.randInt(0, map.height-1);

        const settler_coords = { x, y };
        const builder_coords = { x: x + 1, y: y + 1 };
        const   scout_coords = { x: x - 1, y: y + 1 };

        let legal_start_location = true;
        for (const coords of [settler_coords, builder_coords, scout_coords]) {
          const tile = this.map.getTile(coords);
          if (!tile || tile.unit || !this.map.canSettleOn(tile)) {
            legal_start_location = false;
            break;
          }
        }

        if (legal_start_location) {
          this.addUnit(new Unit('settler', civID, settler_coords));
          this.addUnit(new Unit('builder', civID, builder_coords));
          this.addUnit(new Unit('scout', civID, scout_coords));
          start_location_successful = true;
          break;
        }
      }

      if (!start_location_successful) {
        console.error("Error: couldn't find legal start location! (gave up after 1000 tries)");
      }

      this.updateCivTileVisibility(civID);
    }

    for (let i = 0; i < leaderTemplates.length; i++) {
      this.leaderPool[i] = new Leader(i);
    }


    // this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});
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
    };
  }

  static import(data: any): World {
    const world = new World();
    world.map = Map.import(data.map);
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
    if (leader && !leader.isTaken()) {
      if (this.civs[civID].leader) {
        this.civs[civID].leader?.unselect();
      }
      this.civs[civID].leader = leader;
      leader.select(civID);
      return true;
    } else {
      return false;
    }
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
        const tile = this.map.getTile(neighbor);
        tile.setVisibility(civID, true);
      }
    }
    const civ = this.civs[civID];
    for (const unit of civ.units) {
      for (const coords of this.map.getVisibleTilesCoords(unit)) {
        const tile = this.map.getTile(coords);
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
      this.civs[unit.civID].addUnit(unit);
      this.map.getTile(unit.coords).setUnit(unit);
    }
  }

  // map, civs
  removeUnit(unit: Unit): void {
    this.civs[unit.civID].removeUnit(unit);
    this.updates.push(() => ['unitKilled', [ unit.coords, unit ]]);
    this.map.getTile(unit.coords).setUnit(undefined);
    // TODO: make this more intelligent
    this.updateCivTileVisibility(unit.civID)
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
    this.map.turn(this);
  }
}
