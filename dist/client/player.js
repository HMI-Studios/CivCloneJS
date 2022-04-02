// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UI {
    constructor() {
        this.elements = {
            readyBtn: this.createElement('button', 'readyBtn'),
            centerModal: this.createElement('div', 'centerModal'),
            civPicker: this.createElement('ul', 'civList'),
            mainActionBtn: this.createElement('button', 'mainActionBtn'),
        };
        this.colorPool = [];
    }
    createElement(type, className = null) {
        const element = document.createElement(type);
        if (className) {
            element.className = className;
        }
        return element;
    }
    createCivItem(civName, color) {
        const civItem = this.createElement('li', 'civItem');
        civItem.style.backgroundColor = color;
        const nameText = this.createElement('span');
        nameText.innerHTML = civName;
        civItem.appendChild(nameText);
        return civItem;
    }
    showGameUI(world) {
        this.elements.mainActionBtn.onclick = () => {
            world.sendActions([
                ['endTurn', []]
            ]);
        };
        document.getElementById('UI').appendChild(this.elements.mainActionBtn);
    }
    showCivPicker(callback) {
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
    showReadyBtn(callback) {
        let btnState = false;
        this.elements.readyBtn.innerHTML = 'Ready';
        this.elements.readyBtn.onclick = () => {
            btnState = !btnState;
            if (btnState) {
                this.elements.readyBtn.innerHTML = 'Waiting';
            }
            else {
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
//# sourceMappingURL=player.js.map