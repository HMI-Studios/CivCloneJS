import { Unit, UnitData } from './unit';
import { Improvement, ImprovementData } from './improvement';
import { City, CityData } from './city';

const tileMovementCostTable: { [type: string]: [number, number] } = {
  // tile name: [land mp, water mp] (0 = impassable)
  'plains': [1, 0],
  'desert': [1, 0],
  'ocean': [0, 1],
  'river': [3, 1],
  'mountain': [0, 0],
};

export interface TileData {
  type: string;
  movementCost: [number, number];
  yield: Yield;
  unit?: UnitData;
  improvement?: ImprovementData;
  owner?: CityData;
  visible?: boolean;
}

export class Yield {
  food: number;
  production: number;

  constructor(params: { food?: number, production?: number }) {
    this.food = params.food ?? 0;
    this.production = params.production ?? 0;
  }

  add(other: Yield): Yield {
    return new Yield({
      food: this.food + other.food,
      production: this.production + other.production,
    });
  }
}

export class Tile {
  movementCost: [number, number];
  type: string;

  unit: Unit;
  improvement: Improvement;
  owner: City;

  discoveredBy: { [civID: number]: boolean };
  visibleTo: { [civID: number]: number };

  private baseYield: Yield;

  constructor(type: string, tileHeight: number, baseYield: Yield) {
    this.movementCost = tileMovementCostTable[type];
    this.type = type;

    this.unit = null;
    this.improvement = null;
    this.owner = null;

    this.discoveredBy = {};
    this.visibleTo = {};
  }

  getTileYield(): Yield {
    if (this.improvement !== null) {
      return this.baseYield.add(this.improvement.yield);
    } else {
      return this.baseYield;
    }
  }

  getDiscoveredData(): TileData {
    return {
      type: this.type,
      movementCost: this.movementCost,
      improvement: this.improvement?.getData(),
      owner: this.owner?.getData(),
      yield: this.getTileYield(),
    };
  }

  getVisibleData(): TileData {
    return {
      ...this.getDiscoveredData(),
      unit: this.unit?.getData(),
      visible: true,
    }
  }

  getMovementCost(unit: Unit): number {
    const mode = unit.getMovementClass();
    return mode > -1 ? this.movementCost[mode] || Infinity : 1;
  }

  setUnit(unit: Unit): void {
    this.unit = unit;
  }

  setVisibility(civID: number, visible: boolean): void {
    if (visible) {
      this.visibleTo[civID]++;
    } else {
      this.visibleTo[civID]--;
    }

    if (visible && !this.discoveredBy[civID]) {
      this.discoveredBy[civID] = true;
    }
  }

  clearVisibility(civID: number): void {
    this.visibleTo[civID] = 0;
  }
}
