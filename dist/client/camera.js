const [TILE_WIDTH, TILE_HEIGHT] = [28, 26];
const X_TILE_SPACING = TILE_WIDTH * 3 / 4;
const Y_TILE_SPACING = TILE_HEIGHT / 2;
const X_CLIP_OFFSET = X_TILE_SPACING * Math.cos(60 * (Math.PI / 180));
let [selectorXOffset, selectorYOffset] = [0, 0];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.canvas = document.getElementById('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx)
            throw 'Canvas Context Error';
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
                farm: this.loadOverlayTexture('improvement_farm'),
                forest: this.loadOverlayTexture('improvement_forest'),
            },
        };
        this.interval;
        this.mouseDownTime = 0;
        this.selectedUnitPos = null;
        this.highlightedTiles = {};
    }
    loadTexture(path) {
        const texture = document.getElementById(path);
        if (!texture)
            throw 'Error: Missing Texture';
        if (!(texture instanceof HTMLImageElement))
            throw 'Error: Bad Image Element';
        return texture;
    }
    loadOverlayTexture(path) {
        const texture = this.loadTexture(path);
        return {
            offset: texture.height - TILE_HEIGHT,
            texture,
        };
    }
    start(world, FPS) {
        if (this.interval)
            throw 'Camera already started!';
        [selectorXOffset, selectorYOffset] = [
            world.width * 0.5 + -0.6951295757078696,
            world.height * 0.4614 + 0.5038168562195441,
        ];
        this.interval = setInterval(() => this.render(world), FPS);
    }
    stop() {
        if (this.interval !== undefined)
            clearInterval(this.interval);
        delete this.interval;
        this.clear();
    }
    clear() {
        this.ctx.clearRect(-this.canvas.width / 2, -this.canvas.height / 2, this.canvas.width, this.canvas.height);
    }
    setPos(pos) {
        this.x = pos.x;
        this.y = pos.y;
    }
    toCameraPos(world, tilePos) {
        const { width, height, civs } = world;
        const camX = -0.5 * X_TILE_SPACING * width + X_TILE_SPACING * tilePos.x + 6.5;
        const camY = -0.5 * height * TILE_HEIGHT + (mod(tilePos.x, 2) * Y_TILE_SPACING) + TILE_HEIGHT * tilePos.y - 1.9;
        return { x: camX, y: camY };
    }
    selectUnit(world, { x, y }, unit) {
        this.highlightedTiles = world.getTilesInRange({ x, y }, unit.movement);
        this.selectedUnitPos = { x, y };
        world.on.event.selectUnit({ x, y }, unit);
    }
    deselectUnit(world) {
        this.highlightedTiles = {};
        world.on.event.deselectUnit(this.selectedUnitPos);
        this.selectedUnitPos = null;
    }
    // The `render` and `renderUnit` methods are exempt from using Coord type, as they must store the `x` and `y` variables separately.
    renderUnit(world, unit, x, y) {
        var _a;
        const { zoom, x: camX, y: camY, textures, ctx } = this;
        const { width, height, civs } = world;
        const UNIT_WIDTH = (74 * 0.2);
        const UNIT_HEIGHT = (88 * 0.2);
        const UNIT_RECT_HEIGHT = (51 * 0.2);
        // Unit Health Bar
        ctx.fillStyle = unit.hp > 66 ? 'limegreen' : (unit.hp > 33 ? 'gold' : 'red');
        ctx.beginPath();
        ctx.rect((-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5) * zoom, (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 1.9) * zoom, UNIT_WIDTH * zoom * (unit.hp / 100), 2 * zoom);
        ctx.fill();
        if (unit.cloaked)
            ctx.globalAlpha = 0.5;
        // Unit Color Background
        ctx.fillStyle = civs[unit.civID].color;
        ctx.beginPath();
        ctx.rect((-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5) * zoom, (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 5) * zoom, UNIT_WIDTH * zoom, UNIT_RECT_HEIGHT * zoom);
        ctx.arc((-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5 + (UNIT_WIDTH / 2)) * zoom, (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 5 + UNIT_RECT_HEIGHT) * zoom, (UNIT_WIDTH / 2) * zoom, 0, Math.PI);
        ctx.fill();
        ctx.drawImage(((_a = textures.unit[unit.type]) !== null && _a !== void 0 ? _a : textures.missing), (-camX + ((x - (width / 2)) * X_TILE_SPACING) + 6.5) * zoom, (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) + 5) * zoom, UNIT_WIDTH * zoom, UNIT_HEIGHT * zoom);
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
        const center1 = [leftX1 + (TILE_WIDTH / 2 * zoom), topY1 + middleYOffset];
        const center2 = [leftX2 + (TILE_WIDTH / 2 * zoom), topY2 + middleYOffset];
        ctx.beginPath();
        ctx.lineWidth = zoom * 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#66faff';
        ctx.moveTo(...center1);
        ctx.lineTo(...center2);
        ctx.stroke();
    }
    render(world) {
        var _a, _b, _c;
        const { zoom, x: camX, y: camY, textures, ctx } = this;
        const { width, height } = world;
        const [wmX, wmY] = [camX + (mouseX / zoom), camY + (mouseY / zoom)];
        const [scx1, scy1, scx2, scy2] = [
            -this.canvas.width / 2,
            -this.canvas.height / 2,
            this.canvas.width / 2,
            this.canvas.height / 2
        ];
        if (mouseDown) {
            this.mouseDownTime++;
        }
        else {
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
                const tile = world.getTile({ x, y });
                if (tile) {
                    if (!tile.visible)
                        ctx.globalAlpha = 0.5;
                    ctx.drawImage(((_a = textures.tile[tile.type]) !== null && _a !== void 0 ? _a : textures.missing), (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom, (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom, TILE_WIDTH * zoom, TILE_HEIGHT * zoom);
                    const leftX = (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom;
                    const topY = (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom;
                    const leftCapXOffset = (TILE_WIDTH - X_TILE_SPACING) * zoom;
                    const rightCapXOffset = X_TILE_SPACING * zoom;
                    const middleYOffset = ((TILE_HEIGHT - 1) / 2) * zoom;
                    const margin = 1 * zoom;
                    const positions = [
                        [leftX + rightCapXOffset - margin, topY + margin],
                        [leftX + (TILE_WIDTH * zoom) - margin, topY + middleYOffset],
                        [leftX + rightCapXOffset - margin, topY + (TILE_HEIGHT * zoom) - margin],
                        [leftX + leftCapXOffset + margin, topY + (TILE_HEIGHT * zoom) - margin],
                        [leftX + margin, topY + middleYOffset],
                        [leftX + leftCapXOffset + margin, topY + margin],
                    ];
                    if (tile.walls.reduce((sum, wall) => (sum + (wall === null ? 0 : 1)), 0) > 0) {
                        ctx.beginPath();
                        ctx.lineWidth = margin * 4;
                        ctx.lineCap = 'square';
                        ctx.strokeStyle = '#777';
                        ctx.moveTo(leftX + leftCapXOffset + margin, topY + margin);
                        for (let i = 0; i < tile.walls.length; i++) {
                            if (tile.walls[i] === null)
                                ctx.moveTo(...positions[i]);
                            else
                                ctx.lineTo(...positions[i]);
                        }
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    if (tile.owner) {
                        const neighbors = world.getNeighbors({ x, y }, false);
                        ctx.beginPath();
                        ctx.lineWidth = margin * 2;
                        ctx.lineCap = 'square';
                        ctx.strokeStyle = world.civs[tile.owner.civID].color;
                        ctx.moveTo(leftX + leftCapXOffset + margin, topY + margin);
                        for (let i = 0; i < neighbors.length; i++) {
                            const neighbor = world.getTile(neighbors[i]);
                            if (!neighbor)
                                ctx.moveTo(...positions[i]);
                            else if (((_b = neighbor.owner) === null || _b === void 0 ? void 0 : _b.civID) === tile.owner.civID)
                                ctx.moveTo(...positions[i]);
                            else
                                ctx.lineTo(...positions[i]);
                        }
                        if (tile.owner.civID === world.player.civID)
                            ctx.setLineDash([5 * zoom, 5 * zoom]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    ctx.globalAlpha = 1;
                    if (world.posIndex({ x, y }) in this.highlightedTiles || (this.selectedUnitPos && (world.posIndex({ x, y }) === world.posIndex(this.selectedUnitPos)))) {
                        const neighbors = world.getNeighbors({ x, y }, false);
                        ctx.beginPath();
                        ctx.lineWidth = margin * 2;
                        ctx.lineCap = 'square';
                        ctx.strokeStyle = "#66faff";
                        ctx.moveTo(leftX + leftCapXOffset + margin, topY + margin);
                        for (let i = 0; i < neighbors.length; i++) {
                            if (world.posIndex(neighbors[i]) in this.highlightedTiles || (this.selectedUnitPos && (world.posIndex(neighbors[i]) === world.posIndex(this.selectedUnitPos))))
                                ctx.moveTo(...positions[i]);
                            else
                                ctx.lineTo(...positions[i]);
                        }
                        ctx.stroke();
                    }
                    if (x === selectedX && y === selectedY) {
                        this.hoverPos = { x, y };
                        if (this.mouseDownTime === 1) {
                            mapClicked = true;
                            world.on.event.selectTile({ x, y }, tile);
                            console.log(x, y);
                            if (this.selectedUnitPos) {
                                const selectedUnit = world.getTile(this.selectedUnitPos).unit;
                                if (tile.unit && selectedUnit.promotionClass === PromotionClass.RANGED && tile.unit.civID !== world.player.civID) {
                                    world.attack(this.selectedUnitPos, { x, y }, selectedUnit);
                                }
                                else if (world.posIndex({ x, y }) in this.highlightedTiles) {
                                    world.moveUnit(this.selectedUnitPos, { x, y }, this.highlightedTiles, !!tile.unit);
                                }
                                else {
                                    this.deselectUnit(world);
                                }
                            }
                        }
                        ctx.drawImage(textures['selector'], (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom, (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING))) * zoom, TILE_WIDTH * zoom, TILE_HEIGHT * zoom);
                        if (tile.unit && this.mouseDownTime === 1 && tile.unit.civID === world.player.civID && ui.turnActive) {
                            console.log(tile.unit);
                            this.selectUnit(world, { x, y }, tile.unit);
                        }
                    }
                    if (!tile.visible)
                        ctx.globalAlpha = 0.5;
                    if (tile.improvement) {
                        const overlay = (_c = textures.improvements[tile.improvement.type]) !== null && _c !== void 0 ? _c : textures.missing_overlay;
                        ctx.drawImage(overlay.texture, (-camX + ((x - (width / 2)) * X_TILE_SPACING)) * zoom, (camY - (((y - (height / 2)) * TILE_HEIGHT) + (mod(x, 2) * Y_TILE_SPACING)) - overlay.offset) * zoom, TILE_WIDTH * zoom, overlay.texture.height * zoom);
                    }
                    ctx.globalAlpha = 1;
                    if (tile.unit) {
                        this.renderUnit(world, tile.unit, x, y);
                    }
                }
            }
        }
        if (this.selectedUnitPos && this.hoverPos && world.posIndex(this.hoverPos) in this.highlightedTiles) {
            let i = 0;
            let curPos = this.hoverPos;
            while (i < 100 && !world.areSameCoords(curPos, this.selectedUnitPos)) {
                const { x, y } = this.highlightedTiles[world.posIndex(curPos)];
                this.drawTileLine(curPos.x, curPos.y, x, y);
                curPos = this.highlightedTiles[world.posIndex(curPos)];
            }
        }
        this.drawTileLine(1, 6, 1, 7);
        if (!mapClicked && this.mouseDownTime === 1) {
            this.highlightedTiles = {};
            world.on.event.deselectUnit(this.selectedUnitPos);
            world.on.event.deselectTile();
            this.selectedUnitPos = null;
        }
    }
}
//# sourceMappingURL=camera.js.map