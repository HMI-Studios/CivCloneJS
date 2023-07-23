interface Civ {
  color: string;
  leader: Leader;
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
  promotionClass: PromotionClass;
  knowledge: KnowledgeMap;
}

interface RangedUnit extends Unit {
  attackRange: number;
}

enum PromotionClass {
  CIVILLIAN,
  MELEE,
  RANGED,
  RECON,
}

type KnowledgeMap = { [name: string]: number };

interface Improvement {
  type: string;
  pillaged: boolean;
  storage: ResourceStorage;
  errand?: Errand;
  metadata?: any;
  isNatural: boolean;
  knowledge: KnowledgeMap;
}

enum ErrandType {
  CONSTRUCTION,
  UNIT_TRAINING,
  RESEARCH,
  // CULTURE,
}

type ErrandAction = {
  type: ErrandType;
  option: string;
  location?: Coords;
  metaData?: any;
};

type Errand = {
  storedThisTurn: Yield;
  turnsToCompletion: number;
  progress: number;
  action: ErrandAction;
};

type ResourceStorage = Yield & {
  capacity: Yield,
}

type Yield = {
  food: number,
  production: number,
};

interface Tile {
  type: string;
  elevation: number;
  knowledges: {
    [name: string]: number,
  },
  improvement: Improvement;
  movementCost: MovementCost;
  unit: Unit;
  yield: Yield,
  owner?: {
    civID: number,
    name: string,
  };
  visible: boolean;
}

interface GameMetadata {
  gameName: string;
  playerCount: number;
  playersConnected: number;
}

type Coords = {
  x: number;
  y: number;
};

type MovementCost = [number, number];

const canTrainUnits: { [improvement: string]: boolean } = {
  'settlement': true,
  'encampment': true,
};

const canResearch: { [improvement: string]: boolean } = {
  'settlement': true,
  'campus': true,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class World {
  tiles: Tile[];
  unitPositions: Coords[];
  unitIndex: number;
  unusedUnits: number[];
  selectedPos: Coords | null;
  height: number;
  width: number;
  socket: WebSocket;
  socketDidOpen: boolean;
  on: { update: WorldEventHandlerMap, error: WorldEventHandlerMap, event: WorldEventHandlerMap };
  civs: { [key: string]: Civ };
  player: Player;
  constructor() {
    this.tiles = [];
    this.unitPositions = [];
    this.unitIndex = 0;
    this.unusedUnits = [];
    this.selectedPos = null;
    this.width;
    this.socket;
    this.socketDidOpen = false;
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

  posIndex({ x, y }: Coords): number {
    return (y * this.width) + mod(x, this.width)
  }

  getTile(pos: Coords): Tile {
    return this.tiles[this.posIndex(pos)] ?? null;
  }

  getNeighbors(pos: Coords, filter = true): Coords[] {
    let tiles: Coords[];
    const {x, y} = pos;

    if (mod(x, 2) === 1) {
      tiles = [
        {x, y: y+1},
        {x: x+1, y: y+1},
        {x: x+1, y},
        {x, y: y-1},
        {x: x-1, y},
        {x: x-1, y: y+1},
      ];
    } else {
      tiles = [
        {x, y: y+1},
        {x: x+1, y},
        {x: x+1, y: y-1},
        {x, y: y-1},
        {x: x-1, y: y-1},
        {x: x-1, y},
      ];
    }

    return filter ? tiles.filter((pos) => !!this.getTile(pos)) : tiles;
  }

  isAdjacent(posA: Coords, posB: Coords): boolean {
    // TODO - possibly optimize this? memoize?
    return this.getNeighbors(posB).map(coord => this.posIndex(coord)).includes(this.posIndex(posA));
  }

  isOcean(tile: Tile): boolean {
    return (
      tile.type === 'ocean' ||
      tile.type === 'frozen_ocean'
    );
  }


  isRiver(tile: Tile): boolean {
    return (
      tile.type === 'river' ||
      tile.type === 'frozen_river'
    );
  }

  canBuildOn(tile: Tile): boolean {
    return (
      tile.owner?.civID === this.player.civID &&
      !this.isOcean(tile) &&
      tile.type !== 'mountain'
    );
  }

  canSettleOn(tile: Tile): boolean {
    return (
      !tile.owner &&
      !this.isOcean(tile) &&
      !this.isRiver(tile) &&
      tile.type !== 'mountain'
    );
  }

  canFarmOn(tile: Tile): boolean {
    // TODO - put this somewhere better
    const farmableTiles = {
      grass_lowlands: true,
      plains: true,
    };
    return farmableTiles[tile.type];
  }

  areSameCoords(pos1: Coords | null, pos2: Coords | null): boolean {
    if (pos1 === null || pos2 === null) return false;
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  // mode: 0 = land unit, 1 = sea unit; -1 = air unit
  getTilesInRange(srcPos: Coords, range: number, mode = 0): { [key: string]: Coords } {
    // BFS to find all tiles within `range` steps

    const queue: Coords[] = [];
    queue.push(srcPos);

    const dst = {};
    dst[this.posIndex(srcPos)] = 0;

    const paths = {};

    while (queue.length) {
      const atPos = queue.shift() as Coords;

      for (const adjPos of this.getNeighbors(atPos)) {

        const tile = this.getTile(adjPos);
        if (tile.unit && tile.unit.civID === this.player.civID) continue;

        const movementCost = mode > -1 ? tile.movementCost[mode] || Infinity : 1;
        if (!(this.posIndex(adjPos) in dst) || dst[this.posIndex(adjPos)] > dst[this.posIndex(atPos)] + movementCost) {
          dst[this.posIndex(adjPos)] = dst[this.posIndex(atPos)] + movementCost;

          if (dst[this.posIndex(adjPos)] <= range) {
            paths[this.posIndex(adjPos)] = atPos;
            queue.push(adjPos);
          }
        }
      }
    }

    return paths;
  }

  findPath(srcPos: Coords, dstPos: Coords, pathMap: { [key: string]: Coords }): Coords[] {
    let curPos: Coords = dstPos;
    const path: Coords[] = [];
    while (this.posIndex(srcPos) !== this.posIndex(curPos)) {
      const { x, y } = curPos;
      path.push({ x, y });
      curPos = pathMap[this.posIndex(curPos)];
    }
    path.reverse();
    return path;
  }

  attack(srcPos: Coords, dstPos: Coords, attacker: RangedUnit) {
    const reachableTiles = this.getTilesInRange(srcPos, attacker.attackRange)
    if (Object.keys(reachableTiles).includes(this.posIndex(dstPos).toString())) {
      this.sendActions([
        ['attack', [ srcPos, dstPos ]]
      ]);
    }
  }

  moveUnit(srcPos: Coords, dstPos: Coords, pathMap: { [key: string]: Coords }, attack: boolean): void {
    console.log(srcPos, dstPos, pathMap);
    const path = this.findPath(srcPos, dstPos, pathMap);
    this.sendActions([
      ['moveUnit', [ srcPos, path, attack ]]
    ]);
  }

  nextUnit(): boolean {
    this.unitIndex = Number(this.unusedUnits.shift());
    if (false) { // TODO - remove me!
      this.unusedUnits.push(this.unitIndex);
    }
    if (this.unitPositions[this.unitIndex]) {
      const unitPos = this.unitPositions[this.unitIndex];
      camera.setPos(camera.toCameraPos(this, unitPos));
      const tile = this.getTile(unitPos);
      this.on.event.selectTile(unitPos, tile);
      camera.deselectUnit(this);
      camera.selectUnit(this, unitPos, tile.unit);
    }
    return this.unusedUnits.length === 0;
  }

  getUnitIndex(pos: Coords): number | null {
    for (let i = 0; i < this.unitPositions.length; i++) {
      const { x, y } = this.unitPositions[i];
      if (x === pos.x && y === pos.y) {
        return i;
      }
    }

    return null;
  }

  fetchImprovementCatalogs(improvement: Improvement, coords: Coords): void {
    if (canTrainUnits[improvement.type]) {
      this.sendActions([[ 'getUnitCatalog', [coords] ]])
    }
    if (canResearch[improvement.type]) {
      this.sendActions([[ 'getKnowledgeCatalog', [coords] ]])
    }
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

  verifyPlayer() {
    this.sendActions([
      ['verifyPlayer', []],
    ]);
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

  async askConnect(secureProtocol = true) {
    const [newIP] = await ui.textInputs.ipSelect.prompt(ui.root, false);
    localStorage.setItem('serverIP', newIP);
    return this.connect(secureProtocol);
  }

  async connect(secureProtocol = true): Promise<void> {
    const serverIP = localStorage.getItem('serverIP');
    return new Promise(async (resolve: () => void, reject: () => void) => {
      console.log(`Connecting to ${`ws${secureProtocol ? 's' : ''}://${serverIP}`}...`);
      const controller = new AbortController();
      try {
        this.socket = new WebSocket(`ws${secureProtocol ? 's' : ''}://${serverIP}`);
        this.socketDidOpen = false;
      } catch (err) {
        console.warn('Invalid address.');
        await this.askConnect().catch(() => reject());
        resolve();
      }
      this.socket.addEventListener('message', (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          console.error('Bad JSON recieved from server');
          return;
        }
        this.handleResponse(data);
      }, { signal: controller.signal });
      this.socket.addEventListener('open', (/*event: Event*/) => {
        this.socketDidOpen = true;
        resolve();
      }, { signal: controller.signal });
      this.socket.addEventListener('close', async (/*event: Event*/) => {
        if (this.socketDidOpen) {
          console.error('Connection Terminated');
          controller.abort();
          try {
            this.on.error.disconnect();
          } catch (err) {
            reject();
          }
        } else if (secureProtocol) {
          console.warn('Retrying with unsecure protocol...');
          await this.connect(false).catch(() => reject());
          resolve();
        } else {
          console.warn('Failed to connect.');
          await this.askConnect().catch(() => reject());
          resolve();
        }
      }, { signal: controller.signal });
      // this.socket.addEventListener('error', async (/*event: Event*/) => {
      //   console.error('Connection Error');
      //   await this.askConnect().catch(() => reject());
      //   resolve();
      // }, { signal: controller.signal });
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
          return: (): void => {
            ui.hideGameList();
            ui.setView('mainMenu');
            ui.showMainMenu(mainMenuFns);
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
      ui.setTurnState(this, true);
      if (this.unitPositions.length === 0) return; // there are no units to for the camera to focus on, return
      const unitPos = this.unitPositions[this.unitIndex];
      camera.setPos(camera.toCameraPos(this, unitPos));
    };

    this.on.update.setMap = (map: Tile[]): void => {
      this.tiles = map;
    };

    this.on.update.tileUpdate = (pos: Coords, tile: Tile): void => {
      this.tiles[this.posIndex(pos)] = tile;
      if (this.selectedPos && pos.x === this.selectedPos.x && pos.y === this.selectedPos.y) {
        if (tile.improvement && !tile.improvement.isNatural) {
          ui.hideSidebarMenu();
          ui.showSidebarMenu(this, pos, tile);
          this.fetchImprovementCatalogs(tile.improvement, pos);
        }
      }
      
    };

    this.on.update.unitPositions = (unitPositions: Coords[]): void => {
      this.unitPositions = unitPositions;
      this.unusedUnits = unitPositions.map((_, index) => index);
    };

    this.on.update.unitPositionUpdate = (startPos: Coords, endPos: Coords): void => {
      const index = this.getUnitIndex(startPos);
      if (index !== null) {
        this.unitPositions[index] = endPos;
        const unit = this.getTile(endPos).unit;
        if (unit && unit.movement === 0) {
          this.unusedUnits.splice(this.unusedUnits.indexOf(index), 1);
        }
        if (this.areSameCoords(camera.selectedUnitPos, startPos)) {
          camera.deselectUnit(this);
          if (unit.movement > 0) {
            camera.selectUnit(this, endPos, unit);
          }
        }
      }
    };

    this.on.update.unitKilled = (unitPos: Coords, unit: Unit): void => {
      const index = this.getUnitIndex(unitPos);
      if (index !== null) this.unitPositions.splice(index, 1);
      camera.deselectUnit(this);
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
    };

    this.on.error.kicked = async (reason) => {
      camera.stop();
      console.error('Kicked:', reason);
      ui.hideAll();
      await ui.textAlerts.errorAlert.alert(ui.root, `Kicked: ${reason}`);
      this.sendActions([
        ['getGames', []],
      ]);
    };

    this.on.error.disconnect = async () => {
      camera.stop();
      ui.hideUnitActionsMenu();
      ui.hideUnitInfoMenu();
      ui.hideTileInfoMenu() 
      ui.hideMainMenu();
      try {
        await ui.textInputs.reconnectMenu.prompt(ui.root, true);
        await this.connect();
        this.verifyPlayer();
        ui.showMainMenu(mainMenuFns);
      } catch (err) {
        await this.askConnect();
        this.verifyPlayer();
        ui.showMainMenu(mainMenuFns);
      }
    };

    this.on.error.invalidUsername = async () => {
      ui.hideAll();
      await this.login();
      ui.showMainMenu(mainMenuFns);
    };

    this.on.event.selectUnit = (coords: Coords, unit: Unit): void => {
      const skipTurn = () => {
        if (camera.selectedUnitPos) {
          const index = this.getUnitIndex(camera.selectedUnitPos) as number;
          camera.deselectUnit(this);
          const metaIndex = this.unusedUnits.indexOf(index);
          if (metaIndex > -1) {
            this.unusedUnits.splice(metaIndex, 1);
          }
        }
      }
      ui.showUnitActionsMenu(this, coords, unit, skipTurn);
      ui.showUnitInfoMenu(this, coords, unit);
    }

    this.on.event.deselectUnit = (selectedUnitPos: Coords | null): void => {
      ui.hideUnitActionsMenu();
      ui.hideUnitInfoMenu();
      if (selectedUnitPos) {
        const index = this.getUnitIndex(selectedUnitPos);
        if (index !== null && this.getTile(selectedUnitPos).unit?.movement > 0 && !this.unusedUnits.includes(index)) {
          this.unusedUnits.push(index);
        }
      }
    }

    this.on.event.selectTile = (coords: Coords, tile: Tile): void => {
      this.selectedPos = coords;
      ui.showTileInfoMenu(this, coords, tile);
      if (tile.improvement && !tile.improvement.isNatural) {
        this.fetchImprovementCatalogs(tile.improvement, coords);
        ui.showSidebarMenu(this, coords, tile);
      } else {
        ui.hideSidebarMenu();
      }
    }

    this.on.event.deselectTile = (): void => {
      this.selectedPos = null;
      ui.hideTileInfoMenu();
      ui.hideSidebarMenu();
    }

    await this.connect().catch(async () => {
      console.error('Connection Failed. Reload page to retry.')
      await ui.textAlerts.reloadAlert.showAsync(ui.root);
      location.reload();
    });

    await this.login();

    const mainMenuFns = {
      createGame: async () => {
        ui.hideMainMenu();

        try {
          const [gameName, playerCount, width, height, seed] = await ui.textInputs.createGame.prompt(ui.root, true);
          this.sendActions([['createGame', [Number(playerCount), {
            width: Number(width),
            height: Number(height),
          }, {
            gameName,
            seed: seed ? Number(seed) : null,
          }]]])
          ui.setView('gameList');
        } catch {
          ui.setView('mainMenu');
          ui.showMainMenu(mainMenuFns);
        }
      },
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
        await this.askConnect();
        this.verifyPlayer();
        ui.showMainMenu(mainMenuFns);
      },
    };

    ui.setView('mainMenu');
    ui.showMainMenu(mainMenuFns);
  }

  sendActions(actions: [string, unknown[]][]): void {
    console.log(this);
    this.sendJSON({ actions });
  }
}
