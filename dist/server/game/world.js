"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.World = void 0;
const map_1 = require("./map");
const unit_1 = require("./map/tile/unit");
const civilization_1 = require("./civilization");
const random_1 = require("../utils/random");
const leader_1 = require("./leader");
const DAMAGE_MULTIPLIER = 20;
class World {
    constructor(map, civsCount) {
        this.updates = [];
        if (!(map && civsCount)) {
            return;
        }
        this.map = map;
        this.civsCount = civsCount;
        this.civs = {};
        this.leaderPool = {};
        for (let civID = 0; civID < this.civsCount; civID++) {
            this.civs[civID] = new civilization_1.Civilization();
            const random = new random_1.Random(42);
            let start_location_successful = false;
            for (let i = 0; i < 1000; i++) {
                const x = random.randInt(0, map.width - 1);
                const y = random.randInt(0, map.height - 1);
                const settler_coords = { x, y };
                const builder_coords = { x: x + 1, y: y + 1 };
                const scout_coords = { x: x - 1, y: y + 1 };
                let legal_start_location = true;
                for (const coords of [settler_coords, builder_coords, scout_coords]) {
                    const tile = this.map.getTile(coords);
                    if (!tile || tile.unit || !this.map.canSettleOn(tile)) {
                        legal_start_location = false;
                        break;
                    }
                }
                if (legal_start_location) {
                    this.addUnit(new unit_1.Unit('settler', civID, settler_coords));
                    this.addUnit(new unit_1.Unit('builder', civID, builder_coords));
                    this.addUnit(new unit_1.Unit('scout', civID, scout_coords));
                    start_location_successful = true;
                    break;
                }
            }
            if (!start_location_successful) {
                console.error("Error: couldn't find legal start location! (gave up after 1000 tries)");
            }
            this.updateCivTileVisibility(civID);
        }
        for (let i = 0; i < leader_1.leaderTemplates.length; i++) {
            this.leaderPool[i] = new leader_1.Leader(i);
        }
        this.currentTurn = 1;
        // this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});
    }
    export() {
        const exportedCivs = {};
        for (const civID in this.civs) {
            const civ = this.civs[civID];
            exportedCivs[civID] = civ.export();
        }
        return {
            map: this.map.export(),
            civs: exportedCivs,
            civsCount: this.civsCount,
            leaderPool: this.leaderPool,
        };
    }
    static import(data) {
        const world = new World();
        world.map = map_1.Map.import(data.map);
        world.civs = {};
        for (const civID in data.civs) {
            const civData = data.civs[civID];
            world.civs[civID] = civilization_1.Civilization.import(civData);
            const units = civData.units.map(unitData => unit_1.Unit.import(unitData));
            for (const unit of units) {
                world.addUnit(unit);
            }
            world.updateCivTileVisibility(Number(civID));
        }
        world.civsCount = data.civsCount;
        world.leaderPool = {};
        for (const leaderID in data.leaderPool) {
            const leaderData = data.leaderPool[leaderID];
            world.leaderPool[leaderID] = leader_1.Leader.import(leaderData);
            if (leaderData.civID !== null) {
                world.setCivLeader(leaderData.civID, Number(leaderID));
            }
        }
        return world;
    }
    getUpdates() {
        // TODO: more updates?
        return this.map.getUpdates().concat(this.updates.splice(0));
    }
    // leaders
    getLeaderPool() {
        const leaderList = [];
        const takenLeaderList = [];
        for (const id in this.leaderPool) {
            const leader = this.leaderPool[id];
            if (leader.isTaken()) {
                takenLeaderList.push(leader.getData());
            }
            else {
                leaderList.push(leader.getData());
            }
        }
        return [leaderList, takenLeaderList];
    }
    // leaders, civs
    setCivLeader(civID, leaderID) {
        var _a;
        const leader = this.leaderPool[leaderID];
        if (leader && !leader.isTaken()) {
            if (this.civs[civID].leader) {
                (_a = this.civs[civID].leader) === null || _a === void 0 ? void 0 : _a.unselect();
            }
            this.civs[civID].leader = leader;
            leader.select(civID);
            return true;
        }
        else {
            return false;
        }
    }
    // civs
    getCiv(civID) {
        return this.civs[civID];
    }
    // civs
    getAllCivsData() {
        const data = {};
        for (const civID in this.civs) {
            const civ = this.civs[civID];
            data[civID] = civ.getData();
        }
        return data;
    }
    // map, civs
    updateCivTileVisibility(civID) {
        const cityTiles = [];
        this.map.forEachTile((tile, coords) => {
            var _a;
            tile.clearVisibility(civID);
            if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) === civID) {
                tile.setVisibility(civID, true);
                cityTiles.push(coords);
            }
        });
        for (const coords of cityTiles) {
            for (const neighbor of this.map.getNeighborsCoords(coords, 1, { filter: (tile) => {
                    var _a;
                    return ((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) !== civID;
                } })) {
                const tile = this.map.getTile(neighbor);
                tile.setVisibility(civID, true);
            }
        }
        const civ = this.civs[civID];
        for (const unit of civ.units) {
            for (const coords of this.map.getVisibleTilesCoords(unit)) {
                const tile = this.map.getTile(coords);
                tile.setVisibility(civID, true);
            }
        }
    }
    // civs
    getCivUnits(civID) {
        return this.civs[civID].getUnits();
    }
    // civs
    getCivUnitPositions(civID) {
        return this.civs[civID].getUnitPositions();
    }
    // map, civs
    addUnit(unit) {
        if (this.map.isInBounds(unit.coords)) {
            this.civs[unit.civID].addUnit(unit);
            this.map.getTile(unit.coords).setUnit(unit);
        }
    }
    // map, civs
    removeUnit(unit) {
        this.civs[unit.civID].removeUnit(unit);
        this.updates.push(() => ['unitKilled', [unit.coords, unit]]);
        this.map.getTile(unit.coords).setUnit(undefined);
        // TODO: make this more intelligent
        this.updateCivTileVisibility(unit.civID);
        this.updates.push((civID) => ['setMap', [this.map.getCivMap(civID)]]);
    }
    rangedCombat(attacker, defender) {
        const [attackerOffense, attackerDefense, attackerAwareness] = attacker.combatStats;
        const [defenderOffense, defenderDefense, defenderAwareness] = defender.combatStats;
        const attackerInitiative = Math.random() * (attackerAwareness * 6);
        const defenderInitiative = Math.random() * (defenderAwareness);
        const defenderCanAttack = this.map.canUnitAttack(defender, attacker);
        if (attackerInitiative > defenderInitiative || !defenderCanAttack) {
            const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
            defender.hurt(attackerDamage);
            if (defenderCanAttack) {
                const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
                attacker.hurt(defenderDamage);
            }
        }
        else {
            const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
            attacker.hurt(defenderDamage);
            const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
            defender.hurt(attackerDamage);
        }
        if (attacker.isDead())
            this.removeUnit(attacker);
        if (defender.isDead())
            this.removeUnit(defender);
        this.map.tileUpdate(attacker.coords);
        this.map.tileUpdate(defender.coords);
    }
    // unit, map, civs
    meleeCombat(attacker, defender) {
        const [attackerOffense, attackerDefense, attackerAwareness] = attacker.combatStats;
        const [defenderOffense, defenderDefense, defenderAwareness] = defender.combatStats;
        const attackerInitiative = Math.random() * (attackerAwareness * 1.5);
        const defenderInitiative = Math.random() * (defenderAwareness);
        if (attackerInitiative > defenderInitiative) {
            const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
            defender.hurt(attackerDamage);
            const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
            attacker.hurt(defenderDamage);
        }
        else {
            const defenderDamage = (defenderOffense * defender.hp) / (attackerDefense * attacker.hp) * DAMAGE_MULTIPLIER;
            attacker.hurt(defenderDamage);
            const attackerDamage = (attackerOffense * attacker.hp) / (defenderDefense * defender.hp) * DAMAGE_MULTIPLIER;
            defender.hurt(attackerDamage);
        }
        if (attacker.isDead())
            this.removeUnit(attacker);
        if (defender.isDead())
            this.removeUnit(defender);
        this.map.tileUpdate(attacker.coords);
        this.map.tileUpdate(defender.coords);
    }
    turn() {
        this.map.turn(this);
        this.currentTurn++;
    }
}
exports.World = World;
//# sourceMappingURL=world.js.map