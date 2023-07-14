import { getAdjacentCoords } from '../../../utils';
import { Coords } from '../../world';
import { Yield } from './yield';

export interface UnitTypeCost {
  type: string;
  cost: Yield;
}

export interface UnitData {
  type: string,
  hp: number,
  movement: number,
  civID: number,
}

export enum MovementClass {
  LAND,
  WATER,
  AIR,
}

export enum PromotionClass {
  CIVILLIAN,
  MELEE,
  RANGED,
  RECON,
}

export class Unit {
  static movementTable: { [unitType: string]: number } = {
    'settler': 3,
    'builder': 3,
    'scout': 5,
    'warrior': 3,
    'slinger': 3,
    'archer': 3,
    'spy': 5,
  };
  
  static movementClassTable: { [unitType: string]: MovementClass } = {
    'settler': MovementClass.LAND,
    'builder': MovementClass.LAND,
    'scout': MovementClass.LAND,
    'warrior': MovementClass.LAND,
    'slinger': MovementClass.LAND,
    'archer': MovementClass.LAND,
    'spy': MovementClass.LAND,
  };
  
  static promotionClassTable: { [unitType: string]: PromotionClass } = {
    'settler': PromotionClass.CIVILLIAN,
    'builder': PromotionClass.CIVILLIAN,
    'scout': PromotionClass.RECON,
    'warrior': PromotionClass.MELEE,
    'slinger': PromotionClass.RANGED,
    'archer': PromotionClass.RANGED,
    'spy': PromotionClass.RECON,
  };
  
  static combatStatsTable: { [unitType: string]: [number, number, number] } = {
    // 'unitType': [offense, defense, awareness],
    'settler': [0, 1, 0],
    'builder': [0, 1, 0],
    'scout': [5, 3, 20],
    'warrior': [12, 8, 10],
    'slinger': [10, 5, 12],
    'archer': [15, 5, 12],
    'spy': [5, 3, 20],
  }
  
  static costTable: { [unitType: string]: Yield } = {
    'settler': new Yield({production: 10}),
    'builder': new Yield({production: 5}),
    'scout': new Yield({production: 10}),
    'warrior': new Yield({production: 15}),
    'slinger': new Yield({production: 15}),
    'spy': new Yield({production: 20}),
  }

  type: string;
  hp: number; // this should never be allowed to be outside the range 0 - 100
  movement: number;
  promotionClass: PromotionClass;
  movementClass: MovementClass;
  combatStats: [number, number, number];
  civID: number;
  coords: Coords;
  alive: boolean;

  static makeCatalog(types: string[]): UnitTypeCost[] {
    return types.map(type => (
      { type, cost: Unit.costTable[type] }
    ));
  }

  constructor(type: string, civID: number, coords: Coords) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.promotionClass = Unit.promotionClassTable[type];
    this.movementClass = Unit.movementClassTable[type];
    this.combatStats = Unit.combatStatsTable[type];
    this.civID = civID;
    this.coords = coords;
    this.alive = true;
  }

  export() {
    return {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      promotionClass: this.promotionClass,
      movementClass: this.movementClass,
      combatStats: this.combatStats,
      civID: this.civID,
      coords: this.coords,
      alive: this.alive,
    };
  }

  static import(data: any): Unit {
    const unit = new Unit(data.type, data.civID, data.coords);
    unit.hp = data.hp;
    unit.movement = data.movement;
    unit.promotionClass = data.promotionClass;
    unit.movementClass = data.movementClass;
    unit.combatStats = data.combatStats;
    unit.alive = data.alive;
    return unit;
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
    this.movement = Unit.movementTable[this.type];
  }

  isAdjacentTo(dst?: Coords): boolean {
    return !!dst && getAdjacentCoords(this.coords).some(coord => coord.x === dst.x && coord.y === dst.y);
  }
}
