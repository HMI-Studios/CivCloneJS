import { Random } from './random';

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
    const targetWeight = random.randInt(this.weightRange);
    let resultTile: TileType | undefined;
    for (const [tile, weight] of this.tileWeights) {
      resultTile = tile;
      if (weight > targetWeight) {
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