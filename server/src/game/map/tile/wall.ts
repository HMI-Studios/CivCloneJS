export enum WallType {
  CLIFF,
  WALL,
  OPEN_GATE,
  CLOSED_GATE,
  WALL_RUIN,
}

export interface Wall {
  type: WallType;
}
