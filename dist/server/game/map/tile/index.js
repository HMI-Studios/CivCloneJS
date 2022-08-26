"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile = void 0;
const tileMovementCostTable = {
    // tile name: [land mp, water mp] (0 = impassable)
    'ocean': [0, 1],
    'frozen_ocean': [0, 0],
    'river': [4, 1],
    'frozen_river': [3, 0],
    'grass_lowlands': [1, 0],
    'plains': [1, 0],
    'grass_hills': [2, 0],
    'grass_mountains': [4, 0],
    'desert': [1, 0],
    'desert_hills': [3, 0],
    'desert_mountains': [4, 0],
    'snow_plains': [2, 0],
    'snow_hills': [3, 0],
    'snow_mountains': [5, 0],
    'mountain': [0, 0],
};
class Tile {
    constructor(type, tileHeight, baseYield) {
        this.movementCost = tileMovementCostTable[type];
        this.type = type;
        this.elevation = tileHeight;
        this.unit = undefined;
        this.improvement = undefined;
        this.owner = undefined;
        this.discoveredBy = {};
        this.visibleTo = {};
        this.baseYield = baseYield;
    }
    export() {
        var _a;
        return {
            // movementCost: this.movementCost,
            type: this.type,
            elevation: this.elevation,
            unit: (_a = this.unit) === null || _a === void 0 ? void 0 : _a.export(),
            improvement: this.improvement,
            // owner: this.owner?,
            discoveredBy: this.discoveredBy,
            // visibleTo: { [civID: number]: number },
            baseYield: this.baseYield,
        };
    }
    getTileYield() {
        if (this.improvement) {
            return this.baseYield.add(this.improvement.yield);
        }
        else {
            return this.baseYield;
        }
    }
    getDiscoveredData() {
        var _a, _b;
        return {
            type: this.type,
            movementCost: this.movementCost,
            improvement: (_a = this.improvement) === null || _a === void 0 ? void 0 : _a.getData(),
            owner: (_b = this.owner) === null || _b === void 0 ? void 0 : _b.getData(),
            yield: this.getTileYield(),
            elevation: this.elevation,
        };
    }
    getVisibleData() {
        var _a;
        return Object.assign(Object.assign({}, this.getDiscoveredData()), { unit: (_a = this.unit) === null || _a === void 0 ? void 0 : _a.getData(), visible: true });
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
    canSupply(requirement) {
        return !!this.improvement && (this.improvement.yield.add(this.baseYield).canSupply(requirement));
    }
}
exports.Tile = Tile;
//# sourceMappingURL=index.js.map