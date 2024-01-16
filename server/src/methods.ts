import * as WebSocket from 'ws';
import WebSocketManager from './game/connection';
import { Player } from './game/player';
import { Map, MapOptions } from './game/map';
import { Game, GameData } from './game';
import { PerlinWorldGenerator, WorldGenerator } from './game/map/generator';
import { PromotionClass } from './game/map/tile/unit';
import { PlayerData, getDirection } from './utils';
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

  ready: (ws: WebSocketManager, state: boolean) => {
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
  endTurn: (ws: WebSocketManager) => {
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

  turnFinished: (ws: WebSocketManager, state: boolean) => {
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

  attack: (ws: WebSocketManager, srcCoords: Coords, targetCoords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const world = game.world;
      const map = world.map;

      const src = map.getTileOrThrow(srcCoords);
      const unit = src.unit;

      const target = map.getTileOrThrow(targetCoords);

      if ( !unit || unit.civID !== civID ) {
        game.sendUpdates();
        return;
      }

      if (target.unit && map.canUnitAttack(unit, target.unit) && unit.movement > 0) {
        if (unit.promotionClass === PromotionClass.RANGED) {
          world.rangedCombat(unit, target.unit);
          unit.movement = 0;
        } else {
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

  moveUnit: (ws: WebSocketManager, srcCoords: Coords, path: Coords[], attack: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const world = game.world;
      const map = world.map;

      let src = map.getTileOrThrow(srcCoords);
      let finalCoords = srcCoords;

      for (const dstCoords of path) {
        const dst = map.getTileOrThrow(dstCoords);

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
          const target = map.getTileOrThrow(path[path.length - 1]);
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

  settleCity: (ws: WebSocketManager, coords: Coords, name: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const world = game.world;
      const map = world.map;

      const unit = map.getTile(coords)?.unit;
      if (unit?.type === 'settler' && unit?.civID === civID) {
        const validCityLocation = map.settleCityAt(coords, name, civID, unit);

        if (validCityLocation) {
          world.removeUnit(unit);
        } else {
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
  getImprovementCatalog: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;
      const tile = map.getTileOrThrow(coords);
      if (tile.owner?.civID === civID && tile.unit && map.canBuildOn(tile)) {
        game.sendToCiv(civID, {
          update: [
            ['improvementCatalog', [coords, tile.getImprovementCatalog()]],
          ],
        });
      }
    }
  },

  buildImprovement: (ws: WebSocketManager, coords: Coords, type: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTileOrThrow(coords);
      const unit = tile?.unit;

      if (unit?.type === 'builder' && unit?.civID === civID && !tile.improvement) {
        map.startConstructionAt(coords, type, civID, unit);
        game.sendUpdates();
      }
    }
  },

  buildWall: (ws: WebSocketManager, coords: Coords, facingCoords: Coords, type: number) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTileOrThrow(coords);
      const unit = tile?.unit;

      if (unit?.type === 'builder' && unit?.civID === civID) {
        tile.setWall(getDirection(coords, facingCoords), type);
        map.tileUpdate(coords);
        game.sendUpdates();
      }
    }
  },

  setGateOpen: (ws: WebSocketManager, coords: Coords, facingCoords: Coords, isOpen: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTile(coords);
      const unit = tile?.unit;

      if (unit && unit.civID === civID) {
        const direction = getDirection(coords, facingCoords);
        const wall = tile.getWall(direction);
        if (wall && wall.type === (isOpen ? WallType.CLOSED_GATE : WallType.OPEN_GATE)) {
          if (isOpen) {
            wall.type = WallType.OPEN_GATE;
          } else {
            wall.type = WallType.CLOSED_GATE;
          }
          map.tileUpdate(coords);
          game.sendUpdates();
        }
      }
    }
  },

  getTraders: (ws: WebSocketManager) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      game.sendToCiv(civID, {
        update: [
          ['tradersList', [map.getTraderDataByCiv(civID)]],
        ],
      });
    }
  },

  /**
   * The list of units the given improvement is able to build
   * @param coords 
   */
  getUnitCatalog: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;
      const tile = map.getTileOrThrow(coords);
      if (tile.owner?.civID === civID && tile.improvement) {
        game.sendToCiv(civID, {
          update: [
            ['unitCatalog', [coords, tile.getUnitCatalog()]],
          ],
        });
      }
    }
  },

  trainUnit: (ws: WebSocketManager, coords: Coords, type: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
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
  getKnowledgeCatalog: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;
      const tile = map.getTileOrThrow(coords);
      if (tile.owner?.civID === civID && tile.improvement) {
        game.sendToCiv(civID, {
          update: [
            ['knowledgeCatalog', [coords, tile.getKnowledgeCatalog()]],
          ],
        });
      }
    }
  },

  researchKnowledge: (ws: WebSocketManager, coords: Coords, name: string) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTile(coords);

      map.researchKnowledgeAt(coords, name, civID);
      game.sendUpdates();
    }
  },

  stealKnowledge: (ws: WebSocketManager, coords: Coords) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTileOrThrow(coords);
      const unit = tile.unit;
      if (unit && unit.civID === civID) {
        const tileKnowledgeMap = tile.improvement?.knowledge?.getKnowledgeMap();
        if (tileKnowledgeMap) unit.updateKnowledge(tileKnowledgeMap);
        // TODO - spy invisiblity stuff + possibility of being discovered here
        // TODO - what about stealing from builders?
        
        map.tileUpdate(unit.coords);
        game.sendUpdates();
      }
    }
  },

  setCloak: (ws: WebSocketManager, coords: Coords, cloaked: boolean) => {
    const username = getUsername(ws);
    const gameID = getGameID(ws);

    const game = games[gameID];
    const civID = game.players[username].civID;

    if (game) {
      const map = game.world.map;

      const tile = map.getTileOrThrow(coords);
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
