import { Coords } from './world';

const unitMovementTable: { [unit: string]: number } = {
  'settler': 3,
  'scout': 5,
};

const unitMovementClassTable: { [unit: string]: number } = {
  'settler': 0,
  'scout': 0,
};

export interface UnitData {
  type: string,
  hp: number,
  movement: number,
  civID: number,
}

export class Unit {
  type: string;
  hp: number;
  movement: number;
  movementClass: number;
  civID: number;
  coords: Coords;

  constructor(type: string, civID: number) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.movementClass = unitMovementClassTable[type];
    this.civID = civID;
    this.coords = {
      x: null,
      y: null,
    };
  }

  getData(): UnitData {
    return {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      civID: this.civID,
    };
  }
  
  getMovementClass(): number {
    return this.movementClass;
  }

  newTurn() {
    this.movement = unitMovementTable[this.type];
  }
}
