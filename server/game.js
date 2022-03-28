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

    this.metaData = {
      gameName: "New Game",
    };
  }

  beginTurnForCiv(civ) {
    this.civs[civ].newTurn();
    this.sendToCiv(civ, {
      update: [
        ['setMap', [this.map.getCivMap(civ)]],
        ['beginTurn', []],
      ],
    });
  }

  updateCivTileVisibility(civ) {
    for (let tile of this.map.tiles) {
      tile.setVisibility(civ, false);
    }
    for (let unit of this.civs[civ].units) {
      for (let tile of this.map.getNeighbors(unit.x, unit.y, 3)) {
        tile.setVisibility(civ, true);
      }
    }
  }

  addUnit(unit, x, y) {
    this.civs[unit.civ].addUnit(unit);
    this.map.moveUnitTo(unit, x, y);
  }

  removeUnit(unit) {
    this.civs[unit.civ].removeUnit(unit);
    this.map.moveUnitTo(unit, null, null);
  }

  newPlayerCivID() {
    const freeCivs = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (let player in this.players) {
      delete freeCivs[this.players[player].civ];
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

  sendToCiv(civ, msg) {
    let player = Object.values(this.players).find(player => player.civ === civ);

    if (!player) {
      console.error("Error: Could not find player for Civilization #" + civ);
      return;
    }

    if (player.isAI) {

    } else {
       player.connection.send(JSON.stringify(msg));
    }
  }

  forEachCiv(callback) {
    for (let civ = 0; civ < this.playerCount; civ++) {
      callback(civ);
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

  getCivMap(civ) {
    return this.tiles.map((tile) => {
      if (tile.discoveredBy.includes(civ)) {
        if (tile.visibleTo.includes(civ)) {
          return tile.getVisibleData();
        } else {
          return tile.getDiscoveredData();
        }
      } else {
        return null;
      }
    });
  }

  setTileVisibility(civ, x, y, visible) {
    this.tiles[this.pos(x, y)].setVisibility(civ, visible);
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

  setVisibility(civ, visible) {
    const vIndex = this.visibleTo.indexOf(civ);
    const dIndex = this.discoveredBy.indexOf(civ);
    if (visible) {
      if (vIndex === -1) this.visibleTo.push(civ);
      if (dIndex === -1) this.discoveredBy.push(civ);
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
  constructor(type, civ) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.civ = civ;
    this.x = null;
    this.y = null;
  }

  getData() {
    return {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      civ: this.civ,
    };
  }

  newTurn() {
    this.movement = unitMovementTable[this.type];
  }
};

class Civilization {
  constructor() {
    this.units = [];
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
  constructor(civ, connection) {
    this.civ = civ;
    this.ready = false;
    this.isAI = !connection;
    this.connection = connection;
  }
};

module.exports = {
  Game, Map, Tile, Unit, Civilization, Player,
};
