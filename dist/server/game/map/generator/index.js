"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldGenerator = exports.PerlinWorldGenerator = void 0;
const random_1 = require("../../../utils/random");
const simplex_noise_1 = __importDefault(require("simplex-noise"));
const biome_1 = require("./biome");
const __1 = require("..");
const tile_1 = require("../tile");
const improvement_1 = require("../tile/improvement");
const yield_1 = require("../tile/yield");
const TAU = 2 * Math.PI;
// Tile Types
const OCEAN = new biome_1.TileType('ocean', 0, {}, null, true, true);
const SHALLOW_OCEAN = new biome_1.TileType('river', 0, { food: 2 }, null, true, true);
const RIVER = new biome_1.TileType('river', 0, { food: 3 }, null, true);
const FROZEN_OCEAN = new biome_1.TileType('frozen_ocean', 0, {}, null, true, true);
const SHALLOW_FROZEN_OCEAN = new biome_1.TileType('frozen_ocean', 0, {}, null, true, true);
const FROZEN_RIVER = new biome_1.TileType('frozen_river', 0, { food: 1 }, null, true);
const GRASS_LOWLANDS = new biome_1.TileType('grass_lowlands', 1, { food: 5 }, [0.25, 'forest']);
const GRASS_PLAINS = new biome_1.TileType('plains', 2, { food: 4 }, [0.5, 'forest']);
const GRASS_HILLS = new biome_1.TileType('grass_hills', 3, { food: 4 }, [0.25, 'forest']);
const GRASS_MOUNTAINS = new biome_1.TileType('grass_mountains', 4, { food: 2 });
const TEMPERATE_FOREST_LOWLANDS = new biome_1.TileType('grass_lowlands', 1, { food: 6 }, [20, 'forest']);
const TEMPERATE_FOREST_PLAINS = new biome_1.TileType('plains', 2, { food: 5 }, [80, 'forest']);
const TEMPERATE_FOREST_HILLS = new biome_1.TileType('grass_hills', 3, { food: 5 }, [50, 'forest']);
const TEMPERATE_FOREST_MOUNTAINS = new biome_1.TileType('grass_mountains', 4, { food: 4 }, [20, 'forest']);
const DESERT_PLAINS = new biome_1.TileType('desert', 2, { food: 1 });
const DESERT_HILLS = new biome_1.TileType('desert_hills', 3, { food: 1 });
const DESERT_MOUNTAINS = new biome_1.TileType('desert_mountains', 4, {});
const SNOW_PLAINS = new biome_1.TileType('snow_plains', 2, { food: 2 });
const SNOW_HILLS = new biome_1.TileType('snow_hills', 3, { food: 2 });
const SNOW_MOUNTAINS = new biome_1.TileType('snow_mountains', 4, {});
const MOUNTAIN = new biome_1.TileType('mountain', 5, {});
const MOUNTAIN_SPRING = new biome_1.TileType('mountain', 5, {}, null, false, false, true);
class PerlinWorldGenerator {
    constructor(seed, { width, height }) {
        this.random = new random_1.Random(seed);
        this.simplex = new simplex_noise_1.default(this.random.randFloat);
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
            'plains': new biome_1.Biome(this.random, OCEAN, [
                [SEA_LEVEL, SHALLOW_OCEAN],
                [COAST_LEVEL, GRASS_LOWLANDS],
                [PLAINS_LEVEL, GRASS_PLAINS],
                [HILLS_LEVEL, new biome_1.TilePool([[GRASS_HILLS, 100], [MOUNTAIN_SPRING, 1]])],
                [HIGHLANDS_LEVEL, new biome_1.TilePool([[GRASS_MOUNTAINS, 100], [MOUNTAIN_SPRING, 1]])],
                [MOUNTAIN_LEVEL, new biome_1.TilePool([[MOUNTAIN, 20], [MOUNTAIN_SPRING, 1]])],
            ]),
            'temperate_forest': new biome_1.Biome(this.random, OCEAN, [
                [SEA_LEVEL, SHALLOW_OCEAN],
                [COAST_LEVEL, TEMPERATE_FOREST_LOWLANDS],
                [PLAINS_LEVEL, TEMPERATE_FOREST_PLAINS],
                [HILLS_LEVEL, new biome_1.TilePool([[TEMPERATE_FOREST_HILLS, 100], [MOUNTAIN_SPRING, 1]])],
                [HIGHLANDS_LEVEL, new biome_1.TilePool([[TEMPERATE_FOREST_MOUNTAINS, 100], [MOUNTAIN_SPRING, 1]])],
                [MOUNTAIN_LEVEL, new biome_1.TilePool([[MOUNTAIN, 20], [MOUNTAIN_SPRING, 1]])],
            ]),
            'tundra': new biome_1.Biome(this.random, OCEAN, [
                [SEA_LEVEL, SHALLOW_OCEAN],
                [SEA_LEVEL + 5, FROZEN_RIVER],
                [COAST_LEVEL, SNOW_PLAINS],
                [HILLS_LEVEL, SNOW_HILLS],
                [HIGHLANDS_LEVEL, SNOW_MOUNTAINS],
                [MOUNTAIN_LEVEL, MOUNTAIN],
            ]),
            'arctic': new biome_1.Biome(this.random, FROZEN_OCEAN, [
                [SEA_LEVEL, SHALLOW_FROZEN_OCEAN],
                [COAST_LEVEL, SNOW_PLAINS],
                [HILLS_LEVEL, SNOW_HILLS],
                [HIGHLANDS_LEVEL, SNOW_MOUNTAINS],
                [MOUNTAIN_LEVEL, MOUNTAIN],
            ]),
            'desert': new biome_1.Biome(this.random, OCEAN, [
                [SEA_LEVEL, SHALLOW_OCEAN],
                [COAST_LEVEL, DESERT_PLAINS],
                [HILLS_LEVEL, DESERT_HILLS],
                [HIGHLANDS_LEVEL, DESERT_MOUNTAINS],
                [MOUNTAIN_LEVEL, new biome_1.TilePool([[MOUNTAIN, 15], [MOUNTAIN_SPRING, 1]])],
            ]),
            'mild_desert': new biome_1.Biome(this.random, OCEAN, [
                [SEA_LEVEL, SHALLOW_OCEAN],
                [COAST_LEVEL, new biome_1.TilePool([[DESERT_PLAINS, 3], [GRASS_LOWLANDS, 1]])],
                [PLAINS_LEVEL, DESERT_PLAINS],
                [HILLS_LEVEL, DESERT_HILLS],
                [HIGHLANDS_LEVEL, DESERT_MOUNTAINS],
                [MOUNTAIN_LEVEL, new biome_1.TilePool([[MOUNTAIN, 15], [MOUNTAIN_SPRING, 1]])],
            ]),
        };
    }
    getBiome(temp, humidity) {
        if (temp < 5)
            return this.biomes.arctic;
        if (temp < 20)
            return this.biomes.tundra;
        if (temp < 60) {
            if (humidity < 55)
                return this.biomes.plains;
            if (humidity < 80)
                return this.biomes.temperate_forest;
            if (humidity <= 100)
                return this.biomes.plains; // TODO - swamp biome
        }
        if (temp <= 100) {
            if (humidity < 60)
                return this.biomes.desert;
            if (humidity <= 100)
                return this.biomes.mild_desert;
        }
        // Default Biome in case no match is found
        return this.biomes.plains;
    }
    getElevation(x, y) {
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
    getTemp(x, y) {
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
    getHumidity(x, y) {
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
    ridgenoise(nx, ny, freq) {
        return 2 * (0.5 - Math.abs(0.5 - this.cylindernoise(nx, ny, freq)));
    }
    cylindernoise(nx, ny, freq) {
        const angle_x = TAU * nx;
        return (this.simplex.noise3D(Math.cos(angle_x) / TAU * freq, Math.sin(angle_x) / TAU * freq, ny * freq) + 1) / 2;
    }
    generate() {
        const startTime = new Date().getTime();
        const { width, height } = this;
        const tileTypeMap = [];
        const heightMap = [];
        const riverSources = []; // change to list of Coords
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const elevation = this.getElevation(x, y);
                const temp = this.getTemp(x, y);
                const humidity = this.getHumidity(x, y);
                const tile = this.getBiome(temp, humidity).getTile(elevation);
                if (tile.isRiverGen)
                    riverSources.push([x, y]);
                tileTypeMap.push(tile);
                heightMap.push(elevation);
            }
        }
        for (const [x, y] of riverSources) {
            const river = new biome_1.River(x, y, this.width);
            river.generate(tileTypeMap, heightMap, RIVER);
        }
        const map = new __1.Map(height, width);
        let i = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = new tile_1.Tile(tileTypeMap[i].type, heightMap[i], new yield_1.Yield(tileTypeMap[i].yieldParams));
                const vegetation = tileTypeMap[i].getVegetation(this.random);
                if (vegetation)
                    tile.improvement = new improvement_1.Improvement(vegetation);
                map.setTile({ x, y }, tile);
                i++;
            }
        }
        console.log(`Map generation completed in ${new Date().getTime() - startTime}ms.`);
        return map;
    }
}
exports.PerlinWorldGenerator = PerlinWorldGenerator;
class WorldGenerator {
    constructor(seed, width, height) {
        this.random = new random_1.Random(seed);
        this.tiles = [];
        this.heightMap = [];
        this.riverCoords = [];
        this.mtCoords = [];
        this.genPoints = [];
        this.width = width;
        this.height = height;
    }
    pos(x, y) {
        return (y * this.width) + x;
    }
    getTile(x, y) {
        return this.tiles[this.pos(x, y)];
    }
    setTile(x, y, tile) {
        this.tiles[this.pos(x, y)] = tile;
    }
    generate(continentSizeMin, continentSizeMax, continents) {
        const { width, height, random } = this;
        this.generateOcean();
        this.riverCoords = [];
        for (let i = 0; i < Math.ceil((continents / 100) * width); i++) {
            const x = random.randInt(width);
            const y = random.doubleRandInt(0, height * 0.2, height * 0.8, height);
            this.generateLandmass(x, y, random.randInt(width * continentSizeMin, width * continentSizeMax), 'plains', continents, width);
        }
        return [this.tiles, this.heightMap];
    }
    generateOcean() {
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
    generateLandmass(x, y, radius, biomeTile, continents, mapWidth) {
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
            if (!mtCoord)
                continue;
            this.generateHeightMap(...mtCoord, radius * 3, 2);
            if (random.randInt(3) === 0 && mtCoord) {
                this.riverCoords.push(mtCoord);
            }
        }
    }
    generateLandStep(x, y, radius, biomeTile, borderTile) {
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
                }
                else {
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
    generateHeightMap(x, y, h, d) {
        const { random } = this;
        if (y > 0 && y < this.height) {
            if (this.heightMap[this.pos(x, y)] < h) {
                this.heightMap[this.pos(x, y)] = h;
                if (h > 0) {
                    this.generateHeightMap(x + 1, y, h - (random.randInt(Math.ceil(h / d)) + 1), d);
                    this.generateHeightMap(x, y + 1, h - (random.randInt(Math.ceil(h / d)) + 1), d);
                    this.generateHeightMap(x - 1, y, h - (random.randInt(Math.ceil(h / d)) + 1), d);
                    this.generateHeightMap(x, y - 1, h - (random.randInt(Math.ceil(h / d)) + 1), d);
                }
            }
        }
    }
}
exports.WorldGenerator = WorldGenerator;
//# sourceMappingURL=index.js.map