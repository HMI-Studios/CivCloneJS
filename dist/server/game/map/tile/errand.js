"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkErrand = exports.ErrandType = void 0;
const improvement_1 = require("./improvement");
const knowledge_1 = require("./knowledge");
const unit_1 = require("./unit");
const yield_1 = require("./yield");
var ErrandType;
(function (ErrandType) {
    ErrandType[ErrandType["CONSTRUCTION"] = 0] = "CONSTRUCTION";
    ErrandType[ErrandType["UNIT_TRAINING"] = 1] = "UNIT_TRAINING";
    ErrandType[ErrandType["RESEARCH"] = 2] = "RESEARCH";
    // CULTURE,
})(ErrandType = exports.ErrandType || (exports.ErrandType = {}));
class WorkErrand {
    constructor(parentStorage, action) {
        this.cost = WorkErrand.errandCostTable[action.type][action.option];
        this.parentStorage = parentStorage;
        this.storedThisTurn = new yield_1.ResourceStore({});
        this.parentStorage.setCapacity(yield_1.Yield.max(this.cost, this.parentStorage.capacity));
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
    complete(world, map, tile) {
        WorkErrand.errandActionEffects[this.action.type](world, map, tile, this.action);
    }
}
exports.WorkErrand = WorkErrand;
WorkErrand.errandCostTable = {
    [ErrandType.CONSTRUCTION]: {
        'encampment': new yield_1.Yield({ production: 1 }),
        'campus': new yield_1.Yield({ production: 1 }),
        'farm': new yield_1.Yield({ production: 10 }),
    },
    [ErrandType.UNIT_TRAINING]: unit_1.Unit.costTable,
    [ErrandType.RESEARCH]: knowledge_1.Knowledge.getCosts(),
};
WorkErrand.errandActionEffects = {
    [ErrandType.CONSTRUCTION]: (world, map, tile, action) => {
        delete tile.improvement;
        tile.improvement = new improvement_1.Improvement(action.option, tile.baseYield);
    },
    [ErrandType.UNIT_TRAINING]: (world, map, tile, action) => {
        if (!(tile.owner && action.location))
            return;
        const newUnit = new unit_1.Unit(action.option, tile.owner.civID, action.location);
        if (tile.unit) {
            // if there is already a unit on this tile, we must figure something else out
        }
        else {
            world.addUnit(newUnit);
        }
    },
    [ErrandType.RESEARCH]: (world, map, tile, action) => {
        tile.addKnowledge(knowledge_1.Knowledge.knowledgeTree[action.option], 100, 0);
    },
};
//# sourceMappingURL=errand.js.map