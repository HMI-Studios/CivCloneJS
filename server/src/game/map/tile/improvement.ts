import { World } from '../../world';
import { Trader } from '../trade';
import { ErrandAction, ErrandData, ErrandType, WorkErrand } from './errand';
import { Knowledge, KnowledgeBranch, KnowledgeBucket, KnowledgeMap } from './knowledge';
import { PromotionClass, PromotionEra, Unit } from './unit';
import { ResourceStore, Yield, YieldParams } from './yield';

export type ImprovementData = {
  type: string;
  pillaged: boolean;
  storage: YieldParams;
  errand?: ErrandData;
  metadata?: any;
  isNatural: boolean;
  knowledge?: KnowledgeMap;
};

export interface ImprovementConstructionCost {
  type: string;
  cost: Yield;
}

export type ImprovementImportArgs = [string, boolean, Yield, ResourceStore];

export class Improvement {
  static yieldTable: { [improvement: string]: Yield } = {
    'settlement': new Yield({food: 2, production: 2}),
    'barbarian_camp': new Yield({food: 2, production: 2}),
    'encampment': new Yield({production: 1}),
    'campus': new Yield({science: 5}),
  
    'farm': new Yield({food: 1}),
  
    'forest': new Yield({food: 1}),
  };
  
  static storeCapTable: { [improvement: string]: YieldParams } = {
    'settlement': {food: 20, production: 2},
    'barbarian_camp': {food: 20, production: 2},
    'encampment': {food: 10, production: 1},
  
    'farm': {food: 20},
  };
  
  static naturalImprovementTable: { [improvement: string]: boolean } = {
    'forest': true,
  };

  static improvementHeightTable: { [improvement: string]: number } = {
    'forest': 5,
  }

  static trainableUnitClassTable: { [improvement: string]: [PromotionClass, PromotionEra][] } = {
    'settlement': [
      [PromotionClass.CIVILLIAN, PromotionEra.ALL],
      [PromotionClass.RECON, PromotionEra.ANCIENT],
    ],
    'encampment': [
      [PromotionClass.MELEE, PromotionEra.ALL],
      [PromotionClass.RANGED, PromotionEra.ALL],
      [PromotionClass.RECON, PromotionEra.ALL],
    ],
  };

  static researchableKnowledgeBranchTable: { [improvement: string]: [KnowledgeBranch, PromotionEra][] } = {
    'settlement' : [
      [KnowledgeBranch.OFFENSE, PromotionEra.ANCIENT],
      [KnowledgeBranch.DEFESNSE, PromotionEra.ANCIENT],
      [KnowledgeBranch.CIVICS, PromotionEra.ANCIENT],
      [KnowledgeBranch.DEVELOPMENT, PromotionEra.ANCIENT],
    ],
    'campus': [
      [KnowledgeBranch.OFFENSE, PromotionEra.ALL],
      [KnowledgeBranch.DEFESNSE, PromotionEra.ALL],
      [KnowledgeBranch.CIVICS, PromotionEra.ALL],
      [KnowledgeBranch.DEVELOPMENT, PromotionEra.ALL],
    ],
  };

  type: string;
  pillaged: boolean;
  yield: Yield;
  isNatural: boolean;
  errand?: WorkErrand;

  protected traders: Trader[];
  protected suppliers: Trader[];
  protected storage: ResourceStore;

  public knowledge?: KnowledgeBucket;

  static makeCatalog(types: string[]): ImprovementConstructionCost[] {
    return types.map(type => (
      { type, cost: WorkErrand.errandCostTable[ErrandType.CONSTRUCTION][type] }
    ));
  }
  
  constructor(args : [type: string, baseYield: Yield, knowledges?: KnowledgeMap] | ImprovementImportArgs) {
    if (args.length === 4) {
      const [type, pillaged, improvementYield, storage] = args;
      this.type = type;
      this.pillaged = pillaged;
      this.isNatural = Improvement.naturalImprovementTable[type];
      this.yield = improvementYield;
      this.storage = storage;
      this.traders = [];
      this.suppliers = [];
      return;
    };
    const [type, baseYield, knowledges] = args;
    this.type = type;
    this.pillaged = false;
    this.isNatural = Improvement.naturalImprovementTable[type];
    this.yield = baseYield.add(Improvement.yieldTable[type] ?? new Yield({}));
    this.storage = new ResourceStore(Improvement.storeCapTable[type] ?? {});
    this.traders = [];
    this.suppliers = [];
    if (this.isNatural) {
      this.yield = new Yield({});
    } else {
      this.knowledge = new KnowledgeBucket(knowledges);
    }
  }

  export() {
    return {
      type: this.type,
      pillaged: this.pillaged,
      isNatural: this.isNatural,
      yield: this.yield,
      storage: this.storage,
      errand: this.errand?.export(),
      knowledge: this.knowledge?.export(),
    };
  }

  static import(data: any): Improvement {
    const storageCap = data.storage.capacity;
    delete data.storage.capacity;
    const improvement = new Improvement([data.type, data.pillaged, new Yield(data.yield), new ResourceStore(storageCap).incr(new Yield(data.storage)) as ResourceStore]);
    if (data.errand) improvement.errand = WorkErrand.import(improvement.storage, data.errand);
    if (!data.isNatural) improvement.knowledge = KnowledgeBucket.import(data.knowledge);
    return improvement;
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
      storage: this.storage,
      errand: this.errand?.getData(),
      isNatural: this.isNatural,
      knowledge: this.knowledge?.getKnowledgeMap(),
    };
  }

  /**
   * 
   * @returns list of units classes this improvement knows how to train
   */
  getTrainableUnitClasses(): [PromotionClass, PromotionEra][] {
    return Improvement.trainableUnitClassTable[this.type] ?? [];
  }

  /**
   * 
   * @returns list of knowledge branches this improvement knows how to research
   */
  getResearchableKnowledgeBranches(): [KnowledgeBranch, PromotionEra][] {
    return Improvement.researchableKnowledgeBranchTable[this.type] ?? [];
  }

  /**
   * 
   * @returns list of units classes this improvement knows how to train
   */
   getTrainableUnitTypes(): string[] {
    if (!this.knowledge) return [];
    const trainableUnitClasses: {
      [cls in PromotionClass]?: PromotionEra
    } = this.getTrainableUnitClasses().reduce((obj, [prClass, era]) => ({ ...obj, [prClass]: era }), {});
    return Knowledge.getTrainableUnits(this.knowledge.getKnowledges(true))
      .filter(unitType => (
        (trainableUnitClasses[Unit.promotionClassTable[unitType]] ?? PromotionEra.NONE) >= Unit.promotionEraTable[unitType]
      ));
  }

  /**
   * 
   * @returns list of knowledges this improvement knows how to research
   */
  getResearchableKnowledgeNames(): string[] {
    const researchableBranches: {
      [cls in KnowledgeBranch]?: PromotionEra
    } = this.getResearchableKnowledgeBranches().reduce((obj, [branch, era]) => ({ ...obj, [branch]: era }), {});
    return Knowledge.getKnowledgeList().filter(({ branch, era }) => (
      researchableBranches[branch] ?? PromotionEra.NONE >= era
    )).map(({ name }) => name);
  }

  startErrand(errand: ErrandAction) {
    this.errand = new WorkErrand(this.storage, errand);
  }

  work(world: World): void {
    // TODO - ADD POPULATION/COST CHECK

    // if (type === 'farm') {

    // }

    if (this.errand) {
      if (this.storage.fulfills(this.errand.cost)) {
        this.errand.completed = true;
        for (const supplier of this.suppliers) {
          supplier.expire();
        }
        this.storage.decr(this.errand.cost);
        this.storage.setCapacity(Improvement.storeCapTable[this.type]);
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

    this.store(this.yield);
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

export interface Worksite extends Improvement {
  errand: WorkErrand;
}
