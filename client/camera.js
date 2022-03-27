class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.canvas = document.getElementById('canvas');
    this.ctx = canvas.getContext('2d');
    this.textures = {
      plains: document.getElementById('tile_plains'),
      ocean: document.getElementById('tile_ocean'),
      river: document.getElementById('tile_coastal'),
      desert: document.getElementById('tile_desert'),
      mountain: document.getElementById('tile_mountain'),
      empty: document.getElementById('border_overlay'),
      selector: document.getElementById('selector'),
    };
  }

  clear() {
    this.ctx.clearRect(
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );
  }

  render(world) {
    const { zoom, x: camX, y: camY, textures, ctx } = this;
    const { tiles, width, height } = world;
    const [ wmX, wmY ] = [ camX + (mouseX / zoom), camY + (mouseY / zoom) ];
    const [ scx1, scy1, scx2, scy2 ] = [
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width / 2,
      this.canvas.height / 2
    ];
    const yStart = (Math.round(((camY * zoom) - ((12.5 * height * zoom) + scy2)) / (25 * zoom)) + (height - 2));
    const yEnd = (Math.round(((camY * zoom) - ((12.5 * height * zoom) + scy1)) / (25 * zoom)) + (height + 3));

    const xStart = (Math.round((((camX * zoom) + (10 * width * zoom)) + scx1) / (19.8 * zoom)) - 1);
    const xEnd = (Math.round((((camX * zoom) + (10 * width * zoom)) + scx2) / (19.8 * zoom)) + 1);

    this.clear();
    for (let y = Math.max(yStart, 1); y < Math.min(yEnd, height); y++) {
      for (let x = xStart; x < xEnd; x++) {

        const tile = world.getTile(x, y);
        if (tile) {
          ctx.drawImage(
            textures[tile.type],
            (-camX + ((x - (width / 2)) * 19.8)) * zoom,
            (-camY + (((y - (height / 2)) * 25) + (mod(x, 2) * 12.5))) * zoom,
            28 * zoom,
            25 * zoom
          );
        }

        if (x === Math.round((wmX / 19.8) + 18.3) && y === Math.round(((wmY + size) / 25) + (17 + (mod(x, 2) / -2)))) {
          ctx.drawImage(
            textures['selector'],
            (-camX + ((x - (size / 2)) * 19.8)) * zoom,
            (-camY + (((y - (size / 2)) * 25) + (mod(x, 2) * 12.5))) * zoom,
            28 * zoom,
            25 * zoom
          );
        }

      }
    }
  }
}