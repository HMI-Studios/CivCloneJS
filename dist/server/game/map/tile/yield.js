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
    div(other) {
        return Math.max(...[
            this.food / other.food,
            this.production / other.production,
        ].map(num => !isNaN(num) && num ? num : 0));
    }
    divNumber(n) {
        return new Yield({
            food: this.food / n,
            production: this.production / n,
        });
    }
    add(other) {
        return this.copy().incr(other);
    }
    sub(other) {
        return this.copy().decr(other);
    }
    static max(a, b) {
        var _a, _b, _c, _d;
        return {
            food: Math.max(((_a = a.food) !== null && _a !== void 0 ? _a : 0), ((_b = b.food) !== null && _b !== void 0 ? _b : 0)) || undefined,
            production: Math.max(((_c = a.production) !== null && _c !== void 0 ? _c : 0), ((_d = b.production) !== null && _d !== void 0 ? _d : 0)) || undefined,
        };
    }
    static min(a, b) {
        var _a, _b, _c, _d;
        return {
            food: Math.min(((_a = a.food) !== null && _a !== void 0 ? _a : 0), ((_b = b.food) !== null && _b !== void 0 ? _b : 0)) || undefined,
            production: Math.min(((_c = a.production) !== null && _c !== void 0 ? _c : 0), ((_d = b.production) !== null && _d !== void 0 ? _d : 0)) || undefined,
        };
    }
    canSupply(requirement) {
        for (const key in requirement) {
            if (this[key] > 0)
                return true;
        }
        return false;
    }
    fulfills(other) {
        return (this.food >= other.food &&
            this.production >= other.production);
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
            food: Math.max(this.food - ((_a = this.capacity.food) !== null && _a !== void 0 ? _a : 0), 0),
            production: Math.max(this.production - ((_b = this.capacity.production) !== null && _b !== void 0 ? _b : 0), 0),
        });
        this.food = Math.min(this.food, (_c = this.capacity.food) !== null && _c !== void 0 ? _c : 0);
        this.production = Math.min(this.production, (_d = this.capacity.production) !== null && _d !== void 0 ? _d : 0);
        return surplus;
    }
}
exports.ResourceStore = ResourceStore;
//# sourceMappingURL=yield.js.map