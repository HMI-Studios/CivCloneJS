import { Yield } from "./yield";

export type KnowledgeData = {
  name: string;
  cost: Yield;
  prerequisites: string[];
};

export class Knowledge {
  name: string;
  cost: Yield;
  prerequisites: string[];
  units: string[];
  improvements: string[];

  public static knowledgeTree: { [name: string]: Knowledge } = {
    'scout': new Knowledge('scout', new Yield({ production: 6, science: 10 }), [], {units: ['scout']}),

  }

  public static getCosts(): { [name: string]: Yield } {
    const costs = {};
    for (const name in Knowledge.knowledgeTree) {
      costs[name] = Knowledge.knowledgeTree[name].cost;
    }
    return costs;
  }

  public static getTrainableUnits(knowledgeNames: string[]): string[] {
    let units: string[] = [];
    for (const name of knowledgeNames) {
      units = [ ...units, ...Knowledge.knowledgeTree[name].units ];
    }
    return units;
  }

  public static getBuildableImprovements(knowledgeNames: string[]): string[] {
    let improvements: string[] = [];
    for (const name of knowledgeNames) {
      improvements = [ ...improvements, ...Knowledge.knowledgeTree[name].improvements ];
    }
    return improvements;
  }

  public static getKnowledgeList(): Knowledge[] {
    return Object.keys(Knowledge.knowledgeTree).map(key => Knowledge.knowledgeTree[key]);
  }

  private static recursiveSetPrerequisitesReachable(reachableMap: { [name: string]: boolean }, knowledge: Knowledge) {
    reachableMap[knowledge.name] = true;
    for (const prerequisite of knowledge.prerequisites) {
      reachableMap = { ...reachableMap, ...Knowledge.recursiveSetPrerequisitesReachable(reachableMap, Knowledge.knowledgeTree[prerequisite]) };
    }
    return reachableMap;
  }

  public static getReachableKnowledges(completedPrerequisites: string[]): Knowledge[] {
    const completedMap = completedPrerequisites.reduce((map, name) => ({ ...map, [name]: true }), {});
    let reachable = {};
    for (const name in Knowledge.knowledgeTree) {
      const knowledge = Knowledge.knowledgeTree[name];
      if (reachable[name]) continue;
      reachable[name] = true;
      for (const prerequisite of knowledge.prerequisites) {
        if (!completedMap[prerequisite]) {
          reachable[name] = false;
          break;
        }
      }
      if (reachable[name]) {
        for (const prerequisite of knowledge.prerequisites) {
          reachable = { ...reachable, ...Knowledge.recursiveSetPrerequisitesReachable(reachable, knowledge) };
        }
      }
    }
    return Knowledge.getKnowledgeList().filter(({ name }) => reachable[name]);
  }

  constructor(name: string, cost: Yield, prerequisites: string[], unlocks: { units?: string[], improvements?: string[] }) {
    this.name = name;
    this.cost = cost;
    this.prerequisites = prerequisites;
    this.units = unlocks.units ?? [];
    this.improvements = unlocks.improvements ?? [];
  }

  getData(): KnowledgeData {
    return {
      name: this.name,
      cost: this.cost,
      prerequisites: this.prerequisites,
    };
  }
}