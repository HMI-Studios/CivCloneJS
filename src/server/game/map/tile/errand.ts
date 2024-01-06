import { Coords, World } from '../../world';
import { Map } from '../index';
import { Improvement } from './improvement';
import { Tile } from './index';
import { Knowledge } from './knowledge';
import { Unit } from './unit';
import { Yield, ResourceStore, YieldParams } from "./yield";

export type ErrandData = {
  storedThisTurn: YieldParams;
  turnsToCompletion: number;
  progress: number;
  action: ErrandAction;
};

export enum ErrandType {
  CONSTRUCTION,
  UNIT_TRAINING,
  RESEARCH,
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
      'encampment': new Yield({production: 1}),
      'campus': new Yield({production: 1}),
      'farm': new Yield({production: 10}),
    },
    [ErrandType.UNIT_TRAINING]: Unit.costTable,
    [ErrandType.RESEARCH]: Knowledge.getCosts(),
  };

  static errandActionEffects: Record<ErrandType, (world: World, map: Map, tile: Tile, action: ErrandAction) => void> = {
    [ErrandType.CONSTRUCTION]: (world, map, tile, action) => {
      delete tile.improvement;
      tile.improvement = new Improvement(action.option, tile.baseYield);
    },
    [ErrandType.UNIT_TRAINING]: (world, map, tile, action) => {
      if (!(tile.owner && action.location)) return;
      const newUnit = new Unit(action.option, action.location, tile.owner.civID, tile.owner.civID ? undefined : tile.owner.id);
      if (tile.unit) {
        // if there is already a unit on this tile, we must figure something else out
      } else {
        world.addUnit(newUnit)
      }
    },
    [ErrandType.RESEARCH]: (world, map, tile, action) => {
      tile.improvement?.knowledge?.addKnowledge(Knowledge.knowledgeTree[action.option], 100, 0);
    },
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
    this.storedThisTurn.incr(this.parentStorage)
    this.parentStorage.setCapacity(Yield.max(this.cost, this.parentStorage.capacity));
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
      progress: Math.min(this.parentStorage.fulfillProgress(this.cost), 1),
      action: this.action,
    };
  }

  complete(world: World, map: Map, tile: Tile): void {
    WorkErrand.errandActionEffects[this.action.type](world, map, tile, this.action);
  }
}