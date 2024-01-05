import { Tile } from ".";
import { Map } from "..";
import { arrayIncludesCoords, getAdjacentCoords, getCoordInDirection, getDirection, getSmallesCoordsDiff, mod } from "../../../utils";
import { World, Coords } from "../../world";
import { ErrandType } from "./errand";
import { Improvement } from "./improvement";
import { Unit } from "./unit";

export interface CityData {
  name: string;
  civID?: number;
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
  private map: Map;

  moveUnit(unit: Unit, toPos: Coords): boolean {
    const tile = this.map.getTile(toPos);
    if (!tile) return false;
    const movementCost = tile.getMovementCost(unit, getDirection(toPos, unit.coords));
    if (!(unit.movement < movementCost)) {
      if (tile.unit) return false;
      this.map.moveUnitTo(unit, toPos);
      unit.movement -= movementCost;
      return true;
    } else {
      return false;
    }
  }

  turn(world: World, map: Map): void {
    super.turn(world, map);
    if (!this.map) {
      this.map = map;
    }
  }
}

export class BarbarianCamp extends UnitController {
  private raidTarget?: Coords;
  private settleTarget?: Coords;

  constructor(id: number, center: Coords) {
    super(id, center, 'camp', undefined)
  }

  turn(world: World, map: Map): void {
    super.turn(world, map);

    const camp = map.getTile(this.center).improvement as Improvement;
    if (!camp.errand) {
      let raidMode: boolean;
      if (this.raidTarget && !this.settleTarget) {
        raidMode = true;
      } else if (!this.raidTarget && this.settleTarget) {
        raidMode = false;
      } else {
        raidMode = Boolean(world.random.randInt(0, 1));
      }
      if (raidMode) {
        // TODO
      } else {
        map.startErrandAt(this.center, camp, {
          type: ErrandType.UNIT_TRAINING,
          option: 'settler',
          location: this.center,
        });
      }
    }

    this.units.forEach(unit => {
      unit.newTurn();

      const visibleCoords = map.getVisibleTilesCoords(unit, unit.visionRange);
      const canSeeCamp = arrayIncludesCoords(visibleCoords, this.center);
      if (unit.type === 'scout') {
        if (!('turnsSinceCampSpotted' in unit.automationData)) {
          unit.automationData.turnsSinceCampSpotted = 0;
        }
        unit.automationData.turnsSinceCampSpotted++;
        visibleCoords.forEach(coords => {
          const tile = map.getTile(coords);
          if (tile.improvement) {
            if (tile.improvement.type === 'barbarian_camp') {
              unit.automationData.turnsSinceCampSpotted = 0;
              if (!(coords.x === this.center.x && coords.y === this.center.y)) {
                unit.automationData.target = this.center;
                delete unit.automationData.wanderTarget;
              } else if (unit.automationData.target) {
                this.raidTarget = unit.automationData.raidTarget ?? this.raidTarget;
                this.settleTarget = unit.automationData.settleTarget ?? this.settleTarget;
              }
            }
          }
          if (unit.automationData.turnsSinceCampSpotted > 3 && !canSeeCamp) {
            if (map.canSettleOn(tile) && !unit.automationData.settleTarget) {
              
            }
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
        const [targetXDiff, targetYDiff] = getSmallesCoordsDiff(map, unit.coords, currentTarget);

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

        if (directRoute && map.areValidCoords(directRoute) && this.moveUnit(unit, directRoute)) {
          stepsTaken++;
          continue;
        }
        else {
          let didMove = false;
          for (const dst of altRoutes) {
            if (map.areValidCoords(dst) && this.moveUnit(unit, dst)) {
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
          if (!(currentTarget.x === unit.automationData.wanderTarget.x && currentTarget.y === unit.automationData.wanderTarget.y)) {
            currentTarget = unit.automationData.wanderTarget;
            continue;
          }
          // If there is no movement we can make towards our target, let switch to a new one.
          unit.automationData.wanderTarget = {
            x: world.random.randInt(0, map.width),
            y: world.random.randInt(0, map.height),
          };
        }
        break;
      }
    })
  }
}
