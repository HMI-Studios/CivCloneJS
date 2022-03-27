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

const { Game, Map, Tile, Player } = require('./game.js');

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

const connections = {};

const games = {
  0: new Game(
    new Map(2, 2, [
      'plains',
      'ocean',
      'ocean',
      'plains',
    ]),
    1
  ),
};

const sendTo = (ws, msg) => {
  ws.send(JSON.stringify(msg));
}

const methods = {
  setPlayer: (ws, username) => {
    connections[ws].username = username;
  },

  joinGame: (ws, gameID) => {
    let game = games[gameID];

    connections[ws].gameID = gameID;

    let username = connections[ws].username;
    game.players[username] = new Player(game.newPlayerCivID(), ws);
  },

  getGames: (ws) => {
    let gameList = {};
    for (let gameID in games) {
      gameList[gameID] = games[gameID].metaData;
    }

    sendTo(ws, {
      update: [
        ['gameList', [gameList]]
      ],
    });
  },

  ready: (ws, state) => {
    let username = connections[ws].username;
    let gameID = connections[ws].gameID;
    let game = games[gameID];

    game.players[username].ready = state;

    if (game.players.length == game.civs.length) {
      if (Object.values(game.players).every(player => player.ready)) {
        game.sendToAll({
          update: [
            ['beginGame', []]
          ],
        });

        game.sendToCiv(0, {
          update: [
            ['beginTurn', []]
          ],
        });
      }
    }
  },
};

wss.on('connection', (ws, req) => {

  connections[ws] = {
    ip: req.socket.remoteAddress,
    username: null,
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

    if (data.actions) {
      for (let i = 0; i < data.actions.length; i++) {
        let action = data.actions[i][0];
        let args = data.actions[i][1];

        methods[action](ws, ...args);
      }
    }
  });
});
