import * as fs from 'node:fs/promises';
import * as path from 'path';

import { SAVE_LOCATION } from '../config';

import { World } from './world';
import { Player } from './player';
import { EventMsg, PlayerData } from '../utils';
import { PerlinWorldGenerator } from './map/generator';
import { GenerationFailed, MapError } from '../utils/error';

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
  players: { [playerName: string]: Player };
  playerCount: number;
  metaData: MetaData;
  hasStarted: boolean;

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

  getPlayer(username: string): Player {
    return this.players[username];
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

  newPlayerCivID(username: string): number | null {
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
}
