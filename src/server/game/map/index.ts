import { Coords } from '../world';
import { Unit } from './tile/unit';
import { City } from './tile/city';
import { Tile, TileData } from './tile';
import { Improvement } from './tile/improvement';
import { getAdjacentCoords, mod, Event } from '../../utils';

export interface MapOptions {
  width: number;
  height: number;
}

export class Map {
  height: number;
  width: number;
  tiles: Tile[];
  cities: City[];
  updates: { (civID: number): Event }[];

  constructor(height: number, width: number) {
    this.height = height;
    this.width = width;
    this.tiles = new Array(height*width);
    this.cities = [];
    this.updates = [];
  }

  export() {
    return {
      height: this.height,
      width: this.width,
      tiles: this.tiles.map(tile => tile.export()),
      cities: this.cities.map(city => city.export()),
    };
  }

  pos({ x, y }: Coords): number {
    return (y * this.width) + mod(x, this.width)
  }

  getUpdates(): { (civID: number): Event }[] {
    return this.updates.splice(0);
  }

  getTile(coords: Coords): Tile {
    return this.tiles[this.pos(coords)];
  }

  setTile(coords: Coords, tile: Tile): void {
    this.tiles[this.pos(coords)] = tile;
  }

  private getNeighborsCoordsRecurse({ x, y }: Coords, r: number, tileList: Coords[]): void {
    if (r >= 0 && this.getTile({x, y})) {
      tileList.push({x, y});
      for (const coord of getAdjacentCoords({x, y})) {
        this.getNeighborsCoordsRecurse(coord, r-1, tileList);
      }
    }
  }

  getNeighborsCoords(coords: Coords, r = 1, tileList: Coords[] = []): Coords[] {
    this.getNeighborsCoordsRecurse(coords, r, tileList);

    return tileList;
  }

  // mode: 0 = land unit, 1 = sea unit; -1 = air unit
  getPathTree(srcPos: Coords, range: number, mode = 0): { [key: string]: Coords } {
    // BFS to find all tiles within `range` steps

    const queue: Coords[] = [];
    queue.push(srcPos);

    const dst = {};
    dst[this.pos(srcPos)] = 0;

    const paths = {};

    while (queue.length) {
      const atPos = queue.shift() as Coords;

      for (const adjPos of this.getNeighborsCoords(atPos)) {

        const tile = this.getTile(adjPos);
        // PATH BLOCKING LOGIC HERE
        // if (tile.unit && tile.unit.civID === this.player.civID) continue;

        const movementCost = mode > -1 ? tile.movementCost[mode] || Infinity : 1;
        if (!(this.pos(adjPos) in dst) || dst[this.pos(adjPos)] > dst[this.pos(atPos)] + movementCost) {
          dst[this.pos(adjPos)] = dst[this.pos(atPos)] + movementCost;

          if (dst[this.pos(adjPos)] <= range) {
            paths[this.pos(adjPos)] = atPos;
            queue.push(adjPos);
          }
        }
      }
    }

    return paths;
  }

  getVisibleTilesCoords(unit: Unit): Coords[] {
    return [unit.coords, ...this.getNeighborsCoords(unit.coords, 2)];
  }

  setTileOwner(coords: Coords, owner: City, overwrite: boolean): void {
    if (!overwrite && this.getTile(coords).owner) return;
    this.getTile(coords).owner?.removeTile(coords);
    this.getTile(coords).owner = owner;
    owner.addTile(coords);
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

  getCivMap(civID: number): (TileData | null)[] {
    return this.tiles.map((tile) => {
      return this.getCivTile(civID, tile);
    });
  }

  setTileVisibility(civID: number, coords: Coords, visible: boolean) {
    this.getTile(coords).setVisibility(civID, visible);
    this.tileUpdate(coords);
  }

  isInBounds(coords: Coords): boolean {
    return coords.x >= 0 && coords.x < this.width && coords.y >= 0 && coords.y < this.height;
  }

  tileUpdate(coords: Coords) {
    // if (coords.x === null && coords.y === null) return;
    const tile = this.getTile(coords);
    this.updates.push( (civID: number) => ['tileUpdate', [ coords, this.getCivTile(civID, tile) ]] );
  }

  moveUnitTo(unit: Unit, coords: Coords): void {
    this.getTile(unit.coords).setUnit(undefined);
    this.tileUpdate(unit.coords);
    unit.coords = coords;
    this.getTile(coords).setUnit(unit);
    this.tileUpdate(coords);
  }

  createTradeRoutes(coords: Coords, sink: Improvement): void {
    console.log(coords, sink)
  }

  settleCityAt(coords: Coords, name: string, civID: number): boolean {
    const tile = this.getTile(coords);
    if (tile.owner) return false;

    const city: City = new City(coords, name, civID);
    this.cities.push(city);

    for (const neighbor of this.getNeighborsCoords(coords)) {
      this.setTileOwner(neighbor, city, false);

      this.tileUpdate(neighbor);
    }

    this.buildImprovementAt(coords, 'settlement', civID, true);
    return true;
  }

  buildImprovementAt(coords: Coords, type: string, ownerID: number, instant = false): void {
    const tile = this.getTile(coords);
    if (tile.owner?.civID !== ownerID) return;

    if (instant) tile.improvement = new Improvement(type);
    else {
      tile.improvement = new Improvement('worksite', { constuction: true, type });
      this.createTradeRoutes(coords, tile.improvement);
    }

    this.tileUpdate(coords);
  }
}
