import { Unit, UnitData } from './unit';

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
  improvement: any;
  movementCost: [number, number];
  unit?: UnitData;
  visible?: boolean;
}

export class Tile {
  type: string;
  improvement: any;
  unit: Unit;
  discoveredBy: { [civID: number]: boolean };
  visibleTo: { [civID: number]: number };
  movementCost: [number, number];

  constructor(type: string) {
    this.type = type;
    this.improvement = null;
    this.unit = null;
    this.discoveredBy = {};
    this.visibleTo = {};
    this.movementCost = tileMovementCostTable[type];
  }

  getDiscoveredData(): TileData {
    return {
      type: this.type,
      improvement: this.improvement,
      movementCost: this.movementCost,
    };
  }

  getVisibleData(): TileData {
    const unitData = !this.unit ? null : this.unit.getData();
    return {
      ...this.getDiscoveredData(),
      unit: unitData,
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
