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
}
exports.Knowledge = Knowledge;
Knowledge.knowledgeTree = {
    'scout': new Knowledge('scout', new yield_1.Yield({ production: 6, science: 10 }), [])
};
//# sourceMappingURL=knowledge.js.map