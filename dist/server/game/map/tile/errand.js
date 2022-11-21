"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkErrand = exports.ErrandType = void 0;
const improvement_1 = require("./improvement");
const yield_1 = require("./yield");
var ErrandType;
(function (ErrandType) {
    ErrandType[ErrandType["CONSTRUCTION"] = 0] = "CONSTRUCTION";
    // MILITARY,
    // CIVILLIAN,
    // RESEARCH,
    // CULTURE,
})(ErrandType = exports.ErrandType || (exports.ErrandType = {}));
class WorkErrand {
    constructor(parentStorage, action) {
        this.cost = WorkErrand.errandCostTable[action.type][action.option];
        this.parentStorage = parentStorage;
        this.storedThisTurn = new yield_1.ResourceStore({});
        this.parentStorage.setCapacity(this.cost);
        this.completed = false;
        this.action = action;
    }
    export() {
        return {
            cost: this.cost,
            storedThisTurn: this.storedThisTurn,
            completed: this.completed,
            action: this.action,
        };
    }
    static import(parentStorage, data) {
        const errand = new WorkErrand(parentStorage, data.action);
        const storageCap = data.storedThisTurn.capacity;
        delete data.storedThisTurn.capacity;
        errand.storedThisTurn = new yield_1.ResourceStore(storageCap).incr(data.storedThisTurn);
        errand.completed = data.completed;
        return errand;
    }
    getData() {
        return {
            storedThisTurn: this.storedThisTurn,
            turnsToCompletion: this.cost.sub(this.parentStorage.sub(this.storedThisTurn)).div(this.storedThisTurn),
        };
    }
    complete(tile) {
        WorkErrand.errandActionEffects[this.action.type](tile, this.action);
    }
}
exports.WorkErrand = WorkErrand;
WorkErrand.errandCostTable = {
    [ErrandType.CONSTRUCTION]: {
        'encampment': new yield_1.Yield({ production: 2 }),
        'farm': new yield_1.Yield({ production: 10 }),
    },
};
WorkErrand.errandActionEffects = {
    [ErrandType.CONSTRUCTION]: (tile, action) => {
        delete tile.improvement;
        tile.improvement = new improvement_1.Improvement(action.option, tile.baseYield);
    }
};
//# sourceMappingURL=errand.js.map