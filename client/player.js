class Player {
  constructor(name) {
    this.name = name;
  }
}

class UI {
  constructor() {
    this.readyBtn = document.createElement('button');
  }

  showReadyBtn(callback) {
    let btnState = false;
    this.readyBtn.innerHTML = 'Ready';
    this.readyBtn.className = 'readyBtn';
    this.readyBtn.onclick = () => {
      btnState = !btnState;
      if (btnState) {
        this.readyBtn.innerHTML = 'Waiting';
      } else {
        this.readyBtn.innerHTML = 'Ready';
      }
      callback(btnState);
    };
    document.getElementById('UI').appendChild(this.readyBtn);
  }

  hideReadyBtn() {
    this.readyBtn.remove();
  }
}