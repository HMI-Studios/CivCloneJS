import { Map } from './map';
import { Unit } from './map/tile/unit';
import { Leader, CivDomainID, isCityDomain, isCivDomain, CityDomainID, DomainID, Domain } from './leader';
import { Event } from '../utils';
import { Random } from '../utils/random';
import { Civilization, CivilizationData } from './civilization';
import { NoStartLocation, ValueError } from '../utils/error';
import { City } from './map/tile/city';

export interface Coords {
  x: number;
  y: number;
}

const DAMAGE_MULTIPLIER = 20;

type WorldImportArgs = [Map, { [civID: number]: Civilization }, number, number];

export class World {
  map: Map;
  civs: { [civID: number]: Civilization };
  civsCount: number;
  updates: { (leader: Leader): Event }[];
  random: Random;

  public currentTurn: number;

  constructor(args: [map: Map, civsCount: number, civTemplateLeaders: [number, Leader][]] | WorldImportArgs) {
    this.updates = [];

    if (args.length === 4) {
      const [map, civs, civsCount, currentTurn] = args;
      this.map = map;
      this.civs = civs;
      this.civsCount = civsCount;
      this.random = new Random(map.seed);
      this.currentTurn = currentTurn;
      return;
    }

    const [ map, civsCount, civTemplateLeaders ] = args;

    this.random = new Random(map.seed);
    this.map = map;

    this.civsCount = civsCount;
    this.civs = {};

    for (let civID = 0; civID < this.civsCount; civID++) {
      const [templateID, leader] = civTemplateLeaders[civID];
      this.civs[civID] = new Civilization(civID, templateID);
      const domainID = this.civs[civID].getDomainID();

      this.getStartLocation(([settlerCoords, builderCoords, scoutCoords]) => {
        this.addUnit(new Unit('settler', settlerCoords, domainID, this.civs[civID].startingKnowledge));
        this.addUnit(new Unit('builder', builderCoords, domainID, this.civs[civID].startingKnowledge));
        this.addUnit(new Unit('scout', scoutCoords, domainID, this.civs[civID].startingKnowledge));
      });

      this.setDomainLeader(domainID, leader)

      this.updateLeaderTileVisibility(leader);
    }

    const barbarianTribes = Math.ceil(map.height * map.width / 1500);
    for (let i = 0; i < barbarianTribes; i++) {
      this.getStartLocation(([settlerCoords, _, scoutCoords]) => {
        const domainID = this.map.newBarbarianCampAt(settlerCoords);
        if (domainID !== null) this.addUnit(new Unit('scout', scoutCoords, domainID));
      });
    }

    this.currentTurn = 1;

    // this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});
  }

  private getStartLocation(callback: (coords: [Coords, Coords, Coords]) => void): void {
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
    const exportedCivs: { [id: number]: any } = {};
    for (const civID in this.civs) {
      const civ = this.civs[civID];
      exportedCivs[civID] = civ.export();
    }

    return {
      map: this.map.export(),
      civs: exportedCivs,
      civsCount: this.civsCount,
      currentTurn: this.currentTurn,
    };
  }

  static import(data: any, leaders: { [id: number]: Leader }): World {
    const [map, callbacks] = Map.import(data.map);
    const civs = {};
    const civsCount = data.civsCount;

    const world = new World([map, civs, civsCount, data.currentTurn]);

    for (const civID in data.civs) {
      const civData = data.civs[civID];
      world.civs[Number(civID)] = Civilization.import(civData);
      const units = civData.units.map((unitData: any) => Unit.import(unitData));
      for (const unit of units) {
        world.addUnit(unit);
      }
      if (civData.leader !== null) {
        world.updateLeaderTileVisibility(leaders[civData.leader]);
        world.setDomainLeader(civData.domainID, leaders[civData.leader]);
      }
    }

    for (const cb of callbacks) {
      cb(world, leaders);
    }

    return world;
  }

  getUpdates(): { (leader: Leader): Event }[] {
    // TODO: more updates?
    return this.map.getUpdates().concat(this.updates.splice(0));
  }

  /**
   * Sets the leader of a domain if none already exists. *Cannot* transfer a domain from one leader to another.
   * @param domainID 
   * @param leader 
   * @returns 
   */
  setDomainLeader(domainID: DomainID, leader: Leader): boolean {
    const domain = this.getDomain(domainID);
    if (!domain || domain.hasLeader()) {
      return false;
    }

    domain.setLeader(leader);
    leader.addDomain(domain);
    return true;
  }

  getDomain(domainID: DomainID): Domain {
    if (isCivDomain(domainID)) return this.getCiv(domainID);
    else if (isCityDomain(domainID)) return this.getCity(domainID);
    else throw new ValueError('Bad domain ID type: ' + domainID.type);
  }

  getCiv(civID: CivDomainID): Civilization {
    return this.civs[civID.subID];
  }

  getCity(cityID: CityDomainID): City {
    return this.map.cities[cityID.subID];
  }

  // civs
  getAllCivsData(): { [civID: number]: CivilizationData } {
    const data: { [id: number]: CivilizationData } = {};

    for (const civID in this.civs) {
      const civ = this.civs[civID];
      data[civID] = civ.getData();
    }

    return data;
  }

  // map, civs
  updateLeaderTileVisibility(leader: Leader): void {
    leader.forEachCityDomainID((domainID: CityDomainID) => {
      this.updateCityTileVisibility(domainID);
    });

    leader.forEachCivDomainID((domainID: CivDomainID) => {
      this.updateCivTileVisibility(domainID);
    });
  }

  updateCityTileVisibility(domainID: CityDomainID): void {
    const city = this.getCity(domainID);
    const cityTiles: Coords[] = [];
    for (const coords of city.getTiles()) {
      this.map.getTileOrThrow(coords).setVisibility(domainID, true);
      cityTiles.push(coords);
    }
    for (const coords of cityTiles) {
      for (const neighbor of this.map.getNeighborsCoords(coords, 1, { filter: (tile) => {
        return tile.owner?.id !== city.id;
      } })) {
        const tile = this.map.getTileOrThrow(neighbor);
        tile.setVisibility(domainID, true);
      }
    }

    for (const unit of city.units) {
      for (const coords of this.map.getVisibleTilesCoords(unit)) {
        const tile = this.map.getTileOrThrow(coords);
        tile.setVisibility(domainID, true);
      }
    }
  }

  updateCivTileVisibility(domainID: CivDomainID): void {
    const civ = this.getCiv(domainID);
    for (const unit of civ.units) {
      for (const coords of this.map.getVisibleTilesCoords(unit)) {
        const tile = this.map.getTileOrThrow(coords);
        tile.setVisibility(domainID, true);
      }
    }
  }

  // map, civs
  addUnit(unit: Unit): void {
    if (this.map.isInBounds(unit.coords)) {
      if (isCivDomain(unit.domainID)) this.getCiv(unit.domainID).addUnit(unit);
      else if (isCityDomain(unit.domainID)) this.getCity(unit.domainID).addUnit(unit);
      this.map.getTileOrThrow(unit.coords).setUnit(unit);
    }
  }

  // map, civs
  removeUnit(unit: Unit): void {
    if (isCivDomain(unit.domainID)) this.getCiv(unit.domainID).removeUnit(unit);
    else if (isCityDomain(unit.domainID)) this.getCity(unit.domainID).removeUnit(unit);
    this.updates.push(() => ['unitKilled', [ unit.coords, unit ]]);
    this.map.getTileOrThrow(unit.coords).setUnit(undefined);
    // TODO: make this more intelligent
    if (isCivDomain(unit.domainID)) this.updateCivTileVisibility(unit.domainID);
    this.updates.push((leader) => ['setMap', [this.map.getLeaderMap(leader)]]);
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
