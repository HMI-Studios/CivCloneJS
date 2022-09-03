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
};

const constructionCostTable: { [improvement: string]: Yield } = {
  'farm': new Yield({production: 10}),
};

const naturalImprovementTable: { [improvement: string]: boolean } = {
  'forest': true,
};

export type ImprovementData = {
  type: string;
  pillaged: boolean;
  storage: YieldParams;
  errand?: ErrandData;
  metadata?: any;
};

export type ErrandData = {
  storedThisTurn: YieldParams;
  turnsToCompletion: number;
};

export class Improvement {
  type: string;
  pillaged: boolean;
  yield: Yield;
  isNatural: boolean;
  errand?: WorkErrand;
  metadata: any;

  protected traders: Trader[];
  protected suppliers: Trader[];
  protected storage: ResourceStore;
  
  constructor(type: string, baseYield: Yield, metadata?: any) {
    this.type = type;
    this.pillaged = false;
    this.isNatural = naturalImprovementTable[type];
    this.yield = baseYield.add(improvementYieldTable[type] ?? new Yield({}));
    this.metadata = metadata;
    this.storage = new ResourceStore(improvementStoreCapTable[type] ?? {});
    this.traders = [];
    this.suppliers = [];
    if (this.isNatural) {
      this.yield = new Yield({});
    } else if (type === 'worksite') {
      this.yield = new Yield({});
      this.errand = new WorkErrand(constructionCostTable[metadata.type], this.storage, metadata.onCompletion);
    }
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
      storage: this.storage,
      errand: this.errand?.getData(),
    };
  }

  work(): void {
    // TODO - ADD POPULATION/COST CHECK

    // if (type === 'farm') {

    // }

    if (this.errand) {
      if (this.storage.fulfills(this.errand.cost)) {
        this.errand.completed = true;
        for (const supplier of this.suppliers) {
          supplier.expire();
        }
        this.errand.onCompletion(this);
      }
      this.errand.storedThisTurn.reset();
    }

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

    this.storage.incr(this.yield);
    this.storage.cap();
  }

  store(resources: Yield): void {
    this.storage.incr(resources);
    this.errand?.storedThisTurn.incr(resources);
  }

  subscribeTrader(trader: Trader): void {
    this.traders.push(trader);
  }

  subscribeSupplier(trader: Trader): void {
    this.suppliers.push(trader);
  }
}

export class WorkErrand {
  public cost: Yield;
  public storedThisTurn: ResourceStore;
  public completed: boolean;
  public parentStorage: ResourceStore; // Specifically, this is a REFERENCE to the ResourceStore of an Improvement
  public onCompletion: (improvement: Improvement) => void;

  constructor(cost: Yield, parentStorage: ResourceStore, onCompletion: () => void) {
    this.cost = cost;
    this.parentStorage = parentStorage;
    this.storedThisTurn = new ResourceStore({});
    this.parentStorage.setCapacity(this.cost);
    this.completed = false;
    this.onCompletion = onCompletion;
  }

  getData(): ErrandData {
    return {
      storedThisTurn: this.storedThisTurn,
      turnsToCompletion: this.cost.sub(this.parentStorage.sub(this.storedThisTurn)).div(this.storedThisTurn),
    };
  }
}

export interface Worksite extends Improvement {
  errand: WorkErrand;
}
