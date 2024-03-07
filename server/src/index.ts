import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';

import express from 'express';
const app = express();
import { PORT, ADDR_PREFIX, DEBUG, CLIENT_BUILD_LOCATION, DOCS_BUILD_LOCATION } from './config';

import path from 'path';
app.use(`${ADDR_PREFIX}`, express.static(CLIENT_BUILD_LOCATION));
app.use(`${ADDR_PREFIX}/src`, express.static(path.join(__dirname, '../../client/src'))); // FOR DEBUGGING - REMOVE IN PRODUCTION!
app.use(`${ADDR_PREFIX}/docs`, express.static(DOCS_BUILD_LOCATION));

const server = app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

import { executeAction, sockets, connections, connData, getConnData } from './methods';
import { EventMsg } from './utils';
import WebSocketManager from './game/connection';

wss.on('connection', async (sock: WebSocket, req: IncomingMessage) => {

  const ws = new WebSocketManager(sock);
  try {
    await ws.handshake;
    console.log('Handshake successful: ', req.socket.remoteAddress);
  } catch (err) {
    console.error('Handshake failed:', err, req.socket.remoteAddress);
    return sock.close()
  }
  sockets.push(sock);
  connections.push(ws);
  connData.push({
    ws: ws,
    ip: req.socket.remoteAddress,
    username: null,
    gameID: null,
  });

  ws.onMessage((message: string) => {
    let data: EventMsg;

    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Bad JSON recieved from %s', getConnData(ws).ip);
      ws.send(JSON.stringify({error: ['bad JSON']}));
      return;
    }

    if (DEBUG) {
      const { username, ip } = getConnData(ws);
      console.log(`Recieved from ${username} (${ip}):`, JSON.stringify(data));
    }

    if (data.actions) {
      for (let i = 0; i < data.actions.length; i++) {
        const action = data.actions[i][0];
        const args = data.actions[i][1];

        executeAction(ws, action, ...args);
      }
    }
  });
});
