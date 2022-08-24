import { Coords } from "../world";
import { Improvement } from "./tile/improvement";
import { ResourceStore, Yield, YieldParams } from "./tile/yield";

export type Route = [Coords[], number];

export class Trader {
  civID: number;
  route: Coords[];
  source: Improvement;
  sink: Improvement;
  speed: number;
  length: number;
  expired: boolean;

  private storage: ResourceStore;

  constructor(civID: number, [path, length]: Route, source: Improvement, sink: Improvement, speed: number, capacity: YieldParams) {
    this.civID = civID;
    this.route = path;
    this.source = source;
    this.sink = sink;
    this.speed = speed;
    this.length = length;
    this.expired = false;

    const capacityPerTurn = Object.keys(capacity).reduce((acc, key) => ({...acc, [key]: capacity[key] / (length / speed)}), {});
    this.storage = new ResourceStore(capacityPerTurn);
    
    this.source.subscribeTrader(this);
  }

  store(resources: Yield): Yield {
    this.storage.incr(resources);
    return this.storage.cap();
  }

  shunt(): void {
    this.sink.store(this.storage);
    this.storage.reset();
  }
}
