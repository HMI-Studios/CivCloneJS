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
Object.defineProperty(exports, "__esModule", { value: true });
// const fs = require('fs');
const fs = __importStar(require("fs"));
// const { WebSocketServer } = require('ws');
const WebSocket = __importStar(require("ws"));
const express = require('express');
const app = express();
const port = 8080;
const path = require('path');
app.use('/', express.static(path.join(__dirname, '../client')));
const server = app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
// const { Game, Player } = require('./game.js');
// const { Map } = require('./map.js');
const game_1 = require("./game");
const map_1 = require("./map");
const wss = new WebSocket.Server({ server });
const games = {
    0: new game_1.Game(new map_1.Map(38, 38, JSON.parse(fs.readFileSync(path.join(__dirname, 'saves/0.json')).toString()).map), 1),
};
const sendTo = (ws, msg) => {
    ws.send(JSON.stringify(msg));
};
const connections = [];
const connData = [];
const getConnData = (ws) => {
    const connIndex = connections.indexOf(ws);
    return connData[connIndex];
};
const methods = {
    setPlayer: (ws, username) => {
        getConnData(ws).username = username;
    },
    joinGame: (ws, gameID) => {
        const game = games[gameID];
        const username = getConnData(ws).username;
        const civID = game.newPlayerCivID();
        if (civID !== null) {
            getConnData(ws).gameID = gameID;
            game.players[username] = new game_1.Player(civID, ws);
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
        for (let gameID in games) {
            gameList[gameID] = games[gameID].metaData;
        }
        sendTo(ws, {
            update: [
                ['gameList', [gameList]],
            ],
        });
    },
    setColor: (ws, color) => {
        const username = getConnData(ws).username;
        const gameID = getConnData(ws).gameID;
        const game = games[gameID];
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
        const username = getConnData(ws).username;
        const gameID = getConnData(ws).gameID;
        const game = games[gameID];
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
                        // console.log(game)
                        game.forEachCiv((civID) => {
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
    moveUnit: (ws, srcX, srcY, dstX, dstY) => {
        const gameID = getConnData(ws).gameID;
        const game = games[gameID];
        if (game) {
            const map = game.map;
            const src = map.getTile(srcX, srcY);
            const dst = map.getTile(dstX, dstY);
            const unit = src.unit;
            if (unit && dst.unit == null && unit.movement >= src.movementCost) {
                map.moveUnitTo(unit, dstX, dstY);
                unit.movement -= src.movementCost;
            }
            game.sendTileUpdate(src);
            game.sendTileUpdate(dst);
        }
    },
};
wss.on('connection', (ws, req) => {
    connections.push(ws);
    connData.push({
        ws: ws,
        ip: req.socket.remoteAddress,
        username: null,
        gameID: null,
    });
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        }
        catch (err) {
            console.error('Bad JSON recieved from %s', getConnData(ws).ip);
            ws.send(JSON.stringify({ error: ['bad JSON'] }));
            return;
        }
        console.log('received:', data);
        if (data.actions) {
            for (let i = 0; i < data.actions.length; i++) {
                const action = data.actions[i][0];
                const args = data.actions[i][1];
                methods[action](ws, ...args);
            }
        }
    });
});
//# sourceMappingURL=index.js.map