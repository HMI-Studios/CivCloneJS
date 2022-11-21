export class Knowledge {
  name: string;
  cost: number;
  prerequisites: string[];

  constructor(name: string, cost: number, prerequisites: string[]) {
    this.name = name;
    this.cost = cost;
    this.prerequisites = prerequisites;
  }
}

export const knowledgeTree: { [name: string]: Knowledge } = {
  'scout': new Knowledge('scout', 100, [])
}
