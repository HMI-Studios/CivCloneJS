"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unit = void 0;
const utils_1 = require("../../../utils");
const yield_1 = require("./yield");
class Unit {
    constructor(type, civID, coords) {
        this.type = type;
        this.hp = 100;
        this.movement = 0;
        this.movementClass = Unit.movementClassTable[type];
        this.combatStats = Unit.combatStatsTable[type];
        this.civID = civID;
        this.coords = coords;
        this.alive = true;
    }
    static makeCatalog(types) {
        return types.map(type => ({ type, cost: Unit.costTable[type] }));
    }
    export() {
        return {
            type: this.type,
            hp: this.hp,
            movement: this.movement,
            movementClass: this.movementClass,
            combatStats: this.combatStats,
            civID: this.civID,
            coords: this.coords,
            alive: this.alive,
        };
    }
    static import(data) {
        const unit = new Unit(data.type, data.civID, data.coords);
        unit.hp = data.hp;
        unit.movement = data.movement;
        unit.movementClass = data.movementClass;
        unit.combatStats = data.combatStats;
        unit.alive = data.alive;
        return unit;
    }
    getData() {
        return {
            type: this.type,
            hp: this.hp,
            movement: this.movement,
            civID: this.civID,
        };
    }
    getMovementClass() {
        return this.movementClass;
    }
    setDead() {
        this.alive = false;
    }
    isDead() {
        return !this.alive;
    }
    hurt(hp) {
        // TODO
        this.hp -= hp;
        if (this.hp <= 0) {
            this.hp = 0;
            this.setDead();
        }
    }
    newTurn() {
        this.movement = Unit.movementTable[this.type];
    }
    isAdjacentTo(dst) {
        return !!dst && (0, utils_1.getAdjacentCoords)(this.coords).some(coord => coord.x === dst.x && coord.y === dst.y);
    }
}
exports.Unit = Unit;
Unit.movementTable = {
    'settler': 3,
    'scout': 5,
    'builder': 3,
};
Unit.movementClassTable = {
    'settler': 0,
    'scout': 0,
    'builder': 0,
};
Unit.combatStatsTable = {
    // 'unitType': [offense, defense, awareness],
    'settler': [0, 1, 0],
    'scout': [5, 3, 20],
    'builder': [0, 1, 0],
};
Unit.costTable = {
    // 'unitType': [offense, defense, awareness],
    'settler': new yield_1.Yield({ production: 10 }),
    'scout': new yield_1.Yield({ production: 10 }),
    'builder': new yield_1.Yield({ production: 5 }),
};
//# sourceMappingURL=unit.js.map