export enum WallType {
  CLIFF,
  WALL,
  OPEN_GATE,
  CLOSED_GATE,
}

export interface Wall {
  type: WallType;
}
