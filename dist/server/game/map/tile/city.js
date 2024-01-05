"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarbarianCamp = exports.UnitController = exports.City = void 0;
const utils_1 = require("../../../utils");
const errand_1 = require("./errand");
class City {
    constructor(id, center, name, civID) {
        this.id = id;
        this.center = center;
        this.name = name;
        this.civID = civID;
        this.units = [];
        this.tiles = new Set();
        this.addTile(center);
    }
    export() {
        const tiles = [];
        for (const coords of this.tiles) {
            tiles.push(coords);
        }
        return {
            center: this.center,
            name: this.name,
            civID: this.civID,
            isBarbarian: this instanceof BarbarianCamp,
            tiles,
        };
    }
    static import(data) {
        const city = new (data.isBarbarian ? BarbarianCamp : City)(data.center, data.name, data.civID);
        city.tiles = new Set();
        for (const coords of data.tiles) {
            city.addTile(coords);
        }
        return city;
    }
    getData() {
        return {
            name: this.name,
            civID: this.civID,
        };
    }
    getTiles() {
        return this.tiles;
    }
    addTile(coords) {
        this.tiles.add(coords);
    }
    removeTile(coords) {
        this.tiles.delete(coords);
    }
    getUnits() {
        return this.units;
    }
    getUnitPositions() {
        return this.units.map(unit => unit.coords);
    }
    addUnit(unit) {
        this.units.push(unit);
        if (this instanceof BarbarianCamp) {
            unit.setBarbarian(true);
        }
    }
    removeUnit(unit) {
        const unitIndex = this.units.indexOf(unit);
        if (unitIndex > -1) {
            this.units.splice(unitIndex, 1);
        }
    }
    turn(world, map) {
        // By default, do nothing (for now)
    }
}
exports.City = City;
class UnitController extends City {
    moveUnit(unit, toPos) {
        const tile = this.map.getTile(toPos);
        if (!tile)
            return false;
        const movementCost = tile.getMovementCost(unit, (0, utils_1.getDirection)(toPos, unit.coords));
        if (!(unit.movement < movementCost)) {
            if (tile.unit)
                return false;
            this.map.moveUnitTo(unit, toPos);
            unit.movement -= movementCost;
            return true;
        }
        else {
            return false;
        }
    }
    turn(world, map) {
        super.turn(world, map);
        if (!this.map) {
            this.map = map;
        }
    }
}
exports.UnitController = UnitController;
class BarbarianCamp extends UnitController {
    constructor(id, center) {
        super(id, center, 'camp', undefined);
    }
    turn(world, map) {
        super.turn(world, map);
        const camp = map.getTile(this.center).improvement;
        if (!camp.errand) {
            let raidMode;
            if (this.raidTarget && !this.settleTarget) {
                raidMode = true;
            }
            else if (!this.raidTarget && this.settleTarget) {
                raidMode = false;
            }
            else {
                raidMode = Boolean(world.random.randInt(0, 1));
            }
            if (raidMode) {
                // TODO
            }
            else {
                map.startErrandAt(this.center, camp, {
                    type: errand_1.ErrandType.UNIT_TRAINING,
                    option: 'settler',
                    location: this.center,
                });
            }
        }
        this.units.forEach(unit => {
            var _a;
            unit.newTurn();
            const visibleCoords = map.getVisibleTilesCoords(unit, unit.visionRange);
            const canSeeCamp = (0, utils_1.arrayIncludesCoords)(visibleCoords, this.center);
            if (unit.type === 'scout') {
                if (!('turnsSinceCampSpotted' in unit.automationData)) {
                    unit.automationData.turnsSinceCampSpotted = 0;
                }
                unit.automationData.turnsSinceCampSpotted++;
                visibleCoords.forEach(coords => {
                    var _a, _b;
                    const tile = map.getTile(coords);
                    if (tile.improvement) {
                        if (tile.improvement.type === 'barbarian_camp') {
                            unit.automationData.turnsSinceCampSpotted = 0;
                            if (!(coords.x === this.center.x && coords.y === this.center.y)) {
                                unit.automationData.target = this.center;
                                delete unit.automationData.wanderTarget;
                            }
                            else if (unit.automationData.target) {
                                this.raidTarget = (_a = unit.automationData.raidTarget) !== null && _a !== void 0 ? _a : this.raidTarget;
                                this.settleTarget = (_b = unit.automationData.settleTarget) !== null && _b !== void 0 ? _b : this.settleTarget;
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
            if (unit.automationData.target && ((unit.coords.x === unit.automationData.target.x && unit.coords.y === unit.automationData.target.y) ||
                (0, utils_1.arrayIncludesCoords)((0, utils_1.getAdjacentCoords)(unit.coords), unit.automationData.target))) {
                delete unit.automationData.target;
            }
            let currentTarget = (_a = unit.automationData.target) !== null && _a !== void 0 ? _a : unit.automationData.wanderTarget;
            let stepsTaken = 0;
            let i = 0;
            console.log(unit.coords, unit.automationData);
            while (unit.movement > 0) {
                i++;
                const adjacentCoords = (0, utils_1.getAdjacentCoords)(unit.coords);
                const [targetXDiff, targetYDiff] = (0, utils_1.getSmallesCoordsDiff)(map, unit.coords, currentTarget);
                let directRoute = null;
                const altRoutes = [];
                for (const coord of adjacentCoords) {
                    const [xDiff, yDiff] = [coord.x - unit.coords.x, coord.y - unit.coords.y];
                    if (Math.sign(targetXDiff) === xDiff && Math.sign(targetYDiff) === yDiff) {
                        directRoute = coord;
                    }
                    else if ((xDiff && !yDiff && Math.sign(targetXDiff) === xDiff) || (yDiff && !xDiff && Math.sign(targetYDiff) === yDiff)) {
                        altRoutes.push(coord);
                    }
                }
                if (!(directRoute || altRoutes.length > 0) || i > 100) {
                    console.warn(`Barbarian unit seems to be stuck at ${JSON.stringify(unit.coords)}. Skipping.`);
                    delete unit.automationData.wanderTarget;
                    break;
                }
                console.log(directRoute, altRoutes);
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
        });
    }
}
exports.BarbarianCamp = BarbarianCamp;
//# sourceMappingURL=city.js.map