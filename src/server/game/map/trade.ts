import { Coords } from "../world";
import { ResourceStore, Yield, YieldParams } from "./tile/yield";

export class Trader {
  route: Coords[];
  source: Improvement;
  sink: Improvement;
  speed: number;
  expired: boolean;

  private storage: ResourceStore;

  constructor(route: Coords[], source: Improvement, sink: Improvement, speed: number, capacity: YieldParams) {
    this.route = route;
    this.source = source;
    this.sink = sink;
    this.speed = speed;
    this.expired = false;
    this.storage = new ResourceStore(capacity);
  }

  store(resources: Yield): Yield {
    this.storage.incr(resources);
    return this.storage.cap();
  }
}
