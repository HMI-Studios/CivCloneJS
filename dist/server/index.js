"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = __importStar(require("ws"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const config_1 = require("./config");
const path_1 = __importDefault(require("path"));
app.use(`${config_1.ADDR_PREFIX}`, express_1.default.static(path_1.default.join(__dirname, '../client')));
app.use(`${config_1.ADDR_PREFIX}/src`, express_1.default.static(path_1.default.join(__dirname, '../../src'))); // FOR DEBUGGING - REMOVE IN PRODUCTION!
app.use(`${config_1.ADDR_PREFIX}/docs`, express_1.default.static(path_1.default.join(__dirname, '../docs')));
const server = app.listen(config_1.PORT, () => {
    console.log(`Server listening at http://localhost:${config_1.PORT}`);
});
const wss = new WebSocket.Server({ server });
const methods_1 = require("./methods");
wss.on('connection', (ws, req) => {
    methods_1.connections.push(ws);
    methods_1.connData.push({
        ws: ws,
        ip: req.socket.remoteAddress,
        username: null,
        gameID: null,
    });
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        }
        catch (err) {
            console.error('Bad JSON recieved from %s', (0, methods_1.getConnData)(ws).ip);
            ws.send(JSON.stringify({ error: ['bad JSON'] }));
            return;
        }
        if (config_1.DEBUG) {
            const { username, ip } = (0, methods_1.getConnData)(ws);
            console.log(`Recieved from ${username} (${ip}):`, JSON.stringify(data));
        }
        if (data.actions) {
            for (let i = 0; i < data.actions.length; i++) {
                const action = data.actions[i][0];
                const args = data.actions[i][1];
                (0, methods_1.executeAction)(ws, action, ...args);
            }
        }
    });
});
//# sourceMappingURL=index.js.map