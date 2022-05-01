import { World, Coords } from './world';
import { Player } from './player';
import { Tile } from './tile';
import { Map } from './map';
import { EventMsg } from './utils';

export class Game {
  world: World;
  players: { [playerName: string]: Player };
  playerCount: number;

  constructor(map: Map, playerCount: number) {
    this.world = new World(map, playerCount);

    this.players = {};
    this.playerCount = playerCount;
  }

  beginTurnForCiv(civID: number): void {
    this.world.civs[civID].newTurn();
    this.world.updateCivTileVisibility(civID);
    this.sendToCiv(civID, {
      update: [
        ['setMap', [this.world.map.getCivMap(civID)]],
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

  newPlayerCivID(): number | null {
    const freeCivs = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (const player in this.players) {
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
