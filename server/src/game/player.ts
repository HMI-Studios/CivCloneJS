import { AIPlayer } from '../ai';
import WebSocketManager from './connection';

export interface PlayerData {
  civID: number | null;
}

export class Player {
  public username: string;
  public civID: number | null;
  public ready: boolean;
  public ai: AIPlayer | null;
  private connection: WebSocketManager | null;

  constructor(username: string, civID: number | null, connection: WebSocketManager | null) {
    this.username = username;
    this.civID = civID;
    this.ready = false;
    this.ai = null;
    this.connection = connection;
  }

  export() {
    return { civID: this.civID };
  }

  static import(username: string, data: any): Player {
    return new Player(username, data.civID, null)
  }

  isAbsent(): boolean {
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
      return;
    } else {
      this.connection.send(msg);
    }
  }
}
