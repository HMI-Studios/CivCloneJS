import { Map } from './map';
import { Unit } from './map/tile/unit';
import { Civilization, CivilizationData } from './civilization';
import { Event } from '../utils';
import { Leader, LeaderData, leaderTemplates } from './leader';

export interface Coords {
  x: number;
  y: number;
}

export class World {
  map: Map;
  civs: { [civID: number]: Civilization };
  civsCount: number;
  leaderPool: { [name: string]: Leader };
  updates: { (civID: number): Event }[];

  constructor(map: Map, civsCount: number) {
    this.map = map;

    this.civsCount = civsCount;
    this.civs = {};
    this.leaderPool = {};

    for (let i = 0; i < this.civsCount; i++) {
      this.civs[i] = new Civilization();

      this.addUnit(new Unit('settler', i, { x: (i+1)*1, y: (i+1)*1+1 })); // REMOVE THESE
      this.addUnit(new Unit('builder', i, { x: (i+1)*3, y: (i+1)*3+1 })); // REMOVE THESE
      this.addUnit(new Unit('scout', i, { x: (i+1)*4, y: (i+1)*4+1 })); // REMOVE THESE

      this.updateCivTileVisibility(i);
    }

    for (let i = 0; i < leaderTemplates.length; i++) {
      this.leaderPool[i] = new Leader(i);
    }




    // this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});

    this.updates = [];
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
    for (const tile of this.map.tiles) {
      tile.clearVisibility(civID);
    }
    for (const unit of this.civs[civID].units) {
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

  // unit, map, civs
  meleeCombat(attacker: Unit, defender: Unit): void {
    const [attackerOffense, attackerDefense, attackerAwareness] = attacker.combatStats;
    const [defenderOffense, defenderDefense, defenderAwareness] = defender.combatStats;
    const attackerInitiative = Math.random() * (attackerAwareness * 1.5);
    const defenderInitiative = Math.random() * (defenderAwareness);

    const DAMAGE_MULTIPLIER = 20;

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
    this.map.turn();
  }
}
