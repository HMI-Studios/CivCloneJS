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
    getData() {
        return {
            name: this.name,
            civID: this.civID,
        };
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