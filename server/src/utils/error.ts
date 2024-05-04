const DEBUG_MODE = false;

class BaseError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = this.constructor.name;
    console.error(DEBUG_MODE ? this.stack : `${this.name}: ${this.message}`);
  }
}

export class InternalServerError extends BaseError {}
export class BugFixError extends InternalServerError {}

export class IllegalCmdError extends BaseError {}
export class GameNotStartedError extends IllegalCmdError {}

export class MapError extends BaseError {}
export class GenerationFailed extends MapError {}
export class NoStartLocation extends MapError {}

export class ValueError extends BaseError {}
export class InvalidCoordsError extends ValueError {}
export class IllegalCoordsError extends ValueError {}

export class FrontendError extends BaseError {
  errName: string;

  constructor(errName: string, msg: string) {
    super(msg);
    this.errName = errName
  }

  getPacket(): [string, [string]] {
    return [this.errName, [this.message]]
  }
}

export class ReportOnlyError extends BaseError {
  constructor(msg: string) {
    super(msg);
  }

  getPacket(): [string, [string]] {
    return ['displayError', [`${this.name}: ${this.message}`]]
  }
}

export class InvalidSettlement extends ReportOnlyError {}
