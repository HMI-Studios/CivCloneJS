import { Coords } from './world';
import { Unit } from './unit';
import { City } from './city';
import { Tile, TileData, Yield } from './tile';
import { Improvement } from './improvement';
import { getAdjacentCoords, mod, Event } from './utils';

export class Map {
  height: number;
  width: number;
  tiles: Tile[];
  cities: City[];
  updates: { (civID: number): Event }[];

  constructor(height: number, width: number, terrain: string[], heightMap: number[]) {
    this.height = height;
    this.width = width;
    this.tiles = new Array(height*width);
    for (let i = 0; i < height*width; i++) {
      this.tiles[i] = new Tile(terrain[i], heightMap[i], new Yield({ food: 1, production: 1 }));
    }
    this.cities = [];
    this.updates = [];
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

  getNeighborsCoords({ x, y }: Coords, r = 1, tileList: Coords[] = [], isTop = true): Coords[] {
    if (r > 0 && this.getTile({x, y})) {
      tileList.push({x, y});
      for (const coord of getAdjacentCoords({x, y})) {
        this.getNeighborsCoords(coord, r-1, tileList, false);
      }
    }
    if (isTop) {
      return tileList;
    }
  }

  getVisibleTilesCoords(unit: Unit): Coords[] {
    return [unit.coords, ...this.getNeighborsCoords(unit.coords, 3)];
  }
  
  setTileOwner(coords: Coords, owner: City): void {
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
  
  getCivMap(civID: number): TileData[] {
    return this.tiles.map((tile) => {
      return this.getCivTile(civID, tile);
    });
  }
  
  setTileVisibility(civID: number, coords: Coords, visible: boolean) {
    this.getTile(coords).setVisibility(civID, visible);
    this.tileUpdate(coords);
  }

  tileUpdate(coords: Coords) {
    // if (coords.x === null && coords.y === null) return;
    const tile = this.getTile(coords);
    this.updates.push( (civID: number) => ['tileUpdate', [ coords, this.getCivTile(civID, tile) ]] );
  }

  moveUnitTo(unit: Unit, coords: Coords): void {
    if (unit.coords.x !== null && unit.coords.y !== null) {
      this.getTile(unit.coords).setUnit(null);
      this.tileUpdate(unit.coords);
    }
    unit.coords = coords;
    if (coords.x !== null && coords.y !== null) {
      this.getTile(coords).setUnit(unit);
      this.tileUpdate(coords);
    }
  }

  settleCityAt(coords: Coords, name: string, civID: number) {
    const city: City = new City(coords, name, civID);
    this.cities.push(city);

    for (const neighbor of this.getNeighborsCoords(coords)) {
      this.setTileOwner(neighbor, city);

      this.tileUpdate(neighbor);
    }

    this.tileUpdate(coords);
  }

  buildImprovementAt(coords: Coords, type: string) {
    this.getTile(coords).improvement = new Improvement(type);

    this.tileUpdate(coords);
  }
}
