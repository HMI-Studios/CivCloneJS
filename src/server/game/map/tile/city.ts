import { Unit } from "./unit";

export interface CityData {
  name: string;
  civID?: number;
}

export class City {
  center: Coords;
  name: string;
  civID?: number;
  units: Unit[];

  private tiles: Set<Coords>;

  constructor(center: Coords, name: string, civID?: number) {
    this.center = center;
    this.name = name;
    this.civID = civID;
    this.units = [];

    this.tiles = new Set();
    this.addTile(center);
  }

  export() {
    const tiles: Coords[] = [];
    for (const coords of this.tiles) {
      tiles.push(coords)
    }
    return {
      center: this.center,
      name: this.name,
      civID: this.civID,
      isBarbarian: this instanceof BarbarianCamp,
      tiles,
    };
  }

  static import(data: any): City {
    const city = new (data.isBarbarian ? BarbarianCamp : City)(data.center, data.name, data.civID);
    city.tiles = new Set();
    for (const coords of data.tiles) {
      city.addTile(coords);
    }
    return city;
  }

  getData(): CityData {
    return {
      name: this.name,
      civID: this.civID,
    };
  }

  getTiles(): Set<Coords> {
    return this.tiles;
  }

  addTile(coords: Coords) {
    this.tiles.add(coords);
  }

  removeTile(coords: Coords) {
    this.tiles.delete(coords);
  }

  getUnits(): Unit[] {
    return this.units;
  }

  getUnitPositions(): Coords[] {
    return this.units.map(unit => unit.coords);
  }

  addUnit(unit: Unit): void {
    this.units.push(unit);
    if (this instanceof BarbarianCamp) {
      unit.setBarbarian(true);
    }
  }

  removeUnit(unit: Unit): void {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }
}

export class BarbarianCamp extends City {
  constructor(center: Coords) {
    super(center, 'camp', undefined)
  }
}
