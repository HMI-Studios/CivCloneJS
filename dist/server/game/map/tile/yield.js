"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Yield = void 0;
class Yield {
    constructor(params) {
        var _a, _b;
        this.food = (_a = params.food) !== null && _a !== void 0 ? _a : 0;
        this.production = (_b = params.production) !== null && _b !== void 0 ? _b : 0;
    }
    add(other) {
        return new Yield({
            food: this.food + other.food,
            production: this.production + other.production,
        });
    }
}
exports.Yield = Yield;
//# sourceMappingURL=yield.js.map