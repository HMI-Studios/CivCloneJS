var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var DomainType;
(function (DomainType) {
    DomainType[DomainType["CIVILIZATION"] = 0] = "CIVILIZATION";
    DomainType[DomainType["CITY"] = 1] = "CITY";
})(DomainType || (DomainType = {}));
var PromotionClass;
(function (PromotionClass) {
    PromotionClass[PromotionClass["CIVILLIAN"] = 0] = "CIVILLIAN";
    PromotionClass[PromotionClass["MELEE"] = 1] = "MELEE";
    PromotionClass[PromotionClass["RANGED"] = 2] = "RANGED";
    PromotionClass[PromotionClass["RECON"] = 3] = "RECON";
})(PromotionClass || (PromotionClass = {}));
var WallType;
(function (WallType) {
    WallType[WallType["CLIFF"] = 0] = "CLIFF";
    WallType[WallType["WALL"] = 1] = "WALL";
    WallType[WallType["OPEN_GATE"] = 2] = "OPEN_GATE";
    WallType[WallType["CLOSED_GATE"] = 3] = "CLOSED_GATE";
    WallType[WallType["WALL_RUIN"] = 4] = "WALL_RUIN";
})(WallType || (WallType = {}));
var ErrandType;
(function (ErrandType) {
    ErrandType[ErrandType["CONSTRUCTION"] = 0] = "CONSTRUCTION";
    ErrandType[ErrandType["UNIT_TRAINING"] = 1] = "UNIT_TRAINING";
    ErrandType[ErrandType["RESEARCH"] = 2] = "RESEARCH";
    // CULTURE,
})(ErrandType || (ErrandType = {}));
const canTrainUnits = {
    'settlement': true,
    'encampment': true,
};
const canResearch = {
    'settlement': true,
    'campus': true,
};
const getCoordsDial = ({ x, y }) => {
    return mod(x, 2) === 1 ?
        [
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 },
            { x: x + 1, y: y },
            { x: x, y: y - 1 },
            { x: x - 1, y: y },
            { x: x - 1, y: y + 1 },
        ] :
        [
            { x: x, y: y + 1 },
            { x: x + 1, y: y },
            { x: x + 1, y: y - 1 },
            { x: x, y: y - 1 },
            { x: x - 1, y: y - 1 },
            { x: x - 1, y: y },
        ];
};
const makeCityID = (id) => ({
    subID: id,
    type: DomainType.CITY,
});
const makeCivID = (id) => ({
    subID: id,
    type: DomainType.CIVILIZATION,
});
const isCiv = (domain) => (domain.templateID !== undefined);
const compareDomainIDs = (a, b) => a !== undefined && b !== undefined && a.type === b.type && a.subID === b.subID;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class World {
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
        this.listeners = {};
        this.civs = {};
        this.leaders = {};
        this.player = {
            name: null,
            leaderID: null,
        };
        this.tradeRoutes = [];
    }
    posIndex({ x, y }) {
        return (y * this.width) + mod(x, this.width);
    }
    getTile(pos) {
        var _a;
        return (_a = this.tiles[this.posIndex(pos)]) !== null && _a !== void 0 ? _a : null;
    }
    getNeighbors(pos, filter = true) {
        let tiles;
        const { x, y } = pos;
        if (mod(x, 2) === 1) {
            tiles = [
                { x, y: y + 1 },
                { x: x + 1, y: y + 1 },
                { x: x + 1, y },
                { x, y: y - 1 },
                { x: x - 1, y },
                { x: x - 1, y: y + 1 },
            ];
        }
        else {
            tiles = [
                { x, y: y + 1 },
                { x: x + 1, y },
                { x: x + 1, y: y - 1 },
                { x, y: y - 1 },
                { x: x - 1, y: y - 1 },
                { x: x - 1, y },
            ];
        }
        return filter ? tiles.filter((pos) => !!this.getTile(pos)) : tiles;
    }
    getDirection(origin, target) {
        const coordsDial = getCoordsDial(origin);
        let direction = -1;
        coordsDial.forEach((coords, i) => {
            if (this.areSameCoords(coords, target)) {
                direction = i;
            }
        });
        return direction;
    }
    isAdjacent(posA, posB) {
        // TODO - possibly optimize this? memoize?
        return this.getNeighbors(posB).map(coord => this.posIndex(coord)).includes(this.posIndex(posA));
    }
    adjacentify(x1, x2) {
        if (mod(x1, this.width) === this.width - 1 && mod(x2, this.width) === 0)
            return x1 + 1;
        if (mod(x1, this.width) === 0 && mod(x2, this.width) === this.width - 1)
            return x1 - 1;
        if (mod(x1, this.width) > mod(x2, this.width))
            return x1 - 1;
        if (mod(x1, this.width) < mod(x2, this.width))
            return x1 + 1;
        return x1;
    }
    domainMatchesID(domain, domainID) {
        if (isCiv(domain)) {
            return domainID.type === DomainType.CIVILIZATION && domain.id === domainID.subID;
        }
        else {
            return domainID.type === DomainType.CITY && domain.id === domainID.subID;
        }
    }
    playerControlsTile(tile) {
        const { owner } = tile;
        if (this.player.leaderID === null || !owner)
            return false;
        const leader = this.leaders[this.player.leaderID];
        return leader.domains.some(domain => this.domainMatchesID(domain, makeCityID(owner.id)) || (owner.civID && this.domainMatchesID(domain, owner.civID)));
    }
    playerControlsUnit(unit) {
        if (this.player.leaderID === null)
            return false;
        const leader = this.leaders[this.player.leaderID];
        return leader.domains.some(domain => this.domainMatchesID(domain, unit.domainID));
    }
    isOcean(tile) {
        return (tile.type === 'ocean' ||
            tile.type === 'frozen_ocean');
    }
    isRiver(tile) {
        return (tile.type === 'river' ||
            tile.type === 'frozen_river');
    }
    canBuildOn(tile) {
        return (this.playerControlsTile(tile) &&
            !this.isOcean(tile) &&
            tile.type !== 'mountain');
    }
    canSettleOn(tile) {
        return (!tile.owner &&
            !this.isOcean(tile) &&
            !this.isRiver(tile) &&
            tile.type !== 'mountain');
    }
    canFarmOn(tile) {
        // TODO - put this somewhere better
        const farmableTiles = {
            grass_lowlands: true,
            plains: true,
        };
        return farmableTiles[tile.type];
    }
    areSameCoords(pos1, pos2) {
        if (pos1 === null || pos2 === null)
            return false;
        return mod(pos1.x, this.width) === mod(pos2.x, this.width) && pos1.y === pos2.y;
    }
    // mode: 0 = land unit, 1 = sea unit; -1 = air unit
    getTilesInRange(srcPos, range, mode = 0) {
        // BFS to find all tiles within `range` steps
        const queue = [];
        queue.push(srcPos);
        const dst = {};
        dst[this.posIndex(srcPos)] = 0;
        const paths = {};
        while (queue.length) {
            const atPos = queue.shift();
            for (const adjPos of this.getNeighbors(atPos)) {
                const tile = this.getTile(adjPos);
                const atTile = this.getTile(atPos);
                if (tile.unit && this.playerControlsUnit(tile.unit))
                    continue;
                const adjDirection = this.getDirection(adjPos, atPos);
                const atDirection = this.getDirection(atPos, adjPos);
                if (tile.walls[adjDirection] && tile.walls[adjDirection].type !== WallType.OPEN_GATE)
                    continue;
                if (atTile.walls[atDirection] && atTile.walls[atDirection].type !== WallType.OPEN_GATE)
                    continue;
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
    findPath(srcPos, dstPos, pathMap) {
        let curPos = dstPos;
        const path = [];
        while (this.posIndex(srcPos) !== this.posIndex(curPos)) {
            const { x, y } = curPos;
            path.push({ x, y });
            curPos = pathMap[this.posIndex(curPos)];
        }
        path.reverse();
        return path;
    }
    attack(srcPos, dstPos, attacker) {
        const reachableTiles = this.getTilesInRange(srcPos, attacker.attackRange);
        if (Object.keys(reachableTiles).includes(this.posIndex(dstPos).toString())) {
            this.sendActions([
                ['attack', [srcPos, dstPos]]
            ]);
        }
    }
    moveUnit(srcPos, dstPos, pathMap, attack) {
        console.log(srcPos, dstPos, pathMap);
        const path = this.findPath(srcPos, dstPos, pathMap);
        this.sendActions([
            ['moveUnit', [srcPos, path, attack]]
        ]);
    }
    nextUnit() {
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
    getUnitIndex(pos) {
        for (let i = 0; i < this.unitPositions.length; i++) {
            const { x, y } = this.unitPositions[i];
            if (x === pos.x && y === pos.y) {
                return i;
            }
        }
        return null;
    }
    fetchImprovementCatalogs(improvement, coords) {
        if (canTrainUnits[improvement.type]) {
            this.sendActions([['getUnitCatalog', [coords]]]);
        }
        if (canResearch[improvement.type]) {
            this.sendActions([['getKnowledgeCatalog', [coords]]]);
        }
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
    verifyPlayer() {
        this.sendActions([
            ['verifyPlayer', []],
        ]);
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
    askConnect(secureProtocol = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const [newIP] = yield ui.textInputs.ipSelect.prompt(ui.root, false);
            localStorage.setItem('serverIP', newIP);
            return this.connect(secureProtocol);
        });
    }
    connect(secureProtocol = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const serverIP = localStorage.getItem('serverIP');
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                console.log(`Connecting to ${`ws${secureProtocol ? 's' : ''}://${serverIP}`}...`);
                const controller = new AbortController();
                try {
                    this.socket = new WebSocket(`ws${secureProtocol ? 's' : ''}://${serverIP}`);
                    this.socketDidOpen = false;
                }
                catch (err) {
                    console.warn('Invalid address.');
                    yield this.askConnect().catch(() => reject());
                    resolve();
                }
                this.socket.addEventListener('message', (event) => {
                    let data;
                    /* Handshake */
                    if (event.data === 'state_version') {
                        return this.socket.send(`html,${VERSION.join(',')}`);
                    }
                    else if (event.data === 'max_packet_size') {
                        return this.socket.send('-1');
                    }
                    else if (event.data === 'handshake_complete') {
                        return resolve();
                    }
                    try {
                        data = JSON.parse(event.data);
                    }
                    catch (err) {
                        console.error('Bad JSON recieved from server');
                        return;
                    }
                    this.handleResponse(data);
                }, { signal: controller.signal });
                this.socket.addEventListener('open', ( /*event: Event*/) => {
                    this.socketDidOpen = true;
                }, { signal: controller.signal });
                this.socket.addEventListener('close', ( /*event: Event*/) => __awaiter(this, void 0, void 0, function* () {
                    if (this.socketDidOpen) {
                        console.error('Connection Terminated');
                        controller.abort();
                        try {
                            this.on.error.disconnect();
                        }
                        catch (err) {
                            reject();
                        }
                    }
                    else if (secureProtocol) {
                        console.warn('Retrying with unsecure protocol...');
                        yield this.connect(false).catch(() => reject());
                        resolve();
                    }
                    else {
                        console.warn('Failed to connect.');
                        yield this.askConnect().catch(() => reject());
                        resolve();
                    }
                }), { signal: controller.signal });
                // this.socket.addEventListener('error', async (/*event: Event*/) => {
                //   console.error('Connection Error');
                //   await this.askConnect().catch(() => reject());
                //   resolve();
                // }, { signal: controller.signal });
            }));
        });
    }
    setup(camera, ui) {
        return __awaiter(this, void 0, void 0, function* () {
            const readyFn = (isReady) => {
                this.sendActions([
                    ['ready', [isReady]],
                ]);
            };
            const civPickerFn = (civTemplateID) => {
                this.sendActions([
                    ['selectCiv', [civTemplateID]],
                ]);
            };
            this.on.update.debug = (data) => {
                try {
                    console.log(JSON.parse(data));
                }
                catch (err) {
                    console.log(data);
                }
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
                        return: () => {
                            ui.hideGameList();
                            ui.setView('mainMenu');
                            ui.showMainMenu(mainMenuFns);
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
                ui.setTurnState(this, true);
                if (this.unitPositions.length === 0)
                    return; // there are no units to for the camera to focus on, return
                const unitPos = this.unitPositions[this.unitIndex];
                camera.setPos(camera.toCameraPos(this, unitPos));
            };
            this.on.update.setMap = (map) => {
                this.tiles = map;
            };
            this.on.update.tileUpdate = (pos, tile) => {
                this.tiles[this.posIndex(pos)] = tile;
                if (this.selectedPos && pos.x === this.selectedPos.x && pos.y === this.selectedPos.y) {
                    if (tile.improvement && !tile.improvement.isNatural) {
                        ui.hideSidebarMenu();
                        ui.showSidebarMenu(this, pos, tile);
                        this.fetchImprovementCatalogs(tile.improvement, pos);
                    }
                }
                if (this.areSameCoords(camera.selectedUnitPos, pos)) {
                    const unit = this.getTile(pos).unit;
                    if (unit) {
                        camera.deselectUnit(this);
                        if (unit.movement > 0) {
                            camera.selectUnit(this, pos, unit);
                        }
                    }
                }
            };
            this.on.update.unitPositions = (unitPositions) => {
                this.unitPositions = unitPositions;
                this.unusedUnits = unitPositions.map((_, index) => index);
            };
            this.on.update.unitPositionUpdate = (startPos, endPos) => {
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
            this.on.update.unitKilled = (unitPos, unit) => {
                const index = this.getUnitIndex(unitPos);
                if (index !== null)
                    this.unitPositions.splice(index, 1);
                camera.deselectUnit(this);
            };
            this.on.update.civPool = (civPool, civTemplates, players) => {
                ui.civPool = civPool;
                ui.civTemplates = civTemplates;
                ui.players = {};
                ui.leaders = {};
                for (const playerName in players) {
                    const player = players[playerName];
                    ui.players[playerName] = Object.assign(Object.assign({}, player), { name: playerName });
                    if (player.leaderID !== null)
                        ui.leaders[player.leaderID] = Object.assign(Object.assign({}, player), { name: playerName });
                }
                ui.setView('civPicker');
                ui.showCivPicker(civPickerFn, this.player);
            };
            this.on.update.leaderData = (leaders) => {
                this.leaders = leaders;
            };
            this.on.update.civData = (civs) => {
                this.civs = civs;
            };
            this.on.update.leaderID = (leaderID) => {
                this.player.leaderID = leaderID;
            };
            this.on.update.leaderUpdate = (leaderID, leaderData) => {
                this.leaders[leaderID] = leaderData;
            };
            this.on.update.tradersList = (tradeRoutes) => {
                this.tradeRoutes = tradeRoutes;
            };
            this.on.error.notReady = (reason) => {
                console.error('Error:', reason);
                ui.hideReadyBtn();
                ui.showReadyBtn(readyFn);
            };
            this.on.error.kicked = (reason) => __awaiter(this, void 0, void 0, function* () {
                camera.stop();
                console.error('Kicked:', reason);
                ui.hideAll();
                yield ui.textAlerts.errorAlert.alert(ui.root, `Kicked: ${reason}`);
                this.sendActions([
                    ['getGames', []],
                ]);
            });
            this.on.error.disconnect = () => __awaiter(this, void 0, void 0, function* () {
                camera.stop();
                ui.hideUnitActionsMenu();
                ui.hideUnitInfoMenu();
                ui.hideTileInfoMenu();
                ui.hideMainMenu();
                try {
                    yield ui.textInputs.reconnectMenu.prompt(ui.root, true);
                    yield this.connect();
                    this.verifyPlayer();
                    ui.showMainMenu(mainMenuFns);
                }
                catch (err) {
                    yield this.askConnect();
                    this.verifyPlayer();
                    ui.showMainMenu(mainMenuFns);
                }
            });
            this.on.error.invalidUsername = () => __awaiter(this, void 0, void 0, function* () {
                ui.hideAll();
                yield this.login();
                ui.showMainMenu(mainMenuFns);
            });
            this.on.event.selectUnit = (coords, unit) => {
                const skipTurn = () => {
                    if (camera.selectedUnitPos) {
                        const index = this.getUnitIndex(camera.selectedUnitPos);
                        camera.deselectUnit(this);
                        const metaIndex = this.unusedUnits.indexOf(index);
                        if (metaIndex > -1) {
                            this.unusedUnits.splice(metaIndex, 1);
                        }
                    }
                };
                ui.showUnitActionsMenu(this, coords, unit, skipTurn);
                ui.showUnitInfoMenu(this, coords, unit);
            };
            this.on.event.deselectUnit = (selectedUnitPos) => {
                var _a;
                ui.hideUnitActionsMenu();
                ui.hideUnitInfoMenu();
                if (selectedUnitPos) {
                    const index = this.getUnitIndex(selectedUnitPos);
                    if (index !== null && ((_a = this.getTile(selectedUnitPos).unit) === null || _a === void 0 ? void 0 : _a.movement) > 0 && !this.unusedUnits.includes(index)) {
                        this.unusedUnits.push(index);
                    }
                }
            };
            this.on.event.selectTile = (coords, tile) => {
                this.selectedPos = coords;
                if (this.listeners.selectTile) {
                    this.listeners.selectTile(coords, tile);
                    this.listeners.selectTile = null;
                    return;
                }
                ui.showTileInfoMenu(this, coords, tile);
                if (tile.improvement && !tile.improvement.isNatural) {
                    this.fetchImprovementCatalogs(tile.improvement, coords);
                    ui.showSidebarMenu(this, coords, tile);
                }
                else {
                    ui.hideSidebarMenu();
                }
            };
            this.on.event.deselectTile = () => {
                this.selectedPos = null;
                ui.hideTileInfoMenu();
                ui.hideSidebarMenu();
            };
            this.on.event.buildWall = (pos, callback) => {
                camera.deselectUnit(this);
                const neighbors = this.getNeighbors(pos);
                const newHighlightedTiles = {};
                for (const pos of neighbors) {
                    newHighlightedTiles[this.posIndex(pos)] = pos;
                }
                camera.highlightedTiles = newHighlightedTiles;
                this.listeners.selectTile = (coords, tile) => {
                    callback(coords, tile);
                    camera.highlightedTiles = {};
                };
            };
            this.on.event.showTradeRoutes = () => {
                this.sendActions([['getTraders', []]]);
                camera.showTradeRoutes = true;
            };
            yield this.connect().catch(() => __awaiter(this, void 0, void 0, function* () {
                console.error('Connection Failed. Reload page to retry.');
                yield ui.textAlerts.reloadAlert.showAsync(ui.root);
                location.reload();
            }));
            yield this.login();
            this.verifyPlayer();
            const mainMenuFns = {
                createGame: () => __awaiter(this, void 0, void 0, function* () {
                    ui.hideMainMenu();
                    try {
                        const [gameName, playerCount, width, height, seed] = yield ui.textInputs.createGame.prompt(ui.root, true);
                        this.sendActions([['createGame', [Number(playerCount), {
                                        width: Number(width),
                                        height: Number(height),
                                    }, {
                                        gameName,
                                        seed: seed ? Number(seed) : null,
                                    }]]]);
                        ui.setView('gameList');
                    }
                    catch (_a) {
                        ui.setView('mainMenu');
                        ui.showMainMenu(mainMenuFns);
                    }
                }),
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
                    yield this.askConnect();
                    this.verifyPlayer();
                    ui.showMainMenu(mainMenuFns);
                }),
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