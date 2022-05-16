"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Biome {
    constructor(oceanTile, tileLevels) {
        this.oceanTile = oceanTile;
        this.tileLevels = tileLevels;
    }
    getTile(elevation) {
        let resultTile = this.oceanTile;
        for (const [level, tile] of this.tileLevels) {
            if (elevation > level) {
                resultTile = tile;
            }
            else {
                break;
            }
        }
        return resultTile;
    }
}
exports.default = Biome;
//# sourceMappingURL=biome.js.map