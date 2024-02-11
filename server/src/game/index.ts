import * as fs from 'node:fs/promises';
import * as path from 'path';

import { SAVE_LOCATION } from '../config';

import { Coords, World } from './world';
import { Player } from './player';
import { EventMsg, PlayerData } from '../utils';
import { PerlinWorldGenerator } from './map/generator';
import { FrontendError, GenerationFailed, InvalidSettlement, MapError } from '../utils/error';
import { PromotionClass } from './map/tile/unit';
import { WallType } from './map/tile/wall';

interface MetaData {
  gameName: string,
  ownerName?: string,
  playerCount: number,
  playersConnected: number,
}

export type GameData = MetaData & { players: {[playerName: string]: PlayerData} };

type GameImportArgs = [World, { [playerName: string]: Player }, number, MetaData, boolean];

export class Game {
  world: World;
  private players: { [playerName: string]: Player };
  playerCount: number;
  metaData: MetaData;
  private hasStarted: boolean;

  constructor(args: [PerlinWorldGenerator, { playerCount: number, ownerName?: string, gameName?: string, isManualSeed?: boolean }] | GameImportArgs) {
    if (args.length === 5) {
      const [world, players, playerCount, metaData, hasStarted] = args;
      this.world = world;
      this.players = players;
      this.playerCount = playerCount;
      this.metaData = metaData;
      this.hasStarted = hasStarted;
      return;
    }
    const [ generator, options ] = args;
    const { playerCount, ownerName } = options;
    const gameName = options.gameName ?? (ownerName ? `${ownerName}'s game` : 'Untitled Game');

    let world: World | null = null;
    let tries = 0;
    const maxTries = options.isManualSeed ? 1 : 10;
    while (!world && !(tries > maxTries)) {
      tries++;
      try {
        world = new World([generator.generate(), playerCount]);
      } catch (err) {
        if (err instanceof MapError) {
          generator.reseed(null);
          console.warn(`Retrying map generation.`)
          if (tries+1 > maxTries) {
            console.error('Map generation failed.');
            throw new GenerationFailed(`Could not generate map! (gave up after ${tries} tries)`);
          }
        } else throw err;
      }
    }

    if (!world) throw new MapError('Map failed to generate and the error was not caught.');
    this.world = world;

    this.players = {};
    this.playerCount = playerCount;

    this.metaData = {
      gameName,
      ownerName,
      playerCount,
      playersConnected: Object.keys(this.players).length,
    };

    this.hasStarted = false;
  }

  export() {
    const exportedPlayers: { [name: string]: any } = {};
    for (const playerName in this.players) {
      const player = this.players[playerName];
      exportedPlayers[playerName] = player.export();
    }

    return {
      world: this.world.export(),
      players: exportedPlayers,
      playerCount: this.playerCount,
      metaData: this.metaData,
      hasStarted: this.hasStarted,
    };
  }

  static import(data: any): Game {
    const world = World.import(data.world);
    const players: { [name: string]: Player } = {};
    for (const playerName in data.players) {
      const playerData = data.players[playerName];
      players[playerName] = Player.import(playerData);
    }
    const playerCount = data.playerCount;
    const metaData = data.metaData;
    const hasStarted = data.hasStarted;
    return new Game([world, players, playerCount, metaData, hasStarted]);
  }

  async save() {
    await fs.writeFile(path.join(SAVE_LOCATION, `${this.metaData.gameName}.json`), JSON.stringify(this.export()));
  }

  static async load(saveFile: string): Promise<Game> {
    const data = await fs.readFile(path.join(SAVE_LOCATION, `${saveFile}.json`), { encoding: 'utf8' });
    return Game.import(JSON.parse(data));
  }

  connectPlayer(username: string, player: Player) {
    this.players[username] = player;
    this.metaData = { ...this.metaData, playersConnected: Object.keys(this.players).length };
  }

  public canStart(): boolean {
    return Object.values(this.players).every((player: Player) => player.ready);
  }

  startGame(player?: Player): void {
    if (this.hasStarted) {
      if (player) {
        this.sendToCiv(player.civID, {
          update: [
            ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
            ['civData', [ this.world.getAllCivsData() ]],
          ],
        });
        this.resumeTurnForCiv(player.civID);
      }
    } else {
      this.hasStarted = true;

      this.sendToAll({
        update: [
          ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
          ['civData', [ this.world.getAllCivsData() ]],
        ],
      });

      this.forEachCivID((civID: number) => {
        this.sendToCiv(civID, {
          update: [
            ['setMap', [this.world.map.getCivMap(civID)]],
          ],
        });
        this.beginTurnForCiv(civID);
      });
    }
  }

  beginTurnForCiv(civID: number): void {
    this.world.civs[civID].newTurn();
    this.world.updateCivTileVisibility(civID);
    this.resumeTurnForCiv(civID);
  }

  resumeTurnForCiv(civID: number): void {
    this.sendToCiv(civID, {
      update: [
        ['setMap', [this.world.map.getCivMap(civID)]],
        ['unitPositions', [this.world.getCivUnitPositions(civID)]],
        ['beginTurn', []],
      ],
    });
  }

  endTurnForCiv(civID: number): void {
    this.world.civs[civID].endTurn();
    this.sendToCiv(civID, {
      update: [
        ['endTurn', []],
      ],
    });
  }

  endTurn(): void {
    // end all players' turns
    this.forEachPlayer((player: Player) => {
      if (!player.isAI()) {
        this.endTurnForCiv(player.civID);
      }
    });

    // Run AIs

    // Run end-of-turn updates
    this.world.turn();

    // begin all players' turns
    this.forEachPlayer((player: Player) => {
      if (!player.isAI()) {
        this.beginTurnForCiv(player.civID);
      }
    });
  }

  sendUpdates(): void {
    const updates = this.world.getUpdates();
    this.forEachCivID((civID) => {
      this.sendToCiv(civID, {
        update: updates.map(updateFn => updateFn(civID)),//.filter(update => update),
      });
    });
  }

  public hasPlayer(username: string): boolean {
    return username in this.players;
  }

  public getPlayer(username: string): Player {
    return this.players[username];
  }

  public getConnectedPlayersCount(): number {
    return Object.keys(this.players).length;
  }

  getPlayersData(): {[playerName: string]: PlayerData} {
    const playersData: { [name: string]: PlayerData } = {};
    for (const playerName in this.players) {
      playersData[playerName] = this.players[playerName].getData();
    }
    return playersData;
  }

  getMetaData(): GameData {
    return { ...this.metaData, players: this.getPlayersData() };
  }

  sendToAll(msg: EventMsg): void {
    for (const playerName in this.players) {
      const player = this.players[playerName];
      player.send(JSON.stringify(msg));
    }
  }

  sendToCiv(civID: number, msg: EventMsg): void {
    const player = Object.values(this.players).find(player => player.civID === civID);

    if (!player) {
      console.error("Error: Could not find player for Civilization #" + civID);
      return;
    }

    player.send(JSON.stringify(msg));
  }

  forEachPlayer(callback: (player: Player) => void): void {
    for (const playerName in this.players) {
      callback(this.players[playerName]);
    }
  }

  public newPlayerCivID(username: string): number | null {
    const freeCivs: { [id: number]: boolean } = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (const player in this.players) {
      if (username === player) return this.players[player].civID;
      delete freeCivs[this.players[player].civID];
    }

    const freeIDs = Object.keys(freeCivs).map(Number);

    if (!freeIDs.length) {
      return null;
    }

    return Math.min(...freeIDs);
  }

  forEachCivID(callback: (civID: number) => void): void {
    for (let civID = 0; civID < this.playerCount; civID++) {
      callback(civID);
    }
  }

  setLeader(player: Player, leaderID: number): void {
    if (player) {
      if (this.world.setCivLeader(player.civID, leaderID)) {
        this.sendToAll({
          update: [
            ['leaderPool', [ ...this.world.getLeaderPool(), this.getPlayersData() ]],
          ],
        });
      } else {
        throw new FrontendError('leaderTaken', 'That leader is no longer available');
      }
    }
  }

  setReady(player: Player, state: boolean): void {
    if (player) {
      const civ = this.world.getCiv(player.civID);

      if (!civ.leader) {
        throw new FrontendError('notReady', 'Please select leader');
      }

      player.ready = state;

      if (this.getConnectedPlayersCount() === this.playerCount) {
        if (this.canStart()) {
          this.startGame(player);
        }
      }
    }
  }

  setTurnFinished(player: Player, state: boolean): void {
    const civID = player.civID;
    const civ = this.world.civs[civID];

    if (!civ.turnActive) {
      this.sendToCiv(civID, {
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
    for (let civID = 0; civID < this.playerCount; civID++) {
      const civ = this.world.civs[civID];
      if (civ.turnActive && !civ.turnFinished) {
        finished = false;
        break;
      }
    }

    // if so, end the turn
    if (finished) {
      this.endTurn();
    }
  }

  /**
   * Handles all combat *not* handled by world.playerUnitMovement.
   * @param player 
   * @param srcCoords 
   * @param targetCoords 
   * @returns 
   */
  playerUnitCombat(player: Player, srcCoords: Coords, targetCoords: Coords): void {
    const civID = player.civID;
    const map = this.world.map;

    const src = map.getTileOrThrow(srcCoords);
    const unit = src.unit;

    const target = map.getTileOrThrow(targetCoords);

    if ( !unit || unit.civID !== civID ) {
      this.sendUpdates();
      return;
    }

    if (target.unit && map.canUnitAttack(unit, target.unit) && unit.movement > 0) {
      if (unit.promotionClass === PromotionClass.RANGED) {
        this.world.rangedCombat(unit, target.unit);
        unit.movement = 0;
      } else {
        this.world.meleeCombat(unit, target.unit);
        unit.movement = 0;
      }
    }

    this.sendUpdates();

    // In case we later support units being moved as a result of them attacking,
    // we want to send a unit position update here. It also simplifies frontend logic.
    this.sendToCiv(civID, {
      update: [
        ['unitPositionUpdate', [srcCoords, unit.coords]],
      ],
    });
  }

  /**
   * Moves the unit on `srcCoords` along `path`. If `attack` is true, attempts to make a melee attack at the end of the movement.
   * @param player 
   * @param srcCoords 
   * @param path 
   * @param attack 
   * @returns 
   */
  playerUnitMovement(player: Player, srcCoords: Coords, path: Coords[], attack: boolean) {
    const civID = player.civID;
    const map = this.world.map;

    let src = map.getTileOrThrow(srcCoords);
    let finalCoords = srcCoords;

    for (const dstCoords of path) {
      const dst = map.getTileOrThrow(dstCoords);

      const unit = src.unit;

      if (!unit || unit.civID !== civID) {
        this.sendUpdates();
        return;
      }

      const movementCost = map.getStepMovementCost(unit.coords, dstCoords, unit.movementClass);

      if (unit.movement < movementCost) {
        this.sendUpdates();
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
          this.world.meleeCombat(unit, target.unit);
          unit.movement = 0;
        }
      }
    }

    this.sendUpdates();

    this.sendToCiv(civID, {
      update: [
        ['unitPositionUpdate', [srcCoords, finalCoords]],
      ],
    });
  }

  setPlayerUnitCloak(player: Player, coords: Coords, cloaked: boolean): void {
    const civID = player.civID;
    const tile = this.world.map.getTileOrThrow(coords);
    const unit = tile.unit;
    if (unit && unit.civID === civID && unit.movement) {
      unit.setCloak(cloaked);
      unit.movement = 0;
      
      this.world.map.tileUpdate(unit.coords);
      this.sendUpdates();
    }
  }

  trainPlayerUnit(player: Player, coords: Coords, type: string): void {
    const civID = player.civID;
    this.world.map.trainUnitAt(coords, type, civID);
    this.sendUpdates();
  }

  settleCityAt(player: Player, coords: Coords, name: string): void {
    const civID = player.civID;
    const map = this.world.map;

    const unit = map.getTile(coords)?.unit;
    if (unit?.type === 'settler' && unit?.civID === civID) {
      const settlementSuccessful = map.settleCityAt(coords, name, civID, unit);

      if (settlementSuccessful) {
        this.world.removeUnit(unit);
      } else {
        throw new InvalidSettlement('You cannot settle a city here!');
      }

      this.sendUpdates();
    }
  }

  /**
   * The list of improvements the builder on the given coords is able to build
   * @param coords 
   */
  getImprovementCatalog(player: Player, coords: Coords): void {
    const civID = player.civID;
    const map = this.world.map;
    const tile = map.getTileOrThrow(coords);
    if (tile.owner?.civID === civID && tile.unit && map.canBuildOn(tile)) {
      this.sendToCiv(civID, {
        update: [
          ['improvementCatalog', [coords, tile.getImprovementCatalog()]],
        ],
      });
    }
  }

  buildImprovement(player: Player, coords: Coords, type: string): void {
    const civID = player.civID;
    const map = this.world.map;
    const tile = map.getTileOrThrow(coords);
    const unit = tile?.unit;

    if (unit?.type === 'builder' && unit?.civID === civID && !tile.improvement) {
      map.startConstructionAt(coords, type, civID, unit);
      this.sendUpdates();
    }
  }

  buildWall(player: Player, coords: Coords, facingCoords: Coords, type: number): void {
    const civID = player.civID;
    const map = this.world.map;
    const tile = map.getTileOrThrow(coords);
    const unit = tile?.unit;

    if (unit?.type === 'builder' && unit?.civID === civID) {
      tile.setWall(map.getDirection(coords, facingCoords), type);
      map.tileUpdate(coords);
      this.sendUpdates();
    }
  }

  setGateOpen(player: Player, coords: Coords, facingCoords: Coords, isOpen: boolean): void {
    const civID = player.civID;
    const map = this.world.map;
    const tile = map.getTile(coords);
    const unit = tile?.unit;

    if (unit && unit.civID === civID) {
      const direction = map.getDirection(coords, facingCoords);
      const wall = tile.getWall(direction);
      if (wall && wall.type === (isOpen ? WallType.CLOSED_GATE : WallType.OPEN_GATE)) {
        if (isOpen) {
          wall.type = WallType.OPEN_GATE;
        } else {
          wall.type = WallType.CLOSED_GATE;
        }
        map.tileUpdate(coords);
        this.sendUpdates();
      }
    }
  }

  getPlayerTraders(player: Player): void {
    const civID = player.civID;
    this.sendToCiv(civID, {
      update: [
        ['tradersList', [this.world.map.getTraderDataByCiv(civID)]],
      ],
    });
  }

  /**
   * The list of units the given improvement is able to build
   * @param coords 
   */
  getUnitCatalog(player: Player, coords: Coords): void {
    const civID = player.civID;
    const tile = this.world.map.getTileOrThrow(coords);
    if (tile.owner?.civID === civID && tile.improvement) {
      this.sendToCiv(civID, {
        update: [
          ['unitCatalog', [coords, tile.getUnitCatalog()]],
        ],
      });
    }
  }

  /**
   * The list of units the given improvement is able to build
   * @param coords 
   */
  getKnowledgeCatalog(player: Player, coords: Coords): void {
    const civID = player.civID;
    const tile = this.world.map.getTileOrThrow(coords);
    if (tile.owner?.civID === civID && tile.improvement) {
      this.sendToCiv(civID, {
        update: [
          ['knowledgeCatalog', [coords, tile.getKnowledgeCatalog()]],
        ],
      });
    }
  }

  researchKnowledge(player: Player, coords: Coords, name: string): void {
    const civID = player.civID;
    this.world.map.researchKnowledgeAt(coords, name, civID);
    this.sendUpdates();
  }

  stealKnowledge(player: Player, coords: Coords): void {
    const civID = player.civID;
    const map = this.world.map;

    const tile = map.getTileOrThrow(coords);
    const unit = tile.unit;
    if (unit && unit.civID === civID) {
      const tileKnowledgeMap = tile.improvement?.knowledge?.getKnowledgeMap();
      if (tileKnowledgeMap) unit.updateKnowledge(tileKnowledgeMap);
      // TODO - spy invisiblity stuff + possibility of being discovered here
      // TODO - what about stealing from builders?
      
      map.tileUpdate(unit.coords);
      this.sendUpdates();
    }
  }
}
