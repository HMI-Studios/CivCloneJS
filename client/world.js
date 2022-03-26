class World {
  constructor() {
    this.tiles = [];
    this.size = 0; // REMOVE
    this.height;
    this.width;
    this.socket;
  }

  getTile(x, y) {
    return this.tiles[(y * this.size) + mod(x, this.size)] || null;
  }

  sendJSON(data) {
    this.socket.send(JSON.stringify(data));
  }

  handleData(data) {
    console.table(data);
  }

  setup(serverIP) {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`ws://${serverIP}`);
      this.socket.addEventListener('message', function (event) {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          console.error('Bad JSON recieved from server');
          return;
        }
        handleData(data);
      });
      this.socket.addEventListener('open', function (event) {
        resolve();
      });
    });
  }

  setPlayer(player) {
    return new Promise((resolve, reject) => {
      this.sendJSON({

        func: {
          setPlayer: [player.name]
        },

      });
    });
  }

  loadMap() {
    return axios.get(`/map`)
      .then(({ data }) => {
        this.tiles = data.map;
        this.size = Math.floor(Math.sqrt(this.tiles.length)); // REMOVE
        this.height = data.height;
        this.width = data.width;
      });
  }
}