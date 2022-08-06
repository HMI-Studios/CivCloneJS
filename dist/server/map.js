"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Map = void 0;
const city_1 = require("./city");
const tile_1 = require("./tile");
const improvement_1 = require("./improvement");
const utils_1 = require("./utils");
class Map {
    constructor(height, width, terrain, heightMap) {
        this.height = height;
        this.width = width;
        this.tiles = new Array(height * width);
        for (let i = 0; i < height * width; i++) {
            this.tiles[i] = new tile_1.Tile(terrain[i], heightMap[i], new tile_1.Yield({ food: 1, production: 1 }));
        }
        this.cities = [];
        this.updates = [];
    }
    export() {
        return {
            height: this.height,
            width: this.width,
            tiles: this.tiles.map(tile => tile.export()),
            cities: this.cities.map(city => city.export()),
        };
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
    getNeighborsCoordsRecurse({ x, y }, r, tileList) {
        if (r >= 0 && this.getTile({ x, y })) {
            tileList.push({ x, y });
            for (const coord of (0, utils_1.getAdjacentCoords)({ x, y })) {
                this.getNeighborsCoordsRecurse(coord, r - 1, tileList);
            }
        }
    }
    getNeighborsCoords(coords, r = 1, tileList = []) {
        this.getNeighborsCoordsRecurse(coords, r, tileList);
        return tileList;
    }
    getVisibleTilesCoords(unit) {
        return [unit.coords, ...this.getNeighborsCoords(unit.coords, 2)];
    }
    setTileOwner(coords, owner, overwrite) {
        var _a;
        if (!overwrite && this.getTile(coords).owner)
            return;
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
    isInBounds(coords) {
        return coords.x >= 0 && coords.x < this.width && coords.y >= 0 && coords.y < this.height;
    }
    tileUpdate(coords) {
        // if (coords.x === null && coords.y === null) return;
        const tile = this.getTile(coords);
        this.updates.push((civID) => ['tileUpdate', [coords, this.getCivTile(civID, tile)]]);
    }
    moveUnitTo(unit, coords) {
        this.getTile(unit.coords).setUnit(undefined);
        this.tileUpdate(unit.coords);
        unit.coords = coords;
        this.getTile(coords).setUnit(unit);
        this.tileUpdate(coords);
    }
    settleCityAt(coords, name, civID) {
        const tile = this.getTile(coords);
        if (tile.owner)
            return false;
        const city = new city_1.City(coords, name, civID);
        this.cities.push(city);
        for (const neighbor of this.getNeighborsCoords(coords)) {
            this.setTileOwner(neighbor, city, false);
            this.tileUpdate(neighbor);
        }
        this.buildImprovementAt(coords, 'settlement', civID);
        return true;
    }
    buildImprovementAt(coords, type, ownerID) {
        var _a;
        const tile = this.getTile(coords);
        if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) !== ownerID)
            return;
        tile.improvement = new improvement_1.Improvement(type);
        this.tileUpdate(coords);
    }
}
exports.Map = Map;
//# sourceMappingURL=map.js.map