"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile = exports.Map = void 0;
class Map {
    constructor(height, width, terrain) {
        this.height = height;
        this.width = width;
        this.tiles = new Array(height * width);
        for (let i = 0; i < height * width; i++) {
            this.tiles[i] = new Tile(terrain[i]);
        }
    }
    pos({ x, y }) {
        return y * this.width + x;
    }
    mod(a, b) {
        if (a >= 0) {
            return a % b;
        }
        else {
            return ((a % b) + b) % b;
        }
    }
    getTile(coords) {
        return this.tiles[this.pos(coords)];
    }
    getNeighbors({ x, y }, r, tileList = [], isTop = true) {
        if (r > 0 && this.tiles[this.pos({ x, y })]) {
            tileList.push(this.tiles[this.pos({ x, y })]);
            if (this.mod(x, 2) === 1) {
                this.getNeighbors({ x: x, y: y + 1 }, r - 1, tileList, false);
                this.getNeighbors({ x: x + 1, y: y + 1 }, r - 1, tileList, false);
                this.getNeighbors({ x: x + 1, y: y }, r - 1, tileList, false);
                this.getNeighbors({ x: x, y: y - 1 }, r - 1, tileList, false);
                this.getNeighbors({ x: x - 1, y: y }, r - 1, tileList, false);
                this.getNeighbors({ x: x - 1, y: y + 1 }, r - 1, tileList, false);
            }
            else {
                this.getNeighbors({ x: x, y: y + 1 }, r - 1, tileList, false);
                this.getNeighbors({ x: x + 1, y: y }, r - 1, tileList, false);
                this.getNeighbors({ x: x + 1, y: y - 1 }, r - 1, tileList, false);
                this.getNeighbors({ x: x, y: y - 1 }, r - 1, tileList, false);
                this.getNeighbors({ x: x - 1, y: y - 1 }, r - 1, tileList, false);
                this.getNeighbors({ x: x - 1, y: y }, r - 1, tileList, false);
            }
        }
        if (isTop) {
            return tileList;
        }
    }
    moveUnitTo(unit, coords) {
        if (unit.coords.x !== null && unit.coords.y !== null) {
            this.tiles[this.pos(unit.coords)].setUnit(null);
        }
        unit.coords = coords;
        if (coords.x !== null && coords.y !== null) {
            this.tiles[this.pos(coords)].setUnit(unit);
        }
    }
    getCivTile(civID, tile) {
        if (tile.discoveredBy[civID]) {
            if (tile.visibleTo[civID]) {
                return tile.getVisibleData();
            }
            else {
                return tile.getDiscoveredData();
            }
        }
        else {
            return null;
        }
    }
    getCivMap(civID) {
        return this.tiles.map((tile) => {
            return this.getCivTile(civID, tile);
        });
    }
    setTileVisibility(civID, coords, visible) {
        this.tiles[this.pos(coords)].setVisibility(civID, visible);
    }
}
exports.Map = Map;
const tileMovementCostTable = {
    // tile name: [land mp, water mp] (0 = impassable)
    'plains': [1, 0],
    'desert': [1, 0],
    'ocean': [0, 1],
    'river': [3, 1],
    'mountain': [0, 0],
};
class Tile {
    constructor(type) {
        this.type = type;
        this.improvement = null;
        this.unit = null;
        this.discoveredBy = {};
        this.visibleTo = {};
        this.movementCost = tileMovementCostTable[type];
    }
    getDiscoveredData() {
        return {
            type: this.type,
            improvement: this.improvement,
            movementCost: this.movementCost,
        };
    }
    getVisibleData() {
        const unitData = !this.unit ? null : this.unit.getData();
        return Object.assign(Object.assign({}, this.getDiscoveredData()), { unit: unitData, visible: true });
    }
    getMovementCost(unit) {
        const mode = unit.getMovementClass();
        return mode > -1 ? this.movementCost[mode] || Infinity : 1;
    }
    setUnit(unit) {
        this.unit = unit;
    }
    setVisibility(civID, visible) {
        if (visible) {
            this.visibleTo[civID]++;
        }
        else {
            this.visibleTo[civID]--;
        }
        if (visible && !this.discoveredBy[civID]) {
            this.discoveredBy[civID] = true;
        }
    }
    clearVisibility(civID) {
        this.visibleTo[civID] = 0;
    }
}
exports.Tile = Tile;
//# sourceMappingURL=map.js.map