import { Unit, UnitData } from './unit';
import { Improvement, ImprovementData } from './improvement';
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
    };
  }

  static import(data: any): Tile {
    const tile = new Tile(data.type, data.elevation, new Yield(data.baseYield));
    // tile.unit = Unit.import(data.unit);
    if (data.improvement) tile.improvement = Improvement.import(data.improvement);
    tile.discoveredBy = data.discoveredBy;
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
   * Returns `true` if this tile has 100 points for all knowledges in `knowledgeNames`, else `false`.
   * @param knowledgeNames List of knowledge names, matching the keys of Knowledge.knowledgeTree.
   */
  hasKnowledges(knowledgeNames: string[]): boolean {
    for (const name of knowledgeNames) {
      if (this.knowledges[name] < 100) return false;
    }
    return true;
  }

  /**
   * 
   * @param knowledge The knowledge instance to be added.
   * @param amount The amount of the knowledge to be added. (0 - 100)
   * @param requirementPenalty Multiplier that will be applied to `amount` if the prerequisites of the knowledge are not present on this tile.
   */
  addKnowledge(knowledge: Knowledge, amount: number, requirementPenalty: number): void {
    if (this.hasKnowledges(knowledge.prerequisites)) amount *= requirementPenalty;
    this.knowledges[knowledge.name] = Math.max(this.knowledges[knowledge.name] + amount, 100);
  }

  /**
   * 
   * @returns type and cost of knowledges this tile knows how to research, or null if it cannot research
   */
  getKnowledgeCatalog(): Knowledge[] | null {
    if (!this.improvement) return null;
    const researchableKnowledges = this.improvement.getResearchableKnowledges().reduce((obj, name) => ({ ...obj, [name]: true }), {});
    const completedKnowledges = this.knowledges ? Object.keys(this.knowledges).filter(key => !(this.knowledges[key] < 100)) : [];
    const reachableKnowledges = Knowledge.getReachableKnowledges(completedKnowledges);
    const knowledgeCatalog = reachableKnowledges.filter(({ name }) => researchableKnowledges[name]);
    console.log(researchableKnowledges, completedKnowledges, reachableKnowledges, knowledgeCatalog);
    return knowledgeCatalog;
  }
}
