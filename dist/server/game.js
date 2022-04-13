"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const world_1 = require("./world");
class Game {
    constructor(map, playerCount) {
        this.world = new world_1.World(map, playerCount);
        this.players = {};
        this.playerCount = playerCount;
    }
    beginTurnForCiv(civID) {
        this.world.civs[civID].newTurn();
        this.world.updateCivTileVisibility(civID);
        this.sendToCiv(civID, {
            update: [
                ['setMap', [this.world.map.getCivMap(civID)]],
                ['beginTurn', []],
            ],
        });
    }
    endTurnForCiv(civID) {
        this.world.civs[civID].endTurn();
        this.sendToCiv(civID, {
            update: [
                ['endTurn', []],
            ],
        });
    }
    settleCityAt(coords, name, civID) {
        let city = this.world.map.settleCityAt(coords, name, civID);
        for (const neighbor of this.world.map.getNeighborsCoords(coords)) {
            this.world.map.setTileOwner(neighbor, city);
            this.sendTileUpdate(neighbor, this.world.map.getTile(neighbor));
        }
        this.sendTileUpdate(coords, this.world.map.getTile(coords));
    }
    sendTileUpdate(coords, tile) {
        this.forEachCivID((civID) => {
            this.sendToCiv(civID, {
                update: [
                    ['tileUpdate', [coords, this.world.map.getCivTile(civID, tile)]],
                ],
            });
        });
    }
    getPlayer(username) {
        return this.players[username];
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
    forEachPlayer(callback) {
        for (const playerName in this.players) {
            callback(this.players[playerName]);
        }
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
    forEachCivID(callback) {
        for (let civID = 0; civID < this.playerCount; civID++) {
            callback(civID);
        }
    }
}
exports.Game = Game;
//# sourceMappingURL=game.js.map