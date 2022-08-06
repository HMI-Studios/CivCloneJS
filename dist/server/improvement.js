"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Improvement = void 0;
const tile_1 = require("./tile");
const improvementYieldTable = {
    'settlement': new tile_1.Yield({ food: 2, production: 2 }),
    'farm': new tile_1.Yield({ food: 1 }),
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