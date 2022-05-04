"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    constructor(civID, connection) {
        this.civID = civID;
        this.ready = false;
        this.isAI = !connection;
        this.connection = connection;
    }
    getData() {
        return {
            civID: this.civID
        };
    }
    reset(connection) {
        this.ready = false;
        this.isAI = !connection;
        this.connection = connection;
    }
}
exports.Player = Player;
//# sourceMappingURL=player.js.map