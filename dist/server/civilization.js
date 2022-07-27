"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Civilization = void 0;
class Civilization {
    constructor() {
        this.units = [];
        this.turnActive = false;
        this.turnFinished = false;
    }
    getData() {
        var _a;
        const leaderData = (_a = this.leader) === null || _a === void 0 ? void 0 : _a.getData();
        return {
            color: leaderData === null || leaderData === void 0 ? void 0 : leaderData.color,
            leader: leaderData,
        };
    }
    newTurn() {
        this.turnActive = true;
        this.turnFinished = false;
        for (const unit of this.units) {
            unit.newTurn();
        }
    }
    endTurn() {
        this.turnActive = false;
    }
    getUnits() {
        return this.units;
    }
    getUnitPositions() {
        return this.units.map(unit => unit.coords);
    }
    addUnit(unit) {
        this.units.push(unit);
    }
    removeUnit(unit) {
        const unitIndex = this.units.indexOf(unit);
        if (unitIndex > -1) {
            this.units.splice(unitIndex, 1);
        }
    }
}
exports.Civilization = Civilization;
//# sourceMappingURL=civilization.js.map