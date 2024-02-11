import * as WebSocket from 'ws';
import WebSocketManager from './game/connection';
import { Player } from './game/player';
import { Map, MapOptions } from './game/map';
import { Game, GameData } from './game';
import { PerlinWorldGenerator, WorldGenerator } from './game/map/generator';
import { PromotionClass } from './game/map/tile/unit';
import { PlayerData } from './utils';
import { WallType } from './game/map/tile/wall';
import { Coords } from './game/world';

interface ConnectionData {
  ws: WebSocketManager,
  ip?: string,
  username: string | null,
  gameID: number | null,
}

export const sockets: WebSocket[] = [];
export const connections: WebSocketManager[] = [];
export const connData: ConnectionData[] = [];

const sendTo = (ws: WebSocketManager, msg: { [key: string]: unknown }) => {
  ws.send(JSON.stringify(msg));
};

export const games: { [gameID: number] : Game } = {};
(async () => {
  const game = await Game.load('singleplayer test')
  games[newID()] = game;
})()

function newID(): number {
  if (Object.keys(games).length) {
    return Number(Object.keys(games)[Object.keys(games).length - 1]) + 1;
  } else {
    return 1;
  }
}

const createGame = (username: string, playerCount: number, mapOptions: MapOptions, options: { seed: number | null, gameName?: string }) => {
  games[newID()] = new Game([
    new PerlinWorldGenerator(options.seed, mapOptions),
    {
      playerCount,
      ownerName: username,
      gameName: options.gameName,
      isManualSeed: options.seed !== null,
    }
  ]);
};

export const getConnData = (ws: WebSocketManager): ConnectionData => {
  const connIndex = connections.indexOf(ws);
  return connData[connIndex];
};

const getUsername = (ws: WebSocketManager): string => {
  const connIndex = connections.indexOf(ws);
  const username = connData[connIndex].username;
  if (!username) {
    sendTo(ws, {
      error: [
        ['invalidUsername', ['username is null; please provide a username.']],
      ],
    });
    throw 'Invalid Username';
  } else {
    return username;
  }
};

const getGameID = (ws: WebSocketManager): number => {
  const connIndex = connections.indexOf(ws);
  const gameID = connData[connIndex].gameID;
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

export const executeAction = (ws: WebSocketManager, action: string, ...args: unknown[]) => {
  try {
    methods[action](ws, ...args);
  } catch(error) {
    console.error(error);
  }
};

const methods: {
  [key: string]: (...args: any[]) => void;
} = {
  listMethods: (ws: WebSocketManager) => {
    sendTo(ws, { update: [
      ['methodList', [Object.keys(methods)]],
    ] });
  },

  // TODO - DEBUG ONLY! REMOVE IN PROD!
  memCheck: (ws: WebSocketManager) => {
    sendTo(ws, { update: [
      ['debug', [process.memoryUsage()]],
    ] });
  },

  setPlayer: (ws: WebSocketManager, username: string) => {
    getConnData(ws).username = username;
    sendTo(ws, { update: [
      ['currentUser', [username]],
    ] });
  },

  verifyPlayer: (ws: WebSocketManager) => {
    try {
      const username = getUsername(ws);
      sendTo(ws, { update: [
        ['currentUser', [username]],
      ] });
    } catch (err) {
      console.error(err);
    }
  },

  exportGame: (ws: WebSocketManager) => {
    const gameID = getGameID(ws);
    const game = games[gameID];
    if (game) {
      sendTo(ws, { update: [
        ['gameExportData', [JSON.stringify(game.export())]],
      ] });

      // TODO REMOVE ME
      game.save();
    }
  },

  createGame: (ws: WebSocketManager, playerCount: number, mapOptions: MapOptions, options: { seed: number | null, gameName?: string }) => {
    const username = getUsername(ws);
    if (username && playerCount && mapOptions) {
      try {
        createGame(username, playerCount, mapOptions, options);
      } catch (err) {
        sendTo(ws, {
          error: [
            ['serverError', [err]],
          ],
        });
      }
    }
    
    methods.getGames(ws);
  },

  joinGame: (ws: WebSocketManager, gameID: number) => {
    const game = games[gameID];

    const username = getUsername(ws);

    const civID = game?.newPlayerCivID(username);
    const isRejoin = game.hasPlayer(username);

    if (civID !== null) {
      getConnData(ws).gameID = gameID;
      
      if (isRejoin) {
        const player = game.getPlayer(username);
        player.reset(ws);
      } else {
        game.connectPlayer(username, new Player(civID, ws));
      }

      sendTo(ws, {
        update: [
          ['civID', [ civID ]],
        ]
      });

      if (isRejoin && game.canStart()) {
        game.startGame(game.getPlayer(username));
      } else {
        sendTo(ws, {
          update: [
            ['leaderPool', [ ...game.world.getLeaderPool(), game.getPlayersData() ]],
          ],
        });
      }

      const gameList: { [id: number]: GameData } = {};
      for (const id in games) {
        gameList[id] = games[id].getMetaData();
      }

      for (const conn of connData) {
        if (conn.gameID === null) {
          sendTo(conn.ws, {
            update: [
              ['gameList', [gameList]],
            ],
          });
        }
      }
    } else {
      sendTo(ws, { error: [
        ['kicked', ['Game full']],
      ] });
    }
  },

  getGames: (ws: WebSocketManager) => {
    const gameList: { [id: number]: GameData } = {};
    for (const gameID in games) {
      gameList[gameID] = games[gameID].getMetaData();
    }

    sendTo(ws, {
      update: [
        ['gameList', [gameList]],
      ],
    });
  },

  setLeader: (ws: WebSocketManager, leaderID: number) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID]
    game.setLeader(game.getPlayer(username), leaderID);
  },

  ready: (ws: WebSocketManager, state: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.setReady(game.getPlayer(username), state);
  },

  turnFinished: (ws: WebSocketManager, state: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.setTurnFinished(game.getPlayer(username), state);
  },

  attack: (ws: WebSocketManager, srcCoords: Coords, targetCoords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.playerUnitCombat(game.getPlayer(username), srcCoords, targetCoords);
  },

  moveUnit: (ws: WebSocketManager, srcCoords: Coords, path: Coords[], attack: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.playerUnitMovement(game.getPlayer(username), srcCoords, path, attack);
  },

  settleCity: (ws: WebSocketManager, coords: Coords, name: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.settleCityAt(game.getPlayer(username), coords, name);
  },

  getImprovementCatalog: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.getImprovementCatalog(game.getPlayer(username), coords);
  },

  buildImprovement: (ws: WebSocketManager, coords: Coords, type: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.buildImprovement(game.getPlayer(username), coords, type);
  },

  buildWall: (ws: WebSocketManager, coords: Coords, facingCoords: Coords, type: number) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.buildWall(game.getPlayer(username), coords, facingCoords, type);
  },

  setGateOpen: (ws: WebSocketManager, coords: Coords, facingCoords: Coords, isOpen: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.setGateOpen(game.getPlayer(username), coords, facingCoords, isOpen);
  },

  getTraders: (ws: WebSocketManager) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.getPlayerTraders(game.getPlayer(username));
  },

  getUnitCatalog: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.getUnitCatalog(game.getPlayer(username), coords);
  },

  trainUnit: (ws: WebSocketManager, coords: Coords, type: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.trainPlayerUnit(game.getPlayer(username), coords, type);
  },

  getKnowledgeCatalog: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.getKnowledgeCatalog(game.getPlayer(username), coords);
  },

  researchKnowledge: (ws: WebSocketManager, coords: Coords, name: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.researchKnowledge(game.getPlayer(username), coords, name);
  },

  stealKnowledge: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.stealKnowledge(game.getPlayer(username), coords);
  },

  setCloak: (ws: WebSocketManager, coords: Coords, cloaked: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);
    const game = games[gameID];
    game.setPlayerUnitCloak(game.getPlayer(username), coords, cloaked);
  },
};
