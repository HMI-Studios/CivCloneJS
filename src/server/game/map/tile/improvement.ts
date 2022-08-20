import { Yield, YieldParams } from './yield';

const improvementYieldTable: { [improvement: string]: Yield } = {
  'settlement': new Yield({food: 2, production: 2}),

  'farm': new Yield({food: 1}),

  'forest': new Yield({food: 1}),
};

const constructionCostTable: { [improvement: string]: YieldParams } = {
  'farm': {production: 10},
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
  metadata: any;

  constructor(type: string, metadata?: any) {
    this.type = type;
    this.pillaged = false;
    this.yield = improvementYieldTable[type] ?? {};
    this.metadata = metadata;
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
    };
  }
}

export class Worksite extends Improvement {
  cost: YieldParams;
  collected: YieldParams;

  constructor(options: { construction: boolean, type: string }) {
    super('worksite', options);
    this.cost = constructionCostTable[options.type];
    this.collected = Object.keys(this.cost).reduce((acc, key) => acc[key] = 0, {});

    
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
      metadata: {
        type: this.metadata.type,
        collected: this.collected,
      }
    };
  }
}
