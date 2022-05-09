const [TILE_WIDTH, TILE_HEIGHT] = [28, 26];
const X_TILE_SPACING = TILE_WIDTH * 3/4;
const Y_TILE_SPACING = TILE_HEIGHT / 2;
const X_CLIP_OFFSET = X_TILE_SPACING * Math.cos(60 * (Math.PI / 180));
let [selectorXOffset, selectorYOffset] = [0, 0];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Camera {
  x: number;
  y: number;
  zoom: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  textures: { tile: { [key: string]: HTMLElement }, selector: HTMLElement, unit: { [key: string]: HTMLElement } };
  interval?: NodeJS.Timer;
  mouseDownTime: number;
  selectedUnitPos: [number, number] | null;
  highlightedTiles: { [key: string]: [number, number] };

  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw 'Canvas Context Error';
    this.ctx = ctx;

    this.textures = {
      tile: {
        plains: this.loadTexture('tile_plains'),
        ocean: this.loadTexture('tile_ocean'),
        river: this.loadTexture('tile_coastal'),
        desert: this.loadTexture('tile_desert'),
        mountain: this.loadTexture('tile_mountain'),
        empty: this.loadTexture('border_overlay'),
      },
      selector: this.loadTexture('selector'),
      unit: {
        settler: this.loadTexture('unit_settler'),
        scout: this.loadTexture('unit_scout'),
        builder: this.loadTexture('unit_settler'),
      },
    };
    this.interval;
    this.mouseDownTime = 0;
    this.selectedUnitPos = null;
    this.highlightedTiles = {};
  }

  loadTexture(path: string): HTMLElement {
    const texture = document.getElementById(path);
    if (!texture) throw 'Error: Missing Texture';
    return texture;
  }

  start(world: World, FPS: number): void {
    [selectorXOffset, selectorYOffset] = [
      world.width * 0.5 + -0.6951295757078696,
      world.height * 0.46 + 0.5038168562195441,
    ];
    this.interval = setInterval(() => this.render(world), FPS);
  }

  stop(): void {
    if (this.interval !== undefined) clearInterval(this.interval);
  }

  clear(): void {
    this.ctx.clearRect(
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );
  }

  renderUnit(world: World, unit: Unit, x: number, y: number): void {
    const { zoom, x: camX, y: camY, textures, ctx } = this;
    const { width, height, civs } = world;

    const UNIT_WIDTH = (74 * 0.2);
    const UNIT_HEIGHT = (88 * 0.2);
    const UNIT_RECT_HEIGHT = (51 * 0.2);

    ctx.fillStyle = civs[unit.civID].color;

    ctx.beginPath();
    ctx.rect(
      (-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5) * zoom,
      (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 5) * zoom,
      UNIT_WIDTH * zoom,
      UNIT_RECT_HEIGHT * zoom
    );
    ctx.arc(
      (-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5 + (UNIT_WIDTH / 2)) * zoom,
      (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 5 + UNIT_RECT_HEIGHT) * zoom,
      (UNIT_WIDTH / 2) * zoom,
      0, Math.PI
    );
    ctx.fill();

    ctx.drawImage(
      textures.unit[unit.type] as CanvasImageSource,
      (-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5) * zoom,
      (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 5) * zoom,
      UNIT_WIDTH * zoom,
      UNIT_HEIGHT * zoom
    );
  }

  render(world: World) {
    const { zoom, x: camX, y: camY, textures, ctx } = this;
    const { width, height } = world;
    const [ wmX, wmY ] = [ camX + (mouseX / zoom), camY + (mouseY / zoom) ];
    const [ scx1, scy1, scx2, scy2 ] = [
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width / 2,
      this.canvas.height / 2
    ];

    if (mouseDown) {
      this.mouseDownTime++;
    } else {
      this.mouseDownTime = 0;
    }

    // const TILE_SIZE = [28, 25];
    // const UNIT_SCALE = [74, 88];

    const yStart = (Math.round(((camY * zoom) - ((Y_TILE_SPACING * height * zoom) + scy2)) / (TILE_HEIGHT * zoom)) + (height - 2));
    const yEnd = (Math.round(((camY * zoom) - ((Y_TILE_SPACING * height * zoom) + scy1)) / (TILE_HEIGHT * zoom)) + (height + 3));

    const xStart = (Math.round((((camX * zoom) + (X_CLIP_OFFSET * width * zoom)) + scx1) / (X_TILE_SPACING * zoom)) - 1);
    const xEnd = (Math.round((((camX * zoom) + (X_CLIP_OFFSET * width * zoom)) + scx2) / (X_TILE_SPACING * zoom)) + 1);

    const selectedX = Math.round((wmX / X_TILE_SPACING) + selectorXOffset);
    const selectedY = Math.round(((wmY + height) / TILE_HEIGHT) + (selectorYOffset + (mod(selectedX, 2) / -2)));

    this.clear();
    for (let y = Math.max(yStart, 0); y < Math.min(yEnd, height); y++) {
      for (let x = xStart; x < xEnd; x++) {

        const tile = world.getTile(x, y);
        if (tile) {

          if (!tile.visible) ctx.globalAlpha = 0.5;

          ctx.drawImage(
            textures.tile[tile.type] as CanvasImageSource,
            (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
            (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom,
            TILE_WIDTH * zoom,
            TILE_HEIGHT * zoom
          );

          ctx.globalAlpha = 1;

          if (tile.unit) {
            this.renderUnit(world, tile.unit, x, y);
          }

          if (world.pos(x, y) in this.highlightedTiles) {
            ctx.drawImage(
              textures['selector'] as CanvasImageSource,
              (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
              (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom,
              TILE_WIDTH * zoom,
              TILE_HEIGHT * zoom
            );
          }

          if (x === selectedX && y === selectedY) {

            if (this.mouseDownTime === 1) {
              console.log(x, y);
              if (this.selectedUnitPos && world.pos(x, y) in this.highlightedTiles) {
                world.moveUnit(this.selectedUnitPos, [x, y], this.highlightedTiles, !!tile.unit);
              }

              this.highlightedTiles = {};
              this.selectedUnitPos = null;

              world.on.event.deselectUnit();
            }

            ctx.drawImage(
              textures['selector'] as CanvasImageSource,
              (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
              (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom,
              TILE_WIDTH * zoom,
              TILE_HEIGHT * zoom
            );

            if (tile.unit && this.mouseDownTime === 1) {
              console.log(tile.unit);
              this.highlightedTiles = world.getTilesInRange(x, y, tile.unit.movement);
              this.selectedUnitPos = [x, y];

              world.on.event.selectUnit({x, y}, tile.unit);
            }
          }
        }
      }
    }
  }
}
