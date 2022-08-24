"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trader = void 0;
const yield_1 = require("./tile/yield");
class Trader {
    constructor(civID, [path, length], source, sink, speed, capacity) {
        this.civID = civID;
        this.route = path;
        this.source = source;
        this.sink = sink;
        this.speed = speed;
        this.length = length;
        this.expired = false;
        const capacityPerTurn = Object.keys(capacity).reduce((acc, key) => (Object.assign(Object.assign({}, acc), { [key]: capacity[key] / (length / speed) })), {});
        this.storage = new yield_1.ResourceStore(capacityPerTurn);
        this.source.subscribeTrader(this);
    }
    store(resources) {
        this.storage.incr(resources);
        return this.storage.cap();
    }
    shunt() {
        this.sink.store(this.storage);
        this.storage.reset();
    }
}
exports.Trader = Trader;
//# sourceMappingURL=trade.js.map