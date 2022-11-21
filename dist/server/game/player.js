"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    constructor(civID, connection) {
        this.civID = civID;
        this.ready = false;
        this.connection = connection;
    }
    export() {
        return {
            civID: this.civID,
        };
    }
    static import(data) {
        return new Player(data.civID, null);
    }
    isAI() {
        return this.connection === null;
    }
    getData() {
        return {
            civID: this.civID
        };
    }
    reset(connection) {
        this.ready = false;
        this.connection = connection;
    }
    send(msg) {
        if (!this.connection) {
            // TODO - do AI things
            return;
        }
        else {
            this.connection.send(msg);
        }
    }
}
exports.Player = Player;
//# sourceMappingURL=player.js.map