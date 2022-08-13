"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Improvement = void 0;
const yield_1 = require("./yield");
const improvementYieldTable = {
    'settlement': new yield_1.Yield({ food: 2, production: 2 }),
    'farm': new yield_1.Yield({ food: 1 }),
    'forest': new yield_1.Yield({ food: 1 }),
};
class Improvement {
    constructor(type) {
        this.type = type;
        this.pillaged = false;
        this.yield = improvementYieldTable[type];
    }
    getData() {
        return {
            type: this.type,
            pillaged: this.pillaged,
        };
    }
}
exports.Improvement = Improvement;
//# sourceMappingURL=improvement.js.map