"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldGenerator = void 0;
const random_1 = require("./random");
class WorldGenerator {
    constructor(seed, width, height) {
        this.random = new random_1.Random(seed);
        this.tiles = [];
        this.riverCoords = [];
        this.mtCoords = [];
        this.genPoints = [];
        this.width = width;
        this.height = height;
    }
    pos(x, y) {
        return (y * this.height) + x;
    }
    getTile(x, y) {
        return this.tiles[this.pos(x, y)];
    }
    setTile(x, y, tile) {
        this.tiles[this.pos(x, y)] = tile;
    }
    generate(continentSizeMin, continentSizeMax, continents) {
        const { width, height, random } = this;
        this.tiles = this.generateOcean();
        this.riverCoords = [];
        for (let i = 0; i < Math.ceil((continents / 100) * width); i++) {
            const x = random.randInt(width);
            const y = random.doubleRandInt(0, height * 0.2, height * 0.8, height);
            this.generateLandmass(x, y, random.randInt(width * continentSizeMin, width * continentSizeMax), 'plains', continents, width);
        }
        return this.tiles;
    }
    generateOcean() {
        const { width, height } = this;
        const tiles = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                tiles.push('ocean');
            }
        }
        return tiles;
    }
    generateLandmass(x, y, radius, biomeTile, continents, mapWidth) {
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
    generateLandStep(x, y, radius, biomeTile, borderTile) {
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
                }
                else {
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
exports.WorldGenerator = WorldGenerator;
//# sourceMappingURL=worldGenerator.js.map