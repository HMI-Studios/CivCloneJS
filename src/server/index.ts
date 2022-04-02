import * as fs from 'fs';
import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';

import express from 'express';
const app = express();
const port = 8080;

import path from 'path';
app.use('/', express.static(path.join(__dirname, '../client')));
app.use('/docs', express.static(path.join(__dirname, '../docs')));

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

import { Game, Player, Coords } from './game';
import { Map } from './map';

const wss = new WebSocket.Server({ server });

const games: { [gameID: number] : Game } = {
  0: new Game(
    new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
    1
  ),
};

const sendTo = (ws: WebSocket, msg: { [key: string]: unknown }) => {
  ws.send(JSON.stringify(msg));
}

interface ConnectionData {
  ws: WebSocket,
  ip: string,
  username: string | null,
  gameID: number | null,
}

const connections: WebSocket[] = [];
const connData: ConnectionData[] = [];

const getConnData = (ws: WebSocket): ConnectionData => {
  const connIndex = connections.indexOf(ws);
  return connData[connIndex];
};

const methods = {
  setPlayer: (ws: WebSocket, username: string) => {
    getConnData(ws).username = username;
  },

  joinGame: (ws: WebSocket, gameID: number) => {
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
    const { username, gameID } = getConnData(ws);
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
    const { username, gameID } = getConnData(ws);
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

            game.forEachCivID((civID: number) => {
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

  moveUnit: (ws: WebSocket, srcCoords: Coords, dstCoords: Coords) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.map;

      const src = map.getTile(srcCoords);
      const dst = map.getTile(dstCoords);

      const unit = src.unit;

      if (unit && unit.civID === civID && dst.unit === null && unit.movement >= dst.getMovementCost(unit)) {
        unit.movement -= dst.getMovementCost(unit);
        map.moveUnitTo(unit, dstCoords);

        game.sendTileUpdate(srcCoords, src);
        game.sendTileUpdate(dstCoords, dst);

        const visible = game.map.getVisibleTilesCoords(unit);
        for (const coords of visible) {
          const tile = game.map.getTile(coords);

          tile.setVisibility(civID, true);
          game.sendTileUpdate(coords, tile);
        }
      }

    }
  },

  endTurn: (ws: WebSocket) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
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

      game.forEachPlayer((player: Player) => {
        if (!player.isAI) {
          game.beginTurnForCiv(player.civID);
        }
      });
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