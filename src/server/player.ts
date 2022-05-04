import * as WebSocket from 'ws';
import { PlayerData } from './utils';

export class Player {
  civID: number;
  ready: boolean;
  isAI: boolean;
  connection: WebSocket;

  constructor(civID: number, connection: WebSocket) {
    this.civID = civID;
    this.ready = false;
    this.isAI = !connection;
    this.connection = connection;
  }

  getData(): PlayerData {
    return {
      civID: this.civID
    };
  }
}