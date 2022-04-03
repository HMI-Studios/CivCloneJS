import { Unit } from './unit';

export interface CivilizationData {
  color: string
}

export class Civilization {
  units: Unit[];
  color: string;
  turnActive: boolean;
  turnFinished: boolean;

  constructor() {
    this.units = [];
    this.color = null;
    this.turnActive = false;
    this.turnFinished = false;
  }

  getData(): CivilizationData {
    return {
      color: this.color
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
