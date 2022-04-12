"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unit = void 0;
const unitMovementTable = {
    'settler': 3,
    'scout': 5,
};
const unitMovementClassTable = {
    'settler': 0,
    'scout': 0,
};
class Unit {
    constructor(type, civID) {
        this.type = type;
        this.hp = 100;
        this.movement = 0;
        this.movementClass = unitMovementClassTable[type];
        this.civID = civID;
        this.coords = {
            x: null,
            y: null,
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
    newTurn() {
        this.movement = unitMovementTable[this.type];
    }
}
exports.Unit = Unit;
//# sourceMappingURL=unit.js.map