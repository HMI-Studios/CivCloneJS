import { Random } from './random';

class Biome {
  private oceanTile: string;
  private tileLevels: [number, string][];

  constructor(oceanTile: string, tileLevels: [number, string][]) {
    this.oceanTile = oceanTile;
    this.tileLevels = tileLevels;
  }

  getTile(elevation: number): string {
    let resultTile = this.oceanTile;
    for (const [level, tile] of this.tileLevels) {
      if (elevation > level) {
        resultTile = tile;
      } else {
        break;
      }
    }
    return resultTile;
  }
}

export default Biome;