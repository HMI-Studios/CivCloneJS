"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Yield = void 0;
class Yield {
    constructor(params) {
        var _a, _b;
        this.food = (_a = params.food) !== null && _a !== void 0 ? _a : 0;
        this.production = (_b = params.production) !== null && _b !== void 0 ? _b : 0;
    }
    copy() {
        return new Yield({
            food: this.food,
            production: this.production,
        });
    }
    incr(other) {
        this.food += other.food;
        this.production += other.production;
        return this;
    }
    add(other) {
        return this.copy().incr(other);
    }
}
exports.Yield = Yield;
//# sourceMappingURL=yield.js.map