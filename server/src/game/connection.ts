import * as WebSocket from 'ws';

const versions = {
  'html': {},
  'godot': {},
};

export default class WebSocketManager {
  private socket: WebSocket;
  private timeout?: NodeJS.Timeout;
  private handshakeComplete: boolean;
  private chunkResolver?: () => void;

  public handshake: Promise<void>;
  private rejectHandshake!: (reason?: any) => void;

  public isKnownClient: boolean;
  public hasPacketSizeLimit: boolean;
  public packetSizeLimit: number;
  // public maxMapSize: [number, number];

  constructor(socket: WebSocket) {
    this.socket = socket;
    this.handshakeComplete = false;

    this.isKnownClient = false;
    this.hasPacketSizeLimit = false;
    this.packetSizeLimit = -1;

    this.handshake = new Promise((resolve, reject) => {
      this.rejectHandshake = reject;
      let handshakeStage = 0;
      this.setTimeout(2000);
      this.socket.send('state_version');
      this.socket.on('message', (msgBuff: string) => {
        const message = msgBuff.toString();
        this.clearTimeout();
        if (handshakeStage === 0) {
          const [client, major, minor, patch] = message.split(',');
          if (!(client && major && minor && patch)) reject('Bad Client Version');
          this.isKnownClient = client in versions;
          handshakeStage++;
          this.setTimeout(2000);
          this.socket.send('max_packet_size');
        } else if (handshakeStage === 1) {
          if (Number(message) > -1) {
            this.hasPacketSizeLimit = true;
            this.packetSizeLimit = Number(message);
          }
          handshakeStage++;
          this.socket.send('handshake_complete');
          resolve();
        }
      })
    });

  }

  private setTimeout(timeout: number): void {
    this.timeout = setTimeout(() => {
      this.rejectHandshake();
    }, timeout);
  }

  private clearTimeout(): void {
    clearTimeout(this.timeout);
  }

  public onMessage(callback: (message: string) => void): void {
    this.socket.on('message', (buf: Buffer) => {
      const message = buf.toString();
      if (message[0] === '@') {
        const [cmd, ...args] = message.split(',');
        if (cmd === '@received_chunk') {
          if (this.chunkResolver) this.chunkResolver()
        }
      } else {
        callback(message);
      }
    });
  }

  private sendChunk(chunk: string): Promise<void> {
    const promise = new Promise<void>((resolve) => {
      this.chunkResolver = resolve;
    });
    this.socket.send(chunk);
    return promise;
  }

  public async send(msg: string): Promise<void> {
    const buffer = Buffer.from(msg, 'utf8');
    const size = buffer.length;
    if (this.hasPacketSizeLimit && size > this.packetSizeLimit) {
      const chunks = Math.ceil(size / this.packetSizeLimit);
      await this.sendChunk(`@packet_size,${chunks}`);
      for (let start = 0; start < buffer.length; start += this.packetSizeLimit) {
        const end = start + this.packetSizeLimit;
        await this.sendChunk(buffer.slice(start, end).toString());
      }
    } else {
      this.socket.send(msg);
    }
  }
}