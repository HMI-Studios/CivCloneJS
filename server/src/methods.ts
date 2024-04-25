import * as WebSocket from 'ws';
import WebSocketManager from './game/connection';
import { Player } from './game/player';
import { MapOptions } from './game/map';
import { Game, GameData } from './game';
import { PerlinWorldGenerator } from './game/map/generator';
import { Coords } from './game/world';
import { FrontendError } from './utils/error';
import { civTemplates } from './game/civilization';

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
  // const game = await Game.load('singleplayer test')
  // games[newID()] = game;
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

(async () => {
  createGame(
    'system',
    1,
    {
      width: 100,
      height: 100,
    },
    {
      seed: null,
      gameName: 'random seed test',
    }
  )
})

export const getConnData = (ws: WebSocketManager): ConnectionData => {
  const connIndex = connections.indexOf(ws);
  return connData[connIndex];
};

const getUsername = (ws: WebSocketManager): string => {
  const connIndex = connections.indexOf(ws);
  const username = connData[connIndex].username;
  if (!username) {
    throw new FrontendError('invalidUsername', 'username is null; please provide a username.');
  } else {
    return username;
  }
};

const getGameID = (ws: WebSocketManager): number => {
  const connIndex = connections.indexOf(ws);
  const gameID = connData[connIndex].gameID;
  if (!gameID) {
    throw new FrontendError('invalidGameID', 'gameID is null; please provide a gameID.');
  }

  return gameID;
};

const getGameInfo = (ws: WebSocketManager): [Game, Player] => {
  const username = getUsername(ws);
  const gameID = getGameID(ws);
  const game = games[gameID];
  if (!game) throw new FrontendError('invalidGameID', `gameID is ${gameID}; no such game found.`);
  const player = game.getPlayer(username);
  if (!player) throw new FrontendError('invalidUsername', `username is ${username}; no such user found in this game.`);
  return [game, player];
}

export const executeAction = (ws: WebSocketManager, action: string, ...args: unknown[]) => {
  try {
    methods[action](ws, ...args);
  } catch(error) {
    if (error instanceof FrontendError) {
      sendTo(ws, {
        error: [error.getPacket()],
      });
    } else {
      console.error(error);
    }
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
    const username = getUsername(ws);
    sendTo(ws, { update: [
      ['currentUser', [username]],
    ] });
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

    const leaderID = game?.newPlayerLeaderID(username);
    const isRejoin = game.hasPlayer(username);

    if (leaderID !== null) {
      getConnData(ws).gameID = gameID;
      
      if (isRejoin) {
        const player = game.getPlayer(username) as Player; // Safe, since `isRejoin` is only true if the player exists.
        player.reset(ws);
      } else {
        game.connectPlayer(username, new Player(leaderID, ws));
      }

      sendTo(ws, {
        update: [
          ['leaderID', [ leaderID ]],
        ]
      });

      game.sendToAll({
        update: [
          ['leaderData', [ game.getLeadersData() ]],
        ],
      })

      if (isRejoin && game.canStart()) {
        game.startGame(game.getPlayer(username));
      } else {
        sendTo(ws, {
          update: [
            ['civPool', [ game.civPool, civTemplates, game.getPlayersData() ]],
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

  selectCiv: (ws: WebSocketManager, civTemplateID: number) => {
    const [game, player] = getGameInfo(ws);
    game.selectCiv(player, civTemplateID);
  },

  ready: (ws: WebSocketManager, state: boolean) => {
    const [game, player] = getGameInfo(ws);
    game.setReady(player, state);
  },

  turnFinished: (ws: WebSocketManager, state: boolean) => {
    const [game, player] = getGameInfo(ws);
    game.setTurnFinished(player, state);
  },

  attack: (ws: WebSocketManager, srcCoords: Coords, targetCoords: Coords) => {
    const [game, player] = getGameInfo(ws);
    game.playerUnitCombat(player, srcCoords, targetCoords);
  },

  moveUnit: (ws: WebSocketManager, srcCoords: Coords, path: Coords[], attack: boolean) => {
    const [game, player] = getGameInfo(ws);
    game.playerUnitMovement(player, srcCoords, path, attack);
  },

  settleCity: (ws: WebSocketManager, coords: Coords, name: string) => {
    const [game, player] = getGameInfo(ws);
    game.settleCityAt(player, coords, name);
  },

  getImprovementCatalog: (ws: WebSocketManager, coords: Coords) => {
    const [game, player] = getGameInfo(ws);
    game.getImprovementCatalog(player, coords);
  },

  buildImprovement: (ws: WebSocketManager, coords: Coords, type: string) => {
    const [game, player] = getGameInfo(ws);
    game.buildImprovement(player, coords, type);
  },

  buildWall: (ws: WebSocketManager, coords: Coords, facingCoords: Coords, type: number) => {
    const [game, player] = getGameInfo(ws);
    game.buildWall(player, coords, facingCoords, type);
  },

  setGateOpen: (ws: WebSocketManager, coords: Coords, facingCoords: Coords, isOpen: boolean) => {
    const [game, player] = getGameInfo(ws);
    game.setGateOpen(player, coords, facingCoords, isOpen);
  },

  getTraders: (ws: WebSocketManager) => {
    const [game, player] = getGameInfo(ws);
    game.getPlayerTraders(player);
  },

  getUnitCatalog: (ws: WebSocketManager, coords: Coords) => {
    const [game, player] = getGameInfo(ws);
    game.getUnitCatalog(player, coords);
  },

  trainUnit: (ws: WebSocketManager, coords: Coords, type: string) => {
    const [game, player] = getGameInfo(ws);
    game.trainPlayerUnit(player, coords, type);
  },

  getKnowledgeCatalog: (ws: WebSocketManager, coords: Coords) => {
    const [game, player] = getGameInfo(ws);
    game.getKnowledgeCatalog(player, coords);
  },

  researchKnowledge: (ws: WebSocketManager, coords: Coords, name: string) => {
    const [game, player] = getGameInfo(ws);
    game.researchKnowledge(player, coords, name);
  },

  stealKnowledge: (ws: WebSocketManager, coords: Coords) => {
    const [game, player] = getGameInfo(ws);
    game.stealKnowledge(player, coords);
  },

  setCloak: (ws: WebSocketManager, coords: Coords, cloaked: boolean) => {
    const [game, player] = getGameInfo(ws);
    game.setPlayerUnitCloak(player, coords, cloaked);
  },
};
