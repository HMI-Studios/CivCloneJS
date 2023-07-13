export interface CityData {
  name: string;
  civID: number;
}

export class City {
  center: Coords;
  name: string;
  civID: number;

  private tiles: Set<Coords>;

  constructor(center: Coords, name: string, civID: number) {
    this.center = center;
    this.name = name;
    this.civID = civID;

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
      tiles,
    };
  }

  static import(data: any): City {
    const city = new City(data.center, data.name, data.civID);
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
}
