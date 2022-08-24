"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceStore = exports.Yield = void 0;
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
    decr(other) {
        this.food -= other.food;
        this.production -= other.production;
        return this;
    }
    div(n) {
        return new Yield({
            food: this.food / n,
            production: this.production / n,
        });
    }
    add(other) {
        return this.copy().incr(other);
    }
    canSupply(requirement) {
        for (const key in requirement) {
            if (this[key] > 0)
                return true;
        }
        return false;
    }
}
exports.Yield = Yield;
class ResourceStore extends Yield {
    constructor(capacity) {
        super({});
        this.capacity = capacity;
    }
    reset() {
        this.food = 0;
        this.production = 0;
    }
    setCapacity(capacity) {
        this.capacity = capacity;
    }
    cap() {
        var _a, _b, _c, _d;
        const surplus = new Yield({
            food: this.food - ((_a = this.capacity.food) !== null && _a !== void 0 ? _a : 0),
            production: this.production - ((_b = this.capacity.production) !== null && _b !== void 0 ? _b : 0),
        });
        this.food = Math.min(this.food, (_c = this.capacity.food) !== null && _c !== void 0 ? _c : 0);
        this.production = Math.min(this.production, (_d = this.capacity.production) !== null && _d !== void 0 ? _d : 0);
        return surplus;
    }
}
exports.ResourceStore = ResourceStore;
//# sourceMappingURL=yield.js.map