const [TILE_WIDTH, TILE_HEIGHT] = [28, 26];
const X_TILE_SPACING = TILE_WIDTH * 3/4;
const Y_TILE_SPACING = TILE_HEIGHT / 2;
const X_CLIP_OFFSET = X_TILE_SPACING * Math.cos(60 * (Math.PI / 180));
let [selectorXOffset, selectorYOffset] = [0, 0];

type OverlayTexture = {
  offset: number;
  texture: HTMLImageElement;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Camera {
  x: number;
  y: number;
  zoom: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  textures: {
    tile: { [key: string]: HTMLImageElement },
    selector: HTMLImageElement,
    unit: { [key: string]: HTMLImageElement },
    improvements: { [key: string]: OverlayTexture },
  };
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
        ocean: this.loadTexture('tile_ocean'),
        frozen_ocean: this.loadTexture('tile_frozen_ocean'),
        river: this.loadTexture('tile_coastal'),
        frozen_river: this.loadTexture('tile_frozen_coastal'),

        grass_lowlands: this.loadTexture('tile_grass_lowlands'),
        plains: this.loadTexture('tile_plains'),
        grass_hills: this.loadTexture('tile_grass_hills'),
        grass_mountains: this.loadTexture('tile_grass_mountains'),

        snow_plains: this.loadTexture('tile_snow_plains'),
        snow_hills: this.loadTexture('tile_snow_hills'),
        snow_mountains: this.loadTexture('tile_snow_mountains'),

        desert: this.loadTexture('tile_desert'),
        desert_hills: this.loadTexture('tile_desert_hills'),
        desert_mountains: this.loadTexture('tile_desert_mountains'),

        mountain: this.loadTexture('tile_mountain'),
        empty: this.loadTexture('border_overlay'),
      },
      selector: this.loadTexture('selector'),
      unit: {
        settler: this.loadTexture('unit_settler'),
        scout: this.loadTexture('unit_scout'),
        builder: this.loadTexture('unit_builder'),
      },
      improvements: {
        settlement: this.loadOverlayTexture('improvement_settlement'),

        farm: this.loadOverlayTexture('improvement_farm'),

        forest: this.loadOverlayTexture('improvement_forest'),
      },
    };
    this.interval;
    this.mouseDownTime = 0;
    this.selectedUnitPos = null;
    this.highlightedTiles = {};
  }

  loadTexture(path: string): HTMLImageElement {
    const texture = document.getElementById(path);
    if (!texture) throw 'Error: Missing Texture';
    if (!(texture instanceof HTMLImageElement)) throw 'Error: Bad Image Element';
    return texture;
  }

  loadOverlayTexture(path: string): {
    offset: number,
    texture: HTMLImageElement,
  } {
    const texture = this.loadTexture(path);
    return {
      offset: texture.height - TILE_HEIGHT,
      texture,
    };
  }

  start(world: World, FPS: number): void {
    [selectorXOffset, selectorYOffset] = [
      world.width * 0.5 + -0.6951295757078696,
      world.height * 0.4614 + 0.5038168562195441,
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

  setPos(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  toCameraPos(world: World, tileX: number, tileY: number): [number, number] {
    const { width, height, civs } = world;
    const camX = -0.5 * X_TILE_SPACING * width + X_TILE_SPACING * tileX + 6.5;
    const camY = -0.5 * height * TILE_HEIGHT + (mod(tileX, 2) * Y_TILE_SPACING) + TILE_HEIGHT * tileY - 1.9;
    return [camX, camY];
  }

  selectUnit(world: World, { x, y }: Coords, unit: Unit): void {
    this.highlightedTiles = world.getTilesInRange(x, y, unit.movement);
    this.selectedUnitPos = [x, y];
    world.on.event.selectUnit({x, y}, unit);
  }

  deselectUnit(world: World): void {
    this.highlightedTiles = {};
    this.selectedUnitPos = null;

    world.on.event.deselectUnit();
  }

  renderUnit(world: World, unit: Unit, x: number, y: number): void {
    const { zoom, x: camX, y: camY, textures, ctx } = this;
    const { width, height, civs } = world;

    const UNIT_WIDTH = (74 * 0.2);
    const UNIT_HEIGHT = (88 * 0.2);
    const UNIT_RECT_HEIGHT = (51 * 0.2);

    // Unit Health Bar
    ctx.fillStyle = unit.hp > 66 ? 'limegreen' : (unit.hp > 33 ? 'gold' : 'red');
    ctx.beginPath();
    ctx.rect(
      (-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5) * zoom,
      (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 1.9) * zoom,
      UNIT_WIDTH * zoom * (unit.hp / 100),
      2 * zoom
    );
    ctx.fill();

    // Unit Color Background
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

    // Bool to keep track of whether a tile has been clicked
    let mapClicked = false;

    // const TILE_SIZE = [28, 25];
    // const UNIT_SCALE = [74, 88];

    const yStart = (Math.round(((camY * zoom) - ((Y_TILE_SPACING * height * zoom) + scy2)) / (TILE_HEIGHT * zoom)) + (height - 2));
    const yEnd = (Math.round(((camY * zoom) - ((Y_TILE_SPACING * height * zoom) + scy1)) / (TILE_HEIGHT * zoom)) + (height + 3));

    const xStart = (Math.round((((camX * zoom) + (X_CLIP_OFFSET * width * zoom)) + scx1) / (X_TILE_SPACING * zoom)) - 1);
    const xEnd = (Math.round((((camX * zoom) + (X_CLIP_OFFSET * width * zoom)) + scx2) / (X_TILE_SPACING * zoom)) + 1);

    const selectedX = Math.round((wmX / X_TILE_SPACING) + selectorXOffset);
    const selectedY = Math.round(((wmY + height) / TILE_HEIGHT) + (selectorYOffset + (mod(selectedX, 2) / -2)));

    this.clear();
    // for (let y = Math.max(yStart, 0); y < Math.min(yEnd, height); y++) {
    for (let yCount = Math.min(yEnd, height) - 0.5; yCount >= Math.max(yStart, 0); yCount -= 0.5) {
      const shiftedXStart = xStart + Number((mod(yCount, 1) === 0) !== (mod(xStart, 2) === 0));

      for (let x = shiftedXStart; x < xEnd; x += 2) {
        const y = Math.floor(yCount);

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

          if (tile.owner) {
            const leftX = (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom;
            const topY = (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom;
            const leftCapXOffset = (TILE_WIDTH - X_TILE_SPACING) * zoom;
            const rightCapXOffset = X_TILE_SPACING * zoom;
            const middleYOffset = ((TILE_HEIGHT - 1) / 2) * zoom;
            const margin = 1 * zoom;

            const positions: [number, number][] = [
              [leftX + rightCapXOffset - margin, topY + margin],
              [leftX + (TILE_WIDTH * zoom) - margin, topY + middleYOffset],
              [leftX + rightCapXOffset - margin, topY + (TILE_HEIGHT * zoom) - margin],
              [leftX + leftCapXOffset + margin, topY + (TILE_HEIGHT * zoom) - margin],
              [leftX + margin, topY + middleYOffset],
              [leftX + leftCapXOffset + margin, topY + margin],
            ];

            const neighbors = world.getNeighbors(x, y, false);
            ctx.beginPath();
            ctx.lineWidth = margin * 2;
            ctx.lineCap='square';
            ctx.strokeStyle = world.civs[tile.owner.civID].color;
            ctx.moveTo(leftX + leftCapXOffset + margin, topY + margin);
            for (let i = 0; i < neighbors.length; i++) {
              const neighbor = world.getTile(...neighbors[i]);
              if (!neighbor) ctx.moveTo(...positions[i]);
              else if (neighbor.owner?.civID === tile.owner.civID) ctx.moveTo(...positions[i]);
              else ctx.lineTo(...positions[i]);
            }
            if (tile.owner.civID === world.player.civID) ctx.setLineDash([5 * zoom, 5 * zoom]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.globalAlpha = 1;

          if (world.pos(x, y) in this.highlightedTiles || (
              this.selectedUnitPos && (world.pos(x, y) === world.pos(...this.selectedUnitPos))
            )) {
            const leftX = (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom;
            const topY = (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom;
            const leftCapXOffset = (TILE_WIDTH - X_TILE_SPACING) * zoom;
            const rightCapXOffset = X_TILE_SPACING * zoom;
            const middleYOffset = ((TILE_HEIGHT - 1) / 2) * zoom;
            const margin = 1 * zoom;

            const positions: [number, number][] = [
              [leftX + rightCapXOffset - margin, topY + margin],
              [leftX + (TILE_WIDTH * zoom) - margin, topY + middleYOffset],
              [leftX + rightCapXOffset - margin, topY + (TILE_HEIGHT * zoom) - margin],
              [leftX + leftCapXOffset + margin, topY + (TILE_HEIGHT * zoom) - margin],
              [leftX + margin, topY + middleYOffset],
              [leftX + leftCapXOffset + margin, topY + margin],
            ];

            const neighbors = world.getNeighbors(x, y, false);
            ctx.beginPath();
            ctx.lineWidth = margin * 2;
            ctx.lineCap='square';
            ctx.strokeStyle = "#66faff";
            ctx.moveTo(leftX + leftCapXOffset + margin, topY + margin);
            for (let i = 0; i < neighbors.length; i++) {
              if (world.pos(...neighbors[i]) in this.highlightedTiles || (
                this.selectedUnitPos && (world.pos(...neighbors[i]) === world.pos(...this.selectedUnitPos))
              )) ctx.moveTo(...positions[i]);
              else ctx.lineTo(...positions[i]);
            }
            ctx.stroke();
          }

          if (x === selectedX && y === selectedY) {

            if (this.mouseDownTime === 1) {

              mapClicked = true;
              world.on.event.selectTile({x, y}, tile);

              console.log(x, y);

              if (this.selectedUnitPos && world.pos(x, y) in this.highlightedTiles) {
                world.moveUnit(this.selectedUnitPos, [x, y], this.highlightedTiles, !!tile.unit);
              }

              this.deselectUnit(world);
            }

            ctx.drawImage(
              textures['selector'] as CanvasImageSource,
              (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
              (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom,
              TILE_WIDTH * zoom,
              TILE_HEIGHT * zoom
            );

            if (tile.unit && this.mouseDownTime === 1 && tile.unit.civID === world.player.civID && ui.turnActive) {
              console.log(tile.unit);
              this.selectUnit(world, { x, y }, tile.unit);
            }
          }

          if (!tile.visible) ctx.globalAlpha = 0.5;

          if (tile.improvement) {
            const overlay = textures.improvements[tile.improvement.type];
            ctx.drawImage(
              overlay.texture as CanvasImageSource,
              (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
              (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) - overlay.offset) * zoom,
              TILE_WIDTH * zoom,
              overlay.texture.height * zoom
            );
          }

          ctx.globalAlpha = 1;

          if (tile.unit) {
            this.renderUnit(world, tile.unit, x, y);
          }
        }
      }
    }

    if (!mapClicked && this.mouseDownTime === 1) {
      this.highlightedTiles = {};
      this.selectedUnitPos = null;
      world.on.event.deselectUnit();
      world.on.event.deselectTile();
    }
  }
}
