"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Biome = exports.TilePool = exports.TileType = void 0;
class TileType {
    constructor(type, heightClass, isWater = false, isRiverGen = false) {
        this.type = type;
        this.isMountain = (heightClass === 5);
        this.isWater = isWater;
        this.isRiverGen = isRiverGen;
        this.heightClass = heightClass;
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
        console.log(this.tileWeights);
    }
    resolve(random) {
        const targetWeight = random.randInt(this.weightRange);
        let resultTile;
        for (const [tile, weight] of this.tileWeights) {
            resultTile = tile;
            if (weight > targetWeight) {
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