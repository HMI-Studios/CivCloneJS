"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Knowledge = exports.KnowledgeBranch = void 0;
const yield_1 = require("./yield");
var KnowledgeBranch;
(function (KnowledgeBranch) {
    KnowledgeBranch[KnowledgeBranch["OFFENSE"] = 0] = "OFFENSE";
    KnowledgeBranch[KnowledgeBranch["DEFESNSE"] = 1] = "DEFESNSE";
    KnowledgeBranch[KnowledgeBranch["CIVICS"] = 2] = "CIVICS";
    KnowledgeBranch[KnowledgeBranch["DEVELOPMENT"] = 3] = "DEVELOPMENT";
})(KnowledgeBranch = exports.KnowledgeBranch || (exports.KnowledgeBranch = {}));
class Knowledge {
    constructor(name, branch, cost, prerequisites, unlocks) {
        var _a, _b;
        this.name = name;
        this.branch = branch;
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
    'start': new Knowledge('start', KnowledgeBranch.DEVELOPMENT, new yield_1.Yield({ science: 0 }), [], { units: ['settler', 'builder'] }),
    'food_0': new Knowledge('food_0', KnowledgeBranch.DEVELOPMENT, new yield_1.Yield({ science: 10 }), [], { improvements: ['farm'] }),
    'military_0': new Knowledge('military_0', KnowledgeBranch.OFFENSE, new yield_1.Yield({ science: 10 }), [], { units: ['warrior', 'slinger'] }),
    'recon_0': new Knowledge('recon_0', KnowledgeBranch.OFFENSE, new yield_1.Yield({ science: 10 }), [], { units: ['scout'] }),
    'ranged_1': new Knowledge('ranged_1', KnowledgeBranch.OFFENSE, new yield_1.Yield({ science: 10 }), ['military_0'], { units: ['archer'] }),
    'science_1': new Knowledge('science_1', KnowledgeBranch.DEVELOPMENT, new yield_1.Yield({ science: 10 }), [], { improvements: ['campus'] }),
    'recon_1': new Knowledge('recon_1', KnowledgeBranch.OFFENSE, new yield_1.Yield({ science: 10 }), ['recon_0', 'science_1'], { units: ['spy'] }),
};
//# sourceMappingURL=knowledge.js.map