import { getAdjacentCoords } from '../../../utils';
import { Coords } from '../../world';
import { KnowledgeBucket, KnowledgeMap } from './knowledge';
import { Yield } from './yield';

export interface UnitTypeCost {
  type: string;
  cost: Yield;
}

export interface UnitData {
  type: string,
  hp: number,
  movement: number,
  domainID: string,
  promotionClass: PromotionClass,
  attackRange?: number,
  knowledge: KnowledgeMap,
  cloaked?: boolean,
  isBarbarian?: boolean,
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

export enum PromotionEra {
  NONE,
  ANCIENT,
  CLASSICAL,
  MEDIEVAL,
  RENAISSANCE,
  INDUSTRIAL,
  MODERN,
  ATOMIC,
  INFORMATION,
  ALL,
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
  
  static promotionEraTable: { [unitType: string]: PromotionEra } = {
    'settler': PromotionEra.ANCIENT,
    'builder': PromotionEra.ANCIENT,
    'scout': PromotionEra.ANCIENT,
    'warrior': PromotionEra.ANCIENT,
    'slinger': PromotionEra.ANCIENT,
    'archer': PromotionEra.ANCIENT,
    'spy': PromotionEra.CLASSICAL,
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

  static attackRangeTable: { [unitType: string]: number } = {
    'slinger': 2,
    'archer': 3,
  }

  static cloakTable: { [unitType: string]: boolean } = {
    'spy': true,
  }

  static visionRangeTable: { [unitType: string]: number } = {
    default: 2,
    'scout': 3,
    'spy': 3,
  }
  
  static costTable: { [unitType: string]: Yield } = {
    'settler': new Yield({production: 10}),
    'builder': new Yield({production: 5}),
    'scout': new Yield({production: 10}),
    'warrior': new Yield({production: 15}),
    'slinger': new Yield({production: 15}),
    'archer': new Yield({production: 20}),
    'spy': new Yield({production: 20}),
  }

  type: string;
  hp: number; // this should never be allowed to be outside the range 0 - 100
  movement: number;
  promotionClass: PromotionClass;
  movementClass: MovementClass;
  combatStats: [number, number, number];
  attackRange?: number;
  visionRange: number;
  domainID: string;
  coords: Coords;
  alive: boolean;
  cloaked?: boolean;
  isBarbarian?: boolean;

  public knowledge: KnowledgeMap;
  public automationData: { [key: string]: any };

  static makeCatalog(types: string[]): UnitTypeCost[] {
    return types.map(type => (
      { type, cost: Unit.costTable[type] }
    ));
  }

  constructor(type: string, coords: Coords, domainID: string, knowledge?: KnowledgeMap) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.promotionClass = Unit.promotionClassTable[type];
    this.movementClass = Unit.movementClassTable[type];
    this.combatStats = Unit.combatStatsTable[type];
    if (this.promotionClass === PromotionClass.RANGED) {
      this.attackRange = Unit.attackRangeTable[type];
    }
    this.visionRange = Unit.visionRangeTable[type] ?? Unit.visionRangeTable.default;
    this.domainID = domainID;
    this.coords = coords;
    this.alive = true;
    this.knowledge = knowledge ?? {};
    this.automationData = {};
    if (Unit.cloakTable[type]) {
      this.cloaked = false;
    }
  }

  export() {
    return {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      domainID: this.domainID,
      coords: this.coords,
      alive: this.alive,
      knowledge: this.knowledge,
      cloaked: this.cloaked,
    };
  }

  static import(data: any): Unit {
    const unit = new Unit(data.type, data.coords, data.domainID, data.knowledge);
    unit.hp = data.hp;
    unit.movement = data.movement;
    unit.promotionClass = Unit.promotionClassTable[unit.type];
    unit.movementClass = Unit.movementClassTable[unit.type];
    unit.combatStats = Unit.combatStatsTable[unit.type];
    if (unit.promotionClass === PromotionClass.RANGED) {
      unit.attackRange = Unit.attackRangeTable[unit.type];
    }
    unit.alive = data.alive;
    unit.knowledge = data.knowledge;
    if (Unit.cloakTable[unit.type]) {
      unit.cloaked = data.cloaked;
    }
    return unit;
  }

  getData(domainID: string): UnitData | undefined {
    return !this.cloaked || domainID === this.domainID ? {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      domainID: this.domainID,
      promotionClass: this.promotionClass,
      attackRange: this.attackRange,
      knowledge: this.knowledge,
      cloaked: this.cloaked,
      isBarbarian: this.isBarbarian,
    } : undefined;
  }
  
  getMovementClass(): number {
    return this.movementClass;
  }

  setDead(): void {
    this.alive = false;
  }

  setBarbarian(isBarbarian: boolean): void {
    this.isBarbarian = isBarbarian;
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

  updateKnowledge(knowledgeMap: KnowledgeMap): void {
    for (const name in knowledgeMap) {
      this.knowledge[name] = Math.max(this.knowledge[name] ?? 0, knowledgeMap[name]);
    }
  }

  setCloak(cloaked: boolean): void {
    if (Unit.cloakTable[this.type]) {
      this.cloaked = cloaked;
    }
  }

  newTurn() {
    this.movement = Unit.movementTable[this.type];
  }

  isAdjacentTo(dst?: Coords): boolean {
    return !!dst && getAdjacentCoords(this.coords).some(coord => coord.x === dst.x && coord.y === dst.y);
  }
}
