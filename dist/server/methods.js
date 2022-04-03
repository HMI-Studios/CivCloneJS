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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = exports.getConnData = exports.games = exports.connData = exports.connections = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const player_1 = require("./player");
const map_1 = require("./map");
const game_1 = require("./game");
exports.connections = [];
exports.connData = [];
const sendTo = (ws, msg) => {
    ws.send(JSON.stringify(msg));
};
exports.games = {
    0: new game_1.Game(new map_1.Map(38, 38, JSON.parse(fs.readFileSync(path_1.default.join(__dirname, 'saves/0.json')).toString()).map), 1),
};
const getConnData = (ws) => {
    const connIndex = exports.connections.indexOf(ws);
    return exports.connData[connIndex];
};
exports.getConnData = getConnData;
exports.methods = {
    setPlayer: (ws, username) => {
        (0, exports.getConnData)(ws).username = username;
    },
    joinGame: (ws, gameID) => {
        const game = exports.games[gameID];
        const username = (0, exports.getConnData)(ws).username;
        const civID = game.newPlayerCivID();
        if (civID !== null) {
            (0, exports.getConnData)(ws).gameID = gameID;
            game.players[username] = new player_1.Player(civID, ws);
            sendTo(ws, {
                update: [
                    ['civID', [civID]],
                    ['colorPool', [game.getColorPool()]],
                ],
            });
        }
        else {
            sendTo(ws, { error: [
                    ['kicked', ['Game full']],
                ] });
        }
    },
    getGames: (ws) => {
        const gameList = {};
        for (const gameID in exports.games) {
            gameList[gameID] = exports.games[gameID].metaData;
        }
        sendTo(ws, {
            update: [
                ['gameList', [gameList]],
            ],
        });
    },
    setColor: (ws, color) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        if (game) {
            const player = game.getPlayer(username);
            if (player) {
                if (game.setCivColor(player.civID, color)) {
                    game.sendToAll({
                        update: [
                            ['colorPool', [game.getColorPool()]],
                        ],
                    });
                }
                else {
                    sendTo(ws, {
                        error: [
                            ['colorTaken', ['That color is no longer available']],
                        ],
                    });
                }
            }
        }
    },
    ready: (ws, state) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        if (game) {
            const player = game.getPlayer(username);
            if (player) {
                const civ = game.getCiv(player.civID);
                if (!civ.color) {
                    sendTo(ws, { error: [
                            ['notReady', ['Please select civ color']],
                        ] });
                    return;
                }
                player.ready = state;
                if (Object.keys(game.players).length === game.playerCount) {
                    if (Object.values(game.players).every((player) => player.ready)) {
                        game.sendToAll({
                            update: [
                                ['beginGame', [[game.map.width, game.map.height], game.playerCount]],
                                ['civData', [game.getAllCivsData()]],
                            ],
                        });
                        game.forEachCivID((civID) => {
                            game.sendToCiv(civID, {
                                update: [
                                    ['setMap', [game.map.getCivMap(civID)]],
                                ],
                            });
                        });
                        game.beginTurnForCiv(0);
                    }
                }
            }
        }
    },
    moveUnit: (ws, srcCoords, path) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        console.log(srcCoords, path);
        if (game) {
            const map = game.map;
            let src = map.getTile(srcCoords);
            for (const dstCoords of path) {
                const dst = map.getTile(dstCoords);
                const unit = src.unit;
                if (!(unit && unit.civID === civID && dst.unit === null && unit.movement >= dst.getMovementCost(unit))) {
                    return;
                }
                // mark tiles currently visible by unit as unseen
                const srcVisible = game.map.getVisibleTilesCoords(unit);
                for (const coords of srcVisible) {
                    const tile = game.map.getTile(coords);
                    tile.setVisibility(civID, false);
                    game.sendTileUpdate(coords, tile);
                }
                unit.movement -= dst.getMovementCost(unit);
                map.moveUnitTo(unit, dstCoords);
                game.sendTileUpdate(srcCoords, src);
                game.sendTileUpdate(dstCoords, dst);
                // mark tiles now visible by unit as seen
                const newVisible = game.map.getVisibleTilesCoords(unit);
                for (const coords of newVisible) {
                    const tile = game.map.getTile(coords);
                    tile.setVisibility(civID, true);
                    game.sendTileUpdate(coords, tile);
                }
                src = dst;
            }
        }
    },
    endTurn: (ws) => {
        const { username, gameID } = (0, exports.getConnData)(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        const civ = game.civs[civID];
        if (civ.turnActive) {
            civ.endTurn();
        }
        let active = false;
        for (let civID = 0; civID < game.playerCount; civID++) {
            if (game.civs[civID].turnActive) {
                active = true;
                break;
            }
        }
        if (!active) {
            // Run AIs
            game.forEachPlayer((player) => {
                if (!player.isAI) {
                    game.beginTurnForCiv(player.civID);
                }
            });
        }
    },
};
//# sourceMappingURL=methods.js.map