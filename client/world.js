class World {
  constructor() {
    this.tiles = [];
    this.size = 0;
  }

  getTile(x, y) {
    return this.tiles[(y * this.size) + mod(x, this.size)] || null;
  }

  loadMap() {
    return axios.get('/map')
      .then((response) => {
        this.tiles = response.data;
        this.size = Math.floor(Math.sqrt(this.tiles.length));
      });
  }
}