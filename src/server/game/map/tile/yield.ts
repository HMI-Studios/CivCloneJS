export class Yield {
  food: number;
  production: number;

  constructor(params: { food?: number, production?: number }) {
    this.food = params.food ?? 0;
    this.production = params.production ?? 0;
  }

  add(other: Yield): Yield {
    return new Yield({
      food: this.food + other.food,
      production: this.production + other.production,
    });
  }
}