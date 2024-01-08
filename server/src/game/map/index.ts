import { Coords, World } from '../world';
import { MovementClass, PromotionClass, Unit } from './tile/unit';
import { BarbarianCamp, City } from './tile/city';
import { Tile, TileData } from './tile';
import { Improvement, Worksite } from './tile/improvement';
import { getAdjacentCoords, mod, Event, arrayIncludesCoords, getCoordInDirection, getDirection, coordsRepr } from '../../utils';
import { Route, Trader, TraderData } from './trade';
import { Yield, YieldParams } from './tile/yield';
import { ErrandAction, ErrandType } from './tile/errand';
import { KnowledgeMap, KNOWLEDGE_SPREAD_RANGE, KNOWLEDGE_SPREAD_SPEED } from './tile/knowledge';
import { InvalidCoordsError } from '../../utils/error';

// MAGIC NUMBER CONSTANTS - TODO GET RID OF THESE?
const TRADER_SPEED = 1;
const TRADER_CAPACITY: YieldParams = {
  food: 10,
  production: 10,
  science: 5,
};

export interface MapOptions {
  width: number;
  height: number;
}

export class Map {
  height: number;
  width: number;
  seed: number;
  cities: City[];
  traders: Trader[];
  updates: { (civID: number): Event }[];

  private tiles: Tile[];

  constructor(height: number, width: number, seed: number) {
    this.height = height;
    this.width = width;
    this.seed = seed;
    this.tiles = new Array(height*width);
    this.cities = [];
    this.traders = [];
    this.updates = [];
  }

  export() {
    return {
      height: this.height,
      width: this.width,
      seed: this.seed,
      tiles: this.tiles.map(tile => tile.export()),
      cities: this.cities.map(city => city.export()),
      traders: this.traders.map(trader => trader.export()),
    };
  }

  /**
   * 
   * @param data 
   * @returns 
   */
  static import(data: any): [Map, ((world: World) => void)[]] {
    const map = new Map(data.height, data.width, data.seed);
    map.tiles = data.tiles.map((tileData: any) => Tile.import(tileData));
    map.cities = data.cities.map((cityData: any) => {
      const city = City.import(cityData);
      const set = city.getTiles();
      for (const coords of set) {
        map.setTileOwner(coords, city, false);
      }
      return city;
    });
    map.traders = data.traders.map((traderData: any) => Trader.import(map, traderData));
    const callbacks: ((world: World) => void)[] = [];
    map.forEachTile((tile, coords): void => {
      callbacks.push((world: World): void => {
        if (tile.improvement?.knowledge) {
          map.updateImprovementLinks(world, tile, coords, tile.improvement);
        }
      });
    });
    return [map, callbacks];
  }

  private pos({ x, y }: Coords): number {
    return (y * this.width) + mod(x, this.width);
  }

  private coords(pos: number): Coords {
    return {
      x: mod(pos, this.width),
		  y: Math.floor(pos / this.width),
    };
  }

  public areValidCoords(coords: Coords) {
    return coords.y >= 0 && coords.y < this.height;
  }

  public areSameCoords(pos1: Coords, pos2: Coords): boolean {
    return mod(pos1.x, this.width) === mod(pos2.x, this.width) && pos1.y === pos2.y;
  }

  getUpdates(): { (civID: number): Event }[] {
    return this.updates.splice(0);
  }

  getTile(coords: Coords): Tile | undefined {
    return this.tiles[this.pos(coords)];
  }

  getTileOrThrow(coords: Coords): Tile {
    const tile = this.getTile(coords);
    if (!tile) throw new InvalidCoordsError(`Bad coords: ${coordsRepr(coords)}`);
    return tile;
  }

  setTile(coords: Coords, tile: Tile): void {
    this.tiles[this.pos(coords)] = tile;
  }

  public forEachTile(callback: (tile: Tile, coords: Coords) => void): void {
    for (let pos = 0; pos < this.tiles.length; pos++) {
      const tile = this.tiles[pos];
      const coords = this.coords(pos);

      callback(tile, coords)
    }
  }

  private getNeighborsRecurse(
    coords: Coords,
    r: number,
    tileSet: Set<Tile>,
    coordList: Coords[],
    rangeMap: { [pos: number]: number },
    filter?: (tile: Tile, coords: Coords) => boolean,
  ): void {
    if (r < 0) return;

    const tile = this.getTile(coords);
    if (!tile) return;

    if (!tileSet.has(tile)) {
      if (!filter || filter(tile, coords)) {
        tileSet.add(tile);
        coordList.push(coords);
        rangeMap[this.pos(coords)] = r;
      }
    }

    for (const coord of getAdjacentCoords(coords)) {
      const pos = this.pos(coord);
      if (!rangeMap[pos] || rangeMap[pos] < r - 1) {
        this.getNeighborsRecurse(coord, r-1, tileSet, coordList, rangeMap, filter);
      }
    }
  }

  /**
   * 
   * @param coords 
   * @param r 
   * @param options
   * @returns A list of coords. Since the internal _getNeighborsRecurse function fetches the tile for each coord
   * and validates it, all coords in this list are guaranteed to be on the map.
   */
  getNeighborsCoords(coords: Coords, r = 1, options?: {
    filter?: (tile: Tile, coords: Coords) => boolean,
    excludeCenter?: boolean,
  }): Coords[] {
    const coordList: Coords[] = [];
    let filter = options?.filter;
    if (options?.excludeCenter) {
      filter = (tile: Tile, coordsToFilter: Coords): boolean => {
        let filterResult = options.filter ? options.filter(tile, coordsToFilter) : true;
        return !this.areSameCoords(coordsToFilter, coords) && filterResult;
      };
    }
    this.getNeighborsRecurse(coords, r, new Set(), coordList, {}, filter);

    return coordList;
  }

  getStepMovementCost(atPos: Coords, adjPos: Coords, mode: MovementClass): number {
    if (mode === MovementClass.AIR) return 1;

    const atTile = this.getTile(atPos);
    const adjTile = this.getTile(adjPos);
    if (!(atTile && adjTile)) {
      throw new InvalidCoordsError(
        `Error calculating movement cost from ${coordsRepr(atPos)} to ${coordsRepr(adjPos)}: one or both of the given coords are invalid.`
      );
    }
    
    // PATH BLOCKING LOGIC HERE
    // if (tile.unit && tile.unit.civID === this.player.civID) return Infinity;
    if (adjTile.hasBlockingWall(getDirection(adjPos, atPos))) return Infinity;
    if (atTile.hasBlockingWall(getDirection(atPos, adjPos))) return Infinity;

    return adjTile.movementCost[mode] ?? Infinity;
  }

  getPathTree(srcPos: Coords, range: number, mode: MovementClass): [{[key: string]: Coords}, {[key: string]: number}] {
    // BFS to find all tiles within `range` steps

    const queue: Coords[] = [];
    queue.push(srcPos);

    const dst: { [pos: number]: number } = {};
    dst[this.pos(srcPos)] = 0;

    const paths: { [pos: number]: Coords } = {};

    while (queue.length) {
      const atPos = queue.shift() as Coords;

      for (const adjPos of this.getNeighborsCoords(atPos, 1, { excludeCenter: true })) {

        const movementCost = this.getStepMovementCost(atPos, adjPos, mode);
        if (!(this.pos(adjPos) in dst) || dst[this.pos(adjPos)] > dst[this.pos(atPos)] + movementCost) {
          dst[this.pos(adjPos)] = dst[this.pos(atPos)] + movementCost;

          if (dst[this.pos(adjPos)] <= range) {
            paths[this.pos(adjPos)] = atPos;
            queue.push(adjPos);
          }
        }
      }
    }

    return [paths, dst];
  }

  private getVisibleTilesRecurse(
    coords: Coords,
    maxElevation: number,
    slope: number,
    r: number,
    direction: number,
    coordsArray: Coords[],
    tileSet: Set<Tile>,
    stepsUntilSpread: number,
    stepLength: number,
  ): void {
    if (r <= 0) return;

    const tile = this.getTile(coords);
    if (!tile) return;

    if (!tileSet.has(tile) && tile.getTotalElevation() >= maxElevation) {
      coordsArray.push(coords);
      tileSet.add(tile);
    }

    if (stepsUntilSpread === 0) {
      const newLeftCoords = getCoordInDirection(coords, direction-1);
      const newLeftTile = this.getTile(newLeftCoords);
      if (newLeftTile) {
        const newLeftSlope = newLeftTile.getTotalElevation() - maxElevation;
        this.getVisibleTilesRecurse(
          newLeftCoords, maxElevation + slope, Math.max(slope, newLeftSlope),
          r-1, direction, coordsArray, tileSet, stepLength, stepLength
        );
      }
      const newCoords = getCoordInDirection(coords, direction);
      const newTile = this.getTile(newCoords);
      if (newTile) {
        const newSlope = newTile.getTotalElevation() - maxElevation;
        this.getVisibleTilesRecurse(
          newCoords, maxElevation + slope, Math.max(slope, newSlope),
          r-1, direction, coordsArray, tileSet, stepLength, stepLength
        );
      }
      const newRightCoords = getCoordInDirection(coords, direction+1);
      const newRightTile = this.getTile(newRightCoords);
      if (newRightTile) {
        const newRightSlope = newRightTile.getTotalElevation() - maxElevation;
        this.getVisibleTilesRecurse(
          newRightCoords, maxElevation + slope, Math.max(slope, newRightSlope),
          r-1, direction, coordsArray, tileSet, stepLength, stepLength
        );
      }
    } else {
      const newCoords = getCoordInDirection(coords, direction);
      const newTile = this.getTile(newCoords);
      if (newTile) {
        const newSlope = newTile.getTotalElevation() - maxElevation;
        this.getVisibleTilesRecurse(
          newCoords, maxElevation + slope, Math.max(slope, newSlope),
          r-1, direction, coordsArray, tileSet, stepsUntilSpread-1, stepLength
        );
      }
    }
  }

  /**
   * 
   * @param unit 
   * @param range 
   * @returns A list of coords visible to the unit. These coords are all guaranteed to be on the map.
   */
  getVisibleTilesCoords(unit: Unit, range?: number): Coords[] {
    const coordsArray: Coords[] = [];
    const tileSet: Set<Tile> = new Set();

    const tile = this.getTileOrThrow(unit.coords);

    coordsArray.push(unit.coords);
    tileSet.add(tile);
    for (let direction = 0; direction < 6; direction++) {
      const newCoords = getCoordInDirection(unit.coords, direction);
      const newTile = this.getTile(newCoords);
      if (!newTile) continue;
      const slope = newTile.getTotalElevation() - tile.getTotalElevation();

      this.getVisibleTilesRecurse(
        newCoords,
        tile.getTotalElevation() + slope,
        slope,
        range ?? unit.visionRange,
        direction,
        coordsArray,
        tileSet,
        0,
        1,
      );
    }
    return coordsArray;
  }

  canUnitSee(unit: Unit, targetCoords: Coords, options?: { isAttack?: boolean }): boolean {
    const isAttack = options?.isAttack ?? false;
    const visibleTiles = this.getVisibleTilesCoords(unit, isAttack ? (unit.attackRange ?? 1) : unit.visionRange);
    return arrayIncludesCoords(visibleTiles, targetCoords);
  }

  canUnitAttack(unit: Unit, target: Unit): boolean {
    if (unit.promotionClass === PromotionClass.RANGED) {
      return this.canUnitSee(unit, target.coords, { isAttack: true });
    } else {
      return unit.isAdjacentTo(target.coords);
    }
  }

  setTileOwner(coords: Coords, owner: City, overwrite: boolean): void {
    const tile = this.getTileOrThrow(coords);
    if (tile.owner) {
      if (!overwrite) return;
      tile.owner?.removeTile(coords);
      if (tile.owner.civID) {
        tile.setVisibility(tile.owner.civID, false);
      }
    }
    tile.owner = owner;
    if (owner.civID) {
      tile.setVisibility(owner.civID, true);
    }
    owner.addTile(coords);
  }

  private getTileDataByCiv(civID: number, tile: Tile): TileData | null {
    if (!tile.discoveredBy[civID]) {
      return null;
    }

    if (tile.visibleTo[civID]) {
      return tile.getVisibleData(civID);
    } else {
      return tile.getDiscoveredData();
    }
  }

  getCivMap(civID: number): (TileData | null)[] {
    return this.tiles.map((tile) => {
      return this.getTileDataByCiv(civID, tile);
    });
  }

  getTraderDataByCiv(civID: number): TraderData[] {
    return this.traders.filter((trader) => trader.civID === civID).map(trader => trader.getData());
  }

  setTileVisibility(civID: number, coords: Coords, visible: boolean) {
    this.getTileOrThrow(coords).setVisibility(civID, visible);
    this.tileUpdate(coords);
  }

  isInBounds({ x, y }: Coords): boolean {
    return mod(x, this.width) >= 0 && mod(x, this.width) < this.width && y >= 0 && y < this.height;
  }

  tileUpdate(coords: Coords): void {
    // if (coords.x === null && coords.y === null) return;
    const tile = this.getTileOrThrow(coords);
    this.updates.push( (civID: number) => ['tileUpdate', [ coords, this.getTileDataByCiv(civID, tile) ]] );
  }

  moveUnitTo(unit: Unit, coords: Coords): void {
    // mark tiles currently visible by unit as unseen
    const srcVisible = this.getVisibleTilesCoords(unit);
    for (const visibleCoords of srcVisible) {
      if (unit.civID !== undefined) this.setTileVisibility(unit.civID, visibleCoords, false);
    }

    this.getTileOrThrow(unit.coords).setUnit(undefined);
    this.tileUpdate(unit.coords);
    unit.coords = coords;
    this.getTileOrThrow(coords).setUnit(unit);
    this.tileUpdate(coords);

    // mark tiles now visible by unit as seen
    const newVisible = this.getVisibleTilesCoords(unit);
    for (const visibleCoords of newVisible) {
      if (unit.civID !== undefined) this.setTileVisibility(unit.civID, visibleCoords, true);
    }
  }

  addTrader(trader: Trader) {
    this.traders.push(trader);
  }

  private findPath(pathTree: {[key: string]: Coords}, srcPosKey: number, target: Coords): Coords[] | null {
    if (srcPosKey in pathTree) {
      if (this.pos(pathTree[srcPosKey]) === this.pos(target)) {
        return [target];
      } else {
        const subPath = this.findPath(pathTree, this.pos(pathTree[srcPosKey]), target);
        if (!subPath) return null;
        return [pathTree[srcPosKey], ...subPath];
      }
    } else {
      return null;
    }
  }

  private findRoute(pathTree: {[key: string]: Coords}, dst: {[key: string]: number}, srcPosKey: number, target: Coords): Route | null {
    const srcCoords = this.coords(srcPosKey);
    const path = this.findPath(pathTree, srcPosKey, target);
    if (!path) return null;
    const fullPath = [srcCoords].concat(path);

    /***
     * Routes *must* guarantee that *both* the source and target tiles are included within the path,
     * unlike normal paths which only include the target. To guarantee this, the Route cannot be
     * returned if the expected source and target tiles are not the same as those on the path.
     */
    const [srcTile, targetTile] = [this.getTile(srcCoords), this.getTile(target)];
    if (!(srcTile === this.getTile(fullPath[0]) && targetTile === this.getTile(path[path.length - 1]))) return null;
    
    return [fullPath, dst[srcPosKey]];
  }

  validateRoute(route: Route, mode: MovementClass): boolean {
    const [ path, maximumLength ] = route;
    let previousPos: Coords | null = null;
    let length = 0;
    for (const pos of path) {
      if (previousPos !== null) {
        length += this.getStepMovementCost(previousPos, pos, mode);
      }
      previousPos = pos;
    }
    return length <= maximumLength;
  }

  recreateTradeRoute(trader: Trader, range = 5): void {
    const oldPath = trader.path;
    const sourcePos = oldPath[0];
    const sinkPos = oldPath[oldPath.length - 1];
    const [pathTree, dst] = this.getPathTree(sinkPos, range, trader.movementClass);
    const sourceTile = this.getTileOrThrow(sourcePos);
    if (!sourceTile.improvement) return;
    const sinkTile = this.getTileOrThrow(sinkPos);
    if (!sinkTile.improvement) return;
    const route = this.findRoute(pathTree, dst, this.pos(sourcePos), sinkPos);
    if (!route) return;
    this.addTrader(
      new Trader(
        trader.civID,
        route,
        sourceTile.improvement,
        sinkTile.improvement,
        TRADER_SPEED,
        TRADER_CAPACITY, // TODO - this is not correct, but it will work for now.
        trader.movementClass
      )
    );
  }

  createTradeRoutes(civID: number, coords: Coords, sink: Improvement, requirement: YieldParams, range = 5, mode = 0): void {
    const [pathTree, dst] = this.getPathTree(coords, range, mode);
    const posKeys = Object.keys(dst).sort((a, b) => {
      if (dst[a] > dst[b]) return 1;
      else return -1;
    });
    for (const pos of posKeys) {
      const tile = this.tiles[Number(pos)];
      if (tile.owner?.civID === civID && tile.canSupply(requirement)) {
        const route = this.findRoute(pathTree, dst, Number(pos), coords);
        if (!route) continue;
        this.addTrader(new Trader(civID, route, tile.improvement, sink, TRADER_SPEED, Yield.min(TRADER_CAPACITY, requirement), mode));
      }
    }
  }

  canSettleOn(tile: Tile): boolean {
    return (
      !tile.owner &&
      tile.type !== 'ocean' &&
      tile.type !== 'frozen_ocean' &&
      tile.type !== 'mountain' &&
      tile.type !== 'coastal' &&
      tile.type !== 'frozen_coastal' &&
      tile.type !== 'river'
    );
  }

  newBarbarianCampAt(coords: Coords): number | null {
    const tile = this.getTileOrThrow(coords);
    if (!this.canSettleOn(tile)) return null;

    const cityID = this.cities.length;
    const camp: BarbarianCamp = new BarbarianCamp(cityID, coords);
    this.cities.push(camp);

    this.setTileOwner(coords, camp, false);

    this.buildImprovementAt(coords, 'barbarian_camp');
    return cityID;
  }

  settleCityAt(coords: Coords, name: string, civID: number, settler: Unit): boolean {
    const tile = this.getTileOrThrow(coords);
    if (!this.canSettleOn(tile)) return false;

    const cityID = this.cities.length;
    const city: City = new City(cityID, coords, name, civID);
    this.cities.push(city);

    for (const neighbor of this.getNeighborsCoords(coords)) {
      this.setTileOwner(neighbor, city, false);

      this.tileUpdate(neighbor);
    }

    this.buildImprovementAt(coords, 'settlement', civID, settler.knowledge);
    return true;
  }

  startErrandAt(coords: Coords, improvement: Improvement, errand: ErrandAction): void {
    improvement.startErrand(errand);
    this.tileUpdate(coords);
  }

  startConstructionAt(coords: Coords, improvementType: string, ownerID: number, builder: Unit): void {
    const tile = this.getTileOrThrow(coords);
    if (tile.owner?.civID !== ownerID) return;
    
    tile.improvement = new Improvement(['worksite', tile.baseYield]);
    this.startErrandAt(coords, tile.improvement, {
      type: ErrandType.CONSTRUCTION,
      option: improvementType,
    });
    this.createTradeRoutes(ownerID, coords, tile.improvement, (tile.improvement as Worksite).errand.cost);

    this.tileUpdate(coords);
  }

  canBuildOn(tile: Tile): boolean {
    return (
      tile.type !== 'ocean' &&
      tile.type !== 'frozen_ocean' &&
      tile.type !== 'mountain'
    );
  }

  buildImprovementAt(coords: Coords, type: string, ownerID?: number, knowledges?: KnowledgeMap): void {
    const tile = this.getTileOrThrow(coords);
    if (tile.owner?.civID !== ownerID) return;
    if (!this.canBuildOn(tile)) return;

    tile.improvement = new Improvement([type, tile.baseYield, knowledges]);

    this.tileUpdate(coords);
  }

  trainUnitAt(coords: Coords, unitType: string, ownerID: number): void {
    const tile = this.getTileOrThrow(coords);

    if (tile.owner?.civID === ownerID && tile.improvement) {
      if (tile.improvement.getTrainableUnitTypes().includes(unitType)) {
        if (!tile.improvement.errand) {
          // TODO - maybe change this in the future, to where new training errands overwrite old ones?
          // That would require gracefully closing the previous errands though, so that is for later.
          this.startErrandAt(coords, tile.improvement, {
            type: ErrandType.UNIT_TRAINING,
            option: unitType,
            location: coords,
          })
          this.createTradeRoutes(ownerID, coords, tile.improvement, (tile.improvement as Worksite).errand.cost);
        }
      }
    }

    this.tileUpdate(coords);
  }

  researchKnowledgeAt(coords: Coords, knowledgeName: string, ownerID: number): void {
    const tile = this.getTileOrThrow(coords);

    if (tile.owner?.civID === ownerID && tile.improvement) {

      // Note that this check technically allows the client to "cheat": research errands can begin without
      // the prerequesites having been fulfilled. These errands will simply do nothing when completed.
      if (tile.improvement.getResearchableKnowledgeNames().includes(knowledgeName)) {

        // TODO - change this in the future, to where new research errands overwrite old ones?
        // That would require gracefully closing the previous errands though, so that is for later.
        if (!tile.improvement.errand) {
          this.startErrandAt(coords, tile.improvement, {
            type: ErrandType.RESEARCH,
            option: knowledgeName,
            location: coords,
          })
          this.createTradeRoutes(ownerID, coords, tile.improvement, (tile.improvement as Worksite).errand.cost);
        }
      }
    }

    this.tileUpdate(coords);
  }

  private updateImprovementLinks(world: World, tile: Tile, coords: Coords, improvement: Improvement) {
    if (!improvement.knowledge) return;
    improvement.knowledge.clearLinks();
    const [_, posDistances] = this.getPathTree(coords, KNOWLEDGE_SPREAD_RANGE, 0);
    for (const pos in posDistances) {
      const otherTile: Tile | undefined = this.tiles[Number(pos)];
      if (
        !otherTile ||
        !otherTile.improvement ||
        !otherTile.improvement.knowledge ||
        !otherTile.improvement.knowledge.hasSource()
      ) continue;
      const distance = posDistances[pos];
      improvement.knowledge.addLink(otherTile.improvement.knowledge, Math.round(world.currentTurn - (distance / KNOWLEDGE_SPREAD_SPEED)));
    }

    improvement.knowledge.turn(world);
  }

  turn(world: World): void {
    // Tiles
    this.forEachTile((tile, coords) => {
      if (tile.improvement) {
        tile.improvement.work(world);
        if (tile.improvement.errand?.completed) {
          tile.improvement.errand.complete(world, this, tile);
          delete tile.improvement.errand;
        }

        if (tile.improvement.knowledge) {
          this.updateImprovementLinks(world, tile, coords, tile.improvement);

          if (tile.unit && tile.unit.civID === tile.owner?.civID) {
            const tileKnowledgeMap = tile.improvement.knowledge.getKnowledgeMap();
            tile.unit.updateKnowledge(tileKnowledgeMap);
          }
        }
      }
    });

    this.cities.forEach(city => city.turn(world, this));

    // Traders
    const traderResets: (() => void)[] = [];
    for (let i = 0; i < this.traders.length; i++) {
      const trader = this.traders[i];

      const isValid = this.validateRoute([trader.path, trader.length], trader.movementClass);
      if (!isValid) {
        traderResets.push(() => {
          this.recreateTradeRoute(trader);
        })
        trader.expire();
      }

      trader.shunt();
      if (trader.expired) {
        this.traders.splice(i, 1);
        i--;
      }
    }
    for (const resetTrader of traderResets) {
      resetTrader();
    }
  }
}
