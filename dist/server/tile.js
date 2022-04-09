"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile = void 0;
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
//# sourceMappingURL=tile.js.map