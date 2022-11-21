"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeTree = exports.Knowledge = void 0;
class Knowledge {
    constructor(name, cost, prerequisites) {
        this.name = name;
        this.cost = cost;
        this.prerequisites = prerequisites;
    }
}
exports.Knowledge = Knowledge;
exports.knowledgeTree = {
    'scout': new Knowledge('scout', 100, [])
};
//# sourceMappingURL=knowledge.js.map