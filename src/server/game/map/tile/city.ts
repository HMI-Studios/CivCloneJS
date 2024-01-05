import { Tile } from ".";
import { Map } from "..";
import { getAdjacentCoords, getDirection, getSmallesCoordsDiff } from "../../../utils";
import { World, Coords } from "../../world";
import { Unit } from "./unit";

export interface CityData {
  name: string;
  civID?: number;
}

export class City {
  center: Coords;
  name: string;
  civID?: number;
  units: Unit[];

  private tiles: Set<Coords>;

  constructor(center: Coords, name: string, civID?: number) {
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
  constructor(center: Coords) {
    super(center, 'camp', undefined)
  }

  turn(world: World, map: Map): void {
    super.turn(world, map);

    this.units.forEach(unit => {
      unit.newTurn();

      const visibleCoords = map.getVisibleTilesCoords(unit, unit.visionRange);
      if (unit.type === 'scout') {

      }

      if (!('wanderTarget' in unit.automationData)) {
        unit.automationData.wanderTarget = {
          x: world.random.randInt(0, map.width - 1),
          y: world.random.randInt(0, map.height - 1),
        };
      }
      const currentTarget = unit.automationData.target ?? unit.automationData.wanderTarget;
      let stepsTaken = 0;
      while (unit.movement > 0) {
        const adjacentCoords = getAdjacentCoords(unit.coords);
        const [targetXDiff, targetYDiff] = getSmallesCoordsDiff(map, unit.coords, currentTarget);

        let directRoute: Coords | null = null;
        const altRoutes: Coords[] = [];
        for (const coord of adjacentCoords) {
          const [xDiff, yDiff] = [coord.x - unit.coords.x, coord.y - unit.coords.y];
          if (Math.sign(targetXDiff) === xDiff && Math.sign(targetYDiff) === yDiff) {
            directRoute = coord;
          } else if ((xDiff && Math.sign(targetXDiff) === xDiff) || (yDiff && Math.sign(targetYDiff) === yDiff)) {
            altRoutes.push(coord);
          }
        }

        if (directRoute && map.areValidCoords(directRoute) && this.moveUnit(unit, directRoute)) {
          stepsTaken++;
          continue;
        } else {
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
