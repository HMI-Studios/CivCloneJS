"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile = exports.Yield = void 0;
const tileMovementCostTable = {
    // tile name: [land mp, water mp] (0 = impassable)
    'plains': [1, 0],
    'desert': [1, 0],
    'ocean': [0, 1],
    'river': [3, 1],
    'mountain': [0, 0],
};
class Yield {
    constructor(params) {
        var _a, _b;
        this.food = (_a = params.food) !== null && _a !== void 0 ? _a : 0;
        this.production = (_b = params.production) !== null && _b !== void 0 ? _b : 0;
    }
    add(other) {
        return new Yield({
            food: this.food + other.food,
            production: this.production + other.production,
        });
    }
}
exports.Yield = Yield;
class Tile {
    constructor(type, tileHeight, baseYield) {
        this.movementCost = tileMovementCostTable[type];
        this.type = type;
        this.unit = null;
        this.improvement = null;
        this.discoveredBy = {};
        this.visibleTo = {};
    }
    getTileYield() {
        if (this.improvement !== null) {
            return this.baseYield.add(this.improvement.yield);
        }
        else {
            return this.baseYield;
        }
    }
    getDiscoveredData() {
        const improvementData = !this.improvement ? null : this.improvement.getData();
        return {
            type: this.type,
            movementCost: this.movementCost,
            improvement: improvementData,
            yield: this.getTileYield(),
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
//# sourceMappingURL=tile.js.map