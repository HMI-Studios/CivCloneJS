"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Random = void 0;
class Random {
    constructor(seed) {
        this.prevRand = seed;
        this.randFloat = this.randFloat.bind(this);
        this.randInt = this.randInt.bind(this);
        this.doubleRandInt = this.doubleRandInt.bind(this);
    }
    _randNumber(from, to) {
        this.prevRand = ((1103515245 * this.prevRand) + 12345) % 2147483648;
        return ((this.prevRand / 2147483648) * (to - from)) + from;
    }
    randFloat(from, to) {
        if (from !== undefined && to === undefined) {
            return this._randNumber(0, from);
        }
        return this._randNumber(from !== null && from !== void 0 ? from : 0, to !== null && to !== void 0 ? to : 1);
    }
    randInt(from, to) {
        return Math.round(this.randFloat(from, to));
    }
    doubleRandInt(n1, n2, n3, n4) {
        return this.randInt(this.randInt(n1, n2), this.randInt(n3, n4));
    }
}
exports.Random = Random;
//# sourceMappingURL=random.js.map