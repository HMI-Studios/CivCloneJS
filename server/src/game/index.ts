import * as fs from 'node:fs/promises';
import * as path from 'path';

import { SAVE_LOCATION } from '../config';

import { Coords, World } from './world';
import { Player, PlayerData } from './player';
import { EventMsg } from '../utils';
import { PerlinWorldGenerator } from './map/generator';
import { FrontendError, GenerationFailed, InvalidSettlement, MapError } from '../utils/error';
import { PromotionClass } from './map/tile/unit';
import { WallType } from './map/tile/wall';
import { Leader, isCivDomain } from './leader';
import { civTemplates } from './civilization';

interface MetaData {
  gameName: string,
  ownerName?: string,
  playerCount: number,
  playersConnected: number,
}

export type GameData = MetaData & { players: {[playerName: string]: PlayerData} };

type GameImportArgs = [World, { [leaderID: number]: Leader }, { [civTemplateID: number]: number | null }, { [playerName: string]: Player }, number, MetaData, boolean];

export class Game {
  world: World;
  leaders: { [leaderID: number]: Leader }
  civPool: { [civTemplateID: number]: number | null }
  private players: { [playerName: string]: Player };
  playerCount: number;
  metaData: MetaData;
  private hasStarted: boolean;

  constructor(args: [PerlinWorldGenerator, { playerCount: number, ownerName?: string, gameName?: string, isManualSeed?: boolean }] | GameImportArgs) {
    if (args.length === 7) {
      const [world, leaders, civPool, players, playerCount, metaData, hasStarted] = args;
      this.world = world;
      this.leaders = leaders;
      this.civPool = civPool;
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

    this.leaders = {};
    for (let leaderID = 0; leaderID < playerCount; leaderID++) {
      this.leaders[leaderID] = new Leader();
    }

    this.civPool = {};
    for (let i = 0; i < civTemplates.length; i++) {
      this.civPool[i] = null;
    }

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

    const exportedLeaders: { [id: number]: any } = {};
    for (const leaderID in this.leaders) {
      const leader = this.leaders[leaderID];
      exportedLeaders[leaderID] = leader.export();
    }

    return {
      world: this.world.export(),
      leaders: exportedLeaders,
      civPool: this.civPool,
      players: exportedPlayers,
      playerCount: this.playerCount,
      metaData: this.metaData,
      hasStarted: this.hasStarted,
    };
  }

  static import(data: any): Game {
    const world = World.import(data.world);
    const leaders: { [id: number]: Leader } = {};
    for (const leaderID in data.leaders) {
      const leaderData = data.leaders[leaderID];
      leaders[Number(leaderID)] = Leader.import(leaderData);
    }
    const civPool = data.civPool;
    const players: { [name: string]: Player } = {};
    for (const playerName in data.players) {
      const playerData = data.players[playerName];
      players[playerName] = Player.import(playerData);
    }
    const playerCount = data.playerCount;
    const metaData = data.metaData;
    const hasStarted = data.hasStarted;
    return new Game([world, leaders, civPool, players, playerCount, metaData, hasStarted]);
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
        this.sendToLeader(player.leaderID, {
          update: [
            ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
            ['civData', [ this.world.getAllCivsData() ]],
          ],
        });
        this.resumeTurnForLeader(player.leaderID);
      }
    } else {
      this.hasStarted = true;

      this.sendToAll({
        update: [
          ['beginGame', [ [this.world.map.width, this.world.map.height], this.playerCount ]],
          ['civData', [ this.world.getAllCivsData() ]],
        ],
      });

      this.forEachLeaderID((leaderID: number) => {
        this.sendToLeader(leaderID, {
          update: [
            ['setMap', [this.world.map.getLeaderMap(this.getLeader(leaderID))]],
          ],
        });
        this.beginTurnForLeader(leaderID);
      });
    }
  }

  beginTurnForLeader(leaderID: number): void {
    const leader = this.getLeader(leaderID);
    leader.newTurn();
    this.world.updateLeaderTileVisibility(leader);
    this.resumeTurnForLeader(leaderID);
  }

  resumeTurnForLeader(leaderID: number): void {
    const leader = this.getLeader(leaderID);
    this.sendToLeader(leaderID, {
      update: [
        ['setMap', [this.world.map.getLeaderMap(leader)]],
        ['unitPositions', [leader.getUnitPositions()]],
        ['beginTurn', []],
      ],
    });
  }

  endTurnForLeader(leaderID: number): void {
    this.leaders[leaderID].endTurn();
    this.sendToLeader(leaderID, {
      update: [
        ['endTurn', []],
      ],
    });
  }

  endTurn(): void {
    // end all players' turns
    this.forEachPlayer((player: Player) => {
      if (!player.isAI()) {
        this.endTurnForLeader(player.leaderID);
      }
    });

    // Run AIs

    // Run end-of-turn updates
    this.world.turn();

    // begin all players' turns
    this.forEachPlayer((player: Player) => {
      if (!player.isAI()) {
        this.beginTurnForLeader(player.leaderID);
      }
    });
  }

  sendUpdates(): void {
    const updates = this.world.getUpdates();
    this.forEachLeaderID((leaderID) => {
      this.sendToLeader(leaderID, {
        update: updates.map(updateFn => updateFn(this.leaders[leaderID].getDomainIDs())),//.filter(update => update),
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

  public getLeader(leaderID: number): Leader {
    return this.leaders[leaderID];
  }

  sendToAll(msg: EventMsg): void {
    for (const playerName in this.players) {
      const player = this.players[playerName];
      player.send(JSON.stringify(msg));
    }
  }

  sendToLeader(leaderID: number, msg: EventMsg): void {
    const player = Object.values(this.players).find(player => player.leaderID === leaderID);

    if (!player) {
      console.error("Error: Could not find player for Leader #" + leaderID);
      return;
    }

    player.send(JSON.stringify(msg));
  }

  forEachPlayer(callback: (player: Player) => void): void {
    for (const playerName in this.players) {
      callback(this.players[playerName]);
    }
  }

  public newPlayerLeaderID(username: string): number | null {
    const freeLeaders: { [id: number]: boolean } = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeLeaders[i] = true;
    }

    for (const playerName in this.players) {
      if (username === playerName) return this.players[playerName].leaderID;
      delete freeLeaders[this.players[playerName].leaderID];
    }

    const freeIDs = Object.keys(freeLeaders).map(Number);

    if (!freeIDs.length) {
      return null;
    }

    return Math.min(...freeIDs);
  }

  forEachLeaderID(callback: (leaderID: number) => void): void {
    for (let leaderID = 0; leaderID < this.playerCount; leaderID++) {
      callback(leaderID);
    }
  }

  selectCiv(player: Player, civTemplateID: number): void {
    if (player) {
      if (this.civPool[civTemplateID] === null) {
        this.civPool[civTemplateID] = player.leaderID;
        this.sendToAll({
          update: [
            // TODO - rename to civPool
            ['leaderPool', [ this.civPool, civTemplates, this.getPlayersData() ]],
          ],
        });
      } else {
        // TODO - rename to civTaken
        throw new FrontendError('leaderTaken', 'That civilization is no longer available');
      }
    }
  }

  setReady(player: Player, state: boolean): void {
    if (player) {

      if (!Object.values(this.civPool).includes(player.leaderID)) {
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

  setTurnFinished(player: Player, state: boolean): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];

    if (!leader.turnActive) {
      this.sendToLeader(leaderID, {
        error: [
          ['turnExpired', []],
        ],
      });

      return;
    }

    // mark leader as finished/unfinished
    leader.turnFinished = state;

    // see if all players are finished...
    let finished = true;
    for (let leaderID = 0; leaderID < this.playerCount; leaderID++) {
      const leader = this.leaders[leaderID];
      if (leader.turnActive && !leader.turnFinished) {
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
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;

    const src = map.getTileOrThrow(srcCoords);
    const unit = src.unit;

    const target = map.getTileOrThrow(targetCoords);

    if ( !unit || !leader.controlsUnit(unit) ) {
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
    this.sendToLeader(leaderID, {
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
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;

    let src = map.getTileOrThrow(srcCoords);
    let finalCoords = srcCoords;

    for (const dstCoords of path) {
      const dst = map.getTileOrThrow(dstCoords);

      const unit = src.unit;

      if (!unit || !leader.controlsUnit(unit)) {
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

    this.sendToLeader(leaderID, {
      update: [
        ['unitPositionUpdate', [srcCoords, finalCoords]],
      ],
    });
  }

  setPlayerUnitCloak(player: Player, coords: Coords, cloaked: boolean): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const tile = this.world.map.getTileOrThrow(coords);
    const unit = tile.unit;
    if (unit && leader.controlsUnit(unit) && unit.movement) {
      unit.setCloak(cloaked);
      unit.movement = 0;
      
      this.world.map.tileUpdate(unit.coords);
      this.sendUpdates();
    }
  }

  trainPlayerUnit(player: Player, coords: Coords, type: string): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    this.world.map.trainUnitAt(coords, type, leader);
    this.sendUpdates();
  }

  settleCityAt(player: Player, coords: Coords, name: string): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;

    const unit = map.getTile(coords)?.unit;
    if (unit?.type === 'settler' && leader.controlsUnit(unit) && isCivDomain(unit.domainID)) {
      const settlementSuccessful = map.settleCityAt(coords, name, leader, unit);

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
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;
    const tile = map.getTileOrThrow(coords);
    if (leader.controlsTile(tile) && tile.unit && map.canBuildOn(tile)) {
      this.sendToLeader(leaderID, {
        update: [
          ['improvementCatalog', [coords, tile.getImprovementCatalog()]],
        ],
      });
    }
  }

  buildImprovement(player: Player, coords: Coords, type: string): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;
    const tile = map.getTileOrThrow(coords);
    const unit = tile?.unit;

    if (unit?.type === 'builder' && leader.controlsUnit(unit) && !tile.improvement) {
      map.startConstructionAt(coords, type, leader, unit);
      this.sendUpdates();
    }
  }

  buildWall(player: Player, coords: Coords, facingCoords: Coords, type: number): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;
    const tile = map.getTileOrThrow(coords);
    const unit = tile?.unit;

    if (unit?.type === 'builder' && leader.controlsUnit(unit)) {
      tile.setWall(map.getDirection(coords, facingCoords), type);
      map.tileUpdate(coords);
      this.sendUpdates();
    }
  }

  setGateOpen(player: Player, coords: Coords, facingCoords: Coords, isOpen: boolean): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;
    const tile = map.getTile(coords);
    const unit = tile?.unit;

    if (unit && leader.controlsUnit(unit)) {
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
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    this.sendToLeader(leaderID, {
      update: [
        ['tradersList', [this.world.map.getTraderDataByLeader(leader)]],
      ],
    });
  }

  /**
   * The list of units the given improvement is able to build
   * @param coords 
   */
  getUnitCatalog(player: Player, coords: Coords): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const tile = this.world.map.getTileOrThrow(coords);
    if (leader.controlsTile(tile) && tile.improvement) {
      this.sendToLeader(leaderID, {
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
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const tile = this.world.map.getTileOrThrow(coords);
    if (leader.controlsTile(tile) && tile.improvement) {
      this.sendToLeader(leaderID, {
        update: [
          ['knowledgeCatalog', [coords, tile.getKnowledgeCatalog()]],
        ],
      });
    }
  }

  researchKnowledge(player: Player, coords: Coords, name: string): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    this.world.map.researchKnowledgeAt(coords, name, leader);
    this.sendUpdates();
  }

  stealKnowledge(player: Player, coords: Coords): void {
    const leaderID = player.leaderID;
    const leader = this.leaders[leaderID];
    const map = this.world.map;

    const tile = map.getTileOrThrow(coords);
    const unit = tile.unit;
    if (unit && leader.controlsUnit(unit)) {
      const tileKnowledgeMap = tile.improvement?.knowledge?.getKnowledgeMap();
      if (tileKnowledgeMap) unit.updateKnowledge(tileKnowledgeMap);
      // TODO - spy invisiblity stuff + possibility of being discovered here
      // TODO - what about stealing from builders?
      
      map.tileUpdate(unit.coords);
      this.sendUpdates();
    }
  }
}
