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
        this.turnTime = Math.ceil(length / speed);
        this.turnsElapsed = 0;
        const capacityPerTurn = Object.keys(capacity).reduce((acc, key) => { var _a; return (Object.assign(Object.assign({}, acc), { [key]: ((_a = capacity[key]) !== null && _a !== void 0 ? _a : 0) / this.turnTime })); }, {});
        this.storage = new yield_1.ResourceStore(capacityPerTurn);
        this.source.subscribeTrader(this);
        this.sink.subscribeSupplier(this);
    }
    getData() {
        return {
            route: this.route,
            source: this.source.getData(),
            sink: this.sink.getData(),
            speed: this.speed,
            routeLength: this.length,
            storage: this.storage,
        };
    }
    expire() {
        this.expired = true;
    }
    store(resources) {
        this.storage.incr(resources);
        return this.storage.cap();
    }
    shunt() {
        if (this.expired) {
            this.source.store(this.storage);
            this.storage.reset();
            return;
        }
        this.sink.store(this.storage);
        this.storage.reset();
        this.turnsElapsed++;
    }
}
exports.Trader = Trader;
//# sourceMappingURL=trade.js.map