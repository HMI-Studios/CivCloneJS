"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Map = void 0;
const city_1 = require("./city");
const tile_1 = require("./tile");
const utils_1 = require("./utils");
class Map {
    constructor(height, width, terrain, heightMap) {
        this.height = height;
        this.width = width;
        this.tiles = new Array(height * width);
        for (let i = 0; i < height * width; i++) {
            this.tiles[i] = new tile_1.Tile(terrain[i], heightMap[i], new tile_1.Yield({ food: 1, production: 1 }));
        }
        this.updates = [];
    }
    pos({ x, y }) {
        return (y * this.width) + (0, utils_1.mod)(x, this.width);
    }
    getUpdates() {
        return this.updates.splice(0);
    }
    getTile(coords) {
        return this.tiles[this.pos(coords)];
    }
    getNeighborsCoords({ x, y }, r = 1, tileList = [], isTop = true) {
        if (r > 0 && this.getTile({ x, y })) {
            tileList.push({ x, y });
            for (const coord of (0, utils_1.getAdjacentCoords)({ x, y })) {
                this.getNeighborsCoords(coord, r - 1, tileList, false);
            }
        }
        if (isTop) {
            return tileList;
        }
    }
    getVisibleTilesCoords(unit) {
        return [unit.coords, ...this.getNeighborsCoords(unit.coords, 3)];
    }
    setTileOwner(coords, owner) {
        var _a;
        (_a = this.getTile(coords).owner) === null || _a === void 0 ? void 0 : _a.removeTile(coords);
        this.getTile(coords).owner = owner;
        owner.addTile(coords);
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
        this.getTile(coords).setVisibility(civID, visible);
        this.tileUpdate(coords);
    }
    tileUpdate(coords) {
        if (coords.x === null && coords.y === null)
            return;
        const tile = this.getTile(coords);
        this.updates.push((civID) => ['tileUpdate', [coords, this.getCivTile(civID, tile)]]);
    }
    moveUnitTo(unit, coords) {
        if (unit.coords.x !== null && unit.coords.y !== null) {
            this.getTile(unit.coords).setUnit(null);
            this.tileUpdate(unit.coords);
        }
        unit.coords = coords;
        if (coords.x !== null && coords.y !== null) {
            this.getTile(coords).setUnit(unit);
            this.tileUpdate(coords);
        }
    }
    settleCityAt(coords, name, civID) {
        const city = new city_1.City(coords, name, civID);
        this.cities.push(city);
        for (const neighbor of this.getNeighborsCoords(coords)) {
            this.setTileOwner(neighbor, city);
            this.tileUpdate(neighbor);
        }
        this.tileUpdate(coords);
    }
}
exports.Map = Map;
//# sourceMappingURL=map.js.map