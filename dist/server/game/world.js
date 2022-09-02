"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.World = void 0;
const unit_1 = require("./map/tile/unit");
const civilization_1 = require("./civilization");
const random_1 = require("../utils/random");
const leader_1 = require("./leader");
class World {
    constructor(map, civsCount) {
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
        // this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});
        this.updates = [];
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
        for (const tile of this.map.tiles) {
            tile.clearVisibility(civID);
        }
        for (const unit of this.civs[civID].units) {
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
    // unit, map, civs
    meleeCombat(attacker, defender) {
        const [attackerOffense, attackerDefense, attackerAwareness] = attacker.combatStats;
        const [defenderOffense, defenderDefense, defenderAwareness] = defender.combatStats;
        const attackerInitiative = Math.random() * (attackerAwareness * 1.5);
        const defenderInitiative = Math.random() * (defenderAwareness);
        const DAMAGE_MULTIPLIER = 20;
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
        this.map.turn();
    }
}
exports.World = World;
//# sourceMappingURL=world.js.map