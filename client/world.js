class World {
  constructor() {
    this.tiles = [];
    // this.size = 0; // REMOVE
    this.height;
    this.width;
    this.socket;
    this.on = {
      update: {},
      error: {},
    };
  }

  getTile(x, y) {
    return this.tiles[(y * this.width) + mod(x, this.size)] || null;
  }

  sendJSON(data) {
    this.socket.send(JSON.stringify(data));
  }

  handleResponse(data) {
    if (data.update) {
      for (let i = 0; i < data.update.length; i++) {
        let name = data.update[i][0];
        let args = data.update[i][1];
        console.log(name);
        if (this.on.update[name]) {
          this.on.update[name](...args);
        }
      }
    }
  }

  setup(serverIP) {

    this.on.update.beginGame = ([width, height]) => {
      ui.hideReadyBtn();
      [this.width, this.height] = [width, height];
    };

    this.on.update.setMap = (map) => {
      console.log(map);
      this.tiles = map;
    };

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`ws://${serverIP}`);
      this.socket.addEventListener('message', (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          console.error('Bad JSON recieved from server');
          return;
        }
        this.handleResponse(data);
      });
      this.socket.addEventListener('open', (event) => {
        resolve();
      });
    });
  }

  sendActions(actions) {
    this.sendJSON({ actions });
  }

  // loadMap() {
  //   return axios.get(`/map`)
  //     .then(({ data }) => {
  //       this.tiles = data.map;
  //       this.size = Math.floor(Math.sqrt(this.tiles.length)); // REMOVE
  //       this.height = data.height;
  //       this.width = data.width;
  //     });
  // }
}