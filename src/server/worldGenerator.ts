import { Random } from './random';
import SimplexNoise from 'simplex-noise';
import { Biome, River, TilePool, TileType } from './biome';

const TAU = 2 * Math.PI;

// Tile Types
const OCEAN = new TileType('ocean', 0, true, true);
const SHALLOW_OCEAN = new TileType('river', 0, true, true);
const RIVER = new TileType('river', 0, true);
const FROZEN_OCEAN = new TileType('frozen_ocean', 0, true, true);
const SHALLOW_FROZEN_OCEAN = new TileType('frozen_ocean', 0, true, true);
const FROZEN_RIVER = new TileType('frozen_river', 0, true);

const GRASS_LOWLANDS = new TileType('grass_lowlands', 1);
const GRASS_PLAINS = new TileType('plains', 2);
const GRASS_HILLS = new TileType('grass_hills', 3);
const GRASS_MOUNTAINS = new TileType('grass_mountains', 4);

const DESERT_PLAINS = new TileType('desert', 2);
const DESERT_HILLS = new TileType('desert_hills', 3);
const DESERT_MOUNTAINS = new TileType('desert_mountains', 4);

const SNOW_PLAINS = new TileType('snow_plains', 2);
const SNOW_HILLS = new TileType('snow_hills', 3);
const SNOW_MOUNTAINS = new TileType('snow_mountains', 4);

const MOUNTAIN = new TileType('mountain', 5);
const MOUNTAIN_SPRING = new TileType('mountain', 5, false, false, true);

export class PerlinWorldGenerator {

  private random: Random;
  private simplex: SimplexNoise;
  private width: number;
  private height: number;
  private biomes: { [key: string]: Biome }

  constructor(seed: number, width: number, height: number) {
    this.random = new Random(seed);
    this.simplex = new SimplexNoise(this.random.randFloat);
    this.width = width;
    this.height = height;

    // Elevation Constants - Make these configurable later
    const SEA_LEVEL = 45;
    const COAST_LEVEL = 55;
    const PLAINS_LEVEL = 60;
    const HILLS_LEVEL = 80;
    const HIGHLANDS_LEVEL = 90;
    const MOUNTAIN_LEVEL = 98;

    // Define Biomes
    this.biomes = {
      'plains': new Biome(this.random,
        OCEAN, [
        [SEA_LEVEL, SHALLOW_OCEAN],
        [COAST_LEVEL, GRASS_LOWLANDS],
        [PLAINS_LEVEL, GRASS_PLAINS],
        [HILLS_LEVEL, new TilePool([[GRASS_HILLS, 100], [MOUNTAIN_SPRING, 1]])],
        [HIGHLANDS_LEVEL, new TilePool([[GRASS_MOUNTAINS, 100], [MOUNTAIN_SPRING, 1]])],
        [MOUNTAIN_LEVEL, new TilePool([[MOUNTAIN, 20], [MOUNTAIN_SPRING, 1]])],
      ]),
      'tundra': new Biome(this.random,
        OCEAN, [
        [SEA_LEVEL, SHALLOW_OCEAN],
        [SEA_LEVEL + 5, FROZEN_RIVER],
        [COAST_LEVEL, SNOW_PLAINS],
        [HILLS_LEVEL, SNOW_HILLS],
        [HIGHLANDS_LEVEL, SNOW_MOUNTAINS],
        [MOUNTAIN_LEVEL, MOUNTAIN],
      ]),
      'arctic': new Biome(this.random,
        FROZEN_OCEAN, [
        [SEA_LEVEL, SHALLOW_FROZEN_OCEAN],
        [COAST_LEVEL, SNOW_PLAINS],
        [HILLS_LEVEL, SNOW_HILLS],
        [HIGHLANDS_LEVEL, SNOW_MOUNTAINS],
        [MOUNTAIN_LEVEL, MOUNTAIN],
      ]),
      'desert': new Biome(this.random,
        OCEAN, [
        [SEA_LEVEL, SHALLOW_OCEAN],
        [COAST_LEVEL, DESERT_PLAINS],
        [HILLS_LEVEL, DESERT_HILLS],
        [HIGHLANDS_LEVEL, DESERT_MOUNTAINS],
        [MOUNTAIN_LEVEL, new TilePool([[MOUNTAIN, 15], [MOUNTAIN_SPRING, 1]])],
      ]),
    };
  }

  getBiome(temp: number): Biome {
    if (temp < 5) return this.biomes.arctic;
    if (temp < 20) return this.biomes.tundra;
    if (temp < 60) return this.biomes.plains;
    if (temp <= 100) return this.biomes.desert;

    // Default Biome in case no match is found
    return this.biomes.plains;
  }

  getElevation(x: number, y: number): number {
    const mapScale = 0.005; // .015
    const freq1 = (mapScale * 1) * this.width;
    const noise1 = this.ridgenoise(x / this.width, y / this.width, freq1);
    const freq2 = (mapScale * 2) * this.width;
    const noise2 = 0.75 * this.ridgenoise(x / this.width, y / this.width, freq2) * noise1;
    const freq3 = (mapScale * 4) * this.width;
    const noise3 = 0.625 * this.ridgenoise(x / this.width, y / this.width, freq3) * (noise1 + noise2);
    const freq4 = (mapScale * 8) * this.width;
    const noise4 = 0.25 * this.cylindernoise(x / this.width, y / this.width, freq4);
    const freq5 = (mapScale * 24) * this.width;
    const noise5 = 0.375 * this.cylindernoise(x / this.width, y / this.width, freq5);

    const noiseVal = (noise1 + noise2 + noise3 + noise4 + noise5) / 3;
    return Math.pow(noiseVal, 1) * 100;
  }

  getTemp(x: number, y: number): number {
    const mapScale = 0.01;
    const freq1 = (mapScale * 1) * this.width;
    const noise1 = this.cylindernoise(x / this.width, y / this.width, freq1);
    const freq2 = (mapScale * 2) * this.width;
    const noise2 = 0.5 * this.cylindernoise(x / this.width, y / this.width, freq2) * noise1;
    let noiseVal = (noise1 + noise2) / 1.5;
    const tempBias = Math.pow(1 - (Math.abs(0.5 - (y / this.height)) * 4), 5);
    noiseVal = Math.min(1, Math.max(0, ((noiseVal / 2) + 0.25) + tempBias));
    return noiseVal * 100;
  }

  getHumidity(x: number, y: number): number {
    const mapScale = 0.01;
    const freq1 = (mapScale * 1) * this.width;
    const noise1 = this.cylindernoise(x / this.width, y / this.width, freq1);
    const freq2 = (mapScale * 2) * this.width;
    const noise2 = 0.5 * this.cylindernoise(x / this.width, y / this.width, freq2) * noise1;
    let noiseVal = (noise1 + noise2) / 1.5;
    const tempBias = 0.25 - Math.abs(0.5 - (y / this.height));
    noiseVal = ((noiseVal / 2) + 0.25) + tempBias;
    return noiseVal * 100;
  }

  ridgenoise(nx: number, ny: number, freq: number): number {
    return 2 * (0.5 - Math.abs(0.5 - this.cylindernoise(nx, ny, freq)));
  }

  cylindernoise(nx: number, ny: number, freq: number): number {
    const angle_x = TAU * nx;
    return (this.simplex.noise3D(
        Math.cos(angle_x) / TAU * freq,
        Math.sin(angle_x) / TAU * freq,
        ny * freq
    ) + 1) / 2;
  }

  generate(): [string[], number[]] {
    const startTime = new Date().getTime();

    const { width, height } = this;
    const tileTypeMap: TileType[] = [];
    const heightMap: number[] = [];
    const riverSources: [number, number][] = []; // change to list of Coords
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const elevation = this.getElevation(x, y);
        const temp = this.getTemp(x, y);
        const tile = this.getBiome(temp).getTile(elevation)
        if (tile.isRiverGen) riverSources.push([x, y]);
        tileTypeMap.push(tile);
        heightMap.push(elevation);
      }
    }

    for (const [x, y] of riverSources) {
      const river = new River(x, y, this.width);
      river.generate(tileTypeMap, heightMap, RIVER);
    }

    const tiles: string[] = tileTypeMap.map(tile => tile.type);

    console.log(`Map generation completed in ${new Date().getTime() - startTime}ms.`)
    return [tiles, heightMap];
  }
}

export class WorldGenerator {

  private random: Random;
  private tiles: string[];
  private heightMap: number[];
  private riverCoords: [number, number][];
  private mtCoords: [number, number][];
  private genPoints: string[];
  private width: number;
  private height: number;
  private tc: number;

  constructor(seed: number, width: number, height: number) {
    this.random = new Random(seed);
    this.tiles = [];
    this.heightMap = [];
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

  generate(continentSizeMin: number, continentSizeMax: number, continents: number): [string[], number[]] {
    const { width, height, random } = this;
    this.generateOcean();

    this.riverCoords = [];

    for (let i = 0; i < Math.ceil((continents / 100) * width); i++) {
      const x = random.randInt(width);
      const y = random.doubleRandInt(0, height*0.2, height*0.8, height);
      this.generateLandmass(x, y, random.randInt(width * continentSizeMin, width * continentSizeMax), 'plains', continents, width);
    }

    return [this.tiles, this.heightMap];
  }

  private generateOcean(): void {
    const { width, height } = this;
    this.tiles = [];
    this.heightMap = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        this.tiles.push('ocean');
        this.heightMap.push(0);
      }
    }
  }

  private generateLandmass(x: number, y: number, radius: number, biomeTile: string, continents: number, mapWidth: number): void {
    const { random } = this;
    this.tc = 0;
    this.genPoints = [];
    this.mtCoords = [[x, y]];
    this.generateLandStep(x, y, radius, biomeTile, 'mountain');
    this.generateHeightMap(...this.mtCoords[0], Math.round(radius * 1.5), 10);
    const mtCoord = this.mtCoords.shift();
    if (random.randInt(3) === 0 && mtCoord) {
      this.riverCoords.push(mtCoord);
    }
    // const l = this.mtCoords.length;
    while (this.mtCoords.length > 0) {
      const mtCoord = this.mtCoords.shift();
      if (!mtCoord) continue;
      this.generateHeightMap(...mtCoord, radius * 3, 2);
      if (random.randInt(3) === 0 && mtCoord) {
        this.riverCoords.push(mtCoord);
      }
    }
  }

  private generateLandStep(x: number, y: number, radius: number, biomeTile: string, borderTile: string): void {
    const { width, height, random } = this;
    if (y >= 0 && y < width) {
      if (!(this.genPoints.includes(`${x}/${y}`))) {
        if (this.getTile(x, y) === biomeTile) {
          this.setTile(x, y, borderTile);
          this.mtCoords.push([x % width, y % height]);
          this.genPoints.push(`${x}/${y}`);
          if (random.randInt(radius) > 0 && this.getTile(x + 1, y) !== biomeTile) {
            this.generateLandStep(x + 1, y, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && this.getTile(x, y + 1) !== biomeTile) {
            this.generateLandStep(x, y + 1, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && this.getTile(x, y - 1) !== biomeTile) {
            this.generateLandStep(x, y - 1, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && this.getTile(x - 1, y) !== biomeTile) {
            this.generateLandStep(x - 1, y, Math.floor(radius / 3), biomeTile, borderTile);
          }
        } else {
          this.setTile(x, y, biomeTile);
          this.genPoints.push(`${x}/${y}`);
          this.tc++;
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x + 1}/${y}`))) {
            this.generateLandStep(x + 1, y, radius - 1, biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x}/${y + 1}`))) {
            this.generateLandStep(x, y + 1, radius - 1, biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x}/${y - 1}`))) {
            this.generateLandStep(x, y - 1, radius - 1, biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x - 1}/${y}`))) {
            this.generateLandStep(x - 1, y, radius - 1, biomeTile, borderTile);
          }
        }
      }
    }
  }

  private generateHeightMap(x: number, y: number, h: number, d: number): void {
    const { random } = this;
    if (y > 0 && y < this.height) {
      if (this.heightMap[this.pos(x, y)] < h) {
        this.heightMap[this.pos(x, y)] = h;
        if (h > 0) {
          this.generateHeightMap(x + 1, y, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
          this.generateHeightMap(x, y + 1, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
          this.generateHeightMap(x - 1, y, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
          this.generateHeightMap(x, y - 1, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
        }
      }
    }
  }
}
