"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkErrand = exports.Improvement = void 0;
const yield_1 = require("./yield");
const improvementYieldTable = {
    'settlement': new yield_1.Yield({ food: 2, production: 2 }),
    'farm': new yield_1.Yield({ food: 1 }),
    'forest': new yield_1.Yield({ food: 1 }),
};
const improvementStoreCapTable = {
    'settlement': { food: 20, production: 2 },
    'farm': { food: 20 },
};
const constructionCostTable = {
    'farm': new yield_1.Yield({ production: 10 }),
};
const naturalImprovementTable = {
    'forest': true,
};
class Improvement {
    constructor(type, baseYield, metadata) {
        var _a, _b;
        this.type = type;
        this.pillaged = false;
        this.isNatural = naturalImprovementTable[type];
        this.yield = baseYield.add((_a = improvementYieldTable[type]) !== null && _a !== void 0 ? _a : new yield_1.Yield({}));
        this.metadata = metadata;
        this.storage = new yield_1.ResourceStore((_b = improvementStoreCapTable[type]) !== null && _b !== void 0 ? _b : {});
        this.traders = [];
        this.suppliers = [];
        if (this.isNatural) {
            this.yield = new yield_1.Yield({});
        }
        else if (type === 'worksite') {
            this.yield = new yield_1.Yield({});
            this.errand = new WorkErrand(constructionCostTable[metadata.type], this.storage, metadata.onCompletion);
        }
    }
    getData() {
        var _a;
        return {
            type: this.type,
            pillaged: this.pillaged,
            storage: this.storage,
            errand: (_a = this.errand) === null || _a === void 0 ? void 0 : _a.getData(),
        };
    }
    work() {
        // TODO - ADD POPULATION/COST CHECK
        // if (type === 'farm') {
        // }
        if (this.errand) {
            if (this.storage.fulfills(this.errand.cost)) {
                this.errand.completed = true;
                for (const supplier of this.suppliers) {
                    supplier.expire();
                }
                this.errand.onCompletion(this);
            }
            this.errand.storedThisTurn.reset();
        }
        let traderCount = this.traders.length;
        for (let i = 0; i < this.traders.length; i++) {
            const trader = this.traders[i];
            if (trader.expired) {
                this.traders.splice(i, 1);
                i--;
                traderCount--;
                continue;
            }
            const traderShare = this.storage.divNumber(traderCount);
            const surplus = trader.store(traderShare);
            this.storage.decr(traderShare.decr(surplus));
            traderCount--;
        }
        this.storage.incr(this.yield);
        this.storage.cap();
    }
    store(resources) {
        var _a;
        this.storage.incr(resources);
        (_a = this.errand) === null || _a === void 0 ? void 0 : _a.storedThisTurn.incr(resources);
    }
    subscribeTrader(trader) {
        this.traders.push(trader);
    }
    subscribeSupplier(trader) {
        this.suppliers.push(trader);
    }
}
exports.Improvement = Improvement;
class WorkErrand {
    constructor(cost, parentStorage, onCompletion) {
        this.cost = cost;
        this.parentStorage = parentStorage;
        this.storedThisTurn = new yield_1.ResourceStore({});
        this.parentStorage.setCapacity(this.cost);
        this.completed = false;
        this.onCompletion = onCompletion;
    }
    getData() {
        return {
            storedThisTurn: this.storedThisTurn,
            turnsToCompletion: this.cost.sub(this.parentStorage.sub(this.storedThisTurn)).div(this.storedThisTurn),
        };
    }
}
exports.WorkErrand = WorkErrand;
//# sourceMappingURL=improvement.js.map