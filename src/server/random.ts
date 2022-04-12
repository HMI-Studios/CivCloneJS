export class Random {

  prevRand: number;

  constructor(seed: number) {
    this.prevRand = seed;
  }

  private _randNumber(from: number, to: number): number {
    this.prevRand = ((1103515245 * this.prevRand) + 12345) % 2147483648;
    return ((this.prevRand / 2147483648) * (to - from)) + from;
  }

  randFloat(from: number = null, to: number = null): number {
    if (from !== null) {
      if (to !== null) {
        return this._randNumber(from, to);
      } else {
        return this._randNumber(0, from);
      }
    } else {
      return this._randNumber(0, 1);
    }
  }

  randInt(from: number = null, to: number = null): number {
    return Math.round(this.randFloat(from, to));
  }

  doubleRandInt(n1: number, n2: number, n3: number, n4: number): number {
    return this.randInt(this.randInt(n1, n2), this.randInt(n3, n4));
  }
}