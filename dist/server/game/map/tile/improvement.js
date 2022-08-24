"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worksite = exports.Improvement = void 0;
const yield_1 = require("./yield");
const improvementYieldTable = {
    'settlement': new yield_1.Yield({ food: 2, production: 2 }),
    'farm': new yield_1.Yield({ food: 1 }),
    'forest': new yield_1.Yield({ food: 1 }),
};
const constructionCostTable = {
    'farm': new yield_1.Yield({ production: 10 }),
};
class Improvement {
    constructor(type, metadata) {
        var _a;
        this.type = type;
        this.pillaged = false;
        this.yield = (_a = improvementYieldTable[type]) !== null && _a !== void 0 ? _a : new yield_1.Yield({});
        this.metadata = metadata;
        this.storage = new yield_1.ResourceStore({});
        this.traders = [];
    }
    getData() {
        return {
            type: this.type,
            pillaged: this.pillaged,
            storage: this.storage,
        };
    }
    work(baseYield) {
        // TODO - ADD POPULATION/COST CHECK
        const totalYield = this.yield.add(baseYield);
        this.storage.cap();
        let traderCount = this.traders.length;
        for (const trader of this.traders) {
            const traderShare = totalYield.div(traderCount);
            const surplus = trader.store(traderShare);
            totalYield.decr(traderShare.decr(surplus));
            traderCount--;
        }
        this.storage.incr(totalYield);
    }
    store(resources) {
        this.storage.incr(resources);
    }
    subscribeTrader(trader) {
        this.traders.push(trader);
    }
}
exports.Improvement = Improvement;
class Worksite extends Improvement {
    constructor(options) {
        super('worksite', options);
        this.cost = constructionCostTable[options.type];
    }
    getData() {
        return Object.assign(Object.assign({}, super.getData()), { metadata: {
                type: this.metadata.type,
            } });
    }
    work(baseYield) {
        // TODO - ACTUAL WORK HERE
        super.work(baseYield);
    }
}
exports.Worksite = Worksite;
//# sourceMappingURL=improvement.js.map