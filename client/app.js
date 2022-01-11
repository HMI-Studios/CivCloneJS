const resize = () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
  ctx.setTransform(1, 0, 0, -1, canvas.width / 2, canvas.height / 2);
  ctx.webkitImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  camera.render(world);
}

window.onload = () => {
  resize();
};
window.onresize = resize;
document.getElementById('canvas').onwheel = (evt) => {
  const canvas = document.getElementById('canvas');
  if (evt.deltaY > 0) {
    const { zoom, x: camX, y: camY } = camera;
    const { tiles, size } = world;
    const [ scx1, scy1, scx2, scy2 ] = [
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width / 2,
      canvas.height / 2
    ];
    const yStart = (Math.round((-((12.5 * world.size * zoom) + scy2)) / (25 * zoom)) + (world.size - 2));
    if (yStart > 1) {
      camera.zoom *= 0.9;
    }
  } else {
    camera.zoom *= 1.1;
  }
};

let mouseX = 0;
let mouseY = 0;
let oldX = 0;
let oldY = 0;
let clickX = 0;
let clickY = 0;
let mouseDown = false;
const getMousePos = ( canvas, evt ) => {
  const rect = canvas.getBoundingClientRect();
  const pos = {
        x: Math.floor( ( evt.clientX - rect.left ) / ( rect.right - rect.left ) * canvas.width ),
        y: Math.floor( ( evt.clientY - rect.top ) / ( rect.bottom - rect.top ) * canvas.height )
    };
  return pos;
}
document.getElementById('canvas').onmousemove = (evt) => {
	const mousePos = getMousePos(canvas, evt);
	mouseX = mousePos.x - Math.round(canvas.width/2);
	mouseY = canvas.height - (mousePos.y + Math.round(canvas.height/2));
	// selX = x+mouseX/size;
	// selY = y+mouseY/size;
	if (mouseDown) {
		camera.x = oldX - ((mouseX-clickX) / camera.zoom);
		camera.y = oldY - ((mouseY-clickY) / camera.zoom);
	}
};
document.getElementById('canvas').onmousedown = function(evt) {
	const mousePos = getMousePos(canvas, evt);
	clickX = mousePos.x - Math.round(canvas.width/2);
	clickY = canvas.height - (mousePos.y + Math.round(canvas.height/2));
	// console.log(Math.round(selX), Math.round(selY));
	mouseDown = true;
	// update();
}
document.getElementById('canvas').onmouseup = function(evt) {
	const mousePos = getMousePos(canvas, evt);
	mouseDown = false;
	oldX = camera.x;
	oldY = camera.y;
}

const mod = (a, b) => {
  if (a >= 0) {
    return a % b;
  } else {
    return ((a % b) + b) % b;
  }
};

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
    const { tiles, size } = world;
    const [ scx1, scy1, scx2, scy2 ] = [
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width / 2,
      this.canvas.height / 2
    ];
    const yStart = (Math.round(((camY * zoom) - ((12.5 * size * zoom) + scy2)) / (25 * zoom)) + (size - 2));
    const yEnd = (Math.round(((camY * zoom) - ((12.5 * size * zoom) + scy1)) / (25 * zoom)) + (size + 3));

    const xStart = (Math.round((((camX * zoom) + (10 * size * zoom)) + scx1) / (19.8 * zoom)) - 1);
    const xEnd = (Math.round((((camX * zoom) + (10 * size * zoom)) + scx2) / (19.8 * zoom)) + 1);

    this.clear();
    for (let y = Math.max(yStart, 1); y < Math.min(yEnd, size); y++) {
      for (let x = xStart; x < xEnd; x++) {
        const tile = world.getTile(x, y);
        if (tile) {
          ctx.drawImage(
            textures[tile],
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

world = new World();
camera = new Camera();
world.loadMap()
  .then(() => {
    setInterval(() => camera.render(world), 1000/60);
  });