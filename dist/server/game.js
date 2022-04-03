"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const unit_1 = require("./unit");
const civilization_1 = require("./civilization");
class Game {
    constructor(map, playerCount) {
        this.map = map;
        this.civs = {};
        for (let i = 0; i < playerCount; i++) {
            this.civs[i] = new civilization_1.Civilization();
            this.addUnit(new unit_1.Unit('settler', i), { x: (i + 1) * 1, y: (i + 1) * 1 }); // REMOVE THESE
            this.addUnit(new unit_1.Unit('scout', i), { x: (i + 1) * 3, y: (i + 1) * 4 }); // REMOVE THESE
            this.updateCivTileVisibility(i);
        }
        this.players = {};
        this.playerCount = playerCount;
        const colorList = [
            '#820000',
            '#0a2ead',
            '#03a300',
            '#03a300',
            '#560e8a',
            '#bd7400', // ORANGE
        ].slice(0, Math.max(this.playerCount, 6));
        this.colorPool = colorList.reduce((obj, color) => (Object.assign(Object.assign({}, obj), { [color]: true })), {});
        this.metaData = {
            gameName: "New Game",
        };
    }
    getPlayer(username) {
        return this.players[username];
    }
    getCiv(civID) {
        return this.civs[civID];
    }
    getColorPool() {
        const colorList = [];
        for (const color in this.colorPool) {
            if (this.colorPool[color]) {
                colorList.push(color);
            }
        }
        return colorList;
    }
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
    getAllCivsData() {
        const data = {};
        for (const civID in this.civs) {
            const civ = this.civs[civID];
            data[civID] = civ.getData();
        }
        return data;
    }
    beginTurnForCiv(civID) {
        this.civs[civID].newTurn();
        this.updateCivTileVisibility(civID);
        this.sendToCiv(civID, {
            update: [
                ['setMap', [this.map.getCivMap(civID)]],
                ['beginTurn', []],
            ],
        });
    }
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
    addUnit(unit, coords) {
        this.civs[unit.civID].addUnit(unit);
        this.map.moveUnitTo(unit, coords);
    }
    removeUnit(unit) {
        this.civs[unit.civID].removeUnit(unit);
        this.map.moveUnitTo(unit, { x: null, y: null });
    }
    newPlayerCivID() {
        const freeCivs = {};
        for (let i = 0; i < this.playerCount; i++) {
            freeCivs[i] = true;
        }
        for (const player in this.players) {
            delete freeCivs[this.players[player].civID];
        }
        const freeIDs = Object.keys(freeCivs).map(Number);
        if (freeIDs.length > 0) {
            return Math.min(...freeIDs);
        }
        else {
            return null;
        }
    }
    sendToAll(msg) {
        for (const playerName in this.players) {
            const player = this.players[playerName];
            if (player.isAI) {
                return;
            }
            else {
                player.connection.send(JSON.stringify(msg));
            }
        }
    }
    sendToCiv(civID, msg) {
        const player = Object.values(this.players).find(player => player.civID === civID);
        if (!player) {
            console.error("Error: Could not find player for Civilization #" + civID);
            return;
        }
        if (player.isAI) {
            return;
        }
        else {
            player.connection.send(JSON.stringify(msg));
        }
    }
    sendTileUpdate(coords, tile) {
        this.forEachCivID((civID) => {
            this.sendToCiv(civID, {
                update: [
                    ['tileUpdate', [coords, this.map.getCivTile(civID, tile)]],
                ],
            });
        });
    }
    forEachCivID(callback) {
        for (let civID = 0; civID < this.playerCount; civID++) {
            callback(civID);
        }
    }
    forEachPlayer(callback) {
        for (const playerName in this.players) {
            callback(this.players[playerName]);
        }
    }
}
exports.Game = Game;
//# sourceMappingURL=game.js.map