import { Yield } from './tile';

const improvementYieldTable: { [improvement: string]: Yield } = {
  'settlement': new Yield({food: 2, production: 2}),

  'farm': new Yield({food: 1}),

  'forest': new Yield({food: 1}),
};

export interface ImprovementData {
  type: string;
  pillaged: boolean;
}

export class Improvement {
  type: string;
  pillaged: boolean;
  yield: Yield;

  constructor(type: string) {
    this.type = type;
    this.pillaged = false;
    this.yield = improvementYieldTable[type];
  }

  getData(): ImprovementData {
    return {
      type: this.type,
      pillaged: this.pillaged,
    };
  }
}
