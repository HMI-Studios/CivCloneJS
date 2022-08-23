export type YieldParams = {
  food?: number,
  production?: number
};

export class Yield {
  food: number;
  production: number;

  constructor(params: YieldParams) {
    this.food = params.food ?? 0;
    this.production = params.production ?? 0;
  }

  copy(): Yield {
    return new Yield({
      food: this.food,
      production: this.production,
    });
  }

  incr(other: Yield): Yield {
    this.food += other.food;
    this.production += other.production;

    return this;
  }

  add(other: Yield): Yield {
    return this.copy().incr(other);
  }
}