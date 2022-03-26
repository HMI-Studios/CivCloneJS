class Player {
  constructor(name) {
    this.name = name;
  }
}

class UI {
  constructor() {

  }

  readyBtn(callback) {
    const btn = document.createElement('button');
    btn.innerHTML = 'Ready';
    btn.className = 'readyBtn';
    btn.onclick = () => {
      callback();
    };
    document.getElementById('UI').appendChild(btn);
  }
}