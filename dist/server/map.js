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
    }
    pos({ x, y }) {
        return (y * this.width) + (0, utils_1.mod)(x, this.width);
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
    moveUnitTo(unit, coords) {
        if (unit.coords.x !== null && unit.coords.y !== null) {
            this.getTile(unit.coords).setUnit(null);
        }
        unit.coords = coords;
        if (coords.x !== null && coords.y !== null) {
            this.getTile(coords).setUnit(unit);
        }
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
    }
    settleCityAt(coords, name, civID) {
        let city = new city_1.City(coords, name, civID);
        this.cities.push(city);
        return city;
    }
}
exports.Map = Map;
//# sourceMappingURL=map.js.map