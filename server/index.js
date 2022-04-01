const fs = require('fs');
const { WebSocketServer } = require('ws');

const express = require('express');
const app = express();
const port = 8080;

const path = require('path');
app.use('/', express.static(path.join(__dirname, '../client')));

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const { Game, Map, Tile, Player } = require('./game.js');

const wss = new WebSocketServer({ server });

const games = {
  0: new Game(
    new Map(38, 38, JSON.parse(fs.readFileSync( path.join(__dirname, 'saves/0.json') )).map),
    2
  ),
};

const sendTo = (ws, msg) => {
  ws.send(JSON.stringify(msg));
}

const methods = {
  setPlayer: (ws, username) => {
    ws.connData.username = username;
  },

  joinGame: (ws, gameID) => {
    const game = games[gameID];
    const username = ws.connData.username;

    const civID = game.newPlayerCivID();

    if (civID !== null) {
      ws.connData.gameID = gameID;
      game.players[username] = new Player(civID, ws);

      sendTo(ws, {
        update: [
          ['civID', [ civID ]],
          ['colorPool', [ game.getColorPool() ]],
        ],
      });
    } else {
      sendTo(ws, { error: [
        ['kicked', ['Game full']],
      ] });
    }
  },

  getGames: (ws) => {
    const gameList = {};
    for (let gameID in games) {
      gameList[gameID] = games[gameID].metaData;
    }

    sendTo(ws, {
      update: [
        ['gameList', [gameList]],
      ],
    });
  },

  setColor: (ws, color) => {
    const username = ws.connData.username;
    const gameID = ws.connData.gameID;
    const game = games[gameID];
    if (game) {
      const player = game.getPlayer(username);

      if (player) {
        if (game.setCivColor(player.civID, color)) {
          game.sendToAll({
            update: [
              ['colorPool', [ game.getColorPool() ]],
            ],
          });
        } else {
          sendTo(ws, {
            error: [
              ['colorTaken', ['That color is no longer available']],
            ],
          });
        }
      }
    }
  },

  ready: (ws, state) => {
    const username = ws.connData.username;
    const gameID = ws.connData.gameID;
    const game = games[gameID];

    if (game) {
      const player = game.getPlayer(username);

      if (player) {
        const civ = game.getCiv(player.civID);

        if (!civ.color) {
          sendTo(ws, { error: [
            ['notReady', ['Please select civ color']],
          ] });
          return;
        }

        player.ready = state;

        if (Object.keys(game.players).length === game.playerCount) {
          if (Object.values(game.players).every(player => player.ready)) {
            game.sendToAll({
              update: [
                ['beginGame', [ [game.map.width, game.map.height], game.playerCount ]],
                ['civData', [ game.getAllCivsData() ]],
              ],
            });

            // console.log(game)

            game.forEachCiv((civID) => {
              game.sendToCiv(civID, {
                update: [
                  ['setMap', [game.map.getCivMap(civID)]],
                ],
              });
            });

            game.beginTurnForCiv(0);
          }
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
        const action = data.actions[i][0];
         const args = data.actions[i][1];

        methods[action](ws, ...args);
      }
    }
  });
});
