"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBucket = exports.KnowledgeSourceLinks = exports.KnowledgeSource = exports.KNOWLEDGE_SPREAD_DELAY = exports.KNOWLEDGE_SPREAD_SPEED = exports.KNOWLEDGE_SPREAD_RANGE = exports.Knowledge = exports.KnowledgeBranch = void 0;
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
    'military_1': new Knowledge('military_1', KnowledgeBranch.DEVELOPMENT, new yield_1.Yield({ science: 10 }), ['military_0'], { improvements: ['encampment'] }),
    'recon_1': new Knowledge('recon_1', KnowledgeBranch.OFFENSE, new yield_1.Yield({ science: 10 }), ['recon_0', 'science_1'], { units: ['spy'] }),
};
exports.KNOWLEDGE_SPREAD_RANGE = 5;
exports.KNOWLEDGE_SPREAD_SPEED = 1;
exports.KNOWLEDGE_SPREAD_DELAY = 5;
class KnowledgeSource {
    constructor(knowledges) {
        this.knowledges = knowledges;
        this.timeline = [];
        this.completionQueue = [];
        for (const knowledge in this.knowledges) {
            if (!(this.knowledges[knowledge] < 100)) {
                this.completionQueue.push(knowledge);
            }
        }
    }
    static fromLinks(links) {
        const knowledges = links.getKnowledgeMap();
        return new KnowledgeSource(knowledges);
    }
    /**
     *
     * @returns knowledge map
     */
    getKnowledgeMap() {
        return this.knowledges;
    }
    /**
     * @param completed whether the knowledge must have 100 points to be included
     * @returns list of knowledge names
     */
    getKnowledges(currentTurn = null) {
        if (currentTurn === null) {
            const knowledges = Object.keys(this.knowledges).map((knowledge) => [knowledge, this.knowledges[knowledge]]);
            return knowledges.filter(([_, progress]) => !(progress < 100));
        }
        else {
            return this.timeline.map(([knowledge, turn]) => {
                const turnDiff = currentTurn - turn;
                const knowledgeShare = Math.min(Math.max(0, turnDiff + exports.KNOWLEDGE_SPREAD_DELAY) * (100 / exports.KNOWLEDGE_SPREAD_DELAY), 100);
                return [knowledge, Math.round(knowledgeShare)];
            });
        }
    }
    /**
     * Returns `true` if this bucket has 100 points for all knowledges in `knowledgeNames`, else `false`.
     * @param knowledgeNames List of knowledge names, matching the keys of Knowledge.knowledgeTree.
     */
    hasKnowledges(knowledgeNames) {
        var _a;
        for (const name of knowledgeNames) {
            if (((_a = this.knowledges[name]) !== null && _a !== void 0 ? _a : 0) < 100)
                return false;
        }
        return true;
    }
    /**
     *
     * @param knowledge The knowledge instance to be added.
     * @param amount The amount of the knowledge to be added. (0 - 100)
     * @param requirementPenalty Multiplier that will be applied to `amount` if the prerequisites of the knowledge are not present in this bucket.
     */
    addKnowledge(knowledge, amount, requirementPenalty, maxPoints = 100) {
        var _a, _b;
        if (maxPoints > 100 || maxPoints < 0)
            throw 'Invalid Knowledge Cap!';
        if (!this.hasKnowledges(knowledge.prerequisites))
            amount *= requirementPenalty;
        const wasNotCompleted = this.knowledges[knowledge.name] < 100;
        this.knowledges[knowledge.name] = Math.min(((_a = this.knowledges[knowledge.name]) !== null && _a !== void 0 ? _a : 0) + amount, Math.max((_b = this.knowledges[knowledge.name]) !== null && _b !== void 0 ? _b : 0, maxPoints));
        if (this.knowledges[knowledge.name] === 100 && wasNotCompleted) {
            this.completionQueue.push(knowledge.name);
        }
    }
    turn(world) {
        for (const knowledge of this.completionQueue) {
            this.timeline.push([knowledge, world.currentTurn]);
        }
        this.completionQueue = [];
    }
}
exports.KnowledgeSource = KnowledgeSource;
class KnowledgeSourceLinks {
    constructor() {
        this.sources = [];
    }
    clearLinks() {
        this.sources = [];
    }
    addLink(source, currentTurn) {
        this.sources.push([source, currentTurn]);
    }
    /**
     *
     * @returns knowledge map
     */
    getKnowledgeMap() {
        const knowledges = {};
        for (const [source, currentTurn] of this.sources) {
            for (const [knowledge, progress] of source.getKnowledges(currentTurn)) {
                if (!(knowledge in knowledges))
                    knowledges[knowledge] = 0;
                knowledges[knowledge] = Math.min(knowledges[knowledge] + progress, 100);
            }
        }
        return knowledges;
    }
    /**
     *
     * @returns list of knowledge names
     */
    getKnowledges() {
        const knowledges = this.getKnowledgeMap();
        return Object.keys(knowledges).map(knowledge => ([knowledge, knowledges[knowledge]]));
    }
    turn(world) {
        // Nothing to do here. We can't update our links here, since the bucket by design does not know what tile it's on.
    }
}
exports.KnowledgeSourceLinks = KnowledgeSourceLinks;
class KnowledgeBucket {
    constructor(knowledges) {
        if (knowledges) {
            this.source = new KnowledgeSource(knowledges);
        }
        else {
            this.source = new KnowledgeSourceLinks();
        }
    }
    export() {
        // TODO - this does NOT account for Knowledge Source Links! FIXME!
        return this.getKnowledgeMap();
    }
    getSource() {
        if (this.source instanceof KnowledgeSource)
            return this.source;
        else
            return null;
    }
    hasLinks() {
        return this.source instanceof KnowledgeSourceLinks;
    }
    clearLinks() {
        if (this.source instanceof KnowledgeSourceLinks) {
            this.source.clearLinks();
        }
        else
            return;
    }
    addLink(bucket, currentTurn) {
        if (this.source instanceof KnowledgeSourceLinks) {
            const source = bucket.getSource();
            if (!source)
                return;
            this.source.addLink(source, currentTurn);
        }
        else
            return;
    }
    /**
     * @param completed whether the knowledge must have 100 points to be included
     * @returns list of knowledge names
     */
    getKnowledges(completed) {
        const knowledgeNames = this.source.getKnowledges().filter(([knowledge, progress]) => (!completed || progress === 100)).map(([knowledge, _]) => knowledge);
        return knowledgeNames;
    }
    /**
     *
     * @returns knowledge map
     */
    getKnowledgeMap() {
        return this.source.getKnowledgeMap();
    }
    /**
     * Returns `true` if this bucket has 100 points for all knowledges in `knowledgeNames`, else `false`.
     * @param knowledgeNames List of knowledge names, matching the keys of Knowledge.knowledgeTree.
     */
    hasKnowledges(knowledgeNames) {
        if (this.source instanceof KnowledgeSourceLinks) {
            const knowledges = {};
            for (const name of this.getKnowledges(true)) {
                knowledges[name] = true;
            }
            for (const name of knowledgeNames) {
                if (!(name in knowledges))
                    return false;
            }
            return true;
        }
        else {
            return this.source.hasKnowledges(knowledgeNames);
        }
    }
    /**
     *
     * @param knowledge The knowledge instance to be added.
     * @param amount The amount of the knowledge to be added. (0 - 100)
     * @param requirementPenalty Multiplier that will be applied to `amount` if the prerequisites of the knowledge are not present in this bucket.
     */
    addKnowledge(knowledge, amount, requirementPenalty, maxPoints = 100) {
        if (maxPoints > 100 || maxPoints < 0)
            throw 'Invalid Knowledge Cap!';
        if (this.source instanceof KnowledgeSourceLinks)
            this.source = KnowledgeSource.fromLinks(this.source);
        this.source.addKnowledge(knowledge, amount, requirementPenalty, maxPoints);
    }
    mergeKnowledge(bucket) {
        if (this.source instanceof KnowledgeSourceLinks)
            return;
        const bucketKnowledgeMap = bucket.getKnowledgeMap();
        const thisKnowledgeMap = this.getKnowledgeMap();
        for (const name in bucketKnowledgeMap) {
            const bucketProgress = bucketKnowledgeMap[name];
            const thisProgress = thisKnowledgeMap[name];
            if (bucketProgress > thisProgress) {
                this.addKnowledge(Knowledge.knowledgeTree[name], bucketProgress - thisProgress, 0.5); // TODO FIXME - magic number
            }
        }
    }
    turn(world) {
        this.source.turn(world);
    }
}
exports.KnowledgeBucket = KnowledgeBucket;
//# sourceMappingURL=knowledge.js.map