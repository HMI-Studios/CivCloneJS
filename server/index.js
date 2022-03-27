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
    ws.connData.username = username;
    console.log(ws.connData);
  },

  joinGame: (ws, gameID) => {
    const game = games[gameID];
    const username = ws.connData.username;

    const civID = game.newPlayerCivID();

    if (civID !== null) {
      ws.connData.gameID = gameID;
      game.players[username] = new Player(civID, ws);
    } else {
      sendTo(ws, { error: [
        ['kicked', ['Game Full']]
      ] });
    }
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
    let username = ws.connData.username;
    let gameID = ws.connData.gameID;
    let game = games[gameID];

    console.log(username, gameID, game);

    if (game && game.players[username]) {
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
    }
  },
};

wss.on('connection', (ws, req) => {

  ws.connData = {
    ip: req.socket.remoteAddress,
    username: null,
    gameID: null,
  };

  ws.on('message', (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Bad JSON recieved from %s', ws.connData.ip);
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
