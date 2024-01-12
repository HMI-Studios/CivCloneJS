import { Coords } from "../world";
import { Map } from "./index";
import { Improvement, ImprovementData } from "./tile/improvement";
import { MovementClass } from "./tile/unit";
import { ResourceStore, Yield, YieldParams, YieldType } from "./tile/yield";

export type Route = [Coords[], number];

export type TraderData = {
  path: Coords[];
  source: ImprovementData;
  sink: ImprovementData;
  speed: number;
  routeLength: number;
  storage: YieldParams;
};

export class Trader {
  civID: number;
  path: Coords[];
  source: Improvement;
  sink: Improvement;
  speed: number;
  length: number;
  expired: boolean;
  turnTime: number;
  turnsElapsed: number;
  movementClass: MovementClass;

  private storage: ResourceStore;

  constructor(
    civID: number,
    [path, length]: Route,
    source: Improvement,
    sink: Improvement,
    speed: number,
    capacity: YieldParams,
    mode: MovementClass
  ) {
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

    const capacityPerTurn = Object.keys(capacity).reduce((acc, key) => ({...acc, [key]: (capacity[key as YieldType] ?? 0) / this.turnTime}), {});
    this.storage = new ResourceStore(capacityPerTurn);
    
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
  static import(map: Map, {civID, path, speed, length, expired, turnsElapsed, storage, movementClass}: any): Trader {
    // This is safe, since a Route is guaranteed to always start at the source and end at the sink.
    const source = map.getTileOrThrow(path[0]);
    const sink = map.getTileOrThrow(path[path.length - 1]);
    if (source.improvement && sink.improvement) {
      const capacity = storage.capacity;
      delete storage.capacity;
      const trader = new Trader(civID, [path, length], source.improvement, sink.improvement, speed, capacity, movementClass);
      trader.storage.incr(new Yield(storage));
      trader.expired = expired;
      trader.turnsElapsed = turnsElapsed;
      return trader;
    } else {
      // The supplied data is broken - the trader can not possibly be created.
      throw 'Error importing Trader: Invalid source or sink.';
    }
  }

  getData(): TraderData {
    return {
      path: this.path,
      source: this.source.getData(),
      sink: this.sink.getData(),
      speed: this.speed,
      routeLength: this.length,
      storage: this.storage,
    };
  }

  expire(): void {
    this.expired = true;
  }

  store(resources: Yield): Yield {
    this.storage.incr(resources);
    return this.storage.cap();
  }

  shunt(): void {
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
