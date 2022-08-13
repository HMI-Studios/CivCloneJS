import { World } from './world';
import { Player } from './player';
import { Map } from './map';
import { EventMsg, PlayerData } from '../utils';

interface MetaData {
  gameName: string,
  ownerName?: string,
  playerCount: number,
  playersConnected: number,
}

export class Game {
  world: World;
  players: { [playerName: string]: Player };
  playerCount: number;
  metaData: MetaData;
  hasStarted: boolean;

  constructor(map: Map, options: { playerCount: number, ownerName?: string, gameName?: string }) {
    const { playerCount, ownerName } = options;
    let { gameName } = options;
    if (!gameName) gameName = ownerName ? `${ownerName}'s game` : 'Untitled Game';

    this.world = new World(map, playerCount);

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
    const exportedPlayers = {};
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
    const playersData = {};
    for (const playerName in this.players) {
      playersData[playerName] = this.players[playerName].getData();
    }
    return playersData;
  }

  getMetaData(): MetaData & { players: {[playerName: string]: PlayerData} } {
    return { ...this.metaData, players: this.getPlayersData() };
  }

  sendToAll(msg: EventMsg): void {
    for (const playerName in this.players) {
      const player = this.players[playerName];

      if (player.isAI) {
        continue;
      } else {
        player.connection.send(JSON.stringify(msg));
      }
    }
  }

  sendToCiv(civID: number, msg: EventMsg): void {
    const player = Object.values(this.players).find(player => player.civID === civID);

    if (!player) {
      console.error("Error: Could not find player for Civilization #" + civID);
      return;
    }

    if (player.isAI) {
      return;
    } else {
       player.connection.send(JSON.stringify(msg));
    }
  }

  forEachPlayer(callback: (player: Player) => void): void {
    for (const playerName in this.players) {
      callback(this.players[playerName]);
    }
  }

  newPlayerCivID(username: string): number | null {
    const freeCivs = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (const player in this.players) {
      if (username === player) return this.players[player].civID;
      delete freeCivs[this.players[player].civID];
    }

    const freeIDs = Object.keys(freeCivs).map(Number);

    if (freeIDs.length > 0) {
      return Math.min(...freeIDs);
    } else {
      return null;
    }
  }

  forEachCivID(callback: (civID: number) => void): void {
    for (let civID = 0; civID < this.playerCount; civID++) {
      callback(civID);
    }
  }
}
