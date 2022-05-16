interface Civ {
  color: string;
}

interface Player {
  name: string | null;
  civID: number | null;
}

interface WorldEventHandlerMap {
  [key: string]: (...args: unknown[]) => void;
}

interface EventMsg {
  actions?: [string, unknown[]][];
  update?: [string, unknown[]][];
  error?: [string, unknown[]][];
}

interface Unit {
  type: string;
  hp: number;
  movement: number;
  civID: number;
}

interface Improvement {
  type: string;
  pillaged: boolean;
}

interface Tile {
  type: string;
  elevation: number;
  improvement: Improvement;
  movementCost: [number, number];
  unit: Unit;
  visible: boolean;
}

interface GameMetadata {
  gameName: string;
  playerCount: number;
  playersConnected: number;
}

interface Coords {
  x: number;
  y: number;
}

type CoordTuple = [number, number];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class World {
  tiles: Tile[];
  height: number;
  width: number;
  socket: WebSocket;
  on: { update: WorldEventHandlerMap, error: WorldEventHandlerMap, event: WorldEventHandlerMap };
  civs: { [key: string]: Civ };
  player: Player;
  constructor() {
    this.tiles = [];
    this.height;
    this.width;
    this.socket;
    this.on = {
      update: {},
      error: {},
      event: {},
    };
    this.civs = {};
    this.player = {
      name: null,
      civID: null,
    };
  }

  pos(x: number, y: number): number {
    return (y * this.width) + mod(x, this.width)
  }

  getTile(x: number, y: number): Tile {
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
  getTilesInRange(srcX: number, srcY: number, range: number, mode = 0): { [key: string]: [number, number] } {
    // BFS to find all tiles within `range` steps

    const queue: [number, number][] = [];
    queue.push([srcX, srcY]);

    const dst = {};
    dst[this.pos(srcX, srcY)] = 0;

    const paths = {};

    while (queue.length) {
      const [atX, atY] = queue.shift() as [number, number];

      for (const [adjX, adjY] of this.getNeighbors(atX, atY)) {

        if (!(this.pos(adjX, adjY) in dst)) {
          const tile = this.getTile(adjX, adjY);

          const movementCost = mode > -1 ? tile.movementCost[mode] || Infinity : 1;
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

  moveUnit(srcPos: CoordTuple, dstPos: CoordTuple, pathMap: { [key: string]: CoordTuple }, attack: boolean): void { // TODO: phase out CoordTuple type
    console.log(srcPos, dstPos, pathMap);
    let curPos: CoordTuple = dstPos;
    const path: Coords[] = [];
    // const [ x, y ] = curPos;
    // path.push({ x, y });
    while (this.pos(...srcPos) !== this.pos(...curPos)) {
      const [ x, y ] = curPos;
      path.push({ x, y });
      curPos = pathMap[this.pos(...curPos)];
    }
    path.reverse();
    const [ x, y ] = srcPos;
    this.sendActions([
      ['moveUnit', [ { x, y }, path, attack ]]
    ]);
  }

  sendJSON(data: EventMsg): void {
    this.socket.send(JSON.stringify(data));
  }

  handleResponse(data: EventMsg): void {
    if (data.update) {
      for (let i = 0; i < data.update.length; i++) {
        const name = data.update[i][0];
        const args = data.update[i][1];
        console.log(name); // DEBUG
        console.log(args); // DEBUG
        if (this.on.update[name]) {
          this.on.update[name](...args);
        }
      }
    }
    if (data.error) {
      for (let i = 0; i < data.error.length; i++) {
        const name = data.error[i][0];
        const args = data.error[i][1];
        console.error(name); // DEBUG
        console.error(args); // DEBUG
        if (this.on.error[name]) {
          this.on.error[name](...args);
        }
      }
    }
  }

  async login(): Promise<void> {
    let username = localStorage.getItem('username');
    if (!username) {
      const [usr, pass] = await ui.textInputs.loginMenu.prompt(ui.root, false);
      username = usr;
      localStorage.setItem('username', username);
    }
    this.player.name = username;
    this.sendActions([
      ['setPlayer', [this.player.name]],
    ]);
  }

  async connect(): Promise<void> {
    const serverIP = localStorage.getItem('serverIP');
    return new Promise((resolve: () => void/* reject: () => void*/) => {
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
      this.socket.addEventListener('open', (/*event: Event*/) => {
        resolve();
      });
      this.socket.addEventListener('error', async (/*event: Event*/) => {
        const [newIP] = await ui.textInputs.ipSelect.prompt(ui.root, false);
        localStorage.setItem('serverIP', newIP);
        await this.connect();
        resolve();
      });
    });
  }

  async setup(camera: Camera, ui: UI): Promise<void> {

    const readyFn = (isReady: boolean): void => {
      this.sendActions([
        ['ready', [isReady]],
      ]);
    };

    const civPickerFn = (leaderID: number): void => {
      this.sendActions([
        ['setLeader', [leaderID]],
      ]);
    };

    this.on.update.gameList = (gameList: { [key: string]: GameMetadata }): void => {
      if (ui.view === 'gameList') {
        ui.hideAll();

        ui.showGameList(gameList, {
          joinGame: (gameID: string): void => {
            if (gameID !== null) {
              this.sendActions([
                ['joinGame', [gameID]],
              ]);

              ui.hideGameList();
              ui.setView('civPicker');
              ui.showReadyBtn(readyFn);
              ui.showCivPicker(civPickerFn, this.player);
            }
          },
        });
      }
    };

    this.on.update.beginGame = ([width, height]: [number, number]): void => {
      ui.hideReadyBtn();
      ui.hideCivPicker();
      ui.setView('inGame');
      ui.showGameUI(this);
      [this.width, this.height] = [width, height];
      camera.start(this, 1000/60);
    };

    this.on.update.beginTurn = (): void => {
      ui.setTurnState(true);
    };

    this.on.update.setMap = (map: Tile[]): void => {
      this.tiles = map;
    };

    this.on.update.tileUpdate = ({ x, y }: Coords, tile: Tile): void => {
      this.tiles[this.pos(x, y)] = tile;
    };

    this.on.update.leaderPool = (leaders: Leader[], takenLeaders: Leader[], players: {[playerName: string]: Player}): void => {
      ui.leaderPool = leaders;
      ui.takenLeaders = takenLeaders;
      ui.players = {};
      ui.civs = {};
      for (const playerName in players) {
        const player = players[playerName];
        ui.players[playerName] = { ...player, name: playerName };
        if (player.civID !== null) ui.civs[player.civID] = { ...player, name: playerName };
      }
      ui.setView('civPicker');
      ui.showCivPicker(civPickerFn, this.player);
    };

    this.on.update.civData = (civs: { [key: string]: Civ }) => {
      this.civs = civs;
    };

    this.on.update.civID = (civID: number): void => {
      this.player.civID = civID;
    };

    this.on.error.notReady = (reason): void => {
      console.error('Error:', reason);
      ui.hideReadyBtn();
      ui.showReadyBtn(readyFn);
    }

    this.on.error.kicked = async (reason) => {
      console.error('Kicked:', reason);
      ui.hideAll();
      await ui.textAlerts.errorAlert.alert(ui.root, `Kicked: ${reason}`);
      this.sendActions([
        ['getGames', []],
      ]);
    }

    this.on.event.selectUnit = (coords: Coords, unit: Unit): void => {
      ui.showUnitActionsMenu(this, coords, unit);
      ui.showUnitInfoMenu(this, coords, unit);
    }

    this.on.event.deselectUnit = (): void => {
      ui.hideUnitActionsMenu();
      ui.hideUnitInfoMenu();
    }

    await this.connect();

    await this.login();

    this.sendActions([
      ['setPlayer', [world.player.name]],
    ]);

    const mainMenuFns = {
      listGames: () => {
        this.sendActions([
          ['getGames', []],
        ]);
        ui.setView('gameList');
      },
      logout: async () => {
        localStorage.setItem('username', '');
        ui.hideMainMenu();
        await this.login();
        ui.showMainMenu(mainMenuFns);
      },
      changeServer:async () => {
        ui.hideMainMenu();
        const [newIP] = await ui.textInputs.ipSelect.prompt(ui.root, false);
        localStorage.setItem('serverIP', newIP);
        await this.connect();
        ui.showMainMenu(mainMenuFns);
      }
    };

    ui.setView('mainMenu');
    ui.showMainMenu(mainMenuFns);
  }

  sendActions(actions: [string, unknown[]][]): void {
    console.log(this);
    this.sendJSON({ actions });
  }
}
