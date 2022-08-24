"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trader = void 0;
const yield_1 = require("./tile/yield");
class Trader {
    constructor(route, source, sink, speed, capacity) {
        this.route = route;
        this.source = source;
        this.sink = sink;
        this.speed = speed;
        this.expired = false;
        this.storage = new yield_1.ResourceStore(capacity);
    }
    store(resources) {
        this.storage.incr(resources);
        return this.storage.cap();
    }
}
exports.Trader = Trader;
//# sourceMappingURL=trade.js.map