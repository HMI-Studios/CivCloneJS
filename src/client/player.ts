// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UI {
  elements: { [key: string]: HTMLElement };
  colorPool: string[];
  constructor() {
    this.elements = {
      readyBtn: this.createElement('button', 'readyBtn'),
      centerModal: this.createElement('div', 'centerModal'),
      civPicker: this.createElement('ul', 'civList')
    };
    this.colorPool = [];
  }

  createElement(type: string, className=null): HTMLElement {
    const element = document.createElement(type);
    if (className) {
      element.className = className;
    }
    return element;
  }

  createCivItem (civName: string, color: string): HTMLElement {
    const civItem = this.createElement('li', 'civItem');
    civItem.style.backgroundColor = color;
    const nameText = this.createElement('span');
    nameText.innerHTML = civName;
    civItem.appendChild(nameText);
    return civItem;
  }

  showCivPicker(callback: (color: string) => void) {
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

  hideCivPicker() {
    this.elements.civPicker.remove();
    this.elements.centerModal.remove();
  }

  showReadyBtn(callback: (isReady: boolean) => void) {
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

  hideReadyBtn() {
    this.elements.readyBtn.remove();
  }
}