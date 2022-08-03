var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
let camera;
let ui;
let world;
const resize = () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2);
    ctx.imageSmoothingEnabled = false;
    camera.render(world);
};
window.onload = () => {
    resize();
};
window.onresize = resize;
const rootElement = document.getElementById('UI'); // FIXME;
if (!rootElement)
    throw 'Root UI Element Missing';
rootElement.onwheel = (evt) => {
    const canvas = document.getElementById('canvas');
    const { zoom } = camera;
    if (evt.deltaY > 0) {
        const { height } = world;
        const scy2 = canvas.height / 2;
        const yStart = (Math.round((-((12.5 * height * zoom) + scy2)) / (25 * zoom)) + (height - 2));
        if (yStart > 1) {
            camera.zoom *= 0.9;
        }
    }
    else {
        if (zoom < 10) {
            camera.zoom *= 1.1;
        }
    }
};
let mouseX = 0;
let mouseY = 0;
let oldX = 0;
let oldY = 0;
let clickX = 0;
let clickY = 0;
let mouseDown = false;
const getMousePos = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect();
    const pos = {
        x: Math.floor((evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
        y: Math.floor((evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
    };
    return pos;
};
rootElement.onmousemove = (evt) => {
    const canvas = document.getElementById('canvas');
    const mousePos = getMousePos(canvas, evt);
    mouseX = mousePos.x - Math.round(canvas.width / 2);
    mouseY = canvas.height - (mousePos.y + Math.round(canvas.height / 2));
    // selX = x+mouseX/size;
    // selY = y+mouseY/size;
    if (mouseDown) {
        camera.x = oldX - ((mouseX - clickX) / camera.zoom);
        camera.y = oldY - ((mouseY - clickY) / camera.zoom);
    }
};
rootElement.onmousedown = function (evt) {
    if (evt.target === rootElement) {
        const canvas = document.getElementById('canvas');
        const mousePos = getMousePos(canvas, evt);
        clickX = mousePos.x - Math.round(canvas.width / 2);
        clickY = canvas.height - (mousePos.y + Math.round(canvas.height / 2));
        mouseDown = true;
        oldX = camera.x;
        oldY = camera.y;
    }
};
rootElement.onmouseup = function () {
    mouseDown = false;
    oldX = camera.x;
    oldY = camera.y;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mod = (a, b) => {
    if (a >= 0) {
        return a % b;
    }
    else {
        return ((a % b) + b) % b;
    }
};
const main = () => __awaiter(this, void 0, void 0, function* () {
    // const SERVER_IP = '192.168.5.47:8080';
    // const SERVER_IP = '192.168.4.29:8080';
    // const SERVER_IP = 'hmi.dynu.net:8080';
    // const SERVER_IP = 'localhost:8080';
    camera = new Camera();
    ui = new UI();
    world = new World();
    yield world.setup(camera, ui);
});
main();
//# sourceMappingURL=app.js.map