"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Biome = exports.River = exports.TilePool = exports.TileType = void 0;
const utils_1 = require("./utils");
class TileType {
    constructor(type, heightClass, vegetation = null, isWater = false, isOcean = false, isRiverGen = false) {
        this.type = type;
        this.vegetation = vegetation !== null && vegetation !== void 0 ? vegetation : [0, null];
        this.isMountain = (heightClass === 5);
        this.isWater = isWater;
        this.isOcean = isOcean;
        this.isRiverGen = isRiverGen;
        this.heightClass = heightClass;
    }
    getVegetation(random) {
        return (random.randFloat(100) < this.vegetation[0]) ? this.vegetation[1] : null;
    }
}
exports.TileType = TileType;
class TilePool {
    constructor(tileWeights) {
        this.tileWeights = [];
        let sum = 0;
        for (const [tile, weight] of tileWeights) {
            this.tileWeights.push([tile, weight + sum]);
            sum += weight;
        }
        this.weightRange = sum;
    }
    resolve(random) {
        const targetWeight = random.randFloat(this.weightRange);
        let resultTile;
        for (const [tile, weight] of this.tileWeights) {
            resultTile = tile;
            if (weight >= targetWeight) {
                break;
            }
        }
        if (resultTile) {
            return resultTile;
        }
        else {
            throw `Broken Tile Pool: ${this.tileWeights}`;
        }
    }
}
exports.TilePool = TilePool;
class River {
    constructor(x, y, width) {
        [this.x, this.y] = [x, y];
        this.mapWidth = width;
    }
    // FIXME
    pos({ x, y }) {
        return (y * this.mapWidth) + x;
    }
    flood(pos, waterLevels, tileTypeMap, riverLen, prevPos, riverTileType) {
        const MAX_RIVER_LEN = this.mapWidth * 2;
        if (tileTypeMap[this.pos(pos)].isOcean)
            return;
        if (tileTypeMap[this.pos(pos)].isRiverGen)
            return;
        const adjCoords = (0, utils_1.getAdjacentCoords)(pos);
        let greatestDiff = 0;
        let greatestDiffCoords;
        for (const coords of adjCoords) {
            const diff = waterLevels[this.pos(pos)] - waterLevels[this.pos(coords)];
            if (diff > greatestDiff && coords.x !== prevPos.x && coords.y !== prevPos.y) {
                greatestDiff = diff;
                greatestDiffCoords = coords;
            }
        }
        if (greatestDiffCoords) {
            tileTypeMap[this.pos(pos)] = riverTileType;
            if (riverLen < MAX_RIVER_LEN)
                this.flood(greatestDiffCoords, waterLevels, tileTypeMap, riverLen + 1, pos, riverTileType);
        }
        else {
            waterLevels[this.pos(pos)]++;
            if (riverLen < MAX_RIVER_LEN)
                this.flood(pos, waterLevels, tileTypeMap, riverLen + 1, prevPos, riverTileType);
        }
    }
    generate(tileTypeMap, heightMap, riverTileType) {
        const waterLevels = [...heightMap];
        const startPos = { x: this.x, y: this.y };
        const adjCoords = (0, utils_1.getAdjacentCoords)(startPos);
        let greatestDiff = 0;
        let greatestDiffCoords;
        for (const coords of adjCoords) {
            const diff = waterLevels[this.pos(startPos)] - waterLevels[this.pos(coords)];
            if (diff > greatestDiff) {
                greatestDiff = diff;
                greatestDiffCoords = coords;
            }
        }
        if (greatestDiffCoords) {
            this.flood(greatestDiffCoords, waterLevels, tileTypeMap, 1, startPos, riverTileType);
        }
        // let riverLen = 0;
        // // while (riverLen < MAX_RIVER_LEN) {
        //   riverLen++;
        // }
    }
}
exports.River = River;
class Biome {
    constructor(random, oceanTile, tileLevels) {
        this.oceanTile = oceanTile;
        this.tileLevels = tileLevels;
        this.random = random;
    }
    getTile(elevation) {
        let resultTile = this.oceanTile;
        for (const [level, tile] of this.tileLevels) {
            if (elevation > level) {
                if (tile instanceof TileType)
                    resultTile = tile;
                else
                    resultTile = tile.resolve(this.random);
            }
            else {
                break;
            }
        }
        return resultTile;
    }
}
exports.Biome = Biome;
//# sourceMappingURL=biome.js.map