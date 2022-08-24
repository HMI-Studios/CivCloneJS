import { Trader } from '../trade';
import { ResourceStore, Yield, YieldParams } from './yield';

const improvementYieldTable: { [improvement: string]: Yield } = {
  'settlement': new Yield({food: 2, production: 2}),

  'farm': new Yield({food: 1}),

  'forest': new Yield({food: 1}),
};

const constructionCostTable: { [improvement: string]: Yield } = {
  'farm': new Yield({production: 10}),
};

export interface ImprovementData {
  type: string;
  pillaged: boolean;
  storage: YieldParams;
  metadata?: any;
}

export class Improvement {
  type: string;
  pillaged: boolean;
  yield: Yield;
  metadata: any;

  protected traders: Trader[];
  protected storage: ResourceStore;
  
  constructor(type: string, metadata?: any) {
    this.type = type;
    this.pillaged = false;
    this.yield = improvementYieldTable[type] ?? new Yield({});
    this.metadata = metadata;
    this.storage = new ResourceStore({});
    this.traders = [];
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
      storage: this.storage,
    };
  }

  work(baseYield: Yield): void {
    // TODO - ADD POPULATION/COST CHECK
    const totalYield = this.yield.add(baseYield);
    this.storage.cap();

    let traderCount = this.traders.length;
    for (const trader of this.traders) {
      const traderShare = totalYield.div(traderCount);
      const surplus = trader.store(traderShare);
      totalYield.decr(traderShare.decr(surplus));
      traderCount--;
    }

    this.storage.incr(totalYield);
  }

  store(resources: Yield): void {
    this.storage.incr(resources);
  }

  subscribeTrader(trader: Trader): void {
    this.traders.push(trader);
  }
}

export class Worksite extends Improvement {
  cost: Yield;

  constructor(options: { construction: boolean, type: string }) {
    super('worksite', options);
    this.cost = constructionCostTable[options.type];
  }

  getData(): ImprovementData {
    return {
      ...super.getData(),
      metadata: {
        type: this.metadata.type,
      }
    };
  }

  work(baseYield: Yield): void {
    // TODO - ACTUAL WORK HERE
    super.work(baseYield);
  }
}
