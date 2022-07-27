var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class World {
    constructor() {
        this.tiles = [];
        this.unitPositions = [];
        this.unitIndex = 0;
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
    pos(x, y) {
        return (y * this.width) + mod(x, this.width);
    }
    getTile(x, y) {
        return this.tiles[this.pos(x, y)] || null;
    }
    getNeighbors(x, y) {
        let tiles;
        if (mod(x, 2) === 1) {
            tiles = [
                [x, y + 1],
                [x + 1, y + 1],
                [x + 1, y],
                [x, y - 1],
                [x - 1, y],
                [x - 1, y + 1],
            ];
        }
        else {
            tiles = [
                [x, y + 1],
                [x + 1, y],
                [x + 1, y - 1],
                [x, y - 1],
                [x - 1, y - 1],
                [x - 1, y],
            ];
        }
        return tiles.filter(([x, y]) => !!this.getTile(x, y));
    }
    // mode: 0 = land unit, 1 = sea unit; -1 = air unit
    getTilesInRange(srcX, srcY, range, mode = 0) {
        // BFS to find all tiles within `range` steps
        const queue = [];
        queue.push([srcX, srcY]);
        const dst = {};
        dst[this.pos(srcX, srcY)] = 0;
        const paths = {};
        while (queue.length) {
            const [atX, atY] = queue.shift();
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
    moveUnit(srcPos, dstPos, pathMap, attack) {
        console.log(srcPos, dstPos, pathMap);
        let curPos = dstPos;
        const path = [];
        // const [ x, y ] = curPos;
        // path.push({ x, y });
        while (this.pos(...srcPos) !== this.pos(...curPos)) {
            const [x, y] = curPos;
            path.push({ x, y });
            curPos = pathMap[this.pos(...curPos)];
        }
        path.reverse();
        const [x, y] = srcPos;
        this.sendActions([
            ['moveUnit', [{ x, y }, path, attack]]
        ]);
    }
    sendJSON(data) {
        this.socket.send(JSON.stringify(data));
    }
    handleResponse(data) {
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
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            let username = localStorage.getItem('username');
            if (!username) {
                const [usr, pass] = yield ui.textInputs.loginMenu.prompt(ui.root, false);
                username = usr;
                localStorage.setItem('username', username);
            }
            this.player.name = username;
            this.sendActions([
                ['setPlayer', [this.player.name]],
            ]);
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const serverIP = localStorage.getItem('serverIP');
            return new Promise((resolve /* reject: () => void*/) => {
                this.socket = new WebSocket(`ws://${serverIP}`);
                this.socket.addEventListener('message', (event) => {
                    let data;
                    try {
                        data = JSON.parse(event.data);
                    }
                    catch (err) {
                        console.error('Bad JSON recieved from server');
                        return;
                    }
                    this.handleResponse(data);
                });
                this.socket.addEventListener('open', ( /*event: Event*/) => {
                    resolve();
                });
                this.socket.addEventListener('error', ( /*event: Event*/) => __awaiter(this, void 0, void 0, function* () {
                    const [newIP] = yield ui.textInputs.ipSelect.prompt(ui.root, false);
                    localStorage.setItem('serverIP', newIP);
                    yield this.connect();
                    resolve();
                }));
            });
        });
    }
    setup(camera, ui) {
        return __awaiter(this, void 0, void 0, function* () {
            const readyFn = (isReady) => {
                this.sendActions([
                    ['ready', [isReady]],
                ]);
            };
            const civPickerFn = (leaderID) => {
                this.sendActions([
                    ['setLeader', [leaderID]],
                ]);
            };
            this.on.update.gameList = (gameList) => {
                if (ui.view === 'gameList') {
                    ui.hideAll();
                    ui.showGameList(gameList, {
                        joinGame: (gameID) => {
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
            this.on.update.beginGame = ([width, height]) => {
                ui.hideReadyBtn();
                ui.hideCivPicker();
                ui.setView('inGame');
                ui.showGameUI(this);
                [this.width, this.height] = [width, height];
                camera.start(this, 1000 / 60);
            };
            this.on.update.beginTurn = () => {
                const { x, y } = this.unitPositions[this.unitIndex];
                [camera.x, camera.y] = camera.toCameraPos(this, x, y);
                ui.setTurnState(true);
            };
            this.on.update.setMap = (map) => {
                this.tiles = map;
            };
            this.on.update.tileUpdate = ({ x, y }, tile) => {
                this.tiles[this.pos(x, y)] = tile;
            };
            this.on.update.unitPositions = (unitPositions) => {
                this.unitPositions = unitPositions;
            };
            this.on.update.unitPositionUpdate = (startPos, endPos) => {
                for (let i = 0; i < this.unitPositions.length; i++) {
                    const { x, y } = this.unitPositions[i];
                    if (x === startPos.x && y === startPos.y) {
                        this.unitPositions[i] = endPos;
                    }
                }
            };
            this.on.update.leaderPool = (leaders, takenLeaders, players) => {
                ui.leaderPool = leaders;
                ui.takenLeaders = takenLeaders;
                ui.players = {};
                ui.civs = {};
                for (const playerName in players) {
                    const player = players[playerName];
                    ui.players[playerName] = Object.assign(Object.assign({}, player), { name: playerName });
                    if (player.civID !== null)
                        ui.civs[player.civID] = Object.assign(Object.assign({}, player), { name: playerName });
                }
                ui.setView('civPicker');
                ui.showCivPicker(civPickerFn, this.player);
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
            };
            this.on.error.kicked = (reason) => __awaiter(this, void 0, void 0, function* () {
                console.error('Kicked:', reason);
                ui.hideAll();
                yield ui.textAlerts.errorAlert.alert(ui.root, `Kicked: ${reason}`);
                this.sendActions([
                    ['getGames', []],
                ]);
            });
            this.on.event.selectUnit = (coords, unit) => {
                ui.showUnitActionsMenu(this, coords, unit);
                ui.showUnitInfoMenu(this, coords, unit);
            };
            this.on.event.selectTile = (coords, tile) => {
                ui.showTileInfoMenu(this, coords, tile);
            };
            this.on.event.deselectUnit = () => {
                ui.hideUnitActionsMenu();
                ui.hideUnitInfoMenu();
            };
            this.on.event.deselectTile = () => {
                ui.hideTileInfoMenu();
            };
            yield this.connect();
            yield this.login();
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
                logout: () => __awaiter(this, void 0, void 0, function* () {
                    localStorage.setItem('username', '');
                    ui.hideMainMenu();
                    yield this.login();
                    ui.showMainMenu(mainMenuFns);
                }),
                changeServer: () => __awaiter(this, void 0, void 0, function* () {
                    ui.hideMainMenu();
                    const [newIP] = yield ui.textInputs.ipSelect.prompt(ui.root, false);
                    localStorage.setItem('serverIP', newIP);
                    yield this.connect();
                    ui.showMainMenu(mainMenuFns);
                })
            };
            ui.setView('mainMenu');
            ui.showMainMenu(mainMenuFns);
        });
    }
    sendActions(actions) {
        console.log(this);
        this.sendJSON({ actions });
    }
}
//# sourceMappingURL=world.js.map