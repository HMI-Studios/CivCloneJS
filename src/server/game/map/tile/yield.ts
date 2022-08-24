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

  decr(other: Yield): Yield {
    this.food -= other.food;
    this.production -= other.production;

    return this;
  }

  div(n: number): Yield {
    return new Yield({
      food: this.food / n,
      production: this.production / n,
    });
  }

  add(other: Yield): Yield {
    return this.copy().incr(other);
  }
}

export class ResourceStore extends Yield {
  capacity: YieldParams;

  constructor(capacity: YieldParams) {
    super({});
    this.capacity = capacity;
  }

  cap(): Yield {
    const surplus = new Yield({
      food: this.food - (this.capacity.food ?? 0),
      production: this.production - (this.capacity.production ?? 0),
    });

    this.production = Math.min(this.production, this.capacity.production ?? 0);
    this.food = Math.min(this.food, this.capacity.food ?? 0);
    console.log(this);

    return surplus;
  }
}