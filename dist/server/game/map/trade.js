"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trader = void 0;
const yield_1 = require("./tile/yield");
class Trader {
    constructor(civID, [path, length], source, sink, speed, capacity, mode) {
        this.civID = civID;
        this.path = path;
        this.source = source;
        this.sink = sink;
        this.speed = speed;
        this.length = length;
        this.expired = false;
        this.turnTime = Math.ceil(length / speed);
        this.turnsElapsed = 0;
        this.movementClass = mode;
        const capacityPerTurn = Object.keys(capacity).reduce((acc, key) => { var _a; return (Object.assign(Object.assign({}, acc), { [key]: ((_a = capacity[key]) !== null && _a !== void 0 ? _a : 0) / this.turnTime })); }, {});
        this.storage = new yield_1.ResourceStore(capacityPerTurn);
        this.source.subscribeTrader(this);
        this.sink.subscribeSupplier(this);
    }
    export() {
        return {
            civID: this.civID,
            path: this.path,
            speed: this.speed,
            length: this.length,
            expired: this.expired,
            turnsElapsed: this.turnsElapsed,
            storage: this.storage,
            movementClass: this.movementClass,
        };
    }
    /***
     * import() needs a reference to the Map in order to get references to the source and sink Improvements
     */
    static import(map, { civID, path, speed, length, expired, turnsElapsed, storage, movementClass }) {
        // This is safe, since a Route is guaranteed to always start at the source and end at the sink.
        const source = map.getTileOrThrow(path[0]);
        const sink = map.getTileOrThrow(path[path.length - 1]);
        if (source.improvement && sink.improvement) {
            const capacity = storage.capacity;
            delete storage.capacity;
            const trader = new Trader(civID, [path, length], source.improvement, sink.improvement, speed, capacity, movementClass);
            trader.storage.incr(new yield_1.Yield(storage));
            trader.expired = expired;
            trader.turnsElapsed = turnsElapsed;
            return trader;
        }
        else {
            // The supplied data is broken - the trader can not possibly be created.
            throw 'Error importing Trader: Invalid source or sink.';
        }
    }
    getData() {
        return {
            path: this.path,
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