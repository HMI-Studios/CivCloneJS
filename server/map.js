const mod = (a, b) => {
  if (a >= 0) {
    return a % b;
  } else {
    return ((a % b) + b) % b;
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

  // pos(Number, Number) => Number;
  pos(x, y) {
    return y*this.width+x;
  }

  // getTile(Number, Number) => Tile
  getTile(x, y) {
    return this.tiles[this.pos(x, y)];
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

  getCivTile(civID, tile) {
    if (tile.discoveredBy[civID]) {
      if (tile.visibleTo[civID]) {
        return tile.getVisibleData();
      } else {
        return tile.getDiscoveredData();
      }
    } else {
      return null;
    }
  }

  getCivMap(civID) {
    return this.tiles.map((tile) => {
      return this.getCivTile(civID, tile);
    });
  }

  setTileVisibility(civID, x, y, visible) {
    this.tiles[this.pos(x, y)].setVisibility(civID, visible);
  }
};

const tileMovementCostTable = {
  // tile name: [land mp, water mp] (0 = impassable)
  'plains': [1, 0],
  'desert': [1, 0],
  'ocean': [0, 1],
  'river': [3, 1],
  'mountain': [0, 0],
};

class Tile {
  constructor(type) {
    this.type = type;
    this.improvement = null;
    this.unit = null;
    this.discoveredBy = {};
    this.visibleTo = {};
    this.movementCost = tileMovementCostTable[type];
  }

  getDiscoveredData() {
    return {
      type: this.type,
      improvement: this.improvement,
      movementCost: this.movementCost,
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

  // setUnit(Unit);
  setUnit(unit) {
    this.unit = unit;
  }

  // setVisibility(Number, Boolean);
  setVisibility(civID, visible) {
    if (visible) {
      this.visibleTo[civID]++;
    } else {
      this.visibleTo[civID]--;
    }

    if (visible && !this.discoveredBy[civID]) {
      this.discoveredBy[civID] = true;
    }
  }

  // clearVisibility(Number);
  clearVisibility(civID) {
    this.visibleTo[civID] = 0;
  }
};

module.exports = {
  Map, Tile,
};