const mod = (a, b) => {
  if (a >= 0) {
    return a % b;
  } else {
    return ((a % b) + b) % b;
  }
};

class Game {
  constructor(map, playerCount) {
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

  getPlayer(username) {
    return this.players[username];
  }

  getCiv(civID) {
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

  setCivColor(civID, color) {
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

  beginTurnForCiv(civID) {
    this.civs[civID].newTurn();
    this.sendToCiv(civID, {
      update: [
        ['setMap', [this.map.getCivMap(civID)]],
        ['beginTurn', []],
      ],
    });
  }

  updateCivTileVisibility(civID) {
    for (let tile of this.map.tiles) {
      tile.setVisibility(civID, false);
    }
    for (let unit of this.civs[civID].units) {
      for (let tile of this.map.getNeighbors(unit.x, unit.y, 3)) {
        tile.setVisibility(civID, true);
      }
    }
  }

  addUnit(unit, x, y) {
    this.civs[unit.civID].addUnit(unit);
    this.map.moveUnitTo(unit, x, y);
  }

  removeUnit(unit) {
    this.civs[unit.civID].removeUnit(unit);
    this.map.moveUnitTo(unit, null, null);
  }

  newPlayerCivID() {
    const freeCivs = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (let player in this.players) {
      delete freeCivs[this.players[player].civID];
    }

    const freeIDs = Object.keys(freeCivs);

    if (freeIDs.length > 0) {
      return Math.min(...freeIDs);
    } else {
      return null;
    }
  }

  sendToAll(msg) {
    for (let playerName in this.players) {
      let player = this.players[playerName];

      if (player.isAI) {

      } else {
        player.connection.send(JSON.stringify(msg));
      }
    }
  }

  sendToCiv(civID, msg) {
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

  forEachCiv(callback) {
    for (let civID = 0; civID < this.playerCount; civID++) {
      callback(civID);
    }
  }
};

class Map {
  constructor(height, width, terrain) {
    this.height = height;
    this.width = width;
    this.tiles = new Array(height*width);
    for (let i = 0; i < height*width; i++) {
      this.tiles[i] = new Tile(terrain[i]);
    }
  }

  pos(x, y) {
    return y*this.width+x;
  }

  getNeighbors(x, y, r, tileList=[], isTop=true) {
    if (r > 0 && this.tiles[this.pos(x, y)]) {
      tileList.push(this.tiles[this.pos(x, y)]);
      if (mod(x, 2) === 1) {
        this.getNeighbors(x, y+1, r-1, tileList, false);
        this.getNeighbors(x+1, y+1, r-1, tileList, false);
        this.getNeighbors(x+1, y, r-1, tileList, false);
        this.getNeighbors(x, y-1, r-1, tileList, false);
        this.getNeighbors(x-1, y, r-1, tileList, false);
        this.getNeighbors(x-1, y+1, r-1, tileList, false);
      } else {
        this.getNeighbors(x, y+1, r-1, tileList, false);
        this.getNeighbors(x+1, y, r-1, tileList, false);
        this.getNeighbors(x+1, y-1, r-1, tileList, false);
        this.getNeighbors(x, y-1, r-1, tileList, false);
        this.getNeighbors(x-1, y-1, r-1, tileList, false);
        this.getNeighbors(x-1, y, r-1, tileList, false);
      }
    }
    if (isTop) {
      return tileList;
    }
  }

  moveUnitTo(unit, x, y) {
    if (unit.x !== null && unit.y !== null) {
      this.tiles[this.pos(unit.x, unit.y)].setUnit(null);
    }
    [unit.x, unit.y] = [x, y];
    if (x !== null && y !== null) {
      this.tiles[this.pos(x, y)].setUnit(unit);
    }
  }

  getCivMap(civID) {
    return this.tiles.map((tile) => {
      if (tile.discoveredBy.includes(civID)) {
        if (tile.visibleTo.includes(civID)) {
          return tile.getVisibleData();
        } else {
          return tile.getDiscoveredData();
        }
      } else {
        return null;
      }
    });
  }

  setTileVisibility(civID, x, y, visible) {
    this.tiles[this.pos(x, y)].setVisibility(civID, visible);
  }
};

class Tile {
  constructor(type) {
    this.type = type;
    this.improvement = null;
    this.unit = null;
    this.discoveredBy = [];
    this.visibleTo = [];
  }

  getDiscoveredData() {
    return {
      type: this.type,
      improvement: this.improvement,
    };
  }

  getVisibleData() {
    const unitData = !this.unit ? null : this.unit.getData();
    return {
      ...this.getDiscoveredData(),
      unit: unitData,
      visible: true,
    }
  }

  setUnit(unit) {
    this.unit = unit;
  }

  setVisibility(civID, visible) {
    const vIndex = this.visibleTo.indexOf(civID);
    const dIndex = this.discoveredBy.indexOf(civID);
    if (visible) {
      if (vIndex === -1) this.visibleTo.push(civID);
      if (dIndex === -1) this.discoveredBy.push(civID);
    } else {
      if (vIndex > -1) this.visibleTo.splice(vIndex, 1);
    }
  }
};

const unitMovementTable = {
  'settler': 3,
  'scout': 5,
};

class Unit {
  constructor(type, civID) {
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

class Civilization {
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

  addUnit(unit) {
    this.units.push(unit);
  }

  removeUnit(unit) {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }
};

class Player {
  constructor(civID, connection) {
    this.civID = civID;
    this.ready = false;
    this.isAI = !connection;
    this.connection = connection;
  }
};

module.exports = {
  Game, Map, Tile, Unit, Civilization, Player,
};
