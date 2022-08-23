import { Yield, YieldParams } from './yield';

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
  metadata?: any;
}

export class Improvement {
  type: string;
  pillaged: boolean;
  yield: Yield;
  storage: Yield;
  metadata: any;

  constructor(type: string, metadata?: any) {
    this.type = type;
    this.pillaged = false;
    this.yield = improvementYieldTable[type] ?? {};
    this.metadata = metadata;
    this.storage = new Yield({});
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
    };
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
      type: this.type,
      pillaged: this.pillaged,
      metadata: {
        type: this.metadata.type,
        storage: this.storage,
      }
    };
  }
}
