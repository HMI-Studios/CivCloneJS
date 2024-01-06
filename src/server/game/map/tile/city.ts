import { Tile } from ".";
import { Map } from "..";
import { arrayIncludesCoords, getAdjacentCoords, getCoordInDirection, getDirection, getSmallestCoordsDiff, mod } from "../../../utils";
import { World, Coords } from "../../world";
import { ErrandType } from "./errand";
import { Improvement } from "./improvement";
import { Unit } from "./unit";

export interface CityData {
  name: string;
  civID?: number;
  isBarbarian: boolean;
}

export class City {
  id: number;
  center: Coords;
  name: string;
  civID?: number;
  units: Unit[];

  private tiles: Set<Coords>;

  constructor(id: number, center: Coords, name: string, civID?: number) {
    this.id = id;
    this.center = center;
    this.name = name;
    this.civID = civID;
    this.units = [];

    this.tiles = new Set();
    this.addTile(center);
  }

  export() {
    const tiles: Coords[] = [];
    for (const coords of this.tiles) {
      tiles.push(coords)
    }
    return {
      center: this.center,
      name: this.name,
      civID: this.civID,
      isBarbarian: this instanceof BarbarianCamp,
      tiles,
    };
  }

  static import(data: any): City {
    const city = new (data.isBarbarian ? BarbarianCamp : City)(data.center, data.name, data.civID);
    city.tiles = new Set();
    for (const coords of data.tiles) {
      city.addTile(coords);
    }
    return city;
  }

  getData(): CityData {
    return {
      name: this.name,
      civID: this.civID,
      isBarbarian: this instanceof BarbarianCamp,
    };
  }

  getTiles(): Set<Coords> {
    return this.tiles;
  }

  addTile(coords: Coords) {
    this.tiles.add(coords);
  }

  removeTile(coords: Coords) {
    this.tiles.delete(coords);
  }

  getUnits(): Unit[] {
    return this.units;
  }

  getUnitPositions(): Coords[] {
    return this.units.map(unit => unit.coords);
  }

  addUnit(unit: Unit): void {
    this.units.push(unit);
    if (this instanceof BarbarianCamp) {
      unit.setBarbarian(true);
    }
  }

  removeUnit(unit: Unit): void {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }

  turn(world: World, map: Map): void {
    // By default, do nothing (for now)
  }


}

export class UnitController extends City {
  protected world: World;
  protected map: Map;

  moveUnit(unit: Unit, toPos: Coords, allowCombat?: boolean): boolean {
    const tile = this.map.getTile(toPos);
    if (!tile) return false;
    const movementCost = tile.getMovementCost(unit, getDirection(toPos, unit.coords));
    if (unit.movement < movementCost) return false;
    if (tile.unit) {
      if (!allowCombat) return false;
      this.world.meleeCombat(unit, tile.unit);
      unit.movement = 0;
      return true;
    }
    this.map.moveUnitTo(unit, toPos);
    unit.movement -= movementCost;
    return true;
  }

  turn(world: World, map: Map): void {
    super.turn(world, map);
    if (!this.world) this.world = world;
    if (!this.map) this.map = map;
  }
}

export class BarbarianCamp extends UnitController {
  private raidTarget?: Coords;
  private settleTarget?: Coords;
  private danger: boolean;

  constructor(id: number, center: Coords) {
    super(id, center, 'camp', undefined)
    this.danger = false;
  }

  handleErrands() {
    const camp = this.map.getTile(this.center).improvement as Improvement;
    if (camp.errand) return;

    if (this.danger) {
      this.map.startErrandAt(this.center, camp, {
        type: ErrandType.UNIT_TRAINING,
        option: 'warrior',
        location: this.center,
      });
    } else if (!this.units.some(unit => unit.type === 'scout')) {
      this.map.startErrandAt(this.center, camp, {
        type: ErrandType.UNIT_TRAINING,
        option: 'scout',
        location: this.center,
      });
    } else {
      let raidMode: boolean;
      raidMode = true;
      if (!this.raidTarget && this.settleTarget) {
        raidMode = false;
      } else if (this.settleTarget) {
        raidMode = Boolean(this.world.random.randInt(0, 1));
      }
      if (this.units.some(unit => unit.type === 'settler')) {
        raidMode = true;
      }
      if (raidMode) {
        // TODO
      } else {
        this.map.startErrandAt(this.center, camp, {
          type: ErrandType.UNIT_TRAINING,
          option: 'settler',
          location: this.center,
        });
      }
    }
  }

  turn(world: World, map: Map): void {
    super.turn(world, map);

    const neighborhoodCoords = map.getNeighborsCoords(this.center, 5);
    const neighborhoodTiles = neighborhoodCoords.map(coords => map.getTile(coords));
    this.danger = false;
    for (const tile of neighborhoodTiles) {
      if (tile.unit && (tile.unit.civID !== undefined || (tile.unit.cityID !== this.id || !tile.unit.isBarbarian))) {
        this.danger = true;
        break;
      }
    }

    this.handleErrands();
    

    this.units.forEach(unit => {
      unit.newTurn();

      const visibleCoords = map.getVisibleTilesCoords(unit);
      const canSeeCamp = arrayIncludesCoords(visibleCoords, this.center);
      if (unit.type === 'scout') {
        const MAX_SCOUTING_TURNS = 15;
        if (!('turnsSinceCampSpotted' in unit.automationData)) {
          unit.automationData.turnsSinceCampSpotted = 0;
        }
        unit.automationData.turnsSinceCampSpotted++;
        if (unit.automationData.turnsSinceCampSpotted > MAX_SCOUTING_TURNS) {
          unit.automationData.target = this.center;
          delete unit.automationData.wanderTarget;
        }
        visibleCoords.forEach(coords => {
          const tile = map.getTile(coords);
          if (tile.improvement) {
            if (tile.improvement.type === 'barbarian_camp') {
              unit.automationData.turnsSinceCampSpotted = 0;
              if (!(coords.x === this.center.x && coords.y === this.center.y)) {
                unit.automationData.target = this.center;
                delete unit.automationData.wanderTarget;
              } else {
                this.raidTarget = unit.automationData.raidTarget ?? this.raidTarget;
                this.settleTarget = unit.automationData.settleTarget ?? this.settleTarget;
                delete unit.automationData.raidTarget;
                delete unit.automationData.settleTarget;
              }
            }
          }
          if (unit.automationData.turnsSinceCampSpotted > 7 && !canSeeCamp) {
            if (map.canSettleOn(tile) && !unit.automationData.settleTarget) {
              unit.automationData.settleTarget = coords;
            }
          }
        });
      } else if (unit.type === 'settler') {
        if (!unit.automationData.target) {
          if (canSeeCamp) {
            if (this.settleTarget) unit.automationData.target = this.settleTarget;
            else return;
          } else {
            unit.automationData.target = this.center;
          }
        } else {
          visibleCoords.forEach(coords => {
            const tile = map.getTile(coords);
            if (!unit.automationData.target) {
              if (tile.unit?.cityID === this.id && tile.unit.type === 'scout' && tile.unit.automationData.settleTarget) {
                unit.automationData.target = tile.unit.automationData.settleTarget;
              }
            }
            if (tile.unit && tile.unit.cityID !== this.id) {
              unit.automationData.target = this.center;
            }
          });
          if (
            unit.automationData.target && (
              (unit.coords.x === unit.automationData.target.x && unit.coords.y === unit.automationData.target.y) ||
              arrayIncludesCoords(getAdjacentCoords(unit.coords), unit.automationData.target)
            )
          ) {
            const tile = map.getTile(unit.automationData.target);
            if (!canSeeCamp && map.canSettleOn(tile)) {
              map.newBarbarianCampAt(unit.automationData.target);
              return world.removeUnit(unit);
            } else {
              unit.automationData.target = this.center;
              delete this.settleTarget;
            }
          }
        }
      } else if (unit.type === 'warrior') {
        if (!unit.automationData.target) {
          unit.automationData.target = neighborhoodCoords[world.random.randInt(0, neighborhoodCoords.length - 1)];
        }
        visibleCoords.forEach(coords => {
          const tile = map.getTile(coords);
          if (tile.unit && (tile.unit.civID !== undefined || (tile.unit.cityID !== this.id || !tile.unit.isBarbarian))) {
            unit.automationData.target = coords;
            return;
          }
        });
      }

      if (!('wanderTarget' in unit.automationData)) {
        unit.automationData.wanderTarget = {
          x: world.random.randInt(0, map.width - 1),
          y: world.random.randInt(0, map.height - 1),
        };
      }
      if (
        unit.automationData.target && (
          (unit.coords.x === unit.automationData.target.x && unit.coords.y === unit.automationData.target.y) ||
          arrayIncludesCoords(getAdjacentCoords(unit.coords), unit.automationData.target)
        )
      ) {
        delete unit.automationData.target;
      }
      let currentTarget = unit.automationData.target ?? unit.automationData.wanderTarget;
      let stepsTaken = 0;
      let i = 0;
      while (unit.movement > 0) {
        i++;
        const adjacentCoords = getAdjacentCoords(unit.coords);
        const [targetXDiff, targetYDiff] = getSmallestCoordsDiff(map, unit.coords, currentTarget);

        let directRoute: Coords | null = null;
        const altRoutes: Coords[] = [];
        for (const coord of adjacentCoords) {
          const [xDiff, yDiff] = [coord.x - unit.coords.x, coord.y - unit.coords.y];
          if (Math.sign(targetXDiff) === xDiff && Math.sign(targetYDiff) === yDiff) {
            directRoute = coord;
          } else if ((xDiff && !yDiff && Math.sign(targetXDiff) === xDiff) || (yDiff && !xDiff && Math.sign(targetYDiff) === yDiff)) {
            altRoutes.push(coord);
          }
        }
        if (!(directRoute || altRoutes.length > 0) || i > 100) {
          console.warn(`Barbarian unit seems to be stuck at ${JSON.stringify(unit.coords)}. Skipping.`)
          delete unit.automationData.wanderTarget;
          break;
        }

        if (directRoute && map.areValidCoords(directRoute) && this.moveUnit(unit, directRoute, true)) {
          stepsTaken++;
          continue;
        }
        else {
          let didMove = false;
          for (const dst of altRoutes) {
            if (map.areValidCoords(dst) && this.moveUnit(unit, dst, true)) {
              stepsTaken++;
              didMove = true;
              break;
            }
          }
          if (didMove) {
            continue;
          }
        }

        if (stepsTaken === 0) {
          // If there is no movement we can make towards our target, let's switch to a new one.
          unit.automationData.wanderTarget = {
            x: world.random.randInt(0, map.width),
            y: world.random.randInt(0, map.height),
          };

          if (!(currentTarget.x === unit.automationData.wanderTarget.x && currentTarget.y === unit.automationData.wanderTarget.y)) {
            currentTarget = unit.automationData.wanderTarget;
            continue;
          }
        }
        break;
      }
    })
  }
}
