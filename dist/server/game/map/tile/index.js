"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile = void 0;
const unit_1 = require("./unit");
const improvement_1 = require("./improvement");
const yield_1 = require("./yield");
const knowledge_1 = require("./knowledge");
class Tile {
    constructor(type, tileHeight, baseYield) {
        this.movementCost = Tile.movementCostTable[type];
        this.type = type;
        this.elevation = tileHeight;
        this.knowledges = {};
        this.unit = undefined;
        this.improvement = undefined;
        this.owner = undefined;
        this.discoveredBy = {};
        this.visibleTo = {};
        this.baseYield = baseYield;
    }
    export() {
        var _a;
        return {
            // movementCost: this.movementCost,
            type: this.type,
            elevation: this.elevation,
            // unit: this.unit?.export(),
            improvement: (_a = this.improvement) === null || _a === void 0 ? void 0 : _a.export(),
            // owner: this.owner?,
            discoveredBy: this.discoveredBy,
            // visibleTo: { [civID: number]: number },
            baseYield: this.baseYield,
            knowledges: this.knowledges,
        };
    }
    static import(data) {
        const tile = new Tile(data.type, data.elevation, new yield_1.Yield(data.baseYield));
        // tile.unit = Unit.import(data.unit);
        if (data.improvement)
            tile.improvement = improvement_1.Improvement.import(data.improvement);
        tile.discoveredBy = data.discoveredBy;
        tile.knowledges = data.knowledges;
        return tile;
    }
    getTileYield() {
        if (this.improvement) {
            return this.improvement.yield;
        }
        else {
            return this.baseYield;
        }
    }
    getDiscoveredData() {
        var _a, _b;
        return {
            type: this.type,
            movementCost: this.movementCost,
            improvement: (_a = this.improvement) === null || _a === void 0 ? void 0 : _a.getData(),
            owner: (_b = this.owner) === null || _b === void 0 ? void 0 : _b.getData(),
            yield: this.getTileYield(),
            elevation: this.elevation,
        };
    }
    getVisibleData() {
        var _a;
        return Object.assign(Object.assign({}, this.getDiscoveredData()), { knowledges: this.knowledges, unit: (_a = this.unit) === null || _a === void 0 ? void 0 : _a.getData(), visible: true });
    }
    getMovementCost(unit) {
        const mode = unit.getMovementClass();
        return mode > -1 ? this.movementCost[mode] || Infinity : 1;
    }
    setUnit(unit) {
        this.unit = unit;
    }
    setVisibility(civID, visible) {
        if (visible) {
            this.visibleTo[civID]++;
        }
        else {
            this.visibleTo[civID]--;
        }
        if (visible && !this.discoveredBy[civID]) {
            this.discoveredBy[civID] = true;
        }
    }
    clearVisibility(civID) {
        this.visibleTo[civID] = 0;
    }
    canSupply(requirement) {
        return !!this.improvement && (this.improvement.yield.canSupply(requirement));
    }
    /**
     * Returns `true` if this tile has 100 points for all knowledges in `knowledgeNames`, else `false`.
     * @param knowledgeNames List of knowledge names, matching the keys of Knowledge.knowledgeTree.
     */
    hasKnowledges(knowledgeNames) {
        for (const name of knowledgeNames) {
            if (this.knowledges[name] < 100)
                return false;
        }
        return true;
    }
    /**
     *
     * @param knowledge The knowledge instance to be added.
     * @param amount The amount of the knowledge to be added. (0 - 100)
     * @param requirementPenalty Multiplier that will be applied to `amount` if the prerequisites of the knowledge are not present on this tile.
     */
    addKnowledge(knowledge, amount, requirementPenalty) {
        var _a;
        if (this.hasKnowledges(knowledge.prerequisites))
            amount *= requirementPenalty;
        this.knowledges[knowledge.name] = Math.max(((_a = this.knowledges[knowledge.name]) !== null && _a !== void 0 ? _a : 0) + amount, 100);
    }
    /**
     *
     * @returns list of units classes this improvement knows how to train
     */
    getTrainableUnitTypes() {
        if (!this.improvement)
            return [];
        const trainableUnitClasses = this.improvement.getTrainableUnitClasses().reduce((obj, name) => (Object.assign(Object.assign({}, obj), { [name]: true })), {});
        console.log(trainableUnitClasses, Object.keys(this.knowledges), knowledge_1.Knowledge.getTrainableUnits(Object.keys(this.knowledges)));
        return knowledge_1.Knowledge.getTrainableUnits(Object.keys(this.knowledges))
            .filter(unitType => trainableUnitClasses[unit_1.Unit.promotionClassTable[unitType]]);
    }
    /**
     *
     * @returns type and cost of units this improvement knows how to train, or null if it cannot train units
     */
    getUnitCatalog() {
        const trainableUnits = this.getTrainableUnitTypes();
        console.log(trainableUnits);
        const catalog = unit_1.Unit.makeCatalog(trainableUnits);
        if (catalog.length === 0)
            return null;
        return catalog;
    }
    /**
     *
     * @returns type and cost of knowledges this tile knows how to research, or null if it cannot research
     */
    getKnowledgeCatalog() {
        if (!this.improvement)
            return null;
        const researchableKnowledges = this.improvement.getResearchableKnowledges().reduce((obj, name) => (Object.assign(Object.assign({}, obj), { [name]: true })), {});
        const completedKnowledges = Object.keys(this.knowledges).filter(key => !(this.knowledges[key] < 100));
        const reachableKnowledges = knowledge_1.Knowledge.getReachableKnowledges(completedKnowledges);
        const knowledgeCatalog = reachableKnowledges.filter(({ name }) => { var _a; return (researchableKnowledges[name] && (((_a = this.knowledges[name]) !== null && _a !== void 0 ? _a : 0) < 100)); });
        return knowledgeCatalog;
    }
}
exports.Tile = Tile;
Tile.movementCostTable = {
    // tile name: [land mp, water mp] (0 = impassable)
    'ocean': [0, 1],
    'frozen_ocean': [0, 0],
    'river': [4, 1],
    'frozen_river': [3, 0],
    'grass_lowlands': [1, 0],
    'plains': [1, 0],
    'grass_hills': [2, 0],
    'grass_mountains': [4, 0],
    'desert': [1, 0],
    'desert_hills': [3, 0],
    'desert_mountains': [4, 0],
    'snow_plains': [2, 0],
    'snow_hills': [3, 0],
    'snow_mountains': [5, 0],
    'mountain': [0, 0],
};
//# sourceMappingURL=index.js.map