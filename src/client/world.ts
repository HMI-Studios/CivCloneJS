class World {
  tiles: any[];
  height: number;
  width: number;
  socket: WebSocket;
  on: { update: any, error: any };
  civs: {};
  player: { name: string, civID: number };
  constructor(playerName: string) {
    this.tiles = [];
    this.height;
    this.width;
    this.socket;
    this.on = {
      update: {},
      error: {},
    };
    this.civs = {};
    this.player = {
      name: playerName,
      civID: null,
    };
  }

  pos (x: number, y: number): number {
    return (y * this.width) + mod(x, this.width)
  }

  getTile(x: number, y: number): any {
    return this.tiles[this.pos(x, y)] || null;
  }

  getNeighbors(x: number, y: number): [number, number][] {
    let tiles: [number, number][];

    if (mod(x, 2) === 1) {
      tiles = [
        [x, y+1],
        [x+1, y+1],
        [x+1, y],
        [x, y-1],
        [x-1, y],
        [x-1, y+1],
      ];
    } else {
      tiles = [
        [x, y+1],
        [x+1, y],
        [x+1, y-1],
        [x, y-1],
        [x-1, y-1],
        [x-1, y],
      ];
    }

    return tiles.filter(([x, y]) => !!this.getTile(x, y));
  }

  // mode: 0 = land unit, 1 = sea unit; -1 = air unit
  getTilesInRange(srcX: number, srcY: number, range: number, mode: number=0): any {
    const queue = [];
    queue.push([srcX, srcY]);

    const dst = {};
    dst[this.pos(srcX, srcY)] = 0;

    const paths = {};

    while (queue.length) {
      const [atX, atY] = queue.shift();

      for (let [adjX, adjY] of this.getNeighbors(atX, atY)) {
        if (!(this.pos(adjX, adjY) in dst)) {
          const movementCost = mode > -1 ? this.getTile(adjX, adjY).movementCost[mode] || Infinity : 1;
          dst[this.pos(adjX, adjY)] = dst[this.pos(atX, atY)] + movementCost;

          if (dst[this.pos(adjX, adjY)] <= range) {
            paths[this.pos(adjX, adjY)] = [atX, atY];
            queue.push([adjX, adjY]);
          }
        }
      }
    }

    return paths;
  }

  sendJSON(data: any) {
    this.socket.send(JSON.stringify(data));
  }

  handleResponse(data: { update?: any, error?: any }) {
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

  setup(serverIP: string, camera: Camera, ui: UI): Promise<void> {

    const readyFn = (isReady: boolean): void => {
      this.sendActions([
        ['ready', [isReady]],
      ]);
    };

    const civPickerFn = (color: string): void => {
      this.sendActions([
        ['setColor', [color]],
      ]);
    };

    this.on.update.gameList = (gameList: { [key: string]: any }): void => {
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

    this.on.update.beginGame = ([width, height]: [number, number]): void => {
      ui.hideReadyBtn();
      ui.hideCivPicker();
      [this.width, this.height] = [width, height];
      camera.start(this, 1000/60);
    };

    this.on.update.setMap = (map: any[]): void => {
      console.log(map);
      this.tiles = map;
    };

    this.on.update.colorPool = (colors: any[]): void => {
      console.log(colors);
      ui.colorPool = colors;
      ui.showCivPicker(civPickerFn);
    };

    this.on.update.civData = (civs) => {
      this.civs = civs;
    };

    this.on.update.civID = (civID) => {
      this.player.civID = civID;
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