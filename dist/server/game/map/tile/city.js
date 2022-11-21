"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.City = void 0;
class City {
    constructor(center, name, civID) {
        this.center = center;
        this.name = name;
        this.civID = civID;
        this.tiles = new Set();
        this.tiles.add(center);
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
            tiles,
        };
    }
    static import(data) {
        const city = new City(data.center, data.name, data.civID);
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
}
exports.City = City;
//# sourceMappingURL=city.js.map