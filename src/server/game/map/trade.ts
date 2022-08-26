import { Coords } from "../world";
import { Improvement, ImprovementData } from "./tile/improvement";
import { ResourceStore, Yield, YieldParams } from "./tile/yield";

export type Route = [Coords[], number];

export type TraderData = {
  route: Coords[];
  source: ImprovementData;
  sink: ImprovementData;
  speed: number;
  routeLength: number;
  storage: YieldParams;
};

export class Trader {
  civID: number;
  route: Coords[];
  source: Improvement;
  sink: Improvement;
  speed: number;
  length: number;
  expired: boolean;
  turnTime: number;
  turnsElapsed: number;

  private storage: ResourceStore;

  constructor(civID: number, [path, length]: Route, source: Improvement, sink: Improvement, speed: number, capacity: YieldParams) {
    this.civID = civID;
    this.route = path;
    this.source = source;
    this.sink = sink;
    this.speed = speed;
    this.length = length;
    this.expired = false;
    this.turnTime = Math.ceil(length / speed);
    this.turnsElapsed = 0;

    const capacityPerTurn = Object.keys(capacity).reduce((acc, key) => ({...acc, [key]: (capacity[key] ?? 0) / this.turnTime}), {});
    this.storage = new ResourceStore(capacityPerTurn);
    
    this.source.subscribeTrader(this);
    this.sink.subscribeSupplier(this);
  }

  getData(): TraderData {
    return {
      route: this.route,
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
