"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayIncludesCoords = exports.getDirection = exports.getCoordInDirection = exports.getAdjacentCoords = exports.mod = void 0;
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
const getCoordsDial = ({ x, y }) => {
    return (0, exports.mod)(x, 2) === 1 ?
        [
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 },
            { x: x + 1, y: y },
            { x: x, y: y - 1 },
            { x: x - 1, y: y },
            { x: x - 1, y: y + 1 },
        ] :
        [
            { x: x, y: y + 1 },
            { x: x + 1, y: y },
            { x: x + 1, y: y - 1 },
            { x: x, y: y - 1 },
            { x: x - 1, y: y - 1 },
            { x: x - 1, y: y },
        ];
};
const getCoordInDirection = (coords, direction) => {
    const coordsDial = getCoordsDial(coords);
    return coordsDial[(0, exports.mod)(direction, 6)];
};
exports.getCoordInDirection = getCoordInDirection;
const getDirection = (origin, target) => {
    const coordsDial = getCoordsDial(origin);
    let direction = -1;
    coordsDial.forEach((coords, i) => {
        if (coords.x === target.x && coords.y === target.y) {
            direction = i;
        }
    });
    return direction;
};
exports.getDirection = getDirection;
const arrayIncludesCoords = (array, { x, y }) => {
    for (const coords of array) {
        if (coords.x === x && coords.y === y)
            return true;
    }
    return false;
};
exports.arrayIncludesCoords = arrayIncludesCoords;
//# sourceMappingURL=index.js.map