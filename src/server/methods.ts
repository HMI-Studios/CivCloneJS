import * as WebSocket from 'ws';
import { Player } from './game/player';
import { Map, MapOptions } from './game/map';
import { Game } from './game';
import { PerlinWorldGenerator, WorldGenerator } from './game/map/generator';

interface ConnectionData {
  ws: WebSocket,
  ip?: string,
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
    // new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
    // new Map(38, 38, ...new WorldGenerator(3634, 38, 38).generate(0.5, 0.9, 1)),
    new PerlinWorldGenerator(1, { width: 20, height: 20 }).generate(),
    {
      gameName: 'singleplayer unsaved test',
      playerCount: 1,
    }
  ),
  // 1: new Game(
  //   // new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
  //   // new Map(38, 38, ...new WorldGenerator(3634, 38, 38).generate(0.5, 0.9, 1)),
  //   new PerlinWorldGenerator(1, { width: 20, height: 20 }).generate(),
  //   {
  //     gameName: 'singleplayer test',
  //     playerCount: 1,
  //   }
  // ),
  // 2: new Game(
  //   // new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') ).toString()).map),
  //   // new Map(38, 38, ...new WorldGenerator(3634, 38, 38).generate(0.5, 0.9, 1)),
  //   new PerlinWorldGenerator(1, { width: 20, height: 20 }).generate(),
  //   {
  //     gameName: 'multiplayer test',
  //     playerCount: 2,
  //   }
  // ),
};
// games[1].save();
// games[2].save();
(async () => {
  games[1] = await Game.load('singleplayer test')
  // games[2] = await Game.load('no units test')
  // games[2] = await Game.load('multiplayer test')
})()

const createGame = (username: string, playerCount: number, mapOptions: MapOptions, options: { seed?: number, gameName?: string }) => {
  const newID = Object.keys(games)[Object.keys(games).length - 1] + 1;
  games[newID] = new Game(
    new PerlinWorldGenerator(options.seed ?? Math.floor(Math.random() * 9007199254740991), mapOptions).generate(),
    {
      playerCount,
      ownerName: username,
      gameName: options.gameName,
    }
  );
};

export const getConnData = (ws: WebSocket): ConnectionData => {
  const connIndex = connections.indexOf(ws);
  return connData[connIndex];
};

const getUsername = (ws: WebSocket): string => {
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

const getGameID = (ws: WebSocket): number => {
  const connIndex = connections.indexOf(ws);
  const gameID = connData[connIndex].gameID;
  if (!gameID) {
    sendTo(ws, {
      error: [
        ['invalidGameID', ['gameID is null; please provide a gameID.']],
      ],
    });
    throw 'Invalid Game ID';
  } else {
    return gameID;
  }
};

export const executeAction = (ws: WebSocket, action: string, ...args: unknown[]) => {
  try {
    methods[action](ws, ...args);
  } catch(error) {
    console.error(error);
  }
};

const methods: {
  [key: string]: (...args: unknown[]) => void;
} = {
  setPlayer: (ws: WebSocket, username: string) => {
    getConnData(ws).username = username;
    sendTo(ws, { update: [
      ['currentUser', [username]],
    ] });
  },

  verifyPlayer: (ws: WebSocket) => {
    try {
      const username = getUsername(ws);
      sendTo(ws, { update: [
        ['currentUser', [username]],
      ] });
    } catch (err) {
      console.error(err);
    }
  },

  exportGame: (ws: WebSocket) => {
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

  createGame: (ws: WebSocket, playerCount: number, mapOptions: MapOptions, options: { seed?: number, gameName?: string }) => {
    const username = getUsername(ws);
    if (username && playerCount && mapOptions) {
      createGame(username, playerCount, mapOptions, options ?? {});
    }
    
    methods.getGames(ws);
  },

  joinGame: (ws: WebSocket, gameID: number) => {
    const game = games[gameID];

    const username = getUsername(ws);

    const civID = game?.newPlayerCivID(username);
    const isRejoin = username in game.players;

    if (civID !== null) {
      getConnData(ws).gameID = gameID;
      
      if (isRejoin) {
        game.players[username].reset(ws);
      } else {
        game.connectPlayer(username, new Player(civID, ws));
      }

      sendTo(ws, {
        update: [
          ['civID', [ civID ]],
        ]
      });

      if (isRejoin) {
        game.startGame(game.players[username]);
      } else {
        sendTo(ws, {
          update: [
            ['leaderPool', [ ...game.world.getLeaderPool(), game.getPlayersData() ]],
          ],
        });
      }

      const gameList = {};
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

  getGames: (ws: WebSocket) => {
    const gameList = {};
    for (const gameID in games) {
      gameList[gameID] = games[gameID].getMetaData();
    }

    sendTo(ws, {
      update: [
        ['gameList', [gameList]],
      ],
    });
  },

  setLeader: (ws: WebSocket, leaderID: number) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];

    const player = game.getPlayer(username);

    if (player) {
      if (game.world.setCivLeader(player.civID, leaderID)) {
        game.sendToAll({
          update: [
            ['leaderPool', [ ...game.world.getLeaderPool(), game.getPlayersData() ]],
          ],
        });
      } else {
        sendTo(ws, {
          error: [
            ['leaderTaken', ['That leader is no longer available']],
          ],
        });
      }
    }
  },

  ready: (ws: WebSocket, state: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];

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
        if (Object.values(game.players).every((player: Player) => player.ready)) {
          game.startGame(player);
        }
      }
    }
  },

  // Deprecated
  // TODO: replace with turnFinished
  endTurn: (ws: WebSocket) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    game.sendToCiv(civID, {
      error: [
        ['deprecatedAction', ['endTurn is deprecated; use turnFinished instead.']],
      ],
    });

    return;
  },

  turnFinished: (ws: WebSocket, state: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
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

  moveUnit: (ws: WebSocket, srcCoords: Coords, path: Coords[], attack: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
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

        if ( !unit || unit.civID !== civID || !(unit.movement >= dst.getMovementCost(unit)) ) {
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

  settleCity: (ws: WebSocket, coords: Coords, name: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const world = game.world;
      const map = world.map;

      const unit = map.getTile(coords)?.unit;
      if (unit?.type === 'settler' && unit?.civID === civID) {
        const validCityLocation = map.settleCityAt(coords, name, civID);

        if (validCityLocation) {
          world.removeUnit(unit);
        } else {
          // TODO - some kind of error here?
        }

        game.sendUpdates();
      }
    }
  },

  buildImprovement: (ws: WebSocket, coords: Coords, type: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTile(coords);
      const unit = tile?.unit;

      if (unit?.type === 'builder' && unit?.civID === civID && !tile.improvement) {
        map.startConstructionAt(coords, type, civID);
        game.sendUpdates();
      }
    }
  },

  getTraders: (ws: WebSocket) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
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
  getUnitCatalog: (ws: WebSocket, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;
      const tile = map.getTile(coords);
      if (tile.owner?.civID === civID && tile.improvement) {
        game.sendToCiv(civID, {
          update: [
            ['unitCatalog', [coords, tile.getUnitCatalog()]],
          ],
        });
      }
    }
  },

  trainUnit: (ws: WebSocket, coords: Coords, type: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTile(coords);

      map.trainUnitAt(coords, type, civID);
    }
  },

  /**
   * The list of units the given improvement is able to build
   * @param coords 
   */
  getKnowledgeCatalog: (ws: WebSocket, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;
      const tile = map.getTile(coords);
      if (tile.owner?.civID === civID && tile.improvement) {
        game.sendToCiv(civID, {
          update: [
            ['knowledgeCatalog', [coords, tile.getKnowledgeCatalog()]],
          ],
        });
      }
    }
  },

  researchKnowledge: (ws: WebSocket, coords: Coords, name: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTile(coords);

      map.researchKnowledgeAt(coords, name, civID);
    }
  },
};
