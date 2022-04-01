class World {
  constructor() {
    this.tiles = [];
    // this.size = 0; // REMOVE
    this.height;
    this.width;
    this.socket;
    this.on = {
      update: {},
      error: {},
    };
  }

  getTile(x, y) {
    return this.tiles[(y * this.width) + mod(x, this.width)] || null;
  }

  sendJSON(data) {
    this.socket.send(JSON.stringify(data));
  }

  handleResponse(data) {
    if (data.update) {
      for (let i = 0; i < data.update.length; i++) {
        let name = data.update[i][0];
        let args = data.update[i][1];
        console.log(name);
        if (this.on.update[name]) {
          this.on.update[name](...args);
        }
      }
    }
    if (data.error) {
      for (let i = 0; i < data.error.length; i++) {
        let name = data.error[i][0];
        let args = data.error[i][1];
        console.error(name);
        if (this.on.error[name]) {
          this.on.error[name](...args);
        }
      }
    }
  }

  setup(serverIP, camera, ui) {

    const readyFn = (isReady) => {
      this.sendActions([
        ['ready', [isReady]],
      ]);
    };

    const civPickerFn = (color) => {
      this.sendActions([
        ['setColor', [color]],
      ]);
    };

    this.on.update.gameList = (gameList) => {
      let gameTitles = [];
      let defaultGame = Object.keys(gameList)[0];
      for (let gameID in gameList) {
        gameTitles.push(`#${gameID} - ${gameList[gameID].gameName}`)
      }

      const gameID = '0';//prompt(`Select game to join:\n${gameTitles.join('\n')}`, defaultGame);

      if (gameID !== null) {
        this.sendActions([
          ['joinGame', [gameID]],
        ]);

        ui.showReadyBtn(readyFn);
        ui.showCivPicker(civPickerFn);
      }
    };

    this.on.update.beginGame = ([width, height], playerCount) => {
      ui.hideReadyBtn();
      ui.hideCivPicker();
      [this.width, this.height] = [width, height];
      camera.start(this, 1000/60);
    };

    this.on.update.setMap = (map) => {
      console.log(map);
      this.tiles = map;
    };

    this.on.update.colorPool = (colors) => {
      console.log(colors);
      ui.colorPool = colors;
      ui.showCivPicker(civPickerFn);
    };

    this.on.error.notReady = (reason) => {
      console.error('Error:', reason);
      ui.hideReadyBtn();
      ui.showReadyBtn(readyFn);
    }

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`ws://${serverIP}`);
      this.socket.addEventListener('message', (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          console.error('Bad JSON recieved from server');
          return;
        }
        this.handleResponse(data);
      });
      this.socket.addEventListener('open', (event) => {
        resolve();
      });
    });
  }

  sendActions(actions) {
    this.sendJSON({ actions });
  }

  // loadMap() {
  //   return axios.get(`/map`)
  //     .then(({ data }) => {
  //       this.tiles = data.map;
  //       this.size = Math.floor(Math.sqrt(this.tiles.length)); // REMOVE
  //       this.height = data.height;
  //       this.width = data.width;
  //     });
  // }
}