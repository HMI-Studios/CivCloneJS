import { Unit, UnitData, UnitTypeCost } from './unit';
import { Improvement, ImprovementConstructionCost, ImprovementData } from './improvement';
import { City, CityData } from './city';
import { Yield, YieldParams } from './yield';
import { Knowledge, KnowledgeBucket } from './knowledge';

export interface TileData {
  type: string;
  elevation: number;
  movementCost: [number, number];
  yield: Yield;
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
      unit: this.unit?.getData(),
      visible: true,
    }
  }

  getMovementCost(unit: Unit): number {
    const mode = unit.getMovementClass();
    return mode > -1 ? this.movementCost[mode] || Infinity : 1;
  }

  /**
   * 
   * @returns the total elevation of this tile plus the height of any improvemnts on it, rounded to the nearest unit.
   */
  getTotalElevation(): number {
    return Math.round(
      this.elevation + (this.improvement ? Improvement.improvementHeightTable[this.improvement.type] ?? 0 : 0)
    );
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
   * 
   * @returns whether farms can be build on this tile
   */
  isFarmable(): boolean {
    const farmableTileTypes = {
      'grass_lowlands': true,
      'plains': true,
    };
    return this.type in farmableTileTypes;
  }

  /**
   * 
   * @returns list of improvements the builder on this tile knows how to build
   * TODO - move this to Unit class
   */
   getBuildableImprovements(): string[] {
    if (!this.unit) return [];
    return Knowledge.getBuildableImprovements(this.unit.knowledge.getKnowledges(true))
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
    if (!this.improvement || !this.improvement.knowledge) return [];
    const trainableUnitClasses = this.improvement.getTrainableUnitClasses().reduce((obj, name) => ({ ...obj, [name]: true }), {});
    return Knowledge.getTrainableUnits(this.improvement.knowledge.getKnowledges(true))
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
    if (!this.improvement || !this.improvement.knowledge) return null;
    const knowledgeBranches = this.improvement.getResearchableKnowledgeBranches().reduce((obj, branch) => ({ ...obj, [branch]: true }), {});
    const completedKnowledges = this.improvement.knowledge.getKnowledges(true);
    const reachableKnowledges = Knowledge.getReachableKnowledges(completedKnowledges);
    const knowledgeCatalog = reachableKnowledges.filter(
      ({ name, branch }) => (knowledgeBranches[branch])
    );
    return knowledgeCatalog;
  }
}
