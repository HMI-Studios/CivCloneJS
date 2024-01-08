"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Improvement = void 0;
const errand_1 = require("./errand");
const knowledge_1 = require("./knowledge");
const unit_1 = require("./unit");
const yield_1 = require("./yield");
class Improvement {
    constructor(args) {
        var _a, _b;
        if (args.length === 4) {
            const [type, pillaged, improvementYield, storage] = args;
            this.type = type;
            this.pillaged = pillaged;
            this.isNatural = Improvement.naturalImprovementTable[type];
            this.yield = improvementYield;
            this.storage = storage;
            this.traders = [];
            this.suppliers = [];
            return;
        }
        ;
        const [type, baseYield, knowledges] = args;
        this.type = type;
        this.pillaged = false;
        this.isNatural = Improvement.naturalImprovementTable[type];
        this.yield = baseYield.add((_a = Improvement.yieldTable[type]) !== null && _a !== void 0 ? _a : new yield_1.Yield({}));
        this.storage = new yield_1.ResourceStore((_b = Improvement.storeCapTable[type]) !== null && _b !== void 0 ? _b : {});
        this.traders = [];
        this.suppliers = [];
        if (this.isNatural) {
            this.yield = new yield_1.Yield({});
        }
        else {
            this.knowledge = new knowledge_1.KnowledgeBucket(knowledges);
        }
    }
    static makeCatalog(types) {
        return types.map(type => ({ type, cost: errand_1.WorkErrand.errandCostTable[errand_1.ErrandType.CONSTRUCTION][type] }));
    }
    export() {
        var _a, _b;
        return {
            type: this.type,
            pillaged: this.pillaged,
            isNatural: this.isNatural,
            yield: this.yield,
            storage: this.storage,
            errand: (_a = this.errand) === null || _a === void 0 ? void 0 : _a.export(),
            knowledge: (_b = this.knowledge) === null || _b === void 0 ? void 0 : _b.export(),
        };
    }
    static import(data) {
        const storageCap = data.storage.capacity;
        delete data.storage.capacity;
        const improvement = new Improvement([data.type, data.pillaged, new yield_1.Yield(data.yield), new yield_1.ResourceStore(storageCap).incr(new yield_1.Yield(data.storage))]);
        if (data.errand)
            improvement.errand = errand_1.WorkErrand.import(improvement.storage, data.errand);
        if (!data.isNatural)
            improvement.knowledge = knowledge_1.KnowledgeBucket.import(data.knowledge);
        return improvement;
    }
    getData() {
        var _a, _b;
        return {
            type: this.type,
            pillaged: this.pillaged,
            storage: this.storage,
            errand: (_a = this.errand) === null || _a === void 0 ? void 0 : _a.getData(),
            isNatural: this.isNatural,
            knowledge: (_b = this.knowledge) === null || _b === void 0 ? void 0 : _b.getKnowledgeMap(),
        };
    }
    /**
     *
     * @returns list of units classes this improvement knows how to train
     */
    getTrainableUnitClasses() {
        var _a;
        return (_a = Improvement.trainableUnitClassTable[this.type]) !== null && _a !== void 0 ? _a : [];
    }
    /**
     *
     * @returns list of knowledge branches this improvement knows how to research
     */
    getResearchableKnowledgeBranches() {
        var _a;
        return (_a = Improvement.researchableKnowledgeBranchTable[this.type]) !== null && _a !== void 0 ? _a : [];
    }
    /**
     *
     * @returns list of units classes this improvement knows how to train
     */
    getTrainableUnitTypes() {
        if (!this.knowledge)
            return [];
        const trainableUnitClasses = this.getTrainableUnitClasses().reduce((obj, [prClass, era]) => (Object.assign(Object.assign({}, obj), { [prClass]: era })), {});
        return knowledge_1.Knowledge.getTrainableUnits(this.knowledge.getKnowledges(true))
            .filter(unitType => {
            var _a;
            return (((_a = trainableUnitClasses[unit_1.Unit.promotionClassTable[unitType]]) !== null && _a !== void 0 ? _a : unit_1.PromotionEra.NONE) >= unit_1.Unit.promotionEraTable[unitType]);
        });
    }
    /**
     *
     * @returns list of knowledges this improvement knows how to research
     */
    getResearchableKnowledgeNames() {
        const researchableBranches = this.getResearchableKnowledgeBranches().reduce((obj, [branch, era]) => (Object.assign(Object.assign({}, obj), { [branch]: era })), {});
        return knowledge_1.Knowledge.getKnowledgeList().filter(({ branch, era }) => {
            var _a;
            return ((_a = researchableBranches[branch]) !== null && _a !== void 0 ? _a : unit_1.PromotionEra.NONE >= era);
        }).map(({ name }) => name);
    }
    startErrand(errand) {
        this.errand = new errand_1.WorkErrand(this.storage, errand);
    }
    work(world) {
        // TODO - ADD POPULATION/COST CHECK
        // if (type === 'farm') {
        // }
        if (this.errand) {
            if (this.storage.fulfills(this.errand.cost)) {
                this.errand.completed = true;
                for (const supplier of this.suppliers) {
                    supplier.expire();
                }
                this.storage.decr(this.errand.cost);
                this.storage.setCapacity(Improvement.storeCapTable[this.type]);
            }
            this.errand.storedThisTurn.reset();
        }
        let traderCount = this.traders.length;
        for (let i = 0; i < this.traders.length; i++) {
            const trader = this.traders[i];
            if (trader.expired) {
                this.traders.splice(i, 1);
                i--;
                traderCount--;
                continue;
            }
            const traderShare = this.storage.divNumber(traderCount);
            const surplus = trader.store(traderShare);
            this.storage.decr(traderShare.decr(surplus));
            traderCount--;
        }
        this.store(this.yield);
        this.storage.cap();
    }
    store(resources) {
        var _a;
        this.storage.incr(resources);
        (_a = this.errand) === null || _a === void 0 ? void 0 : _a.storedThisTurn.incr(resources);
    }
    subscribeTrader(trader) {
        this.traders.push(trader);
    }
    subscribeSupplier(trader) {
        this.suppliers.push(trader);
    }
}
exports.Improvement = Improvement;
Improvement.yieldTable = {
    'settlement': new yield_1.Yield({ food: 2, production: 2 }),
    'barbarian_camp': new yield_1.Yield({ food: 2, production: 2 }),
    'encampment': new yield_1.Yield({ production: 1 }),
    'campus': new yield_1.Yield({ science: 5 }),
    'farm': new yield_1.Yield({ food: 1 }),
    'forest': new yield_1.Yield({ food: 1 }),
};
Improvement.storeCapTable = {
    'settlement': { food: 20, production: 2 },
    'barbarian_camp': { food: 20, production: 2 },
    'encampment': { food: 10, production: 1 },
    'farm': { food: 20 },
};
Improvement.naturalImprovementTable = {
    'forest': true,
};
Improvement.improvementHeightTable = {
    'forest': 5,
};
Improvement.trainableUnitClassTable = {
    'settlement': [
        [unit_1.PromotionClass.CIVILLIAN, unit_1.PromotionEra.ALL],
        [unit_1.PromotionClass.RECON, unit_1.PromotionEra.ANCIENT],
    ],
    'encampment': [
        [unit_1.PromotionClass.MELEE, unit_1.PromotionEra.ALL],
        [unit_1.PromotionClass.RANGED, unit_1.PromotionEra.ALL],
        [unit_1.PromotionClass.RECON, unit_1.PromotionEra.ALL],
    ],
};
Improvement.researchableKnowledgeBranchTable = {
    'settlement': [
        [knowledge_1.KnowledgeBranch.OFFENSE, unit_1.PromotionEra.ANCIENT],
        [knowledge_1.KnowledgeBranch.DEFESNSE, unit_1.PromotionEra.ANCIENT],
        [knowledge_1.KnowledgeBranch.CIVICS, unit_1.PromotionEra.ANCIENT],
        [knowledge_1.KnowledgeBranch.DEVELOPMENT, unit_1.PromotionEra.ANCIENT],
    ],
    'campus': [
        [knowledge_1.KnowledgeBranch.OFFENSE, unit_1.PromotionEra.ALL],
        [knowledge_1.KnowledgeBranch.DEFESNSE, unit_1.PromotionEra.ALL],
        [knowledge_1.KnowledgeBranch.CIVICS, unit_1.PromotionEra.ALL],
        [knowledge_1.KnowledgeBranch.DEVELOPMENT, unit_1.PromotionEra.ALL],
    ],
};
//# sourceMappingURL=improvement.js.map