const DEBUG_MODE = true;

class BaseError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = this.constructor.name;
    console.error(DEBUG_MODE ? this.stack : `${this.name}: ${this.message}`);
  }
}

export class MapError extends BaseError {}
export class GenerationFailed extends MapError {}
export class NoStartLocation extends MapError {}

export class ValueError extends BaseError {}
export class InvalidCoordsError extends ValueError {}