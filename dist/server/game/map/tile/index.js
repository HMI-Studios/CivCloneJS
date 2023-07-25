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
        this.unit = undefined;
        this.improvement = undefined;
        this.owner = undefined;
        this.walls = [null, null, null, null, null, null];
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
        };
    }
    static import(data) {
        const tile = new Tile(data.type, data.elevation, new yield_1.Yield(data.baseYield));
        // tile.unit = Unit.import(data.unit);
        if (data.improvement)
            tile.improvement = improvement_1.Improvement.import(data.improvement);
        tile.discoveredBy = data.discoveredBy;
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
            walls: this.walls,
            yield: this.getTileYield(),
            elevation: this.elevation,
        };
    }
    getVisibleData(civID) {
        var _a;
        return Object.assign(Object.assign({}, this.getDiscoveredData()), { unit: (_a = this.unit) === null || _a === void 0 ? void 0 : _a.getData(civID), visible: true });
    }
    getMovementCost(unit, direction) {
        const mode = unit.getMovementClass();
        if (this.walls[direction] !== null)
            return Infinity;
        return mode > -1 ? this.movementCost[mode] || Infinity : 1;
    }
    /**
     *
     * @returns the total elevation of this tile plus the height of any improvemnts on it, rounded to the nearest unit.
     */
    getTotalElevation() {
        var _a;
        return Math.round(this.elevation + (this.improvement ? (_a = improvement_1.Improvement.improvementHeightTable[this.improvement.type]) !== null && _a !== void 0 ? _a : 0 : 0));
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
    setWall(direction, type) {
        this.walls[direction] = { type };
    }
    canSupply(requirement) {
        return !!this.improvement && (this.improvement.yield.canSupply(requirement));
    }
    /**
     *
     * @returns whether farms can be build on this tile
     */
    isFarmable() {
        const farmableTileTypes = {
            'grass_lowlands': true,
            'plains': true,
        };
        return this.type in farmableTileTypes;
    }
    /**
     *
     * @returns list of improvements the builder on this tile knows how to build
     * TODO - move this to Unit class
     */
    getBuildableImprovements() {
        if (!this.unit)
            return [];
        const unitKnowledge = this.unit.knowledge;
        return knowledge_1.Knowledge.getBuildableImprovements(Object.keys(unitKnowledge).filter((name) => !(unitKnowledge[name] < 100)))
            .filter((improvementType) => {
            if (improvementType === 'farm' && !this.isFarmable())
                return false;
            return true;
        });
    }
    /**
     *
     * @returns list of units classes this improvement knows how to train
     */
    getTrainableUnitTypes() {
        if (!this.improvement || !this.improvement.knowledge)
            return [];
        const trainableUnitClasses = this.improvement.getTrainableUnitClasses().reduce((obj, name) => (Object.assign(Object.assign({}, obj), { [name]: true })), {});
        return knowledge_1.Knowledge.getTrainableUnits(this.improvement.knowledge.getKnowledges(true))
            .filter(unitType => trainableUnitClasses[unit_1.Unit.promotionClassTable[unitType]]);
    }
    /**
     *
     * @returns type and cost of improvements the builder on this tile knows how to build, or null if it cannot build improvements
     */
    getImprovementCatalog() {
        const buildableImprovements = this.getBuildableImprovements();
        const catalog = improvement_1.Improvement.makeCatalog(buildableImprovements);
        if (catalog.length === 0)
            return null;
        return catalog;
    }
    /**
     *
     * @returns type and cost of units this improvement knows how to train, or null if it cannot train units
     */
    getUnitCatalog() {
        const trainableUnits = this.getTrainableUnitTypes();
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
        if (!this.improvement || !this.improvement.knowledge)
            return null;
        const knowledgeBranches = this.improvement.getResearchableKnowledgeBranches().reduce((obj, branch) => (Object.assign(Object.assign({}, obj), { [branch]: true })), {});
        const knowledgeMap = this.improvement.knowledge.getKnowledgeMap();
        const completedKnowledges = this.improvement.knowledge.getKnowledges(true);
        const reachableKnowledges = knowledge_1.Knowledge.getReachableKnowledges(completedKnowledges);
        const knowledgeCatalog = reachableKnowledges.filter(({ name, branch }) => { var _a; return (knowledgeBranches[branch] && (((_a = knowledgeMap[name]) !== null && _a !== void 0 ? _a : 0) < 100)); });
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