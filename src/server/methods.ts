import * as fs from 'fs';
import path from 'path';
import * as WebSocket from 'ws';
import { Player } from './player';
import { Map } from './map';
import { Game } from './game';

interface ConnectionData {
  ws: WebSocket,
  ip: string,
  username: string | null,
  gameID: number | null,
}

export const connections: WebSocket[] = [];
export const connData: ConnectionData[] = [];

const sendTo = (ws: WebSocket, msg: { [key: string]: unknown }) => {
  ws.send(JSON.stringify(msg));
};

export const games: { [gameID: number] : Game } = {
  0: new Game(
    new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
    1
  ),
};

export const getConnData = (ws: WebSocket): ConnectionData => {
  const connIndex = connections.indexOf(ws);
  return connData[connIndex];
};

export const methods = {
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

  moveUnit: (ws: WebSocket, srcCoords: Coords, path: Coords[]) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
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

  // Depricated
  // TODO: replace with turnFinished
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

  turnFinished: (ws: WebSocket, state: boolean) => {
    const { username, gameID } = getConnData(ws);
    const game = games[gameID];
    const civID = game.players[username].civID;
    const civ = game.civs[civID];

    if (!civ.turnActive) {
      return;
    }

    // mark civ as finished/unfinished
    civ.turnFinished = state;

    // see if all players are finished...
    let finished = true;
    for (let civID = 0; civID < game.playerCount; civID++) {
      const civ = game.civs[civID];
      if (civ.turnActive && !civ.turnFinished) {
        finished = false;
        break;
      }
    }

    // if so:
    if (finished) {
      // end all players' turns
      game.forEachPlayer((player: Player) => {
        game.civs[player.civID].endTurn();
      });

      // Run AIs

      // begin all players' turns
      game.forEachPlayer((player: Player) => {
        if (!player.isAI) {
          game.beginTurnForCiv(player.civID);
        }
      });
    }
  },
};
