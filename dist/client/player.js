const unitActionsTable = {
    'settler': ['settleCity'],
    'scout': [],
    'builder': ['buildFarm'],
};
const unitActionsFnTable = {
    'settleCity': (pos) => {
        // TODO: bring up settle-city menu and ask for city name
        const name = 'name';
        return ['settleCity', [pos, name]];
    },
    'buildFarm': (pos) => {
        return ['buildImprovement', [pos, 'farm']];
    },
};
const unitActionsAvailabilityTable = {
    'settleCity': (world, pos) => {
        const tile = world.getTile(pos.x, pos.y);
        return tile.type === 'plains';
    },
    'buildFarm': (world, pos) => {
        const tile = world.getTile(pos.x, pos.y);
        return tile.type === 'plains';
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UI {
    constructor() {
        const rootElement = document.getElementById('UI');
        if (!rootElement)
            throw 'Root UI Element Missing';
        this.root = rootElement;
        this.elements = {
            readyBtn: this.createElement('button', 'readyBtn'),
            centerModal: this.createElement('div', 'centerModal'),
            civPicker: this.createElement('ul', 'civList'),
            mainMenu: this.createElement('div', 'mainMenu'),
            gameList: this.createElement('div', 'gameList'),
            unitActionsMenu: this.createElement('div', 'unitActionsMenu'),
            unitInfoMenu: this.createElement('div', 'unitInfoMenu'),
            tileInfoMenu: this.createElement('div', 'tileInfoMenu'),
        };
        this.leaderPool = [];
        this.takenLeaders = [];
        this.players = {};
        this.civs = {};
        this.turnActive = false;
        this.buttons = {
            mainBtn: new Button(this.createElement('button', 'mainActionBtn'), {
                text: 'MainBtn',
            }),
        };
        this.textInputs = {
            loginMenu: new TextInput({
                query: 'Please log in:',
                fields: [
                    ['Username', 'username here...'],
                    ['Password', 'password here...', 'password'],
                ]
            }),
            ipSelect: new TextInput({
                query: 'Enter Server Address:',
                fields: [
                    ['Address'],
                ]
            }),
            createGame: new TextInput({
                query: 'New Game:',
                fields: [
                    ['Game Name'],
                    ['# of players', undefined, 'number'],
                    ['Map Width', undefined, 'number'],
                    ['Map Height', undefined, 'number'],
                    ['Seed', 'Leave blank for random seed', 'number'],
                ]
            }),
        };
        this.textAlerts = {
            errorAlert: new TextAlert({
                message: 'Error',
            }),
        };
    }
    setView(view) {
        this.view = view;
    }
    hideAll() {
        for (const widgetName in this.buttons) {
            this.buttons[widgetName].hide();
        }
        for (const widgetName in this.textInputs) {
            this.textInputs[widgetName].hide();
        }
        for (const widgetName in this.textAlerts) {
            this.textAlerts[widgetName].hide();
        }
        // TODO: generalize this
        this.hideReadyBtn();
        this.hideCivPicker();
        this.hideGameList();
        this.hideMainMenu();
    }
    createElement(type, className) {
        const element = document.createElement(type);
        if (className) {
            element.className = className;
        }
        return element;
    }
    createCivItem(leader) {
        const civItem = this.createElement('li', 'civItem');
        civItem.style.backgroundColor = leader.color;
        const nameText = this.createElement('span');
        nameText.innerHTML = `${leader.name}` + (leader.civID !== null ? ` - Selected by ${this.civs[leader.civID].name}` : '');
        civItem.appendChild(nameText);
        return civItem;
    }
    setTurnState(world, state) {
        this.turnActive = state;
        if (state) {
            this.buttons.mainBtn.bindCallback(() => {
                const isFinished = world.nextUnit();
                if (isFinished) {
                    this.buttons.mainBtn.bindActionCallback(world.sendActions.bind(world));
                    this.buttons.mainBtn.setAction(['turnFinished', [true]]);
                    this.buttons.mainBtn.setText('Finish Turn');
                }
            });
            this.buttons.mainBtn.setText('Next Unit');
            // automatically select the first unit by "pressing" the button
            this.buttons.mainBtn.element.click();
        }
        else {
            this.buttons.mainBt.unbindCallback();
            this.buttons.mainBtn.setText('Waiting...');
        }
    }
    showGameUI(world) {
        for (const buttonID in this.buttons) {
            const button = this.buttons[buttonID];
            button.bindActionCallback(world.sendActions.bind(world));
            this.root.appendChild(button.element);
        }
    }
    showCivPicker(callback, self) {
        this.elements.civPicker.innerHTML = '';
        const selectedLeaderSlot = this.createElement('div', 'selectedLeader');
        this.elements.civPicker.appendChild(selectedLeaderSlot);
        for (let i = 0; i < this.leaderPool.length; i++) {
            const leader = this.leaderPool[i];
            const civItem = this.createCivItem(leader);
            civItem.onclick = () => {
                callback(leader.id);
            };
            this.elements.civPicker.appendChild(civItem);
        }
        for (let i = 0; i < this.takenLeaders.length; i++) {
            const leader = this.takenLeaders[i];
            const civItem = this.createCivItem(leader);
            civItem.onclick = () => {
                alert('That leader is already selected!');
            };
            if (leader.civID === self.civID) {
                selectedLeaderSlot.appendChild(civItem);
            }
            else {
                this.elements.civPicker.appendChild(civItem);
            }
        }
        this.elements.centerModal.appendChild(this.elements.civPicker);
        this.root.appendChild(this.elements.centerModal);
    }
    hideCivPicker() {
        this.elements.civPicker.remove();
        this.elements.centerModal.remove();
    }
    showReadyBtn(callback) {
        let btnState = false;
        this.elements.readyBtn.innerText = 'Ready';
        this.elements.readyBtn.onclick = () => {
            btnState = !btnState;
            if (btnState) {
                this.elements.readyBtn.innerText = 'Waiting';
            }
            else {
                this.elements.readyBtn.innerText = 'Ready';
            }
            callback(btnState);
        };
        this.root.appendChild(this.elements.readyBtn);
    }
    hideReadyBtn() {
        this.elements.readyBtn.remove();
    }
    showMainMenu(callbacks) {
        this.elements.mainMenu.innerHTML = '';
        const titleHeading = this.createElement('h1');
        titleHeading.innerText = 'CivCloneJS';
        this.elements.mainMenu.appendChild(titleHeading);
        const createGameBtn = this.createElement('button');
        createGameBtn.innerText = 'New Game';
        createGameBtn.onclick = () => callbacks.createGame();
        this.elements.mainMenu.appendChild(createGameBtn);
        const gameListBtn = this.createElement('button');
        gameListBtn.innerText = 'List Games';
        gameListBtn.onclick = () => callbacks.listGames();
        this.elements.mainMenu.appendChild(gameListBtn);
        const changeServerBtn = this.createElement('button');
        changeServerBtn.innerText = 'Switch Server';
        changeServerBtn.onclick = () => callbacks.changeServer();
        this.elements.mainMenu.appendChild(changeServerBtn);
        const logoutBtn = this.createElement('button');
        logoutBtn.innerText = 'Logout';
        logoutBtn.onclick = () => callbacks.logout();
        this.elements.mainMenu.appendChild(logoutBtn);
        this.elements.centerModal.appendChild(this.elements.mainMenu);
        this.root.appendChild(this.elements.centerModal);
    }
    hideMainMenu() {
        this.elements.mainMenu.remove();
        this.elements.centerModal.remove();
    }
    showGameList(gameList, callbacks) {
        this.elements.gameList.innerHTML = '';
        const titleHeading = this.createElement('h1');
        titleHeading.innerText = 'Active Games';
        this.elements.gameList.appendChild(titleHeading);
        const returnBtn = this.createElement('button');
        returnBtn.onclick = () => callbacks.return();
        returnBtn.innerText = 'Return to Main Menu';
        this.elements.gameList.appendChild(returnBtn);
        for (const gameID in gameList) {
            const { gameName, playersConnected, playerCount } = gameList[gameID];
            const gameBtn = this.createElement('button');
            gameBtn.innerText = `${gameName} - ${playersConnected} / ${playerCount} players connected`;
            gameBtn.onclick = () => callbacks.joinGame(gameID);
            this.elements.gameList.appendChild(gameBtn);
        }
        this.elements.centerModal.appendChild(this.elements.gameList);
        this.root.appendChild(this.elements.centerModal);
    }
    hideGameList() {
        this.elements.gameList.remove();
        this.elements.centerModal.remove();
    }
    showUnitActionsMenu(world, pos, unit) {
        for (const action of unitActionsTable[unit.type]) {
            if (!unitActionsAvailabilityTable[action](world, pos)) {
                continue;
            }
            const actionBtn = new Button(this.createElement('button'), {
                text: action,
                action: unitActionsFnTable[action](pos),
            });
            actionBtn.bindActionCallback(world.sendActions.bind(world));
            this.elements.unitActionsMenu.appendChild(actionBtn.element);
        }
        this.root.appendChild(this.elements.unitActionsMenu);
    }
    hideUnitActionsMenu() {
        this.elements.unitActionsMenu.remove();
        this.elements.unitActionsMenu.innerHTML = '';
    }
    showUnitInfoMenu(world, pos, unit) {
        const unitName = this.createElement('h2', 'infoSpan');
        unitName.innerText = unit.type[0].toUpperCase() + unit.type.substring(1);
        const unitHP = this.createElement('span', 'infoSpan');
        unitHP.innerText = `HP: ${unit.hp}%`;
        const unitMovement = this.createElement('span', 'infoSpan');
        unitMovement.innerText = `Movement: ${unit.movement}`;
        this.elements.unitInfoMenu.appendChild(unitName);
        this.elements.unitInfoMenu.appendChild(unitHP);
        this.elements.unitInfoMenu.appendChild(unitMovement);
        this.root.appendChild(this.elements.unitInfoMenu);
    }
    hideUnitInfoMenu() {
        this.elements.unitInfoMenu.remove();
        this.elements.unitInfoMenu.innerHTML = '';
    }
    showTileInfoMenu(world, pos, tile) {
        this.elements.tileInfoMenu.innerHTML = '';
        const tileType = this.createElement('span', 'infoSpan');
        tileType.innerText = `Type: ${tile.type}`;
        const tileMovementCost = this.createElement('span', 'infoSpan');
        tileMovementCost.innerText = `Movement Cost: ${tile.movementCost[0]} - ${tile.movementCost[1]}`;
        const tileElevation = this.createElement('span', 'infoSpan');
        tileElevation.innerText = `Elevation: ${Math.round(tile.elevation)}`;
        this.elements.tileInfoMenu.appendChild(tileType);
        this.elements.tileInfoMenu.appendChild(tileMovementCost);
        this.elements.tileInfoMenu.appendChild(tileElevation);
        this.root.appendChild(this.elements.tileInfoMenu);
    }
    hideTileInfoMenu() {
        this.elements.tileInfoMenu.remove();
        this.elements.tileInfoMenu.innerHTML = '';
    }
}
//# sourceMappingURL=player.js.map