import { Trader } from '../trade';
import { ResourceStore, Yield, YieldParams } from './yield';

const improvementYieldTable: { [improvement: string]: Yield } = {
  'settlement': new Yield({food: 2, production: 2}),

  'farm': new Yield({food: 1}),

  'forest': new Yield({food: 1}),
};

const improvementStoreCapTable: { [improvement: string]: YieldParams } = {
  'settlement': {food: 20, production: 2},

  'farm': {food: 20},
}

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
  protected suppliers: Trader[];
  protected storage: ResourceStore;
  
  constructor(type: string, metadata?: any) {
    this.type = type;
    this.pillaged = false;
    this.yield = improvementYieldTable[type] ?? new Yield({});
    this.metadata = metadata;
    this.storage = new ResourceStore(improvementStoreCapTable[type] ?? {});
    this.traders = [];
    this.suppliers = [];
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

    let traderCount = this.traders.length;
    for (let i = 0; i < this.traders.length; i++) {
      const trader = this.traders[i];
      if (trader.expired) {
        this.traders.splice(i, 1);
        i--;
        traderCount--;
        continue;
      }
      const traderShare = this.storage.divNumber(traderCount);
      const surplus = trader.store(traderShare);
      this.storage.decr(traderShare.decr(surplus));
      traderCount--;
    }

    const totalYield = this.yield.add(baseYield);
    this.storage.incr(totalYield);
    this.storage.cap();
  }

  store(resources: Yield): void {
    this.storage.incr(resources);
  }

  subscribeTrader(trader: Trader): void {
    this.traders.push(trader);
  }

  subscribeSupplier(trader: Trader): void {
    this.suppliers.push(trader);
  }
}

export class Worksite extends Improvement {
  public cost: Yield;
  public storedThisTurn: ResourceStore;
  public completed: boolean;

  constructor(options: { construction: boolean, type: string }) {
    super('worksite', options);
    this.cost = constructionCostTable[options.type];
    this.storedThisTurn = new ResourceStore({});
    this.storage.setCapacity(this.cost);
    this.completed = false;
  }

  getData(): ImprovementData {
    return {
      ...super.getData(),
      metadata: {
        type: this.metadata.type,
        storedThisTurn: this.storedThisTurn,
        turnsToCompletion: this.cost.sub(this.storage.sub(this.storedThisTurn)).div(this.storedThisTurn),
      }
    };
  }

  work(baseYield: Yield): void {
    if (this.storage.fulfills(this.cost)) {
      this.completed = true;
      for (const supplier of this.suppliers) {
        supplier.expire();
      }
      return;
    }
    this.storedThisTurn.reset();
    super.work(baseYield);
  }

  store(resources: Yield): void {
    super.store(resources);
    this.storedThisTurn.incr(resources);
  }
}
