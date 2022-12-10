"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Map = void 0;
const unit_1 = require("./tile/unit");
const city_1 = require("./tile/city");
const tile_1 = require("./tile");
const improvement_1 = require("./tile/improvement");
const utils_1 = require("../../utils");
const trade_1 = require("./trade");
const yield_1 = require("./tile/yield");
const errand_1 = require("./tile/errand");
// MAGIC NUMBER CONSTANTS - TODO GET RID OF THESE!
const TRADER_SPEED = 1;
const TRADER_CAPACITY = {
    food: 10,
    production: 10,
};
class Map {
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.tiles = new Array(height * width);
        this.cities = [];
        this.traders = [];
        this.updates = [];
    }
    export() {
        return {
            height: this.height,
            width: this.width,
            tiles: this.tiles.map(tile => tile.export()),
            cities: this.cities.map(city => city.export()),
            traders: this.traders.map(trader => trader.export()),
        };
    }
    static import(data) {
        const map = new Map(data.height, data.width);
        map.tiles = data.tiles.map(tileData => tile_1.Tile.import(tileData));
        map.cities = data.cities.map(cityData => {
            const city = city_1.City.import(cityData);
            const set = city.getTiles();
            for (const coords of set) {
                map.setTileOwner(coords, city, false);
            }
            return city;
        });
        map.traders = data.traders.map(traderData => trade_1.Trader.import(map, traderData));
        return map;
    }
    pos({ x, y }) {
        return (y * this.width) + (0, utils_1.mod)(x, this.width);
    }
    coords(pos) {
        return {
            x: (0, utils_1.mod)(pos, this.width),
            y: Math.floor(pos / this.width),
        };
    }
    getUpdates() {
        return this.updates.splice(0);
    }
    getTile(coords) {
        return this.tiles[this.pos(coords)];
    }
    setTile(coords, tile) {
        this.tiles[this.pos(coords)] = tile;
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
    getPathTree(srcPos, range, mode) {
        // BFS to find all tiles within `range` steps
        const queue = [];
        queue.push(srcPos);
        const dst = {};
        dst[this.pos(srcPos)] = 0;
        const paths = {};
        while (queue.length) {
            const atPos = queue.shift();
            for (const adjPos of this.getNeighborsCoords(atPos)) {
                const tile = this.getTile(adjPos);
                // PATH BLOCKING LOGIC HERE
                // if (tile.unit && tile.unit.civID === this.player.civID) continue;
                const movementCost = mode !== unit_1.MovementClass.AIR ? tile.movementCost[mode] || Infinity : 1;
                if (!(this.pos(adjPos) in dst) || dst[this.pos(adjPos)] > dst[this.pos(atPos)] + movementCost) {
                    dst[this.pos(adjPos)] = dst[this.pos(atPos)] + movementCost;
                    if (dst[this.pos(adjPos)] <= range) {
                        paths[this.pos(adjPos)] = atPos;
                        queue.push(adjPos);
                    }
                }
            }
        }
        return [paths, dst];
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
    getCivTraders(civID) {
        return this.traders.filter((trader) => trader.civID === civID).map(trader => trader.getData());
    }
    setTileVisibility(civID, coords, visible) {
        this.getTile(coords).setVisibility(civID, visible);
        this.tileUpdate(coords);
    }
    isInBounds({ x, y }) {
        return (0, utils_1.mod)(x, this.width) >= 0 && (0, utils_1.mod)(x, this.width) < this.width && y >= 0 && y < this.height;
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
    addTrader(trader) {
        this.traders.push(trader);
    }
    findPath(pathTree, srcPosKey, target) {
        if (srcPosKey in pathTree) {
            if (this.pos(pathTree[srcPosKey]) === this.pos(target)) {
                return [target];
            }
            else {
                const subPath = this.findPath(pathTree, this.pos(pathTree[srcPosKey]), target);
                if (!subPath)
                    return null;
                return [pathTree[srcPosKey], ...subPath];
            }
        }
        else {
            return null;
        }
    }
    findRoute(pathTree, dst, srcPosKey, target) {
        const srcCoords = this.coords(srcPosKey);
        const path = this.findPath(pathTree, srcPosKey, target);
        if (!path)
            return null;
        const fullPath = [srcCoords].concat(path);
        /***
         * Routes *must* guarantee that *both* the source and target tiles are included within the path,
         * unlike normal paths which only include the target. To guarantee this, the Route cannot be
         * returned if the expected source and target tiles are not the same as those on the path.
         */
        const [srcTile, targetTile] = [this.getTile(srcCoords), this.getTile(target)];
        if (!(srcTile === this.getTile(fullPath[0]) && targetTile === this.getTile(path[path.length - 1])))
            return null;
        return [fullPath, dst[srcPosKey]];
    }
    createTradeRoutes(civID, coords, sink, requirement, range = 5, mode = 0) {
        var _a;
        const [pathTree, dst] = this.getPathTree(coords, range, mode);
        const posKeys = Object.keys(dst).sort((a, b) => {
            if (dst[a] > dst[b])
                return 1;
            else
                return -1;
        });
        for (const pos of posKeys) {
            const tile = this.tiles[pos];
            if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) === civID && tile.canSupply(requirement)) {
                const route = this.findRoute(pathTree, dst, Number(pos), coords);
                if (!route)
                    continue;
                this.addTrader(new trade_1.Trader(civID, route, tile.improvement, sink, TRADER_SPEED, yield_1.Yield.min(TRADER_CAPACITY, requirement)));
            }
        }
    }
    canSettleOn(tile) {
        return (!tile.owner &&
            tile.type !== 'ocean' &&
            tile.type !== 'frozen_ocean' &&
            tile.type !== 'mountain' &&
            tile.type !== 'coastal' &&
            tile.type !== 'frozen_coastal' &&
            tile.type !== 'river');
    }
    settleCityAt(coords, name, civID) {
        const tile = this.getTile(coords);
        if (!this.canSettleOn(tile))
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
    startConstructionAt(coords, improvementType, ownerID) {
        var _a;
        const tile = this.getTile(coords);
        if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) !== ownerID)
            return;
        tile.improvement = new improvement_1.Improvement('worksite', tile.baseYield);
        tile.improvement.startErrand({
            type: errand_1.ErrandType.CONSTRUCTION,
            option: improvementType,
        });
        this.createTradeRoutes(ownerID, coords, tile.improvement, tile.improvement.errand.cost);
        this.tileUpdate(coords);
    }
    canBuildOn(tile) {
        return (tile.type !== 'ocean' &&
            tile.type !== 'frozen_ocean' &&
            tile.type !== 'mountain');
    }
    buildImprovementAt(coords, type, ownerID) {
        var _a;
        const tile = this.getTile(coords);
        if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) !== ownerID)
            return;
        if (!this.canBuildOn(tile))
            return;
        tile.improvement = new improvement_1.Improvement(type, tile.baseYield);
        this.tileUpdate(coords);
    }
    trainUnitAt(coords, unitType, ownerID) {
        var _a;
        const tile = this.getTile(coords);
        if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) === ownerID && tile.improvement) {
            if (tile.getTrainableUnitTypes().includes(unitType)) {
                if (!tile.improvement.errand) {
                    // TODO - maybe change this in the future, to where new training errands overwrite old ones?
                    // That would require gracefully closing the previous errands though, so that is for later.
                    tile.improvement.startErrand({
                        type: errand_1.ErrandType.UNIT_TRAINING,
                        option: unitType,
                        location: coords,
                    });
                    this.createTradeRoutes(ownerID, coords, tile.improvement, tile.improvement.errand.cost);
                }
            }
        }
        this.tileUpdate(coords);
    }
    researchKnowledgeAt(coords, knowledgeName, ownerID) {
        var _a;
        const tile = this.getTile(coords);
        if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) === ownerID && tile.improvement) {
            // Note that this check technically allows the client to "cheat": research errands can begin without
            // the prerequesites having been fulfilled. These errands will simply do nothing when completed.
            if (tile.improvement.getResearchableKnowledgeNames().includes(knowledgeName)) {
                // TODO - change this in the future, to where new research errands overwrite old ones?
                // That would require gracefully closing the previous errands though, so that is for later.
                if (!tile.improvement.errand) {
                    tile.improvement.startErrand({
                        type: errand_1.ErrandType.RESEARCH,
                        option: knowledgeName,
                        location: coords,
                    });
                    this.createTradeRoutes(ownerID, coords, tile.improvement, tile.improvement.errand.cost);
                }
            }
        }
        this.tileUpdate(coords);
    }
    turn(world) {
        var _a;
        for (const tile of this.tiles) {
            if (tile.improvement) {
                tile.improvement.work();
                if ((_a = tile.improvement.errand) === null || _a === void 0 ? void 0 : _a.completed) {
                    tile.improvement.errand.complete(world, this, tile);
                    delete tile.improvement.errand;
                }
            }
        }
        for (let i = 0; i < this.traders.length; i++) {
            const trader = this.traders[i];
            trader.shunt();
            if (trader.expired) {
                this.traders.splice(i, 1);
                i--;
            }
        }
    }
}
exports.Map = Map;
//# sourceMappingURL=index.js.map