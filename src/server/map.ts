import { Unit, UnitData, Coords } from './game';

export class Map {
  height: number;
  width: number;
  tiles: Tile[];

  constructor(height: number, width: number, terrain: string[]) {
    this.height = height;
    this.width = width;
    this.tiles = new Array(height*width);
    for (let i = 0; i < height*width; i++) {
    this.tiles[i] = new Tile(terrain[i]);
    }
  }

  pos({ x, y }: Coords): number {
    return (y * this.width) + this.mod(x, this.width)
  }

  mod(a: number, b: number): number {
    if (a >= 0) {
      return a % b;
    } else {
      return ((a % b) + b) % b;
    }
  } 

  getTile(coords: Coords): Tile {
    return this.tiles[this.pos(coords)];
  }

  getNeighborsCoords({ x, y }: Coords, r: number, tileList: Coords[] = [], isTop = true): Coords[] {
    if (r > 0 && this.tiles[this.pos({x, y})]) {
      tileList.push({x, y});
      if (this.mod(x, 2) === 1) {
        this.getNeighborsCoords({ x: x,   y: y+1 }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x+1, y: y+1 }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x+1, y: y   }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x,   y: y-1 }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x-1, y: y   }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x-1, y: y+1 }, r-1, tileList, false);
      } else {
        this.getNeighborsCoords({ x: x,   y: y+1 }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x+1, y: y   }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x+1, y: y-1 }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x,   y: y-1 }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x-1, y: y-1 }, r-1, tileList, false);
        this.getNeighborsCoords({ x: x-1, y: y   }, r-1, tileList, false);
      }
    }
    if (isTop) {
      return tileList;
    }
  }

  getVisibleTilesCoords(unit: Unit): Coords[] {
    return this.getNeighborsCoords(unit.coords, 3);
  }

  moveUnitTo(unit: Unit, coords: Coords): void {
    if (unit.coords.x !== null && unit.coords.y !== null) {
      this.tiles[this.pos(unit.coords)].setUnit(null);
    }
    unit.coords = coords;
    if (coords.x !== null && coords.y !== null) {
      this.tiles[this.pos(coords)].setUnit(unit);
    }
  }

  getCivTile(civID: number, tile: Tile): TileData | null {
    if (tile.discoveredBy[civID]) {
      if (tile.visibleTo[civID]) {
        return tile.getVisibleData();
      } else {
        return tile.getDiscoveredData();
      }
    } else {
      return null;
    }
  }

  getCivMap(civID: number) {
    return this.tiles.map((tile) => {
      return this.getCivTile(civID, tile);
    });
  }

  setTileVisibility(civID: number, coords: Coords, visible: boolean) {
    this.tiles[this.pos(coords)].setVisibility(civID, visible);
  }
}

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