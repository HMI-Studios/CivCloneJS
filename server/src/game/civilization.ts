import { Leader, LeaderData } from './leader';
import { Unit } from './map/tile/unit';
import { Coords } from './world';

export interface CivilizationData {
  color?: string;
  leader?: LeaderData;
}

export class Civilization {
  units: Unit[];
  leader?: Leader;
  turnActive: boolean;
  turnFinished: boolean;

  constructor() {
    this.units = [];
    this.turnActive = false;
    this.turnFinished = false;
  }

  export() {
    return {
      units: this.units.map(unit => unit.export()),
      turnActive: this.turnActive,
      turnFinished: this.turnFinished,
    };
  }

  static import(data: any): Civilization {
    const civ =  new Civilization();
    // civ.units = data.units.map(unitData => Unit.import(unitData));
    civ.turnActive = data.turnActive;
    civ.turnFinished = data.turnFinished;
    return civ;
  }

  getData(): CivilizationData {
    const leaderData = this.leader?.getData();
    return {
      color: leaderData?.color,
      leader: leaderData,
    }
  }

  newTurn() {
    this.turnActive = true;
    this.turnFinished = false;

    for (const unit of this.units) {
      unit.newTurn();
    }
  }

  endTurn() {
    this.turnActive = false;
  }

  getUnits(): Unit[] {
    return this.units;
  }

  getUnitPositions(): Coords[] {
    return this.units.map(unit => unit.coords);
  }

  addUnit(unit: Unit): void {
    this.units.push(unit);
  }

  removeUnit(unit: Unit): void {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }
}
