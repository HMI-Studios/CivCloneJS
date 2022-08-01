"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAction = exports.getConnData = exports.games = exports.connData = exports.connections = void 0;
const player_1 = require("./player");
const game_1 = require("./game");
const worldGenerator_1 = require("./worldGenerator");
exports.connections = [];
exports.connData = [];
const sendTo = (ws, msg) => {
    ws.send(JSON.stringify(msg));
};
exports.games = {
    0: new game_1.Game(
    // new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
    // new Map(38, 38, ...new WorldGenerator(3634, 38, 38).generate(0.5, 0.9, 1)),
    new worldGenerator_1.PerlinWorldGenerator(1, { width: 20, height: 20 }).generate(), {
        playerCount: 1,
    }),
};
const createGame = (username, playerCount, mapOptions, options) => {
    const newID = Object.keys(exports.games)[Object.keys(exports.games).length - 1] + 1;
    exports.games[newID] = new game_1.Game(new worldGenerator_1.PerlinWorldGenerator(options.seed || Math.floor(Math.random() * 9007199254740991), mapOptions).generate(), {
        playerCount,
        ownerName: username,
        gameName: options.gameName,
    });
};
const getConnData = (ws) => {
    const connIndex = exports.connections.indexOf(ws);
    return exports.connData[connIndex];
};
exports.getConnData = getConnData;
const getUsername = (ws) => {
    const connIndex = exports.connections.indexOf(ws);
    const username = exports.connData[connIndex].username;
    if (!username) {
        sendTo(ws, {
            error: [
                ['invalidUsername', ['username is null; please provide a username.']],
            ],
        });
        throw 'Invalid Username';
    }
    else {
        return username;
    }
};
const getGameID = (ws) => {
    const connIndex = exports.connections.indexOf(ws);
    const gameID = exports.connData[connIndex].gameID;
    if (!gameID) {
        sendTo(ws, {
            error: [
                ['invalidGameID', ['gameID is null; please provide a gameID.']],
            ],
        });
        throw 'Invalid Game ID';
    }
    else {
        return gameID;
    }
};
const executeAction = (ws, action, ...args) => {
    try {
        methods[action](ws, ...args);
    }
    catch (error) {
        console.error(error);
    }
};
exports.executeAction = executeAction;
const methods = {
    setPlayer: (ws, username) => {
        (0, exports.getConnData)(ws).username = username;
    },
    exportGame: (ws) => {
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        if (game) {
            sendTo(ws, { update: [
                    ['gameExportData', [JSON.stringify(game.export())]],
                ] });
        }
    },
    createGame: (ws, playerCount, mapOptions, options) => {
        const username = getUsername(ws);
        if (username && playerCount && mapOptions) {
            createGame(username, playerCount, mapOptions, options || {});
        }
        methods.getGames(ws);
    },
    joinGame: (ws, gameID) => {
        const game = exports.games[gameID];
        const username = getUsername(ws);
        const civID = game === null || game === void 0 ? void 0 : game.newPlayerCivID(username);
        if (civID !== null) {
            (0, exports.getConnData)(ws).gameID = gameID;
            if (!game.players[username]) {
                game.connectPlayer(username, new player_1.Player(civID, ws));
            }
            else {
                game.players[username].reset(ws);
            }
            sendTo(ws, {
                update: [
                    ['civID', [civID]],
                    ['leaderPool', [...game.world.getLeaderPool(), game.getPlayersData()]],
                ],
            });
            const gameList = {};
            for (const id in exports.games) {
                gameList[id] = exports.games[id].getMetaData();
            }
            for (const conn of exports.connData) {
                if (conn.gameID === null) {
                    sendTo(conn.ws, {
                        update: [
                            ['gameList', [gameList]],
                        ],
                    });
                }
            }
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
            gameList[gameID] = exports.games[gameID].getMetaData();
        }
        sendTo(ws, {
            update: [
                ['gameList', [gameList]],
            ],
        });
    },
    setLeader: (ws, leaderID) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const player = game.getPlayer(username);
        if (player) {
            if (game.world.setCivLeader(player.civID, leaderID)) {
                game.sendToAll({
                    update: [
                        ['leaderPool', [...game.world.getLeaderPool(), game.getPlayersData()]],
                    ],
                });
            }
            else {
                sendTo(ws, {
                    error: [
                        ['leaderTaken', ['That leader is no longer available']],
                    ],
                });
            }
        }
    },
    ready: (ws, state) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const player = game.getPlayer(username);
        if (player) {
            const civ = game.world.getCiv(player.civID);
            if (!civ.leader) {
                sendTo(ws, { error: [
                        ['notReady', ['Please select leader']],
                    ] });
                return;
            }
            player.ready = state;
            if (Object.keys(game.players).length === game.playerCount) {
                if (Object.values(game.players).every((player) => player.ready)) {
                    game.startGame(player);
                }
            }
        }
    },
    // Deprecated
    // TODO: replace with turnFinished
    endTurn: (ws) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        game.sendToCiv(civID, {
            error: [
                ['deprecatedAction', ['endTurn is deprecated; use turnFinished instead.']],
            ],
        });
        return;
    },
    turnFinished: (ws, state) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        const civ = game.world.civs[civID];
        if (!civ.turnActive) {
            game.sendToCiv(civID, {
                error: [
                    ['turnExpired', []],
                ],
            });
            return;
        }
        // mark civ as finished/unfinished
        civ.turnFinished = state;
        // see if all players are finished...
        let finished = true;
        for (let civID = 0; civID < game.playerCount; civID++) {
            const civ = game.world.civs[civID];
            if (civ.turnActive && !civ.turnFinished) {
                finished = false;
                break;
            }
        }
        // if so:
        if (finished) {
            // end all players' turns
            game.forEachPlayer((player) => {
                if (!player.isAI) {
                    game.endTurnForCiv(player.civID);
                }
            });
            // Run AIs
            // begin all players' turns
            game.forEachPlayer((player) => {
                if (!player.isAI) {
                    game.beginTurnForCiv(player.civID);
                }
            });
        }
    },
    moveUnit: (ws, srcCoords, path, attack) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        console.log(srcCoords, path, attack);
        if (game) {
            const world = game.world;
            const map = world.map;
            let src = map.getTile(srcCoords);
            let finalCoords = srcCoords;
            for (const dstCoords of path) {
                const dst = map.getTile(dstCoords);
                const unit = src.unit;
                if (!unit || unit.civID !== civID || !(unit.movement >= dst.getMovementCost(unit))) {
                    game.sendUpdates();
                    return;
                }
                if (dst.unit) {
                    break;
                }
                // mark tiles currently visible by unit as unseen
                const srcVisible = map.getVisibleTilesCoords(unit);
                for (const coords of srcVisible) {
                    map.setTileVisibility(civID, coords, false);
                }
                unit.movement -= dst.getMovementCost(unit);
                map.moveUnitTo(unit, dstCoords);
                // mark tiles now visible by unit as seen
                const newVisible = map.getVisibleTilesCoords(unit);
                for (const coords of newVisible) {
                    map.setTileVisibility(civID, coords, true);
                }
                src = dst;
                finalCoords = dstCoords;
            }
            if (attack) {
                const unit = src.unit;
                if (unit) {
                    const target = map.getTile(path[path.length - 1]);
                    if (target.unit && unit.isAdjacentTo(target.unit.coords)) {
                        world.meleeCombat(unit, target.unit);
                        unit.movement = 0;
                    }
                }
            }
            game.sendUpdates();
            game.sendToCiv(civID, {
                update: [
                    ['unitPositionUpdate', [srcCoords, finalCoords]],
                ],
            });
        }
    },
    settleCity: (ws, coords, name) => {
        var _a;
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const world = game.world;
            const map = world.map;
            const unit = (_a = map.getTile(coords)) === null || _a === void 0 ? void 0 : _a.unit;
            if ((unit === null || unit === void 0 ? void 0 : unit.type) === 'settler' && (unit === null || unit === void 0 ? void 0 : unit.civID) === civID) {
                map.settleCityAt(coords, name, civID);
                world.removeUnit(unit);
                game.sendUpdates();
            }
        }
    },
    buildImprovement: (ws, coords, type) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            const unit = tile === null || tile === void 0 ? void 0 : tile.unit;
            if ((unit === null || unit === void 0 ? void 0 : unit.type) === 'builder' && (unit === null || unit === void 0 ? void 0 : unit.civID) === civID && !tile.improvement) {
                map.buildImprovementAt(coords, type);
            }
        }
    },
};
//# sourceMappingURL=methods.js.map