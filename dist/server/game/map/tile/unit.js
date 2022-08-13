"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unit = void 0;
const utils_1 = require("../../../utils");
const unitMovementTable = {
    'settler': 3,
    'scout': 5,
    'builder': 3,
};
const unitMovementClassTable = {
    'settler': 0,
    'scout': 0,
    'builder': 0,
};
const unitCombatStatsTable = {
    // 'unit': [offense, defense, awareness],
    'settler': [0, 1, 0],
    'scout': [5, 3, 20],
    'builder': [0, 1, 0],
};
class Unit {
    constructor(type, civID, coords) {
        this.type = type;
        this.hp = 100;
        this.movement = 0;
        this.movementClass = unitMovementClassTable[type];
        this.combatStats = unitCombatStatsTable[type];
        this.civID = civID;
        this.coords = coords;
        this.alive = true;
    }
    export() {
        return {
            type: this.type,
            hp: this.hp,
            movement: this.movement,
            movementClass: this.movementClass,
            combatStats: this.combatStats,
            civID: this.civID,
            alive: this.alive,
        };
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
        this.movement = unitMovementTable[this.type];
    }
    isAdjacentTo(dst) {
        return !!dst && (0, utils_1.getAdjacentCoords)(this.coords).some(coord => coord.x === dst.x && coord.y === dst.y);
    }
}
exports.Unit = Unit;
//# sourceMappingURL=unit.js.map