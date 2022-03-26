const fs = require('fs');
const { WebSocketServer } = require('ws');

const express = require('express');
const app = express();
const port = 8080;

const path = require('path');
app.use('/', express.static(path.join(__dirname, '../client')));

// TODO
// app.use('/map', express.static(path.join(__dirname, 'data/map.json')));

// app.get('/map/:gameID', (req, res) => {
//   const { gameID } = req.params;
//   fs.readFile(path.join(__dirname, `saves/${gameID}.json`), (err, data) => {
//     if (err) {
//       if (err.code === 'ENOENT') {
//         console.error('File not found!');
//         res.status(404);
//         res.end("No such game ID");
//       } else {
//         throw err;
//       }
//     } else {
//       res.end(data.toString());
//     }
//   });
// });



const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

const connections = {};

wss.on('connection', (ws, req) => {

  connections[ws] = {
    ip: req.socket.remoteAddress,
    userID: null,
    gameID: null,
  };

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Bad JSON recieved from %s', connections[ws].ip);
      ws.send(JSON.stringify({error: ['bad JSON']}));
      return;
    }
    console.log('received:', data);
  });

  console.log(connections[ws]);
});