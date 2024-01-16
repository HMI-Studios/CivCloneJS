import * as WebSocket from 'ws';
import { PlayerData } from '../utils';
import WebSocketManager from './connection';

export class Player {
  civID: number;
  ready: boolean;
  private connection: WebSocketManager | null;

  constructor(civID: number, connection: WebSocketManager | null) {
    this.civID = civID;
    this.ready = false;
    this.connection = connection;
  }

  export() {
    return { civID: this.civID };
  }

  static import(data: any): Player {
    return new Player(data.civID, null)
  }

  isAI(): boolean {
    return this.connection === null;
  }

  getData(): PlayerData {
    return { civID: this.civID };
  }
  
  reset(connection: WebSocketManager | null): void {
    this.ready = false;
    this.connection = connection;
  }

  send(msg: string): void {
    if (!this.connection) {
      // TODO - do AI things
      return;
    } else {
      this.connection.send(msg);
    }
  }
}
