import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';

import express from 'express';
const app = express();
import { PORT, ADDR_PREFIX } from './config';

import path from 'path';
app.use(`${ADDR_PREFIX}`, express.static(path.join(__dirname, '../client')));
app.use(`${ADDR_PREFIX}/src`, express.static(path.join(__dirname, '../../src'))); // FOR DEBUGGING - REMOVE IN PRODUCTION!
app.use(`${ADDR_PREFIX}/docs`, express.static(path.join(__dirname, '../docs')));

const server = app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

import { executeAction, connections, connData, getConnData } from './methods';
import { EventMsg } from './utils';

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {

  connections.push(ws);
  connData.push({
    ws: ws,
    ip: req.socket.remoteAddress,
    username: null,
    gameID: null,
  });

  ws.on('message', (message: string) => {
    let data: EventMsg;

    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Bad JSON recieved from %s', getConnData(ws).ip);
      ws.send(JSON.stringify({error: ['bad JSON']}));
      return;
    }

    console.log('received:', data);

    if (data.actions) {
      for (let i = 0; i < data.actions.length; i++) {
        const action = data.actions[i][0];
        const args = data.actions[i][1];

        executeAction(ws, action, ...args);
      }
    }
  });
});
