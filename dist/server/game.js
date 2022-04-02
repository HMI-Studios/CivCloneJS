"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = exports.Civilization = exports.Unit = exports.Game = void 0;
const map_1 = require("./map");
class Game {
    constructor(map, playerCount) {
        this.map = map;
        this.civs = {};
        for (let i = 0; i < playerCount; i++) {
            this.civs[i] = new Civilization();
            this.addUnit(new Unit('settler', i), { x: (i + 1) * 1, y: (i + 1) * 1 }); // REMOVE THESE
            this.addUnit(new Unit('scout', i), { x: (i + 1) * 3, y: (i + 1) * 4 }); // REMOVE THESE
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
const unitMovementTable = {
    'settler': 3,
    'scout': 5,
};
const unitMovementClassTable = {
    'settler': 0,
    'scout': 0,
};
class Unit {
    constructor(type, civID) {
        this.type = type;
        this.hp = 100;
        this.movement = 0;
        this.movementClass = unitMovementClassTable[type];
        this.civID = civID;
        this.coords = {
            x: null,
            y: null,
        };
    }
    getData() {
        return {
            type: this.type,
            hp: this.hp,
            movement: this.movement,
            civID: this.civID,
        };
    }
    getMovementClass() {
        return this.movementClass;
    }
    newTurn() {
        this.movement = unitMovementTable[this.type];
    }
}
exports.Unit = Unit;
class Civilization {
    constructor() {
        this.units = [];
        this.color = null;
        this.turnActive = false;
    }
    getData() {
        return {
            color: this.color
        };
    }
    newTurn() {
        this.turnActive = true;
        for (const unit of this.units) {
            unit.newTurn();
        }
    }
    endTurn() {
        this.turnActive = false;
    }
    addUnit(unit) {
        this.units.push(unit);
    }
    removeUnit(unit) {
        const unitIndex = this.units.indexOf(unit);
        if (unitIndex > -1) {
            this.units.splice(unitIndex, 1);
        }
    }
}
exports.Civilization = Civilization;
class Player {
    constructor(civID, connection) {
        this.civID = civID;
        this.ready = false;
        this.isAI = !connection;
        this.connection = connection;
    }
}
exports.Player = Player;
module.exports = {
    Game, Map: map_1.Map, Tile: map_1.Tile, Unit, Civilization, Player,
};
//# sourceMappingURL=game.js.map