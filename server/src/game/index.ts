import * as fs from 'node:fs/promises';
import * as path from 'path';

import { SAVE_LOCATION } from '../config';

import { Coords, World } from './world';
import { Player, PlayerData } from './player';
import { EventMsg } from '../utils';
import { PerlinWorldGenerator } from './map/generator';
import { BugFixError, FrontendError, GameNotStartedError, GenerationFailed, ImportError, InvalidSettlement, MapError } from '../utils/error';
import { PromotionClass } from './map/tile/unit';
import { WallType } from './map/tile/wall';
import { Civilization, civTemplates } from './civilization';
import WebSocketManager from './connection';
import { King } from '../ai/king';
import { Map } from './map';

interface MetaData {
  gameName: string,
  ownerName?: string,
  playerCount: number,
  playersConnected: number,
  spectatorsConnected: number,
}

export type GameData = MetaData & { players: {[playerName: string]: PlayerData} };

type GameOptions = { playerCount: number, ownerName?: string, gameName?: string, isManualSeed?: boolean };
type GameImportArgs = [World | null, { [civTemplateID: number]: string | null }, { [playerName: string]: Player }, number, MetaData];

export class Game {
  generator?: PerlinWorldGenerator;
  options?: GameOptions;
  world: World | null;
  civPool: { [civTemplateID: number]: string | null }
  private players: { [playerName: string]: Player };
  private spectators: { [playerName: string]: WebSocketManager };
  playerCount: number;
  metaData: MetaData;

  constructor(args: [PerlinWorldGenerator, GameOptions] | GameImportArgs) {
    this.spectators = {};
    
    if (args.length === 5) {
      const [world, civPool, players, playerCount, metaData] = args;
      this.world = world;
      this.civPool = civPool;
      this.players = players;
      this.playerCount = playerCount;
      this.metaData = metaData;
      return;
    }
    const [ generator, options ] = args;
    this.generator = generator;
    this.options = options;

    const { playerCount, ownerName } = options;
    const gameName = options.gameName ?? (ownerName ? `${ownerName}'s game` : 'Untitled Game');

    this.players = {};
    this.playerCount = playerCount;

    this.civPool = {};
    for (let i = 0; i < civTemplates.length; i++) {
      this.civPool[i] = null;
    }

    this.metaData = {
      gameName,
      ownerName,
      playerCount,
      playersConnected: Object.keys(this.players).length,
      spectatorsConnected: Object.keys(this.spectators).length,
    };

    this.world = null;
  }

  private generateWorld(): void {
    const { generator, options } = this;
    if (!(generator && options)) throw new MapError('Map failed to generate: generator or other required options were missing.');

    const { playerCount } = options;

    const civTemplatePlayers: [number, Player][] = [];
    for (const templateID in this.civPool) {
      const username = this.civPool[templateID];
      if (username !== null) civTemplatePlayers.push([Number(templateID), this.players[username]]);
    }

    if (civTemplatePlayers.length !== playerCount) {
      throw new BugFixError('If this is ever thrown, it means we are not enforcing all players selecting a civ before game start.');
    }

    let world: World | null = null;
    let tries = 0;
    const maxTries = options.isManualSeed ? 1 : 10;
    while (!world && !(tries > maxTries)) {
      tries++;
      try {
        world = new World([generator.generate(), playerCount, civTemplatePlayers]);
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
  }

  export() {
    const exportedPlayers: { [name: string]: any } = {};
    for (const playerName in this.players) {
      const player = this.players[playerName];
      exportedPlayers[playerName] = player.export();
    }

    return {
      world: this.world?.export(),
      civPool: this.civPool,
      players: exportedPlayers,
      playerCount: this.playerCount,
      metaData: this.metaData,
    };
  }

  static import(data: any): Game {
    const world = data.world === null ? null : World.import(data.world);
    const civPool = data.civPool;
    const players: { [name: string]: Player } = {};
    for (const playerName in data.players) {
      const playerData = data.players[playerName];
      players[playerName] = Player.import(playerName, playerData);
    }
    const playerCount = data.playerCount;
    const metaData = data.metaData;
    return new Game([world, civPool, players, playerCount, metaData]);
  }

  public async save() {
    await fs.writeFile(path.join(SAVE_LOCATION, `${this.metaData.gameName}.json`), JSON.stringify(this.export()));
  }

  public static async load(saveFile: string): Promise<Game> {
    const data = await fs.readFile(path.join(SAVE_LOCATION, `${saveFile}.json`), { encoding: 'utf8' });
    return Game.import(JSON.parse(data));
  }

  hasStarted(): this is Game & { world: World } {
    return this.world !== null;
  }

  public connectPlayer(username: string, player: Player) {
    this.players[username] = player;
    this.metaData = { ...this.metaData, playersConnected: Object.keys(this.players).length };
  }

  public connectSpectator(username: string, ws: WebSocketManager): void {
    this.spectators[username] = ws;
    this.metaData = { ...this.metaData, spectatorsConnected: Object.keys(this.spectators).length };
    if (this.hasStarted()) {
      this.sendToSpectator(username, {
        update: [
          ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
          ['civData', [ this.world.getAllCivsData(), this.getPlayersData() ]],
        ],
      });
    }
  }

  public canStart(): boolean {
    return Object.values(this.players).every((player: Player) => player.ready);
  }

  public startGame(player?: Player): void {
    if (this.hasStarted()) {
      if (player) {
        this.sendToPlayer(player, {
          update: [
            ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
            ['civData', [ this.world.getAllCivsData(), this.getPlayersData() ]],
          ],
        });
        this.resumeTurnForPlayer(player);
      }
    } else {
      this.generateWorld();

      if (!this.hasStarted()) {
        throw new BugFixError('This should never be thrown. This means the world was not generated, and none of our previous checks caught it.');
      }

      this.sendUpdates();

      this.sendToAll({
        update: [
          ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
          ['civData', [ this.world.getAllCivsData(), this.getPlayersData() ]],
        ],
      });

      this.sendToSpectators({
        update: [
          ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
          ['civData', [ this.world.getAllCivsData(), this.getPlayersData() ]],
        ],
      });

      this.forEachPlayer((player: Player) => {
        const [world, civ] = this.getPlayerWorldAndCiv(player);
        this.sendToPlayer(player, {
          update: [
            ['setMap', [world.map.getMapByCivID(civ.id)]],
          ],
        });
        this.beginTurnForPlayer(player);
      });

      this.sendToSpectators({
        update: [
          ['setMap', [this.world.map.getSpectatorMap()]],
        ],
      });
    }
  }

  private beginTurnForPlayer(player: Player): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    civ.newTurn();
    world.updateCivTileVisibility(civ.id);
    this.resumeTurnForPlayer(player);
  }

  private resumeTurnForPlayer(player: Player): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    this.sendToPlayer(player, {
      update: [
        ['setMap', [world.map.getMapByCivID(civ.id)]],
        ['unitPositions', [civ.getUnitPositions()]],
        ['beginTurn', []],
      ],
    });
  }

  private endTurnForPlayer(player: Player): void {
    const [_, civ] = this.getPlayerWorldAndCiv(player);
    civ.endTurn();
    this.sendToPlayer(player, {
      update: [
        ['endTurn', []],
      ],
    });
  }

  endTurn(): void {
    if (!this.hasStarted()) throw new GameNotStartedError();

    // end all players' turns
    this.forEachPlayer((player: Player) => {
      if (!player.isAbsent()) {
        this.endTurnForPlayer(player);
      }
    });

    // Absent players
    this.forEachPlayer((player: Player, username: string) => {
      if (player.isAbsent()) {
        console.log(`${username} is absent!`)
        if (player.ai === null) {
          const [world, civ] = this.getPlayerWorldAndCiv(player);
          player.ai = new King(world, world.map, civ);
        }
        player.ai.takeTurn();
      } else if (player.ai !== null) {
        player.ai = null;
      }
    });

    // Run AIs

    // Run end-of-turn updates
    this.world.turn();

    // Send map to spectators
    this.sendToSpectators({
      update: [
        ['setMap', [this.world.map.getSpectatorMap()]],
      ],
    });

    // begin all players' turns
    this.forEachPlayer((player: Player) => {
      if (!player.isAbsent()) {
        this.beginTurnForPlayer(player);
      }
    });

    // TODO remove this
    // In case we have only AIs in the game, try to finish player's turns
    // This should not be allowed really, but it's useful for testing
    setTimeout(() => {
      this.tryEndTurn();
    }, 1000);
  }

  sendUpdates(): void {
    if (!this.hasStarted()) throw new GameNotStartedError();
    const updates = this.world.getUpdates();
    this.forEachPlayer((player) => {
      const [_, civ] = this.getPlayerWorldAndCiv(player);
      this.sendToPlayer(player, {
        update: updates.map(updateFn => updateFn(civ.id)),//.filter(update => update),
      });
    });
  }

  public hasPlayer(username: string): boolean {
    return username in this.players;
  }

  public getPlayer(username: string): Player | undefined {
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

  public sendToSpectators(msg: EventMsg): void {
    for (const username in this.spectators) {
      const ws = this.spectators[username];
      ws.send(JSON.stringify(msg));
    }
  }

  public sendToSpectator(username: string, msg: EventMsg): void {
    const ws = this.spectators[username];
    ws.send(JSON.stringify(msg));
  }

  public sendToAll(msg: EventMsg): void {
    for (const playerName in this.players) {
      const player = this.players[playerName];
      player.send(JSON.stringify(msg));
    }
  }

  sendToPlayer(player: Player, msg: EventMsg): void {
    player.send(JSON.stringify(msg));
  }

  forEachPlayer(callback: (player: Player, username: string) => boolean | void): void {
    for (const playerName in this.players) {
      const shouldBreak = callback(this.players[playerName], playerName);
      if (shouldBreak) break;
    }
  }

  public canJoinGame(username: string): boolean {
    return username in this.players || Object.keys(this.players).length < this.playerCount;
  }

  selectCiv(player: Player, civTemplateID: number): void {
    if (player) {
      if (this.civPool[civTemplateID] === null) {
        // Unselect the old civ, if one is selected
        for (const templateID in this.civPool) {
          if (this.civPool[templateID] === player.username) {
            this.civPool[templateID] = null;
          }
        }
        // Then select the new one
        this.civPool[civTemplateID] = player.username;
        this.sendToAll({
          update: [
            ['civPool', [ this.civPool, civTemplates, this.getPlayersData() ]],
          ],
        });
      } else {
        throw new FrontendError('civTaken', 'That civilization is no longer available');
      }
    }
  }

  setReady(player: Player, state: boolean): void {
    if (player) {

      if (!Object.values(this.civPool).includes(player.username)) {
        throw new FrontendError('notReady', 'Please select a civilization');
      }

      player.ready = state;

      if (this.getConnectedPlayersCount() === this.playerCount) {
        if (this.canStart()) {
          this.startGame(player);
        }
      }
    }
  }

  public disconnectPlayer(player: Player): void {
    console.log('Player disconnected.');
    player.reset(null);
    player.ready = true;
    this.setTurnFinished(player, true);
  }

  public setTurnFinished(player: Player, state: boolean): void {
    const [_, civ] = this.getPlayerWorldAndCiv(player);

    if (!civ.turnActive) {
      this.sendToPlayer(player, {
        error: [
          ['turnExpired', []],
        ],
      });

      return;
    }

    // mark civ as finished/unfinished
    civ.turnFinished = state;
    this.tryEndTurn();
  }

  private tryEndTurn(): void {
    // see if all players are finished...
    let finished = true;
    this.forEachPlayer((player) => {
      const [_, civ] = this.getPlayerWorldAndCiv(player);
      if (!player.isAbsent() && civ.turnActive && !civ.turnFinished) {
        finished = false;
        return true;
      }
    });

    // if so, end the turn
    if (finished) {
      this.endTurn();
    }
  }

  /**
   * Returns the player's civilization (and the world), throws error if none is found
   * (the game probably hasn't started yet in this case).
   * @param player
   * @throws GameNotStartedError
   */
  private getPlayerWorldAndCiv(player: Player): [World, Civilization] {
    if (!this.hasStarted() || player.civID === null) throw new GameNotStartedError();
    return [this.world, this.world.getCiv(player.civID)];
  }

  /**
   * Handles all combat *not* handled by world.playerUnitMovement.
   * @param player 
   * @param srcCoords 
   * @param targetCoords 
   * @returns 
   */
  playerUnitCombat(player: Player, srcCoords: Coords, targetCoords: Coords): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;

    const src = map.getTileOrThrow(srcCoords);
    const unit = src.unit;

    const target = map.getTileOrThrow(targetCoords);

    if ( !unit || !civ.ownsUnit(unit) ) {
      this.sendUpdates();
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

    this.sendUpdates();

    // In case we later support units being moved as a result of them attacking,
    // we want to send a unit position update here. It also simplifies frontend logic.
    this.sendToPlayer(player, {
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
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;

    let src = map.getTileOrThrow(srcCoords);
    let finalCoords = srcCoords;

    for (const dstCoords of path) {
      const dst = map.getTileOrThrow(dstCoords);

      const unit = src.unit;

      if (!unit || !civ.ownsUnit(unit)) {
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
          world.meleeCombat(unit, target.unit);
          unit.movement = 0;
        }
      }
    }

    this.sendUpdates();

    this.sendToPlayer(player, {
      update: [
        ['unitPositionUpdate', [srcCoords, finalCoords]],
      ],
    });
  }

  setPlayerUnitCloak(player: Player, coords: Coords, cloaked: boolean): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const tile = world.map.getTileOrThrow(coords);
    const unit = tile.unit;
    if (unit && civ.ownsUnit(unit) && unit.movement) {
      unit.setCloak(cloaked);
      unit.movement = 0;
      
      world.map.tileUpdate(unit.coords);
      this.sendUpdates();
    }
  }

  trainPlayerUnit(player: Player, coords: Coords, type: string): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    world.map.trainUnitAt(coords, type, civ);
    this.sendUpdates();
  }

  settleCityAt(player: Player, coords: Coords, name: string): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;

    const unit = map.getTile(coords)?.unit;
    if (unit?.type === 'settler' && civ.ownsUnit(unit)) {
      const settlementSuccessful = map.settleCityAt(coords, name, civ, unit);

      if (settlementSuccessful) {
        world.removeUnit(unit);
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
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;
    const tile = map.getTileOrThrow(coords);
    if (civ.controlsTile(tile) && tile.unit && map.canBuildOn(tile)) {
      this.sendToPlayer(player, {
        update: [
          ['improvementCatalog', [coords, tile.getImprovementCatalog()]],
        ],
      });
    }
  }

  buildImprovement(player: Player, coords: Coords, type: string): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;
    const tile = map.getTileOrThrow(coords);
    const unit = tile?.unit;

    if (unit?.type === 'builder' && civ.ownsUnit(unit) && !tile.improvement) {
      map.startConstructionAt(coords, type, civ, unit);
      this.sendUpdates();
    }
  }

  buildWall(player: Player, coords: Coords, facingCoords: Coords, type: number): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;
    const tile = map.getTileOrThrow(coords);
    const unit = tile?.unit;

    if (unit?.type === 'builder' && civ.ownsUnit(unit)) {
      tile.setWall(map.getDirection(coords, facingCoords), type);
      map.tileUpdate(coords);
      this.sendUpdates();
    }
  }

  setGateOpen(player: Player, coords: Coords, facingCoords: Coords, isOpen: boolean): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;
    const tile = map.getTile(coords);
    const unit = tile?.unit;

    if (unit && civ.ownsUnit(unit)) {
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
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    this.sendToPlayer(player, {
      update: [
        ['tradersList', [world.map.getTraderDataByCiv(civ)]],
      ],
    });
  }

  /**
   * The list of units the given improvement is able to build
   * @param coords 
   */
  getUnitCatalog(player: Player, coords: Coords): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const tile = world.map.getTileOrThrow(coords);
    if (civ.controlsTile(tile) && tile.improvement) {
      this.sendToPlayer(player, {
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
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const tile = world.map.getTileOrThrow(coords);
    if (civ.controlsTile(tile) && tile.improvement) {
      this.sendToPlayer(player, {
        update: [
          ['knowledgeCatalog', [coords, tile.getKnowledgeCatalog()]],
        ],
      });
    }
  }

  researchKnowledge(player: Player, coords: Coords, name: string): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    world.map.researchKnowledgeAt(coords, name, civ);
    this.sendUpdates();
  }

  stealKnowledge(player: Player, coords: Coords): void {
    const [world, civ] = this.getPlayerWorldAndCiv(player);
    const map = world.map;

    const tile = map.getTileOrThrow(coords);
    const unit = tile.unit;
    if (unit && civ.ownsUnit(unit)) {
      const tileKnowledgeMap = tile.improvement?.knowledge?.getKnowledgeMap();
      if (tileKnowledgeMap) unit.updateKnowledge(tileKnowledgeMap);
      // TODO - spy invisiblity stuff + possibility of being discovered here
      // TODO - what about stealing from builders?
      
      map.tileUpdate(unit.coords);
      this.sendUpdates();
    }
  }
}
