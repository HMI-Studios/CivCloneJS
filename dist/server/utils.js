"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdjacentCoords = exports.mod = void 0;
const mod = (a, b) => {
    if (a >= 0) {
        return a % b;
    }
    else {
        return ((a % b) + b) % b;
    }
};
exports.mod = mod;
const getAdjacentCoords = ({ x, y }) => {
    const coordArray = [];
    if ((0, exports.mod)(x, 2) === 1) {
        coordArray.push({ x: x, y: y + 1 });
        coordArray.push({ x: x + 1, y: y + 1 });
        coordArray.push({ x: x + 1, y: y });
        coordArray.push({ x: x, y: y - 1 });
        coordArray.push({ x: x - 1, y: y });
        coordArray.push({ x: x - 1, y: y + 1 });
    }
    else {
        coordArray.push({ x: x + 1, y: y });
        coordArray.push({ x: x + 1, y: y - 1 });
        coordArray.push({ x: x, y: y - 1 });
        coordArray.push({ x: x, y: y + 1 });
        coordArray.push({ x: x - 1, y: y - 1 });
        coordArray.push({ x: x - 1, y: y });
    }
    return coordArray;
};
exports.getAdjacentCoords = getAdjacentCoords;
//# sourceMappingURL=utils.js.map