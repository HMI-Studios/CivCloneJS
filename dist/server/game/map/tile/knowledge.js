"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Knowledge = void 0;
const yield_1 = require("./yield");
class Knowledge {
    constructor(name, cost, prerequisites) {
        this.name = name;
        this.cost = cost;
        this.prerequisites = prerequisites;
    }
    static getCosts() {
        const costs = {};
        for (const name in Knowledge.knowledgeTree) {
            costs[name] = this.knowledgeTree[name].cost;
        }
        return costs;
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
    'scout': new Knowledge('scout', new yield_1.Yield({ production: 6, science: 10 }), []),
    'r1': new Knowledge('r1', new yield_1.Yield({ science: 1 }), []),
    'r2': new Knowledge('r2', new yield_1.Yield({ science: 1 }), []),
    'r3': new Knowledge('r3', new yield_1.Yield({ science: 1 }), ['r1', 'r2']),
    'r4': new Knowledge('r4', new yield_1.Yield({ science: 1 }), ['scout']),
    'r5': new Knowledge('r5', new yield_1.Yield({ science: 1 }), ['r3', 'r4']),
};
//# sourceMappingURL=knowledge.js.map