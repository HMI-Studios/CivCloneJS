export class Random {

  prevRand: number;

  constructor(seed: number) {
    this.prevRand = seed;
  }

  private _randNumber(from: number, to: number): number {
    this.prevRand = ((1103515245 * this.prevRand) + 12345) % 2147483648;
    return ((this.prevRand / 2147483648) * (to - from)) + from;
  }

  randFloat(from: number, to: number): number {
    if (from) {
      if (to) {
        return this._randNumber(from, to);
      } else {
        return this._randNumber(0, from);
      }
    } else {
      return this._randNumber(0, 1);
    }
  }

  randInt(from: number, to: number): number {
    return Math.round(this.randFloat(from, to));
  }
}