import * as fs from 'fs';
import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';

import express from 'express';
const app = express();
const port = 8080;

import path from 'path';
app.use('/', express.static(path.join(__dirname, '../client')));

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

import { Game, Player } from './game';
import { Map } from './map';

const wss = new WebSocket.Server({ server });

const games = {
  0: new Game(
    new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
    1
  ),
};

const sendTo = (ws: WebSocket, msg: { [key: string]: unknown }): void => {
  ws.send(JSON.stringify(msg));
}

const connections = [];
const connData = [];

const getConnData = (ws: WebSocket): any => {
  const connIndex = connections.indexOf(ws);
  return connData[connIndex];
};

const methods = {
  setPlayer: (ws: WebSocket, username: string): void => {
    getConnData(ws).username = username;
  },

  joinGame: (ws: WebSocket
    , gameID: number) => {
    const game = games[gameID];
    const username = getConnData(ws).username;

    const civID = game.newPlayerCivID();

    if (civID !== null) {
      getConnData(ws).gameID = gameID;
      game.players[username] = new Player(civID, ws);

      sendTo(ws, {
        update: [
          ['civID', [ civID ]],
          ['colorPool', [ game.getColorPool() ]],
        ],
      });
    } else {
      sendTo(ws, { error: [
        ['kicked', ['Game full']],
      ] });
    }
  },

  getGames: (ws: WebSocket) => {
    const gameList = {};
    for (const gameID in games) {
      gameList[gameID] = games[gameID].metaData;
    }

    sendTo(ws, {
      update: [
        ['gameList', [gameList]],
      ],
    });
  },

  setColor: (ws: WebSocket, color: string) => {
    const username = getConnData(ws).username;
    const gameID = getConnData(ws).gameID;
    const game = games[gameID];

    if (game) {
      const player = game.getPlayer(username);

      if (player) {
        if (game.setCivColor(player.civID, color)) {
          game.sendToAll({
            update: [
              ['colorPool', [ game.getColorPool() ]],
            ],
          });
        } else {
          sendTo(ws, {
            error: [
              ['colorTaken', ['That color is no longer available']],
            ],
          });
        }
      }
    }
  },

  ready: (ws: WebSocket, state: boolean) => {
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
          if (Object.values(game.players).every((player: Player) => player.ready)) {
            game.sendToAll({
              update: [
                ['beginGame', [ [game.map.width, game.map.height], game.playerCount ]],
                ['civData', [ game.getAllCivsData() ]],
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

  moveUnit: (ws: WebSocket, srcX: number, srcY: number, dstX: number, dstY: number) => {
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

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {

  connections.push(ws);
  connData.push({
    ws: ws,
    ip: req.socket.remoteAddress,
    username: null,
    gameID: null,
  });

  ws.on('message', (message: string) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Bad JSON recieved from %s', getConnData(ws).ip);
      ws.send(JSON.stringify({error: ['bad JSON']}));
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