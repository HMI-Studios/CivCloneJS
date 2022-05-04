import { getAdjacentCoords } from './utils';
import { Coords } from './world';

const unitMovementTable: { [unit: string]: number } = {
  'settler': 3,
  'scout': 5,
  'builder': 3,
};

const unitMovementClassTable: { [unit: string]: number } = {
  'settler': 0,
  'scout': 0,
  'builder': 0,
};

const unitCombatStatsTable: { [unit: string]: [number, number, number] } = {
  // 'unit': [offense, defense, awareness],
  'settler': [0, 1, 0],
  'scout': [5, 3, 20],
  'builder': [0, 1, 0],
}

export interface UnitData {
  type: string,
  hp: number,
  movement: number,
  civID: number,
}

export class Unit {
  type: string;
  hp: number; // this should never be allowed to be outside the range 0 - 100
  movement: number;
  movementClass: number;
  combatStats: [number, number, number];
  civID: number;
  coords: Coords;
  alive: boolean;

  constructor(type: string, civID: number, coords: Coords) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.movementClass = unitMovementClassTable[type];
    this.combatStats = unitCombatStatsTable[type];
    this.civID = civID;
    this.coords = coords;
    this.alive = true;
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

  setDead(): void {
    this.alive = false;
  }

  isDead(): boolean {
    return !this.alive;
  }

  hurt(hp: number): void {
    // TODO
    this.hp -= hp;
    if (this.hp <= 0) {
      this.hp = 0;
      this.setDead();
    }
  }

  newTurn() {
    this.movement = unitMovementTable[this.type];
  }

  isAdjacentTo(dst?: Coords): boolean {
    return !!dst && getAdjacentCoords(this.coords).some(coord => coord.x === dst.x && coord.y === dst.y);
  }
}
