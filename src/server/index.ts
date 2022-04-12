import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';

import express from 'express';
const app = express();
const port = 8080;

import path from 'path';
app.use('/', express.static(path.join(__dirname, '../client')));
app.use('/docs', express.static(path.join(__dirname, '../docs')));

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

import { methods, getConnData, connections, connData, games } from './methods';
import { EventMsg } from './game';

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

        methods[action](ws, ...args);
      }
    }
  });
});
