"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.World = void 0;
const unit_1 = require("./unit");
const civilization_1 = require("./civilization");
class World {
    constructor(map, civsCount) {
        this.map = map;
        this.civs = {};
        this.civsCount = civsCount;
        for (let i = 0; i < this.civsCount; i++) {
            this.civs[i] = new civilization_1.Civilization();
            this.addUnit(new unit_1.Unit('settler', i), { x: (i + 1) * 1, y: (i + 1) * 1 }); // REMOVE THESE
            this.addUnit(new unit_1.Unit('scout', i), { x: (i + 1) * 3, y: (i + 1) * 4 }); // REMOVE THESE
            this.updateCivTileVisibility(i);
        }
        const colorList = [
            '#820000',
            '#0a2ead',
            '#03a300',
            '#03a300',
            '#560e8a',
            '#bd7400', // ORANGE
        ].slice(0, Math.max(this.civsCount, 6));
        this.colorPool = colorList.reduce((obj, color) => (Object.assign(Object.assign({}, obj), { [color]: true })), {});
        this.updates = [];
    }
    getUpdates() {
        // TODO: more updates?
        return this.map.getUpdates().concat(this.updates.splice(0));
    }
    // colorPool
    getColorPool() {
        const colorList = [];
        for (const color in this.colorPool) {
            if (this.colorPool[color]) {
                colorList.push(color);
            }
        }
        return colorList;
    }
    // colorPool, civs
    setCivColor(civID, color) {
        if (this.colorPool[color]) {
            if (this.civs[civID].color) {
                this.colorPool[this.civs[civID].color] = true;
            }
            this.civs[civID].color = color;
            this.colorPool[color] = false;
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
    // map, civs
    addUnit(unit, coords) {
        this.civs[unit.civID].addUnit(unit);
        this.map.moveUnitTo(unit, coords);
    }
    // map, civs
    removeUnit(unit) {
        this.civs[unit.civID].removeUnit(unit);
        this.updates.push(() => ['unitKilled', [unit.coords, unit]]);
        this.map.moveUnitTo(unit, { x: null, y: null });
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
}
exports.World = World;
//# sourceMappingURL=world.js.map