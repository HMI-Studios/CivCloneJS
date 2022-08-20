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
    'farm': { production: 10 },
};
class Improvement {
    constructor(type, metadata) {
        var _a;
        this.type = type;
        this.pillaged = false;
        this.yield = (_a = improvementYieldTable[type]) !== null && _a !== void 0 ? _a : {};
        this.metadata = metadata;
    }
    getData() {
        return {
            type: this.type,
            pillaged: this.pillaged,
        };
    }
}
exports.Improvement = Improvement;
class Worksite extends Improvement {
    constructor(options) {
        super('worksite', options);
        this.cost = constructionCostTable[options.type];
        this.collected = Object.keys(this.cost).reduce((acc, key) => acc[key] = 0, {});
    }
    getData() {
        return {
            type: this.type,
            pillaged: this.pillaged,
            metadata: {
                type: this.metadata.type,
                collected: this.collected,
            }
        };
    }
}
exports.Worksite = Worksite;
//# sourceMappingURL=improvement.js.map