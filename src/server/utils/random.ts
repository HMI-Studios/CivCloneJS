export class Random {

  private prevRand: number;

  constructor(seed: number) {
    this.prevRand = seed;
    this.randFloat = this.randFloat.bind(this);
    this.randInt = this.randInt.bind(this);
    this.doubleRandInt = this.doubleRandInt.bind(this);
  }

  private _randNumber(from: number, to: number): number {
    this.prevRand = ((1103515245 * this.prevRand) + 12345) % 2147483648;
    return ((this.prevRand / 2147483648) * (to - from)) + from;
  }

  public randFloat(from?: number, to?: number): number {
    if (from !== undefined) {
      if (to !== undefined) {
        return this._randNumber(from, to);
      } else {
        return this._randNumber(0, from);
      }
    } else {
      return this._randNumber(0, 1);
    }
  }

  public randInt(from?: number, to?: number): number {
    return Math.round(this.randFloat(from, to));
  }

  public doubleRandInt(n1: number, n2: number, n3: number, n4: number): number {
    return this.randInt(this.randInt(n1, n2), this.randInt(n3, n4));
  }
}