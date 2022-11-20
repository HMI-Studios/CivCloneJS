import { Coords } from '../../world';
import { Improvement } from './improvement';
import { Tile } from './index';
import { Yield, ResourceStore, YieldParams } from "./yield";

export type ErrandData = {
  storedThisTurn: YieldParams;
  turnsToCompletion: number;
};

export enum ErrandType {
  CONSTRUCTION,
  // MILITARY,
  // CIVILLIAN,
  // RESEARCH,
  // CULTURE,
}

export type ErrandAction = {
  type: ErrandType;
  option: string;
  location?: Coords;
  metaData?: any;
};

export class WorkErrand {
  static errandCostTable: Record<ErrandType, { [option: string]: Yield }> = {
    [ErrandType.CONSTRUCTION]: {
      'encampment': new Yield({production: 2}),
      'farm': new Yield({production: 10}),
    },
  };

  static errandActionEffects: Record<ErrandType, (tile: Tile, action: ErrandAction) => void> = {
    [ErrandType.CONSTRUCTION]: (tile, action) => {
      delete tile.improvement;
      tile.improvement = new Improvement(action.option, tile.baseYield);
    }
  }

  public cost: Yield;
  public storedThisTurn: ResourceStore;
  public completed: boolean;
  public parentStorage: ResourceStore; // Specifically, this is a REFERENCE to the ResourceStore of an Improvement
  public action: ErrandAction;

  constructor(parentStorage: ResourceStore, action: ErrandAction) {
    this.cost = WorkErrand.errandCostTable[action.type][action.option];
    this.parentStorage = parentStorage;
    this.storedThisTurn = new ResourceStore({});
    this.parentStorage.setCapacity(this.cost);
    this.completed = false;
    this.action = action;
  }

  export() {
    return {
      cost: this.cost,
      storedThisTurn: this.storedThisTurn,
      completed: this.completed,
      action: this.action,
    };
  }

  static import(parentStorage: ResourceStore, data: any): WorkErrand {
    const errand = new WorkErrand(parentStorage, data.action);
    const storageCap = data.storedThisTurn.capacity;
    delete data.storedThisTurn.capacity;
    errand.storedThisTurn = new ResourceStore(storageCap).incr(data.storedThisTurn) as ResourceStore;
    errand.completed = data.completed;
    return errand;
  }

  getData(): ErrandData {
    return {
      storedThisTurn: this.storedThisTurn,
      turnsToCompletion: this.cost.sub(this.parentStorage.sub(this.storedThisTurn)).div(this.storedThisTurn),
    };
  }

  complete(tile: Tile): void {
    WorkErrand.errandActionEffects[this.action.type](tile, this.action);
  }
}