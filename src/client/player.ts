// eslint-disable-next-line @typescript-eslint/no-unused-vars

const unitActionsTable: { [unit: string]: string[] } = {
  'settler': ['settleCity'],
  'scout': [],
  'builder': ['buildFarm'],
};

const unitActionsFnTable: { [action: string]: (pos: Coords) => unknown[] } = {
  'settleCity': (pos: Coords): unknown[] => {
    // TODO: bring up settle-city menu and ask for city name
    const name = 'name';
    return [pos, name];
  },
};

const unitActionsAvailabilityTable: { [action: string]: (world: World, pos: Coords) => boolean } = {
  'settleCity': (world: World, pos: Coords): boolean => {
    const tile: Tile = world.getTile(pos.x, pos.y);
    return tile.type === 'plains';
  },
  'buildFarm': (world: World, pos: Coords): boolean => {
    const tile: Tile = world.getTile(pos.x, pos.y);
    return tile.type === 'plains';
  },
};

class UI {

  root: HTMLElement;
  elements: { [key: string]: HTMLElement };
  colorPool: string[];
  turnActive: boolean;
  buttons: { [key: string]: Button };

  constructor() {
    this.root = document.getElementById('UI');
    this.elements = {
      readyBtn: this.createElement('button', 'readyBtn'),
      centerModal: this.createElement('div', 'centerModal'),
      civPicker: this.createElement('ul', 'civList'),
      unitActionsMenu: this.createElement('div', 'unitActionsMenu'),
    };

    this.colorPool = [];
    this.turnActive = false;

    this.buttons = {
      mainBtn: new Button(this.createElement('button', 'mainActionBtn'), {
        text: 'MainBtn',
        action: null,
      }),
    };
  }

  createElement(type: string, className=null): HTMLElement {
    const element = document.createElement(type);
    if (className) {
      element.className = className;
    }
    return element;
  }

  createCivItem(civName: string, color: string): HTMLElement {
    const civItem = this.createElement('li', 'civItem');
    civItem.style.backgroundColor = color;
    const nameText = this.createElement('span');
    nameText.innerHTML = civName;
    civItem.appendChild(nameText);
    return civItem;
  }

  setTurnState(state: boolean) {
    this.turnActive = state;

    if (state) {
      this.buttons.mainBtn.setAction(['turnFinished', [true]]);
      this.buttons.mainBtn.setText('Finish');
    } else {
      this.buttons.mainBtn.setText('Waiting...');
    }
  }

  showGameUI(world: World): void {
    for (const buttonID in this.buttons) {
      const button = this.buttons[buttonID];
      button.bindActionCallback(world.sendActions.bind(world));

      this.root.appendChild(button.element);
    }
  }

  showCivPicker(callback: (color: string) => void): void {
    this.elements.civPicker.innerHTML = '';
    for (let i = 0; i < this.colorPool.length; i++) {
      const color = this.colorPool[i];
      const civItem = this.createCivItem(`Color option #${i}`, color);
      civItem.onclick = () => {
        callback(color);
      };
      this.elements.civPicker.appendChild(civItem);
    }

    this.elements.centerModal.appendChild(this.elements.civPicker);
    this.root.appendChild(this.elements.centerModal);
  }

  hideCivPicker(): void {
    this.elements.civPicker.remove();
    this.elements.centerModal.remove();
  }

  showReadyBtn(callback: (isReady: boolean) => void): void {
    let btnState = false;
    this.elements.readyBtn.innerText = 'Ready';

    this.elements.readyBtn.onclick = () => {
      btnState = !btnState;
      if (btnState) {
        this.elements.readyBtn.innerText = 'Waiting';
      } else {
        this.elements.readyBtn.innerText = 'Ready';
      }

      callback(btnState);
    };

    this.root.appendChild(this.elements.readyBtn);
  }

  hideReadyBtn(): void {
    this.elements.readyBtn.remove();
  }

  showUnitActionsMenu(world: World, pos: Coords, unit: Unit): void {
    for (const action of unitActionsTable[unit.type]) {
      if (!unitActionsAvailabilityTable[action](world, pos)) {
        continue;
      }

      const actionBtn = new Button(
        this.createElement('button'),
        { 
          text: action,
          action: [action, unitActionsFnTable[action](pos)],
        }
      );

      actionBtn.bindActionCallback(world.sendActions.bind(world));

      this.elements.unitActionsMenu.appendChild(actionBtn.element);
    }

    this.root.appendChild(this.elements.unitActionsMenu);
  }

  hideUnitActionsMenu(): void {
    this.elements.unitActionsMenu.remove();
    this.elements.unitActionsMenu.innerHTML = '';
  }
}
