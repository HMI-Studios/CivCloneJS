import { Yield } from "./yield";

export class Knowledge {
  name: string;
  cost: Yield;
  prerequisites: string[];

  public static knowledgeTree: { [name: string]: Knowledge } = {
    'scout': new Knowledge('scout', new Yield({ production: 6, science: 10 }), [])
  }

  public static getCosts(): { [name: string]: Yield } {
    const costs = {};
    for (const name in Knowledge.knowledgeTree) {
      costs[name] = this.knowledgeTree[name].cost;
    }
    return costs;
  }

  constructor(name: string, cost: Yield, prerequisites: string[]) {
    this.name = name;
    this.cost = cost;
    this.prerequisites = prerequisites;
  }
}