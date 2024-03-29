import { World } from "../../world";
import { PromotionEra } from "./unit";
import { Yield } from "./yield";

export type KnowledgeData = {
  name: string;
  cost: Yield;
  prerequisites: string[];
};

export type KnowledgeMap = { [name: string]: number };

export enum KnowledgeBranch {
  OFFENSE,
  DEFESNSE,
  CIVICS,
  DEVELOPMENT,
}

export class Knowledge {
  name: string;
  branch: KnowledgeBranch;
  era: PromotionEra;
  cost: Yield;
  prerequisites: string[];
  units: string[];
  improvements: string[];

  public static knowledgeTree: { [name: string]: Knowledge } = {
    'start': new Knowledge('start', KnowledgeBranch.DEVELOPMENT, PromotionEra.ANCIENT, new Yield({ science: 0 }), [], {units: ['settler', 'builder']}),
    'food_0': new Knowledge('food_0', KnowledgeBranch.DEVELOPMENT, PromotionEra.ANCIENT, new Yield({ science: 10 }), [], {improvements: ['farm']}),
    'military_0': new Knowledge('military_0', KnowledgeBranch.OFFENSE, PromotionEra.ANCIENT, new Yield({ science: 10 }), [], {units: ['warrior', 'slinger']}),
    'recon_0': new Knowledge('recon_0', KnowledgeBranch.OFFENSE, PromotionEra.ANCIENT, new Yield({ science: 10 }), [], {units: ['scout']}),
    'ranged_1': new Knowledge('ranged_1', KnowledgeBranch.OFFENSE, PromotionEra.ANCIENT, new Yield({ science: 10 }), ['military_0'], {units: ['archer']}),
    'science_1': new Knowledge('science_1', KnowledgeBranch.DEVELOPMENT, PromotionEra.CLASSICAL, new Yield({ science: 10 }), [], {improvements: ['campus']}),
    'military_1': new Knowledge('military_1', KnowledgeBranch.DEVELOPMENT, PromotionEra.CLASSICAL, new Yield({ science: 10 }), ['military_0'], {improvements: ['encampment']}),
    'recon_1': new Knowledge('recon_1', KnowledgeBranch.OFFENSE, PromotionEra.CLASSICAL, new Yield({ science: 10 }), ['recon_0', 'science_1'], {units: ['spy']}),
  }

  public static getCosts(): { [name: string]: Yield } {
    const costs: { [name: string]: Yield } = {};
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
    const completedMap: { [name: string]: boolean } = completedPrerequisites.reduce((map, name) => ({ ...map, [name]: true }), {});
    let reachable: { [name: string]: boolean } = {};
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

  constructor(
    name: string,
    branch: KnowledgeBranch,
    era: PromotionEra,
    cost: Yield,
    prerequisites: string[],
    unlocks: { units?: string[], improvements?: string[] }
  ) {
    this.name = name;
    this.branch = branch;
    this.era = era;
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

export const KNOWLEDGE_SPREAD_RANGE = 5;
export const KNOWLEDGE_SPREAD_SPEED = 1;
export const KNOWLEDGE_SPREAD_DELAY = 5;

export class KnowledgeSource {
  private knowledges: KnowledgeMap;
  private timeline: [string, number][];
  private completionQueue: string[];

  static fromLinks(links: KnowledgeSourceLinks): KnowledgeSource {
    const knowledges = links.getKnowledgeMap();
    return new KnowledgeSource(knowledges);
  }

  constructor(knowledges: KnowledgeMap) {
    this.knowledges = knowledges;
    this.timeline = [];
    this.completionQueue = [];
    for (const knowledge in this.knowledges) {
      if (!(this.knowledges[knowledge] < 100)) {
        this.completionQueue.push(knowledge);
      }
    }
  }

  export() {
    return {
      knowledges: this.knowledges,
      timeline: this.timeline,
    };
  }

  static import(data: any): KnowledgeSource {
    const knowledgeSource = new KnowledgeSource({});
    knowledgeSource.knowledges = data.knowledges;
    knowledgeSource.timeline = data.timeline;
    return knowledgeSource;
  }

  /**
   * 
   * @returns knowledge map
   */
  getKnowledgeMap(): KnowledgeMap {
    return this.knowledges;
  }

  /**
   * @param completed whether the knowledge must have 100 points to be included
   * @returns list of knowledge names
   */
  getKnowledges(currentTurn: number | null = null): [string, number][] {
    if (currentTurn === null) {
      const knowledges = Object.keys(this.knowledges).map((knowledge): [string, number] => [knowledge, this.knowledges[knowledge]]);
      return knowledges.filter(([_, progress]) => !(progress < 100));
    } else {
      return this.timeline.map(([knowledge, turn]) => {
        const turnDiff = currentTurn - turn;
        const knowledgeShare = Math.min(Math.max(0, turnDiff + KNOWLEDGE_SPREAD_DELAY) * (100 / KNOWLEDGE_SPREAD_DELAY), 100);
        return [knowledge, Math.round(knowledgeShare)];
      });
    }
  }

  /**
   * Returns `true` if this bucket has 100 points for all knowledges in `knowledgeNames`, else `false`.
   * @param knowledgeNames List of knowledge names, matching the keys of Knowledge.knowledgeTree.
   */
  hasKnowledges(knowledgeNames: string[]): boolean {
    for (const name of knowledgeNames) {
      if ((this.knowledges[name] ?? 0) < 100) return false;
    }
    return true;
  }

  /**
   * 
   * @param knowledge The knowledge instance to be added.
   * @param amount The amount of the knowledge to be added. (0 - 100)
   * @param requirementPenalty Multiplier that will be applied to `amount` if the prerequisites of the knowledge are not present in this bucket.
   */
  addKnowledge(knowledge: Knowledge, amount: number, requirementPenalty: number, maxPoints = 100): void {
    if (maxPoints > 100 || maxPoints < 0) throw 'Invalid Knowledge Cap!';
    if (!this.hasKnowledges(knowledge.prerequisites)) amount *= requirementPenalty;
    const wasNotCompleted = !this.knowledges[knowledge.name] || this.knowledges[knowledge.name] < 100;
    this.knowledges[knowledge.name] = Math.min(
      (this.knowledges[knowledge.name] ?? 0) + amount,
      Math.max(this.knowledges[knowledge.name] ?? 0, maxPoints)
    );
    if (this.knowledges[knowledge.name] === 100 && wasNotCompleted) {
      this.completionQueue.push(knowledge.name);
    }
  }

  turn(world: World): void {
    for (const knowledge of this.completionQueue) {
      this.timeline.push([knowledge, world.currentTurn])
    }
    this.completionQueue = [];
  }
}

export class KnowledgeSourceLinks {
  private sources: [KnowledgeSource, number][];

  constructor() {
    this.sources = [];
  }

  clearLinks(): void {
    this.sources = [];
  }


  addLink(source: KnowledgeSource, currentTurn: number): void {
    this.sources.push([source, currentTurn]);
  }

  /**
   * 
   * @returns knowledge map
   */
  getKnowledgeMap(): KnowledgeMap {
    const knowledges: { [name: string]: number } = {};
    for (const [source, currentTurn] of this.sources) {
      for (const [knowledge, progress] of source.getKnowledges(currentTurn)) {
        if (!(knowledge in knowledges)) knowledges[knowledge] = 0;
        knowledges[knowledge] = Math.max(knowledges[knowledge], progress);
      }
    }
    
    return knowledges;
  }

  /**
   * 
   * @returns list of knowledge names
   */
  getKnowledges(): [string, number][] {
    const knowledges = this.getKnowledgeMap();
    
    return Object.keys(knowledges).map(knowledge => ([knowledge, knowledges[knowledge]]));
  }

  turn(world: World): void {
    // Nothing to do here. We can't update our links here, since the bucket by design does not know what tile it's on.
  }
}

export class KnowledgeBucket {
  private source?: KnowledgeSource;
  private links: KnowledgeSourceLinks;

  constructor(knowledges?: KnowledgeMap) {
    if (knowledges) {
      this.source = new KnowledgeSource(knowledges);
    }
    this.links = new KnowledgeSourceLinks();
  }

  export() {
    if (this.source) return this.source.export();
  }

  static import(data: any): KnowledgeBucket {
    const bucket = new KnowledgeBucket();
    if (data) {
      bucket.source = KnowledgeSource.import(data);
    }
    return bucket;
  }

  getSource(): KnowledgeSource | null {
    if (this.source) return this.source;
    else return null;
  }

  hasSource(): boolean {
    return !!this.source;
  }

  clearLinks(): void {
    this.links.clearLinks();
  }

  addLink(bucket: KnowledgeBucket, currentTurn: number): void {
    const source = bucket.getSource();
    if (!source) return;
    this.links.addLink(source, currentTurn);
  }

  /**
   * @param completed whether the knowledge must have 100 points to be included
   * @returns list of knowledge names
   */
  getKnowledges(completed: boolean): string[] {
    const knowledgeNames = this.links.getKnowledges().filter(([_, progress]) => (
      !completed || progress === 100
    )).map(([knowledge, _]) => knowledge);
    return knowledgeNames;
  }

  /**
   * 
   * @returns knowledge map
   */
  getKnowledgeMap(): KnowledgeMap {
    return this.links.getKnowledgeMap();
  }

  /**
   * Returns `true` if this bucket has 100 points for all knowledges in `knowledgeNames`, else `false`.
   * @param knowledgeNames List of knowledge names, matching the keys of Knowledge.knowledgeTree.
   */
  hasKnowledges(knowledgeNames: string[]): boolean {
    if (!this.source) {
      const knowledges: { [name: string]: boolean } = {};
      for (const name of this.getKnowledges(true)) {
        knowledges[name] = true;
      }
      for (const name of knowledgeNames) {
        if (!(name in knowledges)) return false;
      }
      return true;
    }

    return this.source.hasKnowledges(knowledgeNames);
  }

  /**
   * 
   * @param knowledge The knowledge instance to be added.
   * @param amount The amount of the knowledge to be added. (0 - 100)
   * @param requirementPenalty Multiplier that will be applied to `amount` if the prerequisites of the knowledge are not present in this bucket.
   */
  addKnowledge(knowledge: Knowledge, amount: number, requirementPenalty: number, maxPoints = 100): void {
    if (maxPoints > 100 || maxPoints < 0) throw 'Invalid Knowledge Cap!';
    if (!this.source) this.source = KnowledgeSource.fromLinks(this.links);
    this.source.addKnowledge(knowledge, amount, requirementPenalty, maxPoints);
  }

  mergeKnowledge(bucketKnowledgeMap: KnowledgeMap): void {
    if (!this.source) return;
    const thisKnowledgeMap = this.getKnowledgeMap();
    for (const name in bucketKnowledgeMap) {
      const bucketProgress = bucketKnowledgeMap[name];
      const thisProgress = thisKnowledgeMap[name] ?? 0;
      if (bucketProgress > thisProgress) {
        this.addKnowledge(Knowledge.knowledgeTree[name], bucketProgress - thisProgress, 0.5); // TODO FIXME - magic number
      }
    }
  }

  turn(world: World): void {
    this.links.turn(world);
    if (this.source) {
      this.mergeKnowledge(this.links.getKnowledgeMap());
      this.source?.turn(world);
    }
  }
}
