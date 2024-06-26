const errandTypeTable = {
    0: 'improvement',
    1: 'unit',
    2: 'knowledge',
    3: 'civic',
};
const commonUnitActions = ['openGate', 'closeGate'];
const unitActionsTable = {
    'settler': [...commonUnitActions, 'settleCity'],
    'scout': [...commonUnitActions],
    'builder': [...commonUnitActions, 'build', 'buildWall', 'buildGate'],
    'warrior': [...commonUnitActions],
    'slinger': [...commonUnitActions],
    'archer': [...commonUnitActions],
    'spy': [...commonUnitActions, 'stealKnowledge', 'cloak', 'decloak'],
};
const unitActionsFnTable = {
    'settleCity': (pos) => {
        // TODO: bring up settle-city menu and ask for city name
        const name = prompt(`${translate('menu.city.prompt')}:`);
        return ['settleCity', [pos, name]];
    },
    'build': (pos, improvement) => {
        return ['buildImprovement', [pos, improvement]];
    },
    'buildWall': (pos, towards, type) => {
        return ['buildWall', [pos, towards, type]];
    },
    'cloak': (pos) => {
        return ['setCloak', [pos, true]];
    },
    'decloak': (pos) => {
        return ['setCloak', [pos, false]];
    },
    'openGate': (pos, towards) => {
        return ['setGateOpen', [pos, towards, true]];
    },
    'closeGate': (pos, towards) => {
        return ['setGateOpen', [pos, towards, false]];
    },
};
const unitActionsAvailabilityTable = {
    'settleCity': (world, pos) => {
        const tile = world.getTile(pos);
        return world.canSettleOn(tile);
    },
    'cloak': (world, pos) => {
        var _a;
        const tile = world.getTile(pos);
        return !((_a = tile.unit.cloaked) !== null && _a !== void 0 ? _a : false);
    },
    'decloak': (world, pos) => {
        var _a;
        const tile = world.getTile(pos);
        return (_a = tile.unit.cloaked) !== null && _a !== void 0 ? _a : false;
    },
    'openGate': (world, pos) => {
        const tile = world.getTile(pos);
        return tile.walls.some(wall => (wall && wall.type === WallType.CLOSED_GATE));
    },
    'closeGate': (world, pos) => {
        const tile = world.getTile(pos);
        return tile.walls.some(wall => (wall && wall.type === WallType.OPEN_GATE));
    },
};
const iconPathTable = {
    'food': 'assets/icons/food.png',
    'production': 'assets/icons/production.png',
};
const MISSING_ICON_PATH = 'assets/missing.png';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UI {
    constructor() {
        const rootElement = document.getElementById('UI');
        if (!rootElement)
            throw 'Root UI Element Missing';
        this.root = rootElement;
        this.elements = {
            readyBtn: this.createElement('button', { className: 'readyBtn' }),
            centerModal: this.createElement('div', { className: 'centerModal' }),
            civPicker: this.createElement('ul', { className: 'civList' }),
            mainMenu: this.createElement('div', { className: 'mainMenu' }),
            gameList: this.createElement('div', { className: 'gameList' }),
            unitActionsMenu: this.createElement('div', { className: 'unitActionsMenu' }),
            unitInfoMenu: this.createElement('div', { className: 'unitInfoMenu' }),
            tileInfoMenu: this.createElement('div', { className: 'tileInfoMenu' }),
            sidebarMenu: this.createElement('div', { className: 'sidebarMenu' }),
        };
        this.civPool = {};
        this.civTemplates = [];
        this.players = {};
        this.leaders = {};
        this.turnActive = false;
        this.buttons = {
            mainBtn: new Button(this.createElement('button', { className: 'mainActionBtn' }), {
                text: 'MainBtn',
            }),
        };
        this.textInputs = {
            loginMenu: new TextInput({
                query: translate('menu.login.query'),
                fields: [
                    [translate('menu.login.fields.username'), undefined],
                    [translate('menu.login.fields.password'), undefined, 'password'],
                ]
            }),
            ipSelect: new TextInput({
                query: translate('menu.connect.query'),
                fields: [
                    [translate('menu.connect.fields.address')],
                ]
            }),
            createGame: new TextInput({
                query: translate('menu.game.new.query'),
                fields: [
                    [translate('menu.game.new.fields.name')],
                    [translate('menu.game.new.fields.players'), undefined, 'number'],
                    [translate('menu.game.new.fields.width'), undefined, 'number'],
                    [translate('menu.game.new.fields.height'), undefined, 'number'],
                    [translate('menu.game.new.fields.seed'), translate('menu.game.new.hints.seed'), 'number'],
                ]
            }),
            reconnectMenu: new TextInput({
                query: translate('menu.reconnect.query'),
                submitText: translate('buttons.server.reconnect'),
                abortText: translate('buttons.server.disconnect'),
                fields: []
            }),
        };
        this.textAlerts = {
            errorAlert: new TextAlert({
                message: translate('error.generic'),
            }),
            reloadAlert: new TextAlert({
                message: translate('error.fatal'),
                submitText: translate('buttons.reload'),
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
    createElement(type, options) {
        const element = document.createElement(type);
        if (options === null || options === void 0 ? void 0 : options.className) {
            element.className = options.className;
        }
        if (options === null || options === void 0 ? void 0 : options.attrs) {
            for (const attr in options === null || options === void 0 ? void 0 : options.attrs) {
                element[attr] = options === null || options === void 0 ? void 0 : options.attrs[attr];
            }
        }
        if (options === null || options === void 0 ? void 0 : options.children) {
            for (const child of options.children) {
                element.appendChild(child);
            }
        }
        return element;
    }
    createSVGElement(type, options) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', type);
        if (options === null || options === void 0 ? void 0 : options.className) {
            element.classList.add(options.className);
        }
        if (options === null || options === void 0 ? void 0 : options.attrs) {
            for (const attr in options === null || options === void 0 ? void 0 : options.attrs) {
                element.setAttribute(attr, options === null || options === void 0 ? void 0 : options.attrs[attr]);
            }
        }
        if (options === null || options === void 0 ? void 0 : options.children) {
            for (const child of options.children) {
                element.appendChild(child);
            }
        }
        return element;
    }
    createCivItem(civTemplate, selectedBy) {
        const civItem = this.createElement('li', { className: 'civItem' });
        civItem.style.backgroundColor = civTemplate.color;
        civItem.style.color = civTemplate.textColor;
        const nameText = this.createElement('span');
        nameText.innerHTML = `${civTemplate.name}` + (selectedBy !== null ? ` - ${translate('menu.civ.selected_by')} ${this.leaders[selectedBy.id].name}` : '');
        civItem.appendChild(nameText);
        return civItem;
    }
    createYieldDisplay(yieldData) {
        // for (const key in yieldData) {}
        return this.createElement('div', { className: 'yieldDisplayDiv', children: Object.keys(yieldData).map(key => {
                var _a;
                return (this.createElement('div', { className: 'yieldDisplay tooltip', children: [
                        this.createElement('img', { className: 'icon', attrs: { src: (_a = iconPathTable[key]) !== null && _a !== void 0 ? _a : MISSING_ICON_PATH } }),
                        this.createElement('span', { className: 'yieldCount', attrs: { innerText: yieldData[key] } }),
                        this.createElement('span', { className: 'tooltipText', attrs: { innerText: translate(`yield.${key}`) } }),
                    ] }));
            }) });
    }
    createProgressBar(progress) {
        const element = this.createSVGElement('svg', { className: 'progressBar', attrs: { width: "100%", height: 16 }, children: [
                this.createSVGElement('defs', { children: [
                        this.createSVGElement('linearGradient', { attrs: {
                                id: 'progressGrad',
                                x1: '0%',
                                y1: '0%',
                                x2: `${100 / progress}%`,
                                y2: '0%',
                            }, children: [
                                this.createSVGElement('stop', { attrs: { offset: '0%', style: 'stop-color:rgb(255,0,0);stop-opacity:1' } }),
                                this.createSVGElement('stop', { attrs: { offset: '50%', style: 'stop-color:rgb(255,255,0);stop-opacity:1' } }),
                                this.createSVGElement('stop', { attrs: { offset: '100%', style: 'stop-color:rgb(0,255,0);stop-opacity:1' } }),
                            ] })
                    ] }),
                this.createSVGElement('rect', { attrs: {
                        width: `${Math.min(progress, 1) * 100}%`,
                        height: 16,
                        fill: 'url(#progressGrad)',
                    } })
            ] });
        const div = this.createElement('div');
        div.appendChild(element);
        return div;
    }
    setTurnState(world, state) {
        this.turnActive = state;
        if (state) {
            this.buttons.mainBtn.bindCallback(() => {
                const isFinished = world.nextUnit();
                if (isFinished) {
                    this.buttons.mainBtn.bindCallback(() => {
                        world.sendActions([['turnFinished', [true]]]);
                        this.setTurnState(world, false);
                    });
                    this.buttons.mainBtn.setText(translate('buttons.end_turn'));
                }
            });
            this.buttons.mainBtn.setText(translate('buttons.next_unit'));
            // automatically select the first unit by "pressing" the button
            this.buttons.mainBtn.element.click();
        }
        else {
            this.buttons.mainBtn.unbindCallback();
            this.buttons.mainBtn.setText(translate('buttons.waiting'));
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
        const selectedLeaderSlot = this.createElement('div', { className: 'selectedLeader' });
        this.elements.civPicker.appendChild(selectedLeaderSlot);
        for (let civTemplateID = 0; civTemplateID < this.civTemplates.length; civTemplateID++) {
            const civTemplate = this.civTemplates[civTemplateID];
            const leaderID = this.civPool[civTemplateID];
            const leader = leaderID !== null ? world.leaders[leaderID] : null;
            const civItem = this.createCivItem(civTemplate, leader);
            if (leader) {
                civItem.onclick = () => {
                    alert(translate('error.civ_taken'));
                };
            }
            else {
                civItem.onclick = () => {
                    callback(civTemplateID);
                };
            }
            if (leader && leader.id === self.leaderID) {
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
        this.elements.readyBtn.innerText = translate('buttons.ready');
        this.elements.readyBtn.onclick = () => {
            btnState = !btnState;
            if (btnState) {
                this.elements.readyBtn.innerText = translate('buttons.waiting');
            }
            else {
                this.elements.readyBtn.innerText = translate('buttons.ready');
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
        titleHeading.innerText = translate('title');
        this.elements.mainMenu.appendChild(titleHeading);
        const createGameBtn = this.createElement('button');
        createGameBtn.innerText = translate('buttons.game.new');
        createGameBtn.onclick = () => callbacks.createGame();
        this.elements.mainMenu.appendChild(createGameBtn);
        const gameListBtn = this.createElement('button');
        gameListBtn.innerText = translate('buttons.game.list');
        gameListBtn.onclick = () => callbacks.listGames();
        this.elements.mainMenu.appendChild(gameListBtn);
        const changeServerBtn = this.createElement('button');
        changeServerBtn.innerText = translate('buttons.server.disconnect');
        changeServerBtn.onclick = () => callbacks.changeServer();
        this.elements.mainMenu.appendChild(changeServerBtn);
        const logoutBtn = this.createElement('button');
        logoutBtn.innerText = translate('buttons.logout');
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
        titleHeading.innerText = translate('menu.game.list.active');
        this.elements.gameList.appendChild(titleHeading);
        const returnBtn = this.createElement('button');
        returnBtn.onclick = () => callbacks.return();
        returnBtn.innerText = `${translate('buttons.return')} ${translate('menu.main.title')}`;
        this.elements.gameList.appendChild(returnBtn);
        for (const gameID in gameList) {
            const { gameName, playersConnected, playerCount } = gameList[gameID];
            const gameBtn = this.createElement('button');
            gameBtn.innerText = `${gameName} - ${playersConnected} / ${playerCount} ${translate('menu.game.list.players')}`;
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
    showUnitActionsMenu(world, pos, unit, skipTurn) {
        const actionBtn = new Button(this.createElement('button'), {
            text: translate(`unit.action.skipTurn`),
        });
        actionBtn.bindCallback(skipTurn);
        this.elements.unitActionsMenu.appendChild(actionBtn.element);
        for (const action of unitActionsTable[unit.type]) {
            if (action === 'build') {
                world.sendActions([['getImprovementCatalog', [pos]]]);
                world.on.update.improvementCatalog = (catalogPos, catalog) => {
                    if (!(pos.x === catalogPos.x && pos.y === catalogPos.y) || !catalog)
                        return;
                    for (const item of catalog) {
                        const actionBtn = new Button(this.createElement('button'), {
                            // Note that we have the cost info here, we are for now choosing not to display it.
                            text: `${translate(`unit.action.${action}`)} ${translate(`improvement.${item.type}`)}`,
                        });
                        actionBtn.bindCallback(() => {
                            world.sendActions([unitActionsFnTable[action](pos, item.type)]);
                        });
                        this.elements.unitActionsMenu.appendChild(actionBtn.element);
                    }
                };
                continue;
            }
            if (action === 'buildWall') {
                const actionBtn = new Button(this.createElement('button'), {
                    text: `${translate(`unit.action.${action}`)}`,
                });
                actionBtn.bindCallback(() => {
                    world.on.event.buildWall(pos, (selectedPos) => {
                        world.sendActions([unitActionsFnTable[action](pos, selectedPos, WallType.WALL)]);
                    });
                });
                this.elements.unitActionsMenu.appendChild(actionBtn.element);
                continue;
            }
            if (action === 'buildGate') {
                const actionBtn = new Button(this.createElement('button'), {
                    text: `${translate(`unit.action.${action}`)}`,
                });
                actionBtn.bindCallback(() => {
                    world.on.event.buildWall(pos, (selectedPos) => {
                        world.sendActions([unitActionsFnTable['buildWall'](pos, selectedPos, WallType.OPEN_GATE)]);
                    });
                });
                this.elements.unitActionsMenu.appendChild(actionBtn.element);
                continue;
            }
            if (action in unitActionsAvailabilityTable && !unitActionsAvailabilityTable[action](world, pos)) {
                continue;
            }
            if (action === 'openGate') {
                const actionBtn = new Button(this.createElement('button'), {
                    text: `${translate(`unit.action.${action}`)}`,
                });
                actionBtn.bindCallback(() => {
                    world.on.event.buildWall(pos, (selectedPos) => {
                        world.sendActions([unitActionsFnTable[action](pos, selectedPos)]);
                    });
                });
                this.elements.unitActionsMenu.appendChild(actionBtn.element);
                continue;
            }
            if (action === 'closeGate') {
                const actionBtn = new Button(this.createElement('button'), {
                    text: `${translate(`unit.action.${action}`)}`,
                });
                actionBtn.bindCallback(() => {
                    world.on.event.buildWall(pos, (selectedPos) => {
                        world.sendActions([unitActionsFnTable[action](pos, selectedPos)]);
                    });
                });
                this.elements.unitActionsMenu.appendChild(actionBtn.element);
                continue;
            }
            const actionBtn = new Button(this.createElement('button'), {
                text: translate(`unit.action.${action}`),
            });
            actionBtn.bindCallback(() => {
                if (action in unitActionsFnTable) {
                    world.sendActions([unitActionsFnTable[action](pos)]);
                }
                else {
                    world.sendActions([[action, [pos]]]);
                }
            });
            this.elements.unitActionsMenu.appendChild(actionBtn.element);
        }
        this.root.appendChild(this.elements.unitActionsMenu);
    }
    hideUnitActionsMenu() {
        this.elements.unitActionsMenu.remove();
        this.elements.unitActionsMenu.innerHTML = '';
    }
    showUnitInfoMenu(world, pos, unit) {
        const unitName = this.createElement('h2', { className: 'infoSpan' });
        unitName.innerText = translate(`unit.${unit.type}`);
        const unitHP = this.createElement('span', { className: 'infoSpan' });
        unitHP.innerText = `${translate('unit.info.hp')}: ${unit.hp}%`;
        const unitMovement = this.createElement('span', { className: 'infoSpan' });
        unitMovement.innerText = `${translate('unit.info.movement')}: ${unit.movement}`;
        const unitKnowledge = this.createElement('span', { className: 'infoSpan' });
        unitKnowledge.innerText = JSON.stringify(unit.knowledge);
        this.elements.unitInfoMenu.appendChild(unitName);
        this.elements.unitInfoMenu.appendChild(unitHP);
        this.elements.unitInfoMenu.appendChild(unitMovement);
        this.elements.unitInfoMenu.appendChild(unitKnowledge);
        this.root.appendChild(this.elements.unitInfoMenu);
    }
    hideUnitInfoMenu() {
        this.elements.unitInfoMenu.remove();
        this.elements.unitInfoMenu.innerHTML = '';
    }
    showTileInfoMenu(world, pos, tile) {
        var _a, _b;
        this.elements.tileInfoMenu.innerHTML = '';
        const tileType = this.createElement('span', { className: 'infoSpan' });
        tileType.innerText = `${translate('tile.info.type')}: ${translate(`tile.${tile.type}`)}`;
        const tileMovementCost = this.createElement('span', { className: 'infoSpan' });
        tileMovementCost.innerText = `${translate('tile.info.movement')}: ${tile.movementCost[0]} - ${tile.movementCost[1]}`;
        const tileElevation = this.createElement('span', { className: 'infoSpan' });
        tileElevation.innerText = `${translate('tile.info.elevation')}: ${Math.round(tile.elevation)}`;
        const tileKnowledge = this.createElement('span', { className: 'infoSpan' });
        tileKnowledge.innerText = JSON.stringify((_a = tile.improvement) === null || _a === void 0 ? void 0 : _a.knowledge);
        this.elements.tileInfoMenu.appendChild(tileType);
        this.elements.tileInfoMenu.appendChild(tileMovementCost);
        this.elements.tileInfoMenu.appendChild(tileElevation);
        this.elements.tileInfoMenu.appendChild(tileKnowledge);
        if (tile.owner) {
            const tileOwner = this.createElement('span', { className: 'infoSpan' });
            // TODO - add some sort of world.getCiv that can take an undefined ID to make this less ugly. Also, TODO make a translate string for 'Free City'.
            tileOwner.innerText = `${translate('tile.info.owner')}: ${tile.owner.name} (${tile.owner.civID ? world.civs[(_b = tile.owner.civID) === null || _b === void 0 ? void 0 : _b.subID].name : 'Free City'})`;
            this.elements.tileInfoMenu.appendChild(tileOwner);
        }
        this.root.appendChild(this.elements.tileInfoMenu);
    }
    hideTileInfoMenu() {
        this.elements.tileInfoMenu.remove();
        this.elements.tileInfoMenu.innerHTML = '';
    }
    showSidebarMenu(world, pos, tile) {
        var _a, _b, _c, _d;
        this.elements.sidebarMenu.innerHTML = '';
        const titleText = (tile.improvement.type === 'settlement') ? ((_b = (_a = tile.owner) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : translate('error.city.orphan')) : (translate(`improvement.${tile.improvement.type}`));
        const title = this.createElement('span', { className: 'sidebarTitleDiv', children: [
                this.createElement('span', { className: 'sidebarTitle', attrs: { innerText: titleText } }),
            ] });
        this.elements.sidebarMenu.appendChild(title);
        if (tile.improvement.type === 'worksite') {
            const worksiteProgress = this.createElement('span', {
                className: 'sidebarInfoSpan',
                attrs: { innerText: `${translate('improvement.info.turnsToComplete')}: ${(_d = (_c = tile.improvement.errand) === null || _c === void 0 ? void 0 : _c.turnsToCompletion) !== null && _d !== void 0 ? _d : '-'}` }
            });
            this.elements.sidebarMenu.appendChild(worksiteProgress);
        }
        const storage = Object.assign({}, tile.improvement.storage);
        const capacity = storage.capacity;
        delete storage.capacity;
        const tileInfo = this.createElement('div', { className: 'sidebarInfoDiv', children: [
                this.createElement('h3', { className: 'sidebarInfoHeading', attrs: { innerText: translate('improvement.info.resources') } }),
                this.createElement('div', { className: 'sidebarInfoTable', children: [
                        this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate('improvement.info.yield') } }),
                                this.createElement('span', { className: 'sidebarInfoSpan', children: [this.createYieldDisplay(tile.yield)] }),
                            ] }),
                        this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate('improvement.info.storage') } }),
                                this.createElement('span', { className: 'sidebarInfoSpan', children: [this.createYieldDisplay(storage)] }),
                            ] }),
                        this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate('improvement.info.capacity') } }),
                                this.createElement('span', { className: 'sidebarInfoSpan', children: [this.createYieldDisplay(capacity)] }),
                            ] }),
                    ] }),
            ] });
        this.elements.sidebarMenu.appendChild(tileInfo);
        if (tile.improvement.errand) {
            const errandInfo = this.createElement('div', { className: 'errandInfo', children: [
                    this.createElement('h3', { className: 'sidebarInfoHeading', attrs: { innerText: translate('improvement.info.errand.current') } }),
                    this.createElement('div', { className: 'sidebarInfoTable', children: [
                            this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate('improvement.info.errand.type') } }),
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate(`errand.type.${tile.improvement.errand.action.type}`) } }),
                                ] }),
                            this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate('improvement.info.errand.option') } }),
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: {
                                            innerText: translate(`${errandTypeTable[tile.improvement.errand.action.type]}.${tile.improvement.errand.action.option}`)
                                        } }),
                                ] }),
                            this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate('improvement.info.errand.progress') } }),
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate(`${Math.round(tile.improvement.errand.progress * 100)}%`) } }),
                                ] }),
                            this.createProgressBar(tile.improvement.errand.progress),
                            this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: { innerText: translate('improvement.info.errand.turns') } }),
                                    this.createElement('span', { className: 'sidebarInfoSpan', attrs: {
                                            innerText: formatTurnsRemaining(tile.improvement.errand.turnsToCompletion)
                                        } }),
                                ] }),
                        ] }),
                ] });
            this.elements.sidebarMenu.appendChild(errandInfo);
        }
        let tileUnitCatalog;
        let tileKnowledgeCatalog;
        world.on.update.unitCatalog = (catalogPos, catalog) => {
            if (!(pos.x === catalogPos.x && pos.y === catalogPos.y))
                return;
            if (tileUnitCatalog)
                tileUnitCatalog.remove();
            tileUnitCatalog = this.createElement('div', { className: 'catalogDiv', children: [
                    this.createElement('h3', { className: 'sidebarInfoHeading', attrs: { innerText: translate('improvement.info.unitCatalog') } }),
                    this.createElement('div', { className: 'sidebarInfoTable', children: catalog && catalog.map(unit => {
                            const trainUnitBtn = this.createElement('button', { className: 'errandButton', attrs: { innerText: translate(`unit.${unit.type}`), onclick: () => {
                                        world.sendActions([['trainUnit', [pos, unit.type]]]);
                                    } } });
                            if (tile.improvement.errand) {
                                trainUnitBtn.setAttribute('disabled', 'true');
                            }
                            return (this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                    trainUnitBtn,
                                    this.createElement('span', { className: 'sidebarInfoSpan', children: [this.createYieldDisplay(unit.cost)] }),
                                ] }));
                        }) }),
                ] });
            this.elements.sidebarMenu.appendChild(tileUnitCatalog);
        };
        world.on.update.knowledgeCatalog = (catalogPos, catalog) => {
            if (!(pos.x === catalogPos.x && pos.y === catalogPos.y))
                return;
            if (tileKnowledgeCatalog)
                tileKnowledgeCatalog.remove();
            tileKnowledgeCatalog = this.createElement('div', { className: 'catalogDiv', children: [
                    this.createElement('h3', { className: 'sidebarInfoHeading', attrs: { innerText: translate('improvement.info.knowledgeCatalog') } }),
                    this.createElement('div', { className: 'sidebarInfoTable', children: catalog && catalog.map(knowledge => {
                            const researchKnowlegeBtn = this.createElement('button', { className: 'errandButton', attrs: { innerText: translate(`knowledge.${knowledge.name}`), onclick: () => {
                                        world.sendActions([['researchKnowledge', [pos, knowledge.name]]]);
                                    } } });
                            if (tile.improvement.errand) {
                                researchKnowlegeBtn.setAttribute('disabled', 'true');
                            }
                            return (this.createElement('div', { className: 'sidebarInfoTableRow', children: [
                                    researchKnowlegeBtn,
                                    this.createElement('span', { className: 'sidebarInfoSpan', children: [this.createYieldDisplay(knowledge.cost)] }),
                                ] }));
                        }) }),
                ] });
            this.elements.sidebarMenu.appendChild(tileKnowledgeCatalog);
        };
        this.root.appendChild(this.elements.sidebarMenu);
    }
    hideSidebarMenu() {
        this.elements.sidebarMenu.remove();
        this.elements.sidebarMenu.innerHTML = '';
        delete world.on.update.unitCatalog;
        delete world.on.update.knowledgeCatalog;
    }
}
const formatTurnsRemaining = (turnsRemaining) => (turnsRemaining === null ?
    ' - ' :
    `${Math.ceil(turnsRemaining)} ${translate('misc.turns')}`);
//# sourceMappingURL=player.js.map