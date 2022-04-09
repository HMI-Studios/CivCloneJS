import { Random } from './random';

export class WorldGenerator {

  private random: Random;
  private tiles: string[];
  private riverCoords: [number, number][];
  private mtCoords: [number, number][];
  private genPoints: string[];
  private width;
  private height;
  private tc: number;

  constructor(seed: number, width: number, height: number) {
    this.random = new Random(seed);
    this.tiles = [];
    this.riverCoords = [];
    this.mtCoords = [];
    this.genPoints = [];
    this.width = width;
    this.height = height;
  }

  private pos(x: number, y: number): number {
    return (y * this.width) + x;
  }

  private getTile(x: number, y: number): string {
    return this.tiles[this.pos(x, y)];
  }

  private setTile(x: number, y: number, tile: string): void {
    this.tiles[this.pos(x, y)] = tile;
  }

  generate(continentSizeMin: number, continentSizeMax: number, continents: number): string[] {
    const { width, height, random } = this;
    this.tiles = this.generateOcean();

    this.riverCoords = [];

    for (let i = 0; i < Math.ceil((continents / 100) * width); i++) {
      const x = random.randInt(width);
      const y = random.doubleRandInt(0, height*0.2, height*0.8, height);
      this.generateLandmass(x, y, random.randInt(width * continentSizeMin, width * continentSizeMax), 'plains', continents, width);
    }

    return this.tiles;
  }

  private generateOcean(): string[] {
    const { width, height } = this;
    const tiles = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        tiles.push('ocean');
      }
    }
    return tiles;
  }

  private generateLandmass(x: number, y: number, radius: number, biomeTile: string, continents: number, mapWidth: number): void {
    const { random } = this;
    this.tc = 0;
    this.genPoints = [];
    this.mtCoords = [[x, y]];
    this.generateLandStep(x, y, radius, biomeTile, 'mountain');
    // HEIGHT MAP
    const mtCoord = this.mtCoords.shift();
    if (random.randInt(3) === 0) {
      this.riverCoords.push(mtCoord);
    }
    const l = this.mtCoords.length;
    while (this.mtCoords.length > 0) {
      // HEIGHT MAP
      const mtCoord = this.mtCoords.shift();
      if (random.randInt(3) === 0) {
        this.riverCoords.push(mtCoord);
      }
    }
  }

  private generateLandStep(x: number, y: number, radius: number, biomeTile: string, borderTile: string): void {
    const { width, height, random } = this;
    if (y > 0 && y < width) {
      if (!(this.genPoints.includes(`${x}/${y}`))) {
        if (this.getTile(x, y) === biomeTile) {
          this.setTile(x, y, borderTile);
          this.mtCoords.push([x % width, y % height]);
          this.genPoints.push(`${x}/${y}`);
          if (!(this.genPoints.includes(`${x + 1}/${y}`)) && random.randInt(radius) > 0) {
            this.generateLandStep(x + 1, y, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (!(this.genPoints.includes(`${x}/${y + 1}`)) && random.randInt(radius) > 0) {
            this.generateLandStep(x, y + 1, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (!(this.genPoints.includes(`${x}/${y - 1}`)) && random.randInt(radius) > 0) {
            this.generateLandStep(x, y - 1, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (!(this.genPoints.includes(`${x - 1}/${y}`)) && random.randInt(radius) > 0) {
            this.generateLandStep(x - 1, y, Math.floor(radius / 3), biomeTile, borderTile);
          }
        } else {
          this.setTile(x, y, biomeTile);
          this.genPoints.push(`${x}/${y}`);
          this.tc++;
          if (this.getTile(x + 1, y) !== biomeTile && random.randInt(radius) > 0) {
            this.generateLandStep(x + 1, y, radius - 1, biomeTile, borderTile);
          }
          if (this.getTile(x, y + 1) !== biomeTile && random.randInt(radius) > 0) {
            this.generateLandStep(x, y + 1, radius - 1, biomeTile, borderTile);
          }
          if (this.getTile(x, y - 1) !== biomeTile && random.randInt(radius) > 0) {
            this.generateLandStep(x, y - 1, radius - 1, biomeTile, borderTile);
          }
          if (this.getTile(x - 1, y) !== biomeTile && random.randInt(radius) > 0) {
            this.generateLandStep(x - 1, y, radius - 1, biomeTile, borderTile);
          }
        }
      }
    }
  }
}