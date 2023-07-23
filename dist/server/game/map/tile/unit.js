"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unit = exports.PromotionClass = exports.MovementClass = void 0;
const utils_1 = require("../../../utils");
const yield_1 = require("./yield");
var MovementClass;
(function (MovementClass) {
    MovementClass[MovementClass["LAND"] = 0] = "LAND";
    MovementClass[MovementClass["WATER"] = 1] = "WATER";
    MovementClass[MovementClass["AIR"] = 2] = "AIR";
})(MovementClass = exports.MovementClass || (exports.MovementClass = {}));
var PromotionClass;
(function (PromotionClass) {
    PromotionClass[PromotionClass["CIVILLIAN"] = 0] = "CIVILLIAN";
    PromotionClass[PromotionClass["MELEE"] = 1] = "MELEE";
    PromotionClass[PromotionClass["RANGED"] = 2] = "RANGED";
    PromotionClass[PromotionClass["RECON"] = 3] = "RECON";
})(PromotionClass = exports.PromotionClass || (exports.PromotionClass = {}));
class Unit {
    constructor(type, civID, coords, knowledge) {
        var _a;
        this.type = type;
        this.hp = 100;
        this.movement = 0;
        this.promotionClass = Unit.promotionClassTable[type];
        this.movementClass = Unit.movementClassTable[type];
        this.combatStats = Unit.combatStatsTable[type];
        if (this.promotionClass === PromotionClass.RANGED) {
            this.attackRange = Unit.attackRangeTable[type];
        }
        this.visionRange = (_a = Unit.visionRangeTable[type]) !== null && _a !== void 0 ? _a : Unit.visionRangeTable.default;
        this.civID = civID;
        this.coords = coords;
        this.alive = true;
        this.knowledge = knowledge !== null && knowledge !== void 0 ? knowledge : {};
    }
    static makeCatalog(types) {
        return types.map(type => ({ type, cost: Unit.costTable[type] }));
    }
    export() {
        return {
            type: this.type,
            hp: this.hp,
            movement: this.movement,
            civID: this.civID,
            coords: this.coords,
            alive: this.alive,
            knowledge: this.knowledge,
        };
    }
    static import(data) {
        const unit = new Unit(data.type, data.civID, data.coords);
        unit.hp = data.hp;
        unit.movement = data.movement;
        unit.promotionClass = Unit.promotionClassTable[unit.type];
        unit.movementClass = Unit.movementClassTable[unit.type];
        unit.combatStats = Unit.combatStatsTable[unit.type];
        if (unit.promotionClass === PromotionClass.RANGED) {
            unit.attackRange = Unit.attackRangeTable[unit.type];
        }
        unit.alive = data.alive;
        unit.knowledge = data.knowledge;
        return unit;
    }
    getData() {
        return {
            type: this.type,
            hp: this.hp,
            movement: this.movement,
            civID: this.civID,
            promotionClass: this.promotionClass,
            attackRange: this.attackRange,
            knowledge: this.knowledge,
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
    'builder': 3,
    'scout': 5,
    'warrior': 3,
    'slinger': 3,
    'archer': 3,
    'spy': 5,
};
Unit.movementClassTable = {
    'settler': MovementClass.LAND,
    'builder': MovementClass.LAND,
    'scout': MovementClass.LAND,
    'warrior': MovementClass.LAND,
    'slinger': MovementClass.LAND,
    'archer': MovementClass.LAND,
    'spy': MovementClass.LAND,
};
Unit.promotionClassTable = {
    'settler': PromotionClass.CIVILLIAN,
    'builder': PromotionClass.CIVILLIAN,
    'scout': PromotionClass.RECON,
    'warrior': PromotionClass.MELEE,
    'slinger': PromotionClass.RANGED,
    'archer': PromotionClass.RANGED,
    'spy': PromotionClass.RECON,
};
Unit.combatStatsTable = {
    // 'unitType': [offense, defense, awareness],
    'settler': [0, 1, 0],
    'builder': [0, 1, 0],
    'scout': [5, 3, 20],
    'warrior': [12, 8, 10],
    'slinger': [10, 5, 12],
    'archer': [15, 5, 12],
    'spy': [5, 3, 20],
};
Unit.attackRangeTable = {
    'slinger': 2,
    'archer': 3,
};
Unit.visionRangeTable = {
    default: 2,
    'scout': 3,
};
Unit.costTable = {
    'settler': new yield_1.Yield({ production: 10 }),
    'builder': new yield_1.Yield({ production: 5 }),
    'scout': new yield_1.Yield({ production: 10 }),
    'warrior': new yield_1.Yield({ production: 15 }),
    'slinger': new yield_1.Yield({ production: 15 }),
    'spy': new yield_1.Yield({ production: 20 }),
};
//# sourceMappingURL=unit.js.map