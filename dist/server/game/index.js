"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("path"));
const config_1 = require("../config");
const world_1 = require("./world");
const player_1 = require("./player");
const error_1 = require("../utils/error");
class Game {
    constructor(generator, options) {
        var _a;
        if (!(generator && options)) {
            // If no arguments are provided, this is part of a call to Game.import
            return;
        }
        const { playerCount, ownerName } = options;
        const gameName = (_a = options.gameName) !== null && _a !== void 0 ? _a : (ownerName ? `${ownerName}'s game` : 'Untitled Game');
        let tries = 0;
        const maxTries = options.isManualSeed ? 1 : 10;
        while (!this.world && !(tries > maxTries)) {
            tries++;
            try {
                this.world = new world_1.World(generator.generate(), playerCount);
            }
            catch (err) {
                if (err instanceof error_1.MapError) {
                    generator.reseed(null);
                    console.warn(`Retrying map generation.`);
                    if (tries + 1 > maxTries) {
                        console.error('Map generation failed.');
                        throw new error_1.GenerationFailed(`Could not generate map! (gave up after ${tries} tries)`);
                    }
                }
                else
                    throw err;
            }
        }
        this.players = {};
        this.playerCount = playerCount;
        this.metaData = {
            gameName,
            ownerName,
            playerCount,
            playersConnected: Object.keys(this.players).length,
        };
        this.hasStarted = false;
    }
    export() {
        const exportedPlayers = {};
        for (const playerName in this.players) {
            const player = this.players[playerName];
            exportedPlayers[playerName] = player.export();
        }
        return {
            world: this.world.export(),
            players: exportedPlayers,
            playerCount: this.playerCount,
            metaData: this.metaData,
            hasStarted: this.hasStarted,
        };
    }
    static import(data) {
        const game = new Game();
        game.world = world_1.World.import(data.world);
        game.players = {};
        for (const playerName in data.players) {
            const playerData = data.players[playerName];
            game.players[playerName] = player_1.Player.import(playerData);
        }
        game.playerCount = data.playerCount;
        game.metaData = data.metaData;
        game.hasStarted = data.hasStarted;
        return game;
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.writeFile(path.join(config_1.SAVE_LOCATION, `${this.metaData.gameName}.json`), JSON.stringify(this.export()));
        });
    }
    static load(saveFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield fs.readFile(path.join(config_1.SAVE_LOCATION, `${saveFile}.json`), { encoding: 'utf8' });
            return Game.import(JSON.parse(data));
        });
    }
    connectPlayer(username, player) {
        this.players[username] = player;
        this.metaData = Object.assign(Object.assign({}, this.metaData), { playersConnected: Object.keys(this.players).length });
    }
    startGame(player) {
        if (this.hasStarted) {
            if (player) {
                this.sendToCiv(player.civID, {
                    update: [
                        ['beginGame', [[this.world.map.width, this.world.map.height], this.playerCount]],
                        ['civData', [this.world.getAllCivsData()]],
                    ],
                });
                this.resumeTurnForCiv(player.civID);
            }
        }
        else {
            this.hasStarted = true;
            this.sendToAll({
                update: [
                    ['beginGame', [[this.world.map.width, this.world.map.height], this.playerCount]],
                    ['civData', [this.world.getAllCivsData()]],
                ],
            });
            this.forEachCivID((civID) => {
                this.sendToCiv(civID, {
                    update: [
                        ['setMap', [this.world.map.getCivMap(civID)]],
                    ],
                });
                this.beginTurnForCiv(civID);
            });
        }
    }
    beginTurnForCiv(civID) {
        this.world.civs[civID].newTurn();
        this.world.updateCivTileVisibility(civID);
        this.resumeTurnForCiv(civID);
    }
    resumeTurnForCiv(civID) {
        this.sendToCiv(civID, {
            update: [
                ['setMap', [this.world.map.getCivMap(civID)]],
                ['unitPositions', [this.world.getCivUnitPositions(civID)]],
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
    endTurn() {
        // end all players' turns
        this.forEachPlayer((player) => {
            if (!player.isAI()) {
                this.endTurnForCiv(player.civID);
            }
        });
        // Run AIs
        // Run end-of-turn updates
        this.world.turn();
        // begin all players' turns
        this.forEachPlayer((player) => {
            if (!player.isAI()) {
                this.beginTurnForCiv(player.civID);
            }
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
    getPlayersData() {
        const playersData = {};
        for (const playerName in this.players) {
            playersData[playerName] = this.players[playerName].getData();
        }
        return playersData;
    }
    getMetaData() {
        return Object.assign(Object.assign({}, this.metaData), { players: this.getPlayersData() });
    }
    sendToAll(msg) {
        for (const playerName in this.players) {
            const player = this.players[playerName];
            player.send(JSON.stringify(msg));
        }
    }
    sendToCiv(civID, msg) {
        const player = Object.values(this.players).find(player => player.civID === civID);
        if (!player) {
            console.error("Error: Could not find player for Civilization #" + civID);
            return;
        }
        player.send(JSON.stringify(msg));
    }
    forEachPlayer(callback) {
        for (const playerName in this.players) {
            callback(this.players[playerName]);
        }
    }
    newPlayerCivID(username) {
        const freeCivs = {};
        for (let i = 0; i < this.playerCount; i++) {
            freeCivs[i] = true;
        }
        for (const player in this.players) {
            if (username === player)
                return this.players[player].civID;
            delete freeCivs[this.players[player].civID];
        }
        const freeIDs = Object.keys(freeCivs).map(Number);
        if (!freeIDs.length) {
            return null;
        }
        return Math.min(...freeIDs);
    }
    forEachCivID(callback) {
        for (let civID = 0; civID < this.playerCount; civID++) {
            callback(civID);
        }
    }
}
exports.Game = Game;
//# sourceMappingURL=index.js.map