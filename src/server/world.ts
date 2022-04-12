import { Map } from './map';
import { Unit } from './unit';
import { Tile } from './tile';
import { Civilization, CivilizationData } from './civilization';

export interface Coords {
  x: number;
  y: number;
}

export class World {
  map: Map;
  civs: { [civID: number]: Civilization };
  civsCount: number;
  colorPool: { [color: string]: boolean };
  metaData: { gameName: string };

  constructor(map: Map, civsCount: number) {
    this.map = map;

    this.civs = {};
    this.civsCount = civsCount;

    for (let i = 0; i < this.civsCount; i++) {
      this.civs[i] = new Civilization();

      this.addUnit(new Unit('settler', i), { x: (i+1)*1, y: (i+1)*1 }); // REMOVE THESE
      this.addUnit(new Unit('scout', i), { x: (i+1)*3, y: (i+1)*4 }); // REMOVE THESE

      this.updateCivTileVisibility(i);
    }

    const colorList: string[] = [
      '#820000', // RICH RED
      '#0a2ead', // BLUE
      '#03a300', // GREEN
      '#03a300', // SAND YELLOW
      '#560e8a', // ROYAL PURPLE
      '#bd7400', // ORANGE
    ].slice(0, Math.max(this.civsCount, 6));

    this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});

    this.metaData = {
      gameName: "New Game",
    };
  }

  // colorPool
  getColorPool(): string[] {
    const colorList = [];

    for (const color in this.colorPool) {
      if (this.colorPool[color]) {
        colorList.push(color);
      }
    }

    return colorList;
  }

  // colorPool, civs
  setCivColor(civID: number, color: string): boolean {
    if (this.colorPool[color]) {
      if (this.civs[civID].color) {
        this.colorPool[this.civs[civID].color] = true;
      }
      this.civs[civID].color = color;
      this.colorPool[color] = false;
      return true;
    } else {
      return false;
    }
  }

  // civs
  getCiv(civID: number): Civilization {
    return this.civs[civID];
  }

  // civs
  getAllCivsData(): { [civID: number]: CivilizationData } {
    const data = {};

    for (const civID in this.civs) {
      const civ = this.civs[civID];
      data[civID] = civ.getData();
    }

    return data;
  }

  // map, civs
  updateCivTileVisibility(civID: number): void {
    for (const tile of this.map.tiles) {
      tile.clearVisibility(civID);
    }
    for (const unit of this.civs[civID].units) {
      for (const coords of this.map.getVisibleTilesCoords(unit)) {
        const tile = this.map.getTile(coords);
        tile.setVisibility(civID, true);
      }
    }
  }

  // map, civs
  addUnit(unit: Unit, coords: Coords): void {
    this.civs[unit.civID].addUnit(unit);
    this.map.moveUnitTo(unit, coords);
  }

  // map, civs
  removeUnit(unit: Unit): void {
    this.civs[unit.civID].removeUnit(unit);
    this.map.moveUnitTo(unit, { x: null, y: null });
  }
}
