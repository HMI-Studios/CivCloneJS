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
    this.tiles.add(center);
  }

  export() {
    return {
      center: this.center,
      name: this.name,
      civID: this.civID,
      tiles: this.tiles,
    };
  }

  static import(data: any): City {
    const city = new City(data.center, data.name, data.civID);
    city.tiles = data.tiles;
    return city;
  }

  getData(): CityData {
    return {
      name: this.name,
      civID: this.civID,
    };
  }

  addTile(coords: Coords) {
    this.tiles.add(coords);
  }

  removeTile(coords: Coords) {
    this.tiles.delete(coords);
  }
}
