class Game {
  constructor(map, playerCount) {
    this.map = map;
    this.civs = {};
    for (let i = 0; i < playerCount; i++) {
      this.civs[i] = new Civilization();
      this.civs[i].units = Array(i+1) // FIXME
      this.civs[i].units[i] = new Unit('settler', i /*civ*/, i /*x*/, i /*y*/); // FIXME
    }

    // so, ig, find all units (ignore tiles for now), find all tiles in range (just tile the Unit is on for now)
    // and mark those as vissible, and then generate the PlayerMap, and then send that??
    // so
    // visibleTiles = new Array(height*width).fill(false);
    // for (unit in this.civs[civ].units) {
    //   visibleTiles[game.pos(unit)] = true; // .pos() just returns x*W+y, because that looks cryptic
    // }
    // :thumbsup: ?


    // Need to move getCivMap to Game then (because needs more variables only in Game)
    // yeah that sounds right

    this.players = {};
    this.playerCount = playerCount;

    this.metaData = {
      gameName: "New Game",
    };
  }

  updateCivTileVisibility(civ) {
    for (let tile of this.map.tiles) {
      tile.setVisibility(civ, false);
    }
    for (let unit of this.civs[civ].units) {
      this.map.setTileVisibility(civ, this.map.pos(unit.x, unit.y), true);
    }
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
  };

  sendToCiv(civ, msg) {
    let player = Object.values(this.players).find(val => val.civ === civ);

    if (!player) {
      console.error("Error: Could not find player for Civilization #" + civ);
      return;
    }

    if (player.isAI) {

    } else {
       player.connection.send(JSON.stringify(msg));
    }
  };
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

  setTileVisibility(civ, pos, visible) {
    this.tiles[pos].setVisibility(civ, visible);
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
    return {
      ...this.getDiscoveredData(),
      unit: this.unit,
    }
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

class Unit {
  constructor(type, civ, x, y) {
    this.type = type;
    this.hp = 100;
    this.civ = civ;
    this.x = x;
    this.y = y;
  }
};

class Civilization {
  constructor() {
    this.units = [];
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
