"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Knowledge = void 0;
const yield_1 = require("./yield");
class Knowledge {
    constructor(name, cost, prerequisites, unlocks) {
        var _a, _b;
        this.name = name;
        this.cost = cost;
        this.prerequisites = prerequisites;
        this.units = (_a = unlocks.units) !== null && _a !== void 0 ? _a : [];
        this.improvements = (_b = unlocks.improvements) !== null && _b !== void 0 ? _b : [];
    }
    static getCosts() {
        const costs = {};
        for (const name in Knowledge.knowledgeTree) {
            costs[name] = Knowledge.knowledgeTree[name].cost;
        }
        return costs;
    }
    static getTrainableUnits(knowledgeNames) {
        let units = [];
        for (const name of knowledgeNames) {
            units = [...units, ...Knowledge.knowledgeTree[name].units];
        }
        return units;
    }
    static getBuildableImprovements(knowledgeNames) {
        let improvements = [];
        for (const name of knowledgeNames) {
            improvements = [...improvements, ...Knowledge.knowledgeTree[name].improvements];
        }
        return improvements;
    }
    static getKnowledgeList() {
        return Object.keys(Knowledge.knowledgeTree).map(key => Knowledge.knowledgeTree[key]);
    }
    static recursiveSetPrerequisitesReachable(reachableMap, knowledge) {
        reachableMap[knowledge.name] = true;
        for (const prerequisite of knowledge.prerequisites) {
            reachableMap = Object.assign(Object.assign({}, reachableMap), Knowledge.recursiveSetPrerequisitesReachable(reachableMap, Knowledge.knowledgeTree[prerequisite]));
        }
        return reachableMap;
    }
    static getReachableKnowledges(completedPrerequisites) {
        const completedMap = completedPrerequisites.reduce((map, name) => (Object.assign(Object.assign({}, map), { [name]: true })), {});
        let reachable = {};
        for (const name in Knowledge.knowledgeTree) {
            const knowledge = Knowledge.knowledgeTree[name];
            if (reachable[name])
                continue;
            reachable[name] = true;
            for (const prerequisite of knowledge.prerequisites) {
                if (!completedMap[prerequisite]) {
                    reachable[name] = false;
                    break;
                }
            }
            if (reachable[name]) {
                for (const prerequisite of knowledge.prerequisites) {
                    reachable = Object.assign(Object.assign({}, reachable), Knowledge.recursiveSetPrerequisitesReachable(reachable, knowledge));
                }
            }
        }
        return Knowledge.getKnowledgeList().filter(({ name }) => reachable[name]);
    }
    getData() {
        return {
            name: this.name,
            cost: this.cost,
            prerequisites: this.prerequisites,
        };
    }
}
exports.Knowledge = Knowledge;
Knowledge.knowledgeTree = {
    'scout': new Knowledge('scout', new yield_1.Yield({ production: 6, science: 10 }), [], { units: ['scout'] }),
};
//# sourceMappingURL=knowledge.js.map