import { Unit, UnitData, UnitTypeCost } from './unit';
import { Improvement, ImprovementConstructionCost, ImprovementData } from './improvement';
import { City, CityData } from './city';
import { Yield, YieldParams } from './yield';
import { Knowledge, KnowledgeBucket } from './knowledge';
import { Wall, WallType } from './wall';
import { DomainID } from '../../leader';

export interface TileData {
  type: string;
  elevation: number;
  movementCost: [number, number];
  yield: Yield;
  unit?: UnitData;
  improvement?: ImprovementData;
  owner?: CityData;
  walls: [
    Wall | null,
    Wall | null,
    Wall | null,
    Wall | null,
    Wall | null,
    Wall | null,
  ];
  visible?: boolean;
}

export class Tile {
  static getDomainVisibilityKey(domainID: DomainID): string {
    return `${domainID.type}/${domainID.subID}`;
  }

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

  public movementCost: [number, number];

  type: string;
  elevation: number;

  unit?: Unit;
  improvement?: Improvement;
  owner?: City;

  private walls: [
    Wall | null,
    Wall | null,
    Wall | null,
    Wall | null,
    Wall | null,
    Wall | null,
  ];

  private discoveredBy: { [domainKey: string]: boolean };
  private visibleTo: { [domainKey: string]: number };

  public baseYield: Yield;

  constructor(type: string, tileHeight: number, baseYield: Yield) {
    this.movementCost = Tile.movementCostTable[type];
    this.type = type;
    this.elevation = tileHeight;

    this.unit = undefined;
    this.improvement = undefined;
    this.owner = undefined;

    this.walls = [null, null, null, null, null, null];

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
      walls: this.walls,
      yield: this.getTileYield(),
      elevation: this.elevation,
    };
  }

  getVisibleData(domainID: DomainID): TileData {
    return {
      ...this.getDiscoveredData(),
      unit: this.unit?.getData(domainID),
      visible: true,
    }
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

  isDiscoveredBy(domainID: DomainID): boolean {
    const key = Tile.getDomainVisibilityKey(domainID);
    return key in this.discoveredBy;
  }

  isVisibleTo(domainID: DomainID): boolean {
    const key = Tile.getDomainVisibilityKey(domainID);
    return this.visibleTo[key] > 0;
  }


  setVisibility(domainID: DomainID, visible: boolean): void {
    const key = Tile.getDomainVisibilityKey(domainID);

    if (!(key in this.visibleTo)) this.visibleTo[key] = 0;

    if (visible) {
      this.visibleTo[key]++;
    } else {
      this.visibleTo[key]--;
    }

    if (visible && !this.discoveredBy[key]) {
      this.discoveredBy[key] = true;
    }
  }

  clearVisibility(domainID: DomainID): void {
    const key = Tile.getDomainVisibilityKey(domainID);
    this.visibleTo[key] = 0;
  }

  getWall(direction: number): Wall | null {
    return this.walls[direction];
  }

  setWall(direction: number, type: number): void {
    this.walls[direction] = { type };
  }

  hasBlockingWall(direction: number): boolean {
    const wall = this.walls[direction];
    return wall !== null && wall.type !== WallType.OPEN_GATE && wall.type !== WallType.WALL_RUIN;
  }

  canSupply(requirement: YieldParams): this is Tile & { improvement: Improvement } {
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
    const unitKnowledge = this.unit.knowledge;
    return Knowledge.getBuildableImprovements(Object.keys(unitKnowledge).filter((name) => !(unitKnowledge[name] < 100)))
      .filter((improvementType) => {
        if (improvementType === 'farm' && !this.isFarmable()) return false;
        return true;
      });
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
    if (!this.improvement) return null;
    const trainableUnits = this.improvement.getTrainableUnitTypes();
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
    const knowledgeNames: { [name: string]: boolean } = this.improvement.getResearchableKnowledgeNames().reduce((obj, name) => ({ ...obj, [name]: true }), {});
    const knowledgeMap = this.improvement.knowledge.getKnowledgeMap();
    const completedKnowledges = this.improvement.knowledge.getKnowledges(true);
    const reachableKnowledges = Knowledge.getReachableKnowledges(completedKnowledges);
    const knowledgeCatalog = reachableKnowledges.filter(
      ({ name }) => (knowledgeNames[name] && ((knowledgeMap[name] ?? 0) < 100))
    );
    return knowledgeCatalog;
  }
}
