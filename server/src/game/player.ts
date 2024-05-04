import * as WebSocket from 'ws';
import WebSocketManager from './connection';

export interface PlayerData {
  leaderID: number;
}

export class Player {
  leaderID: number;
  ready: boolean;
  private connection: WebSocketManager | null;

  constructor(leaderID: number, connection: WebSocketManager | null) {
    this.leaderID = leaderID;
    this.ready = false;
    this.connection = connection;
  }

  export() {
    return { leaderID: this.leaderID };
  }

  static import(data: any): Player {
    return new Player(data.leaderID, null)
  }

  isAI(): boolean {
    return this.connection === null;
  }

  getData(): PlayerData {
    return { leaderID: this.leaderID };
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
