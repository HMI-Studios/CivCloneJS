// eslint-disable-next-line @typescript-eslint/no-unused-vars
class World {
    constructor(playerName) {
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
    moveUnit(srcPos, dstPos, pathMap) {
        console.log(srcPos, dstPos, pathMap);
        let curPos = dstPos;
        const path = [];
        const [x, y] = curPos;
        path.push({ x, y });
        while (this.pos(...srcPos) !== this.pos(...curPos)) {
            curPos = pathMap[this.pos(...curPos)];
            const [x, y] = curPos;
            path.push({ x, y });
        }
        path.reverse();
        const actions = [];
        for (let i = 0; i < path.length - 1; i++) {
            actions.push(['moveUnit', [path[i], path[i + 1]]]);
        }
        this.sendActions(actions);
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
            const gameTitles = [];
            // const defaultGame = Object.keys(gameList)[0];
            for (const gameID in gameList) {
                gameTitles.push(`#${gameID} - ${gameList[gameID].gameName}`);
            }
            const gameID = '0'; //prompt(`Select game to join:\n${gameTitles.join('\n')}`, defaultGame);
            if (gameID !== null) {
                this.sendActions([
                    ['joinGame', [gameID]],
                ]);
                ui.showReadyBtn(readyFn);
                ui.showCivPicker(civPickerFn);
            }
        };
        this.on.update.beginGame = ([width, height]) => {
            ui.hideReadyBtn();
            ui.hideCivPicker();
            ui.showGameUI(this);
            [this.width, this.height] = [width, height];
            camera.start(this, 1000 / 60);
        };
        this.on.update.setMap = (map) => {
            console.log(map);
            this.tiles = map;
        };
        this.on.update.tileUpdate = ({ x, y }, tile) => {
            this.tiles[this.pos(x, y)] = tile;
        };
        this.on.update.colorPool = (colors) => {
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
        };
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
        });
    }
    sendActions(actions) {
        this.sendJSON({ actions });
    }
}
//# sourceMappingURL=world.js.map