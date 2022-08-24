import { Unit, UnitData } from './unit';
import { Improvement, ImprovementData } from './improvement';
import { City, CityData } from './city';
import { Yield } from './yield';

const tileMovementCostTable: { [type: string]: [number, number] } = {
  // tile name: [land mp, water mp] (0 = impassable)
  'ocean': [0, 1],
  'frozen_ocean': [0, 0],
  'river': [4, 1],
  'frozen_river': [3, 0],
  'grass_lowlands': [1, 0],
  'plains': [1, 0],
  'grass_hills': [2, 0],
  'grass_mountains': [4, 0],
  'desert': [1, 0],
  'desert_hills': [3, 0],
  'desert_mountains': [4, 0],
  'snow_plains': [2, 0],
  'snow_hills': [3, 0],
  'snow_mountains': [5, 0],
  'mountain': [0, 0],
};

export interface TileData {
  type: string;
  elevation: number;
  movementCost: [number, number];
  yield: Yield;
  unit?: UnitData;
  improvement?: ImprovementData;
  owner?: CityData;
  visible?: boolean;
}

export class Tile {
  movementCost: [number, number];
  type: string;
  elevation: number;

  unit?: Unit;
  improvement?: Improvement;
  owner?: City;

  discoveredBy: { [civID: number]: boolean };
  visibleTo: { [civID: number]: number };

  public baseYield: Yield;

  constructor(type: string, tileHeight: number, baseYield: Yield) {
    this.movementCost = tileMovementCostTable[type];
    this.type = type;
    this.elevation = tileHeight;

    this.unit = undefined;
    this.improvement = undefined;
    this.owner = undefined;

    this.discoveredBy = {};
    this.visibleTo = {};

    this.baseYield = baseYield;
  }

  export() {
    return {
      // movementCost: this.movementCost,
      type: this.type,
      elevation: this.elevation,
      unit: this.unit?.export(),
      improvement: this.improvement,
      // owner: this.owner?,
      discoveredBy: this.discoveredBy,
      // visibleTo: { [civID: number]: number },
      baseYield: this.baseYield,
    };
  }

  getTileYield(): Yield {
    if (this.improvement) {
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
      elevation: this.elevation,
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

  setUnit(unit?: Unit): void {
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
