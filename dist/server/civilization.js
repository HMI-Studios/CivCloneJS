"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Civilization = void 0;
class Civilization {
    constructor() {
        this.units = [];
        this.color = null;
        this.turnActive = false;
        this.turnFinished = false;
    }
    getData() {
        return {
            color: this.color
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