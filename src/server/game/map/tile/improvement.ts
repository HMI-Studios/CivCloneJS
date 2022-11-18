import { Trader } from '../trade';
import { Unit, UnitTypeCost } from './unit';
import { ResourceStore, Yield, YieldParams } from './yield';

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
  static yieldTable: { [improvement: string]: Yield } = {
    'settlement': new Yield({food: 2, production: 2}),
    'encampment': new Yield({production: 1}),
  
    'farm': new Yield({food: 1}),
  
    'forest': new Yield({food: 1}),
  };
  
  static storeCapTable: { [improvement: string]: YieldParams } = {
    'settlement': {food: 20, production: 2},
    'encampment': {food: 10, production: 1},
  
    'farm': {food: 20},
  };
  
  static constructionCostTable: { [improvement: string]: Yield } = {
    'encampment': new Yield({production: 2}),
    'farm': new Yield({production: 10}),
  };
  
  static naturalImprovementTable: { [improvement: string]: boolean } = {
    'forest': true,
  };

  type: string;
  pillaged: boolean;
  yield: Yield;
  isNatural: boolean;
  errand?: WorkErrand;
  metadata: any;

  protected traders: Trader[];
  protected suppliers: Trader[];
  protected storage: ResourceStore;
  
  constructor(type?: string, baseYield?: Yield, metadata?: any) {
    if (!(type && baseYield)) return;
    this.type = type;
    this.pillaged = false;
    this.isNatural = Improvement.naturalImprovementTable[type];
    this.yield = baseYield.add(Improvement.yieldTable[type] ?? new Yield({}));
    this.metadata = metadata;
    this.storage = new ResourceStore(Improvement.storeCapTable[type] ?? {});
    this.traders = [];
    this.suppliers = [];
    if (this.isNatural) {
      this.yield = new Yield({});
    } else if (type === 'worksite') {
      this.yield = new Yield({});
      this.errand = new WorkErrand(Improvement.constructionCostTable[metadata.type], this.storage, metadata.onCompletion);
    }
  }

  export() {
    return {
      type: this.type,
      pillaged: this.pillaged,
      isNatural: this.isNatural,
      yield: this.yield,
      storage: this.storage,
      errand: this.errand,
    };
  }

  static import(data: any): Improvement {
    const improvement = new Improvement();
    improvement.type = data.type;
    improvement.pillaged = data.pillaged;
    improvement.isNatural = data.isNatural;
    improvement.yield = new Yield(data.yield);
    const storageCap = data.storage.capacity;
    delete data.storage.capacity;
    improvement.storage = new ResourceStore(storageCap).incr(data.storage) as ResourceStore;
    improvement.traders = [];
    improvement.suppliers = [];
    return improvement;
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
      storage: this.storage,
      errand: this.errand?.getData(),
    };
  }

  // Return type and cost of units this improvement knows how to train, or null if it cannot train units
  getUnitCatalog(): UnitTypeCost[] | null {
    if (this.type === 'settlement') {
      return Unit.makeCatalog(['settler', 'builder']);
    } else if (this.type === 'encampment') {
      return Unit.makeCatalog(['scout']);
    } else {
      return null;
    }
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
