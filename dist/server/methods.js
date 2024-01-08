"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAction = exports.getConnData = exports.games = exports.connData = exports.connections = void 0;
const player_1 = require("./game/player");
const game_1 = require("./game");
const generator_1 = require("./game/map/generator");
const unit_1 = require("./game/map/tile/unit");
const utils_1 = require("./utils");
const wall_1 = require("./game/map/tile/wall");
exports.connections = [];
exports.connData = [];
const sendTo = (ws, msg) => {
    ws.send(JSON.stringify(msg));
};
exports.games = {};
const createGame = (username, playerCount, mapOptions, options) => {
    const newID = Object.keys(exports.games)[Object.keys(exports.games).length - 1] + 1;
    exports.games[newID] = new game_1.Game(new generator_1.PerlinWorldGenerator(options.seed, mapOptions), {
        playerCount,
        ownerName: username,
        gameName: options.gameName,
        isManualSeed: options.seed !== null,
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
    return gameID;
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
    listMethods: (ws) => {
        sendTo(ws, { update: [
                ['methodList', [Object.keys(methods)]],
            ] });
    },
    // TODO - DEBUG ONLY! REMOVE IN PROD!
    memCheck: (ws) => {
        sendTo(ws, { update: [
                ['debug', [process.memoryUsage()]],
            ] });
    },
    setPlayer: (ws, username) => {
        (0, exports.getConnData)(ws).username = username;
        sendTo(ws, { update: [
                ['currentUser', [username]],
            ] });
    },
    verifyPlayer: (ws) => {
        try {
            const username = getUsername(ws);
            sendTo(ws, { update: [
                    ['currentUser', [username]],
                ] });
        }
        catch (err) {
            console.error(err);
        }
    },
    exportGame: (ws) => {
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        if (game) {
            sendTo(ws, { update: [
                    ['gameExportData', [JSON.stringify(game.export())]],
                ] });
            // TODO REMOVE ME
            game.save();
        }
    },
    createGame: (ws, playerCount, mapOptions, options) => {
        const username = getUsername(ws);
        if (username && playerCount && mapOptions) {
            try {
                createGame(username, playerCount, mapOptions, options);
            }
            catch (err) {
                sendTo(ws, {
                    error: [
                        ['serverError', [err]],
                    ],
                });
            }
        }
        methods.getGames(ws);
    },
    joinGame: (ws, gameID) => {
        const game = exports.games[gameID];
        const username = getUsername(ws);
        const civID = game === null || game === void 0 ? void 0 : game.newPlayerCivID(username);
        const isRejoin = username in game.players;
        if (civID !== null) {
            (0, exports.getConnData)(ws).gameID = gameID;
            if (isRejoin) {
                game.players[username].reset(ws);
            }
            else {
                game.connectPlayer(username, new player_1.Player(civID, ws));
            }
            sendTo(ws, {
                update: [
                    ['civID', [civID]],
                ]
            });
            if (isRejoin) {
                game.startGame(game.players[username]);
            }
            else {
                sendTo(ws, {
                    update: [
                        ['leaderPool', [...game.world.getLeaderPool(), game.getPlayersData()]],
                    ],
                });
            }
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
            game.endTurn();
        }
    },
    attack: (ws, srcCoords, targetCoords) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const world = game.world;
            const map = world.map;
            const src = map.getTile(srcCoords);
            const unit = src.unit;
            const target = map.getTile(targetCoords);
            if (!unit || unit.civID !== civID) {
                game.sendUpdates();
                return;
            }
            if (target.unit && map.canUnitAttack(unit, target.unit) && unit.movement > 0) {
                if (unit.promotionClass === unit_1.PromotionClass.RANGED) {
                    world.rangedCombat(unit, target.unit);
                    unit.movement = 0;
                }
                else {
                    world.meleeCombat(unit, target.unit);
                    unit.movement = 0;
                }
            }
            game.sendUpdates();
            // In case we later support units being moved as a result of them attacking,
            // we want to send a unit position update here. It also simplifies frontend logic.
            game.sendToCiv(civID, {
                update: [
                    ['unitPositionUpdate', [srcCoords, unit.coords]],
                ],
            });
        }
    },
    moveUnit: (ws, srcCoords, path, attack) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const world = game.world;
            const map = world.map;
            let src = map.getTile(srcCoords);
            let finalCoords = srcCoords;
            for (const dstCoords of path) {
                const dst = map.getTile(dstCoords);
                const unit = src.unit;
                if (!unit || unit.civID !== civID) {
                    game.sendUpdates();
                    return;
                }
                const movementCost = map.getStepMovementCost(unit.coords, dstCoords, unit.movementClass);
                if (unit.movement < movementCost) {
                    game.sendUpdates();
                    return;
                }
                if (dst.unit) {
                    if (dst.unit.cloaked) {
                        dst.unit.setCloak(false);
                        map.tileUpdate(dstCoords);
                    }
                    break;
                }
                unit.movement -= movementCost;
                map.moveUnitTo(unit, dstCoords);
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
                const validCityLocation = map.settleCityAt(coords, name, civID, unit);
                if (validCityLocation) {
                    world.removeUnit(unit);
                }
                else {
                    // TODO - some kind of error here?
                }
                game.sendUpdates();
            }
        }
    },
    /**
     * The list of improvements the builder on the given coords is able to build
     * @param coords
     */
    getImprovementCatalog: (ws, coords) => {
        var _a;
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) === civID && tile.unit && map.canBuildOn(tile)) {
                game.sendToCiv(civID, {
                    update: [
                        ['improvementCatalog', [coords, tile.getImprovementCatalog()]],
                    ],
                });
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
                map.startConstructionAt(coords, type, civID, unit);
                game.sendUpdates();
            }
        }
    },
    buildWall: (ws, coords, facingCoords, type) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            const unit = tile === null || tile === void 0 ? void 0 : tile.unit;
            if ((unit === null || unit === void 0 ? void 0 : unit.type) === 'builder' && (unit === null || unit === void 0 ? void 0 : unit.civID) === civID) {
                tile.setWall((0, utils_1.getDirection)(coords, facingCoords), type);
                map.tileUpdate(coords);
                game.sendUpdates();
            }
        }
    },
    setGateOpen: (ws, coords, facingCoords, isOpen) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            const unit = tile === null || tile === void 0 ? void 0 : tile.unit;
            if (unit && unit.civID === civID) {
                const direction = (0, utils_1.getDirection)(coords, facingCoords);
                const wall = tile.getWall(direction);
                if (wall && wall.type === (isOpen ? wall_1.WallType.CLOSED_GATE : wall_1.WallType.OPEN_GATE)) {
                    if (isOpen) {
                        wall.type = wall_1.WallType.OPEN_GATE;
                    }
                    else {
                        wall.type = wall_1.WallType.CLOSED_GATE;
                    }
                    map.tileUpdate(coords);
                    game.sendUpdates();
                }
            }
        }
    },
    getTraders: (ws) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            game.sendToCiv(civID, {
                update: [
                    ['tradersList', [map.getCivTraders(civID)]],
                ],
            });
        }
    },
    /**
     * The list of units the given improvement is able to build
     * @param coords
     */
    getUnitCatalog: (ws, coords) => {
        var _a;
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) === civID && tile.improvement) {
                game.sendToCiv(civID, {
                    update: [
                        ['unitCatalog', [coords, tile.getUnitCatalog()]],
                    ],
                });
            }
        }
    },
    trainUnit: (ws, coords, type) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            map.trainUnitAt(coords, type, civID);
            game.sendUpdates();
        }
    },
    /**
     * The list of units the given improvement is able to build
     * @param coords
     */
    getKnowledgeCatalog: (ws, coords) => {
        var _a;
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            if (((_a = tile.owner) === null || _a === void 0 ? void 0 : _a.civID) === civID && tile.improvement) {
                game.sendToCiv(civID, {
                    update: [
                        ['knowledgeCatalog', [coords, tile.getKnowledgeCatalog()]],
                    ],
                });
            }
        }
    },
    researchKnowledge: (ws, coords, name) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            map.researchKnowledgeAt(coords, name, civID);
            game.sendUpdates();
        }
    },
    stealKnowledge: (ws, coords) => {
        var _a, _b;
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            const unit = tile.unit;
            if (unit && unit.civID === civID) {
                const tileKnowledgeMap = (_b = (_a = tile.improvement) === null || _a === void 0 ? void 0 : _a.knowledge) === null || _b === void 0 ? void 0 : _b.getKnowledgeMap();
                if (tileKnowledgeMap)
                    unit.updateKnowledge(tileKnowledgeMap);
                // TODO - spy invisiblity stuff + possibility of being discovered here
                // TODO - what about stealing from builders?
                map.tileUpdate(unit.coords);
                game.sendUpdates();
            }
        }
    },
    setCloak: (ws, coords, cloaked) => {
        const username = getUsername(ws);
        const gameID = getGameID(ws);
        const game = exports.games[gameID];
        const civID = game.players[username].civID;
        if (game) {
            const map = game.world.map;
            const tile = map.getTile(coords);
            const unit = tile.unit;
            if (unit && unit.civID === civID && unit.movement) {
                unit.setCloak(cloaked);
                unit.movement = 0;
                map.tileUpdate(unit.coords);
                game.sendUpdates();
            }
        }
    },
};
//# sourceMappingURL=methods.js.map