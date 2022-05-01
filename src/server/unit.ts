import { getAdjacentCoords } from './utils';
import { Coords } from './world';

const unitMovementTable: { [unit: string]: number } = {
  'settler': 3,
  'scout': 5,
};

const unitMovementClassTable: { [unit: string]: number } = {
  'settler': 0,
  'scout': 0,
};

const unitCombatStatsTable: { [unit: string]: [number, number, number] } = {
  // 'unit': [offense, defense, awareness],
  'settler': [0, 1, 0],
  'scout': [5, 3, 20],
}

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
  combatStats: [number, number, number];
  civID: number;
  coords: Coords;
  alive: boolean;

  constructor(type: string, civID: number) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.movementClass = unitMovementClassTable[type];
    this.combatStats = unitCombatStatsTable[type];
    this.civID = civID;
    this.coords = {
      x: null,
      y: null,
    };
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
      this.setDead();
    }
  }

  newTurn() {
    this.movement = unitMovementTable[this.type];
  }

  isAdjacentTo(dst?: Coords): boolean {
    return dst && getAdjacentCoords(this.coords).some(coord => coord.x === dst.x && coord.y === dst.y);
  }
}
