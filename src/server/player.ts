import * as WebSocket from 'ws';

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
}