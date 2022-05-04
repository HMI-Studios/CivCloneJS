"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const world_1 = require("./world");
class Game {
    constructor(map, options) {
        const { playerCount, ownerName } = options;
        let { gameName } = options;
        if (!gameName)
            gameName = ownerName ? `${ownerName}'s game` : 'Untitled Game';
        this.world = new world_1.World(map, playerCount);
        this.players = {};
        this.playerCount = playerCount;
        this.metaData = {
            gameName,
            ownerName,
            playerCount,
            playersConnected: Object.keys(this.players).length,
        };
    }
    connectPlayer(username, player) {
        this.players[username] = player;
        this.metaData = Object.assign(Object.assign({}, this.metaData), { playersConnected: Object.keys(this.players).length });
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
    sendUpdates() {
        const updates = this.world.getUpdates();
        this.forEachCivID((civID) => {
            this.sendToCiv(civID, {
                update: updates.map(updateFn => updateFn(civID)), //.filter(update => update),
            });
        });
    }
    getPlayer(username) {
        return this.players[username];
    }
    getMetaData() {
        return Object.assign(Object.assign({}, this.metaData), { players: this.players });
    }
    sendToAll(msg) {
        for (const playerName in this.players) {
            const player = this.players[playerName];
            if (player.isAI) {
                continue;
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