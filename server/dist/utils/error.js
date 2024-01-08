"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidCoordsError = exports.ValueError = exports.NoStartLocation = exports.GenerationFailed = exports.MapError = void 0;
const DEBUG_MODE = true;
class BaseError extends Error {
    constructor(msg) {
        super(msg);
        this.name = this.constructor.name;
        console.error(DEBUG_MODE ? this.stack : `${this.name}: ${this.message}`);
    }
}
class MapError extends BaseError {
}
exports.MapError = MapError;
class GenerationFailed extends MapError {
}
exports.GenerationFailed = GenerationFailed;
class NoStartLocation extends MapError {
}
exports.NoStartLocation = NoStartLocation;
class ValueError extends BaseError {
}
exports.ValueError = ValueError;
class InvalidCoordsError extends ValueError {
}
exports.InvalidCoordsError = InvalidCoordsError;
//# sourceMappingURL=error.js.map