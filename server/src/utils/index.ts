import { Map } from '../game/map';
import { Coords } from '../game/world';

export type Event = [string, unknown[]];

export interface EventMsg {
  actions?: Event[];
  update?: Event[];
  error?: Event[];
}

export const mod = (a: number, b: number): number => {
  if (a >= 0) {
    return a % b;
  } else {
    return ((a % b) + b) % b;
  }
};

export const getAdjacentCoords = ({x, y}: Coords): Coords[] => {
  const coordArray: Coords[] = [];
  if (mod(x, 2) === 1) {
    coordArray.push({ x: x,   y: y+1 });
    coordArray.push({ x: x+1, y: y+1 });
    coordArray.push({ x: x+1, y: y   });
    coordArray.push({ x: x,   y: y-1 });
    coordArray.push({ x: x-1, y: y   });
    coordArray.push({ x: x-1, y: y+1 });
  } else {
    coordArray.push({ x: x+1, y: y   });
    coordArray.push({ x: x+1, y: y-1 });
    coordArray.push({ x: x,   y: y-1 });
    coordArray.push({ x: x,   y: y+1 });
    coordArray.push({ x: x-1, y: y-1 });
    coordArray.push({ x: x-1, y: y   });
  }

  return coordArray;
};

export const arrayIncludesCoords = (array: Coords[], {x, y}: Coords): boolean => {
  for (const coords of array) {
    if (coords.x === x && coords.y === y) return true;
  }
  return false;
};

export const getSmallestCoordsDiff = (map: Map, pos: Coords, target: Coords): [number, number] => {
  const { width } = map;
  const [posX, posY] = [mod(pos.x, width), pos.y];
  const [targetX, targetY] = [target.x, target.y];
  const altTargetX = targetX < posX ? (targetX + width) : (targetX - width);
  const xDiff = targetX - posX;
  const altXDiff = altTargetX - posX;
  return [(Math.abs(xDiff) <= Math.abs(altXDiff)) ? (xDiff) : (altXDiff), targetY - posY];
};

export const coordsRepr = (coords: Coords): string => {
  return `${coords.x}, ${coords.y}`;
};