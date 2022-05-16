import { Coords } from './world';

export type Event = [string, unknown[]];

export interface EventMsg {
  actions?: Event[];
  update?: Event[];
  error?: Event[];
}

export interface PlayerData {
  civID: number;
}

export const mod = (a: number, b: number): number => {
  if (a >= 0) {
    return a % b;
  } else {
    return ((a % b) + b) % b;
  }
}

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
}