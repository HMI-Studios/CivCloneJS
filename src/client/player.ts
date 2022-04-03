// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UI {

  elements: { [key: string]: HTMLElement };
  colorPool: string[];
  turnActive: boolean;
  mainBtnAction: [string, unknown[]]

  constructor() {
    this.elements = {
      readyBtn: this.createElement('button', 'readyBtn'),
      centerModal: this.createElement('div', 'centerModal'),
      civPicker: this.createElement('ul', 'civList'),
      mainActionBtn: this.createElement('button', 'mainActionBtn'),
    };
    this.colorPool = [];
    this.turnActive = false;
    this.mainBtnAction = null;
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
      this.mainBtnAction = ['endTurn', []];
    }
  }

  showGameUI(world: World): void {

    this.elements.mainActionBtn.onclick = () => {
      if (this.mainBtnAction) {
        world.sendActions([
          this.mainBtnAction
        ]);
      }
    };

    document.getElementById('UI').appendChild(this.elements.mainActionBtn);
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
    document.getElementById('UI').appendChild(this.elements.centerModal);
  }

  hideCivPicker(): void {
    this.elements.civPicker.remove();
    this.elements.centerModal.remove();
  }

  showReadyBtn(callback: (isReady: boolean) => void): void {
    let btnState = false;
    this.elements.readyBtn.innerHTML = 'Ready';
    this.elements.readyBtn.onclick = () => {
      btnState = !btnState;
      if (btnState) {
        this.elements.readyBtn.innerHTML = 'Waiting';
      } else {
        this.elements.readyBtn.innerHTML = 'Ready';
      }
      callback(btnState);
    };
    document.getElementById('UI').appendChild(this.elements.readyBtn);
  }

  hideReadyBtn(): void {
    this.elements.readyBtn.remove();
  }
}