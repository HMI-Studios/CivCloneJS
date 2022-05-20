import { Random } from './random';
import { getAdjacentCoords } from './utils';

export class TileType {
  public type: string;
  public isMountain: boolean;
  public isWater: boolean;
  public isRiverGen: boolean;
  public heightClass: number; // 0 = Sea Level, 1 = Lowlands, 2 = Plains, 3 = Highlands, 4 = Mountains, 5 = Mountain Peak

  constructor(type: string, heightClass: number, isWater = false, isRiverGen = false) {
    this.type = type;
    this.isMountain = (heightClass === 5);
    this.isWater = isWater;
    this.isRiverGen = isRiverGen;
    this.heightClass = heightClass;
  }
}

export class TilePool {
  private tileWeights: [TileType, number][];
  private weightRange: number;

  constructor(tileWeights: [TileType, number][]) {
    this.tileWeights = [];
    let sum = 0;
    for (const [tile, weight] of tileWeights) {
      this.tileWeights.push([tile, weight + sum]);
      sum += weight;
    }
    this.weightRange = sum;
    console.log(this.tileWeights);
  }

  resolve(random: Random): TileType {
    const targetWeight = random.randFloat(this.weightRange);
    let resultTile: TileType | undefined;
    for (const [tile, weight] of this.tileWeights) {
      resultTile = tile;
      if (weight >= targetWeight) {
        break;
      }
    }
    if (resultTile) {
      return resultTile;
    } else {
      throw `Broken Tile Pool: ${this.tileWeights}`;
    }
  }
}

export class River {
  private x: number;
  private y: number;
  private mapWidth: number; // FIXME


  constructor(x: number, y: number, width: number) { // change to coords later
    [this.x, this.y] = [x, y];

    this.mapWidth = width;
  }

  // FIXME
  pos({ x, y }: Coords): number {
    return (y * this.mapWidth) + x;
  }

  flood(pos: Coords, waterLevels: number[], tiles: string[], riverLen: number, prevPos: Coords): void {
    const MAX_RIVER_LEN = this.mapWidth * 2;

    if (tiles[this.pos(pos)] === 'ocean') return;

    const adjCoords = getAdjacentCoords(pos);
    let greatestDiff = 0;
    let greatestDiffCoords: Coords | undefined;
    for (const coords of adjCoords) {
      const diff = waterLevels[this.pos(pos)] - waterLevels[this.pos(coords)]
      if (diff > greatestDiff && coords.x !== prevPos.x && coords.y !== prevPos.y) {
        greatestDiff = diff;
        greatestDiffCoords = coords;
      }
    }

    if (greatestDiffCoords) {
      tiles[this.pos(pos)] = 'river'; // FIXME
      if (riverLen < MAX_RIVER_LEN) this.flood(greatestDiffCoords, waterLevels, tiles, riverLen+1, pos);
    } else {
      waterLevels[this.pos(pos)]++;
      if (riverLen < MAX_RIVER_LEN) this.flood(pos, waterLevels, tiles, riverLen+1, prevPos);
    }
  }

  generate(tiles: string[], heightMap: number[]): void {
    const waterLevels = [...heightMap];
    const startPos = { x: this.x, y: this.y };

    const adjCoords = getAdjacentCoords(startPos);
    let greatestDiff = 0;
    let greatestDiffCoords: Coords | undefined;
    for (const coords of adjCoords) {
      const diff = waterLevels[this.pos(startPos)] - waterLevels[this.pos(coords)]
      if (diff > greatestDiff ) {
        greatestDiff = diff;
        greatestDiffCoords = coords;
      }
    }
    if (greatestDiffCoords) {
      this.flood(greatestDiffCoords, waterLevels, tiles, 1, startPos);
    }

    // let riverLen = 0;
    // // while (riverLen < MAX_RIVER_LEN) {
    //   riverLen++;
    // }
  }
}

export class Biome {
  private oceanTile: TileType;
  private tileLevels: [number, TileType | TilePool][];
  private random: Random;

  constructor(random: Random, oceanTile: TileType, tileLevels: [number, TileType | TilePool][]) {
    this.oceanTile = oceanTile;
    this.tileLevels = tileLevels;
    this.random = random;
  }

  getTile(elevation: number): TileType {
    let resultTile = this.oceanTile;
    for (const [level, tile] of this.tileLevels) {
      if (elevation > level) {
        if (tile instanceof TileType) resultTile = tile;
        else resultTile = tile.resolve(this.random);
      } else {
        break;
      }
    }
    return resultTile;
  }
}