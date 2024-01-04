"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarbarianCamp = exports.City = void 0;
class City {
    constructor(center, name, civID) {
        this.center = center;
        this.name = name;
        this.civID = civID;
        this.units = [];
        this.tiles = new Set();
        this.addTile(center);
    }
    export() {
        const tiles = [];
        for (const coords of this.tiles) {
            tiles.push(coords);
        }
        return {
            center: this.center,
            name: this.name,
            civID: this.civID,
            isBarbarian: this instanceof BarbarianCamp,
            tiles,
        };
    }
    static import(data) {
        const city = new (data.isBarbarian ? BarbarianCamp : City)(data.center, data.name, data.civID);
        city.tiles = new Set();
        for (const coords of data.tiles) {
            city.addTile(coords);
        }
        return city;
    }
    getData() {
        return {
            name: this.name,
            civID: this.civID,
        };
    }
    getTiles() {
        return this.tiles;
    }
    addTile(coords) {
        this.tiles.add(coords);
    }
    removeTile(coords) {
        this.tiles.delete(coords);
    }
    getUnits() {
        return this.units;
    }
    getUnitPositions() {
        return this.units.map(unit => unit.coords);
    }
    addUnit(unit) {
        this.units.push(unit);
        if (this instanceof BarbarianCamp) {
            unit.setBarbarian(true);
        }
    }
    removeUnit(unit) {
        const unitIndex = this.units.indexOf(unit);
        if (unitIndex > -1) {
            this.units.splice(unitIndex, 1);
        }
    }
}
exports.City = City;
class BarbarianCamp extends City {
    constructor(center) {
        super(center, 'camp', undefined);
    }
}
exports.BarbarianCamp = BarbarianCamp;
//# sourceMappingURL=city.js.map