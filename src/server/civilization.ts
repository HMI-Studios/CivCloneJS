import { Leader, LeaderData } from './leader';
import { Unit } from './unit';

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
