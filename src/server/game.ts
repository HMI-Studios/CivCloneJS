// const { Map, Tile } = require('./map.js');
import { Map, Tile } from './map';
import * as WebSocket from 'ws';

export class Game {
  map: Map;
  civs: { [civID: string]: Civilization };
  players: { [playerName: string]: Player };
  playerCount: number;
  colorPool: { [key: string]: boolean };
  metaData: { gameName: string };
  constructor(map: Map, playerCount: number) {
    this.map = map;
    this.civs = {};
    for (let i = 0; i < playerCount; i++) {
      this.civs[i] = new Civilization();

      this.addUnit(new Unit('settler', i), (i+1)*1, (i+1)*1);
      this.addUnit(new Unit('scout', i), (i+1)*3, (i+1)*4); // REMOVE THESE

      this.updateCivTileVisibility(i);
    }

    this.players = {};
    this.playerCount = playerCount;

    const colorList = [
      '#820000', // RICH RED
      '#0a2ead', // BLUE
      '#03a300', // GREEN
      '#03a300', // SAND YELLOW
      '#560e8a', // ROYAL PURPLE
      '#bd7400', // ORANGE
    ].slice(0, Math.max(this.playerCount, 6));
    this.colorPool = colorList.reduce((obj, color) => ({...obj, [color]: true}), {});

    this.metaData = {
      gameName: "New Game",
    };
  }

  getPlayer(username: string) {
    return this.players[username];
  }

  getCiv(civID: number) {
    return this.civs[civID];
  }

  getColorPool() {
    const colorList = [];
    for (let color in this.colorPool) {
      if (this.colorPool[color]) {
        colorList.push(color);
      }
    }
    return colorList;
  }

  setCivColor(civID: number, color: string) {
    if (this.colorPool[color]) {
      if (this.civs[civID].color) {
        this.colorPool[this.civs[civID].color] = true;
      }
      this.civs[civID].color = color;
      this.colorPool[color] = false;
      return true;
    } else {
      return false;
    }
  }

  getAllCivsData() {
    const data = {};
    for (let civID in this.civs) {
      const civ = this.civs[civID];
      data[civID] = civ.getData();
    }
    return data;
  }

  beginTurnForCiv(civID: number) {
    this.civs[civID].newTurn();
    this.sendToCiv(civID, {
      update: [
        ['setMap', [this.map.getCivMap(civID)]],
        ['beginTurn', []],
      ],
    });
  }

  updateCivTileVisibility(civID: number) {
    for (let tile of this.map.tiles) {
      tile.clearVisibility(civID);
    }
    for (let unit of this.civs[civID].units) {
      for (let tile of this.map.getNeighbors(unit.x, unit.y, 3)) {
        tile.setVisibility(civID, true);
      }
    }
  }

  addUnit(unit: Unit, x: number, y: number) {
    this.civs[unit.civID].addUnit(unit);
    this.map.moveUnitTo(unit, x, y);
  }

  removeUnit(unit: Unit) {
    this.civs[unit.civID].removeUnit(unit);
    this.map.moveUnitTo(unit, null, null);
  }

  // newPlayerCivID() => Number || null;
  newPlayerCivID() {
    const freeCivs = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (let player in this.players) {
      delete freeCivs[this.players[player].civID];
    }

    const freeIDs = Object.keys(freeCivs).map(Number);

    if (freeIDs.length > 0) {
      return Math.min(...freeIDs);
    } else {
      return null;
    }
  }

  sendToAll(msg: object) {
    for (let playerName in this.players) {
      let player = this.players[playerName];

      if (player.isAI) {

      } else {
        player.connection.send(JSON.stringify(msg));
      }
    }
  }

  sendToCiv(civID: number, msg: object) {
    let player = Object.values(this.players).find(player => player.civID === civID);

    if (!player) {
      console.error("Error: Could not find player for Civilization #" + civID);
      return;
    }

    if (player.isAI) {

    } else {
       player.connection.send(JSON.stringify(msg));
    }
  }

  sendTileUpdate(tile: Tile) {
    for (let civID = 0; civID < this.playerCount; civID++) {
      this.sendToCiv(civID, {
        update: [
          ['tileUpdate', [ this.map.getCivTile(civID, tile) ]],
        ],
      });
    }
  }

  forEachCiv(callback: (civID: number) => any) {
    for (let civID = 0; civID < this.playerCount; civID++) {
      callback(civID);
    }
  }
};

const unitMovementTable = {
  'settler': 3,
  'scout': 5,
};

export class Unit {
  type: string;
  hp: number;
  movement: number;
  civID: number;
  x: number;
  y: number;

  constructor(type: string, civID: number) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.civID = civID;
    this.x = null;
    this.y = null;
  }

  getData() {
    return {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      civID: this.civID,
    };
  }

  newTurn() {
    this.movement = unitMovementTable[this.type];
  }
};

export class Civilization {
  units: Unit[];
  color: string;

  constructor() {
    this.units = [];
    this.color = null;
  }

  getData() {
    return {
      color: this.color
    }
  }

  newTurn() {
    for (let unit of this.units) {
      unit.newTurn();
    }
  }

  addUnit(unit: Unit) {
    this.units.push(unit);
  }

  removeUnit(unit: Unit) {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }
};

export class Player {
  civID: number;
  ready: boolean;
  isAI: boolean;
  connection: WebSocket;

  constructor(civID: number, connection: WebSocket) {
    this.civID = civID;
    this.ready = false;
    this.isAI = !connection;
    this.connection = connection;
  }
};

module.exports = {
  Game, Map, Tile, Unit, Civilization, Player,
};
