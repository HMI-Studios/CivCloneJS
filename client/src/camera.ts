const DEFAULT_COLOR = '#333';
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
    missing: HTMLImageElement,
    missing_overlay: OverlayTexture,
    tile: { [key: string]: HTMLImageElement },
    selector: HTMLImageElement,
    unit: { [key: string]: HTMLImageElement },
    improvements: { [key: string]: OverlayTexture },
  };
  interval?: NodeJS.Timer;
  mouseDownTime: number;
  selectedUnitPos: Coords | null;
  highlightedTiles: { [key: string]: Coords };
  hoverPos: Coords | null;
  showTradeRoutes: boolean;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw 'Canvas Context Error';
    this.ctx = ctx;

    this.textures = {
      missing: this.loadTexture('missing'),
      missing_overlay: this.loadOverlayTexture('missing'),
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
        warrior: this.loadTexture('unit_warrior'),
        slinger: this.loadTexture('unit_slinger'),
        archer: this.loadTexture('unit_archer'),
        builder: this.loadTexture('unit_builder'),
      },
      improvements: {
        settlement: this.loadOverlayTexture('improvement_settlement'),
        worksite: this.loadOverlayTexture('improvement_worksite'),

        encampment: this.loadOverlayTexture('improvement_encampment'),
        campus: this.loadOverlayTexture('improvement_campus'),

        wall_1_0: this.loadOverlayTexture('walls_0'),
        wall_1_1: this.loadOverlayTexture('walls_1'),
        wall_1_2: this.loadOverlayTexture('walls_2'),
        wall_1_3: this.loadOverlayTexture('walls_3'),
        wall_1_4: this.loadOverlayTexture('walls_4'),
        wall_1_5: this.loadOverlayTexture('walls_5'),

        wall_2_0: this.loadOverlayTexture('open_gate_0'),
        wall_2_1: this.loadOverlayTexture('open_gate_1'),
        wall_2_2: this.loadOverlayTexture('open_gate_2'),
        wall_2_3: this.loadOverlayTexture('open_gate_3'),
        wall_2_4: this.loadOverlayTexture('open_gate_4'),
        wall_2_5: this.loadOverlayTexture('open_gate_5'),

        wall_3_0: this.loadOverlayTexture('closed_gate_0'),
        wall_3_1: this.loadOverlayTexture('closed_gate_1'),
        wall_3_2: this.loadOverlayTexture('closed_gate_2'),
        wall_3_3: this.loadOverlayTexture('closed_gate_3'),
        wall_3_4: this.loadOverlayTexture('closed_gate_4'),
        wall_3_5: this.loadOverlayTexture('closed_gate_5'),

        farm: this.loadOverlayTexture('improvement_farm'),

        forest: this.loadOverlayTexture('improvement_forest'),
      },
    };
    this.interval;
    this.mouseDownTime = 0;
    this.selectedUnitPos = null;
    this.highlightedTiles = {};
    this.showTradeRoutes = false;
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
    if (this.interval) throw 'Camera already started!';
    [selectorXOffset, selectorYOffset] = [
      world.width * 0.5 + -0.6951295757078696,
      world.height * 0.4614 + 0.5038168562195441,
    ];
    this.interval = setInterval(() => this.render(world), FPS);
  }

  stop(): void {
    if (this.interval !== undefined) clearInterval(this.interval);
    delete this.interval;
    this.clear();
  }

  clear(): void {
    this.ctx.clearRect(
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );
  }

  setPos(pos: Coords): void {
    this.x = pos.x;
    this.y = pos.y;
  }

  toCameraPos(world: World, tilePos: Coords): Coords {
    const { width, height, civs } = world;
    const camX = -0.5 * X_TILE_SPACING * width + X_TILE_SPACING * tilePos.x + 6.5;
    const camY = -0.5 * height * TILE_HEIGHT + (mod(tilePos.x, 2) * Y_TILE_SPACING) + TILE_HEIGHT * tilePos.y - 1.9;
    return { x: camX, y: camY };
  }

  selectUnit(world: World, { x, y }: Coords, unit: Unit): void {
    this.highlightedTiles = world.getTilesInRange({x, y}, unit.movement);
    this.selectedUnitPos = {x, y};
    world.on.event.selectUnit({x, y}, unit);
  }

  deselectUnit(world: World): void {
    this.highlightedTiles = {};
    world.on.event.deselectUnit(this.selectedUnitPos);
    this.selectedUnitPos = null;
  }

  // The `render` and `renderUnit` methods are exempt from using Coord type, as they must store the `x` and `y` variables separately.
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

    if (unit.cloaked) ctx.globalAlpha = 0.5;

    // Unit Color Background
    ctx.fillStyle = unit.domainID.type === DomainType.CIVILIZATION ? (civs[unit.domainID.subID]?.color ?? DEFAULT_COLOR) : DEFAULT_COLOR;
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
      (textures.unit[unit.type] ?? textures.missing) as CanvasImageSource,
      (-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5) * zoom,
      (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 5) * zoom,
      UNIT_WIDTH * zoom,
      UNIT_HEIGHT * zoom
    );

    ctx.globalAlpha = 1;
  }

  drawTileLine(x1, y1, x2, y2) {
    const { zoom, x: camX, y: camY, textures, ctx } = this;
    const { width, height } = world;

    const leftX1 = (-camX + ((x1 - (width / 2)) * X_TILE_SPACING)) * zoom;
    const topY1 = (camY - (((y1 - (height / 2)) * TILE_HEIGHT) + (mod(x1, 2) * Y_TILE_SPACING))) * zoom;
    const leftX2 = (-camX + ((x2 - (width / 2)) * X_TILE_SPACING)) * zoom;
    const topY2 = (camY - (((y2 - (height / 2)) * TILE_HEIGHT) + (mod(x2, 2) * Y_TILE_SPACING))) * zoom;
    const middleYOffset = ((TILE_HEIGHT - 1) / 2) * zoom;

    const center1: [number, number] = [leftX1 + (TILE_WIDTH / 2 * zoom), topY1 + middleYOffset];
    const center2: [number, number] = [leftX2 + (TILE_WIDTH / 2 * zoom), topY2 + middleYOffset];
    const offset: [number, number] = [(center2[0] - center1[0]) / 2, (center2[1] - center1[1]) / 2];

    ctx.beginPath();
    ctx.lineWidth = zoom * 2;
    ctx.lineCap='round';
    ctx.strokeStyle = '#66faff';
    ctx.moveTo(...center1);
    ctx.lineTo(center1[0] + offset[0], center1[1] + offset[1]);
    ctx.stroke();
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

    const selectedPath = {};
    if (this.selectedUnitPos && this.hoverPos && world.posIndex(this.hoverPos) in this.highlightedTiles) {
      let i = 0;
      let curPos = this.hoverPos;
      let prevPos: Coords | null = null;
      while (i < 100 && !world.areSameCoords(curPos, this.selectedUnitPos)) {
        const nextPos = this.highlightedTiles[world.posIndex(curPos)];
        selectedPath[world.posIndex(curPos)] = [prevPos, nextPos];
        prevPos = curPos;
        curPos = nextPos;
      }
      selectedPath[world.posIndex(curPos)] = [prevPos, null];
    }

    const tradeRoutePaths = {};
    if (this.showTradeRoutes) {
      for (const route of world.tradeRoutes) {
        let prevPos: Coords | null = null;
        for (const curPos of route.path) {
          if (!tradeRoutePaths[world.posIndex(curPos)]) {
            tradeRoutePaths[world.posIndex(curPos)] = new Set();
          }
          if (prevPos) {
            tradeRoutePaths[world.posIndex(curPos)].add(world.getDirection(curPos, prevPos));
            tradeRoutePaths[world.posIndex(prevPos)].add(world.getDirection(prevPos, curPos));
          }
          prevPos = curPos
        }
      }
    }

    // for (let y = Math.max(yStart, 0); y < Math.min(yEnd, height); y++) {
    for (let yCount = Math.min(yEnd, height) - 0.5; yCount >= Math.max(yStart, 0); yCount -= 0.5) {
      const shiftedXStart = xStart + Number((mod(yCount, 1) === 0) !== (mod(xStart, 2) === 0));

      for (let x = shiftedXStart; x < xEnd; x += 2) {
        const y = Math.floor(yCount);

        const tile = world.getTile({x, y});
        if (tile) {

          const hasWalls = tile.walls.reduce((sum, wall) => (sum + (wall === null ? 0 : 1)), 0) > 0;

          if (!tile.visible) ctx.globalAlpha = 0.5;

          ctx.drawImage(
            (textures.tile[tile.type] ?? textures.missing) as CanvasImageSource,
            (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
            (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom,
            TILE_WIDTH * zoom,
            TILE_HEIGHT * zoom
          );

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

          if (hasWalls) {
            for (const i of [0, 5, 1]) {
              if (tile.walls[i] !== null) {
                const overlay = textures.improvements[`wall_${tile.walls[i].type}_${i}`] ?? textures.missing_overlay;
                ctx.drawImage(
                  overlay.texture as CanvasImageSource,
                  (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
                  (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) - overlay.offset) * zoom,
                  TILE_WIDTH * zoom,
                  overlay.texture.height * zoom
                );
              }
            }
          }

          if (tile.owner && !tile.owner.isBarbarian) {
            const neighbors = world.getNeighbors({x, y}, false);
            ctx.beginPath();
            ctx.lineWidth = margin * 2;
            ctx.lineCap='square';
            ctx.strokeStyle = tile.owner.civID ? world.civs[tile.owner.civID.subID].color : DEFAULT_COLOR;
            ctx.moveTo(leftX + leftCapXOffset + margin, topY + margin);
            for (let i = 0; i < neighbors.length; i++) {
              const neighbor = world.getTile(neighbors[i]);
              if (!neighbor) ctx.moveTo(...positions[i]);
              else if (compareDomainIDs(neighbor.owner?.civID, tile.owner.civID) || neighbor.owner?.id === tile.owner.id) ctx.moveTo(...positions[i]);
              else ctx.lineTo(...positions[i]);
            }
            if (world.playerControlsTile(tile)) ctx.setLineDash([5 * zoom, 5 * zoom]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.globalAlpha = 1;

          if (world.posIndex({x, y}) in this.highlightedTiles || (
              this.selectedUnitPos && (world.posIndex({x, y}) === world.posIndex(this.selectedUnitPos))
            )) {
            const neighbors = world.getNeighbors({x, y}, false);
            ctx.beginPath();
            ctx.lineWidth = margin * 2;
            ctx.lineCap='square';
            ctx.strokeStyle = "#66faff";
            ctx.moveTo(leftX + leftCapXOffset + margin, topY + margin);
            for (let i = 0; i < neighbors.length; i++) {
              if (world.posIndex(neighbors[i]) in this.highlightedTiles || (
                this.selectedUnitPos && (world.posIndex(neighbors[i]) === world.posIndex(this.selectedUnitPos))
              )) ctx.moveTo(...positions[i]);
              else ctx.lineTo(...positions[i]);
            }
            ctx.stroke();
          }

          if (x === selectedX && y === selectedY) {

            this.hoverPos = {x, y};

            if (this.mouseDownTime === 1) {

              mapClicked = true;
              world.on.event.selectTile({x, y}, tile);

              console.log(x, y);

              if (this.selectedUnitPos) {
                const selectedUnit = world.getTile(this.selectedUnitPos).unit;
                if (tile.unit && selectedUnit.promotionClass === PromotionClass.RANGED && !world.playerControlsUnit(tile.unit)) {
                  world.attack(this.selectedUnitPos, {x, y}, selectedUnit as RangedUnit);
                } else if (world.posIndex({x, y}) in this.highlightedTiles) {
                  world.moveUnit(this.selectedUnitPos, {x, y}, this.highlightedTiles, !!tile.unit);
                } else {
                  this.deselectUnit(world);
                }
              }
            }

            ctx.drawImage(
              textures['selector'] as CanvasImageSource,
              (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
              (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom,
              TILE_WIDTH * zoom,
              TILE_HEIGHT * zoom
            );

            if (tile.unit && this.mouseDownTime === 1 && world.playerControlsUnit(tile.unit) && ui.turnActive) {
              console.log(tile.unit);
              this.selectUnit(world, { x, y }, tile.unit);
            }
          }

          if (!tile.visible) ctx.globalAlpha = 0.5;

          if (tile.improvement) {
            const overlay = textures.improvements[tile.improvement.type] ?? textures.missing_overlay;
            ctx.drawImage(
              overlay.texture as CanvasImageSource,
              (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
              (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) - overlay.offset) * zoom,
              TILE_WIDTH * zoom,
              overlay.texture.height * zoom
            );
          }

          ctx.globalAlpha = 1;

          if (this.showTradeRoutes && tradeRoutePaths[world.posIndex({x, y})]) {
            for (let direction = 0; direction < 6; direction++) {
              if (tradeRoutePaths[world.posIndex({x, y})].has(direction)) {
                const { x: otherX, y: otherY } = getCoordsDial({x, y})[direction];
                this.drawTileLine(x, y, world.adjacentify(x, otherX), otherY);
              }
            }
          }

          if (tile.unit) {
            this.renderUnit(world, tile.unit, x, y);
          }

          if (!tile.visible) ctx.globalAlpha = 0.5;

          if (hasWalls) {
            for (const i of [2, 3, 4]) {
              if (tile.walls[i] !== null) {
                const overlay = textures.improvements[`wall_${tile.walls[i].type}_${i}`] ?? textures.missing_overlay;
                ctx.drawImage(
                  overlay.texture as CanvasImageSource,
                  (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom,
                  (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) - overlay.offset) * zoom,
                  TILE_WIDTH * zoom,
                  overlay.texture.height * zoom
                );
              }
            }
          }

          ctx.globalAlpha = 1;

          if (selectedPath[world.posIndex({x, y})]) {
            const [ prevPos, nextPos ] = selectedPath[world.posIndex({x, y})];
            if (prevPos) {
              const { x: x1, y: y1 } = prevPos;
              this.drawTileLine(x, y, world.adjacentify(x, x1), y1);
            }
            if (nextPos) {
              const { x: x2, y: y2 } = nextPos;
              this.drawTileLine(x, y, world.adjacentify(x, x2), y2);
            }
          }
        }
      }
    }

    // if (this.selectedUnitPos && this.hoverPos && world.posIndex(this.hoverPos) in this.highlightedTiles) {
    //   let i = 0;
    //   let curPos = this.hoverPos;
    //   while (i < 100 && !world.areSameCoords(curPos, this.selectedUnitPos)) {
    //     const { x, y } = this.highlightedTiles[world.posIndex(curPos)];
    //     this.drawTileLine(curPos.x, curPos.y, x, y);
    //     curPos = this.highlightedTiles[world.posIndex(curPos)];
    //   }
    // }

    if (!mapClicked && this.mouseDownTime === 1) {
      this.highlightedTiles = {};
      world.on.event.deselectUnit(this.selectedUnitPos);
      world.on.event.deselectTile();
      this.selectedUnitPos = null;
    }
  }
}
