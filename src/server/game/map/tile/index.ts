import { Unit, UnitData, UnitTypeCost } from './unit';
import { Improvement, ImprovementConstructionCost, ImprovementData } from './improvement';
import { City, CityData } from './city';
import { Yield, YieldParams } from './yield';
import { Knowledge } from './knowledge';

export interface TileData {
  type: string;
  elevation: number;
  movementCost: [number, number];
  yield: Yield;
  knowledges?: { [name: string]: number };
  unit?: UnitData;
  improvement?: ImprovementData;
  owner?: CityData;
  visible?: boolean;
}

export class Tile {
  static movementCostTable: { [type: string]: [number, number] } = {
    // tile name: [land mp, water mp] (0 = impassable)
    'ocean': [0, 1],
    'frozen_ocean': [0, 0],
    'river': [4, 1],
    'frozen_river': [3, 0],
    'grass_lowlands': [1, 0],
    'plains': [1, 0],
    'grass_hills': [2, 0],
    'grass_mountains': [4, 0],
    'desert': [1, 0],
    'desert_hills': [3, 0],
    'desert_mountains': [4, 0],
    'snow_plains': [2, 0],
    'snow_hills': [3, 0],
    'snow_mountains': [5, 0],
    'mountain': [0, 0],
  };

  movementCost: [number, number];
  type: string;
  elevation: number;

  private knowledges: { [name: string]: number };

  unit?: Unit;
  improvement?: Improvement;
  owner?: City;

  discoveredBy: { [civID: number]: boolean };
  visibleTo: { [civID: number]: number };

  public baseYield: Yield;

  constructor(type: string, tileHeight: number, baseYield: Yield) {
    this.movementCost = Tile.movementCostTable[type];
    this.type = type;
    this.elevation = tileHeight;

    this.knowledges = {};

    this.unit = undefined;
    this.improvement = undefined;
    this.owner = undefined;

    this.discoveredBy = {};
    this.visibleTo = {};

    this.baseYield = baseYield;
  }

  export() {
    return {
      // movementCost: this.movementCost,
      type: this.type,
      elevation: this.elevation,
      // unit: this.unit?.export(),
      improvement: this.improvement?.export(),
      // owner: this.owner?,
      discoveredBy: this.discoveredBy,
      // visibleTo: { [civID: number]: number },
      baseYield: this.baseYield,
      knowledges: this.knowledges,
    };
  }

  static import(data: any): Tile {
    const tile = new Tile(data.type, data.elevation, new Yield(data.baseYield));
    // tile.unit = Unit.import(data.unit);
    if (data.improvement) tile.improvement = Improvement.import(data.improvement);
    tile.discoveredBy = data.discoveredBy;
    tile.knowledges = data.knowledges;
    return tile;
  }

  getTileYield(): Yield {
    if (this.improvement) {
      return this.improvement.yield;
    } else {
      return this.baseYield;
    }
  }

  getDiscoveredData(): TileData {
    return {
      type: this.type,
      movementCost: this.movementCost,
      improvement: this.improvement?.getData(),
      owner: this.owner?.getData(),
      yield: this.getTileYield(),
      elevation: this.elevation,
    };
  }

  getVisibleData(): TileData {
    return {
      ...this.getDiscoveredData(),
      knowledges: this.knowledges,
      unit: this.unit?.getData(),
      visible: true,
    }
  }

  getMovementCost(unit: Unit): number {
    const mode = unit.getMovementClass();
    return mode > -1 ? this.movementCost[mode] || Infinity : 1;
  }

  setUnit(unit?: Unit): void {
    this.unit = unit;
  }

  setVisibility(civID: number, visible: boolean): void {
    if (visible) {
      this.visibleTo[civID]++;
    } else {
      this.visibleTo[civID]--;
    }

    if (visible && !this.discoveredBy[civID]) {
      this.discoveredBy[civID] = true;
    }
  }

  clearVisibility(civID: number): void {
    this.visibleTo[civID] = 0;
  }

  canSupply(requirement: YieldParams): boolean {
    return !!this.improvement && (
      this.improvement.yield.canSupply(requirement)
    );
  }

  /**
   * @param completed whether the knowledge must have 100 points to be included
   * @returns list of knowledge names
   */
  getKnowledges(completed: boolean): string[] {
    const knowledges = Object.keys(this.knowledges);
    if (!completed) return knowledges;
    return knowledges.filter(name => !(this.knowledges[name] < 100));
  }

  /**
   * 
   * @returns Map between knowledge name and [spilloverPoints, maxPoints]
   */
  getKnowledgeSpillover(): { [name: string]: [number, number] } {
    const KNOWLEDGE_SPREAD_DENOM = 10;

    const knowledgeSpillover = {};
    for (const name in this.knowledges) {
      const knowledgePoints = this.knowledges[name];
      const spillover = Math.ceil((knowledgePoints / 6) / KNOWLEDGE_SPREAD_DENOM);
      knowledgeSpillover[name] = [spillover, knowledgePoints];
    }
    return knowledgeSpillover;
  }

  /**
   * Returns `true` if this tile has 100 points for all knowledges in `knowledgeNames`, else `false`.
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
   * @param requirementPenalty Multiplier that will be applied to `amount` if the prerequisites of the knowledge are not present on this tile.
   */
  addKnowledge(knowledge: Knowledge, amount: number, requirementPenalty: number, maxPoints = 100): void {
    if (maxPoints > 100 || maxPoints < 0) throw 'Invalid Knowledge Cap!';
    if (!this.hasKnowledges(knowledge.prerequisites)) amount *= requirementPenalty;
    this.knowledges[knowledge.name] = Math.min(
      (this.knowledges[knowledge.name] ?? 0) + amount,
      Math.max(this.knowledges[knowledge.name] ?? 0, maxPoints)
    );
  }

  /**
   * 
   * @returns whether farms can be build on this tile
   */
  isFarmable(): boolean {
    const farmableTiles = {
      grass_lowlands: true,
      plains: true,
    };
    return farmableTiles[this.type];
  }

  /**
   * 
   * @returns list of improvements the builder on this tile knows how to build
   */
   getBuildableImprovements(): string[] {
    if (!(this.unit)) return [];
    return Knowledge.getBuildableImprovements(this.getKnowledges(true))
      .filter((improvementType) => {
        if (improvementType === 'farm' && !this.isFarmable()) return false;
        return true;
      });
  }

  /**
   * 
   * @returns list of units classes this improvement knows how to train
   */
   getTrainableUnitTypes(): string[] {
    if (!this.improvement) return [];
    const trainableUnitClasses = this.improvement.getTrainableUnitClasses().reduce((obj, name) => ({ ...obj, [name]: true }), {});
    return Knowledge.getTrainableUnits(this.getKnowledges(true))
      .filter(unitType => trainableUnitClasses[Unit.promotionClassTable[unitType]]);
  }

  /**
   * 
   * @returns type and cost of improvements the builder on this tile knows how to build, or null if it cannot build improvements
   */
   getImprovementCatalog(): ImprovementConstructionCost[] | null {
    const buildableImprovements = this.getBuildableImprovements();
    const catalog = Improvement.makeCatalog(buildableImprovements);
    if (catalog.length === 0) return null;
    return catalog;
  }

  /**
   * 
   * @returns type and cost of units this improvement knows how to train, or null if it cannot train units
   */
  getUnitCatalog(): UnitTypeCost[] | null {
    const trainableUnits = this.getTrainableUnitTypes();
    const catalog = Unit.makeCatalog(trainableUnits);
    if (catalog.length === 0) return null;
    return catalog;
  }

  /**
   * 
   * @returns type and cost of knowledges this tile knows how to research, or null if it cannot research
   */
  getKnowledgeCatalog(): Knowledge[] | null {
    if (!this.improvement) return null;
    const knowledgeBranches = this.improvement.getResearchableKnowledgeBranches().reduce((obj, branch) => ({ ...obj, [branch]: true }), {});
    const completedKnowledges = this.getKnowledges(true).filter(key => !(this.knowledges[key] < 100));
    const reachableKnowledges = Knowledge.getReachableKnowledges(completedKnowledges);
    const knowledgeCatalog = reachableKnowledges.filter(
      ({ name, branch }) => (knowledgeBranches[branch] && ((this.knowledges[name] ?? 0) < 100))
    );
    return knowledgeCatalog;
  }
}
