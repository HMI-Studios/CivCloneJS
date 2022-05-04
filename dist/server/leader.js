"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Leader = exports.leaderTemplates = void 0;
exports.leaderTemplates = [
    { color: '#820000', name: 'Rokun' },
    { color: '#0a2ead', name: 'Azura' },
    { color: '#03a300', name: 'Vertos' },
    { color: '#bd9a02', name: 'Solei' },
    { color: '#560e8a', name: 'Imperius' },
    { color: '#bd7400', name: 'Baranog' }, // ORANGE
];
class Leader {
    constructor(id) {
        const { color, name } = exports.leaderTemplates[id];
        this.id = id;
        this.color = color;
        this.name = name;
        this.civID = null;
    }
    select(civID) {
        this.civID = civID;
    }
    unselect() {
        this.civID = null;
    }
    isTaken() {
        return this.civID !== null;
    }
    getData() {
        return {
            id: this.id,
            color: this.color,
            name: this.name,
            civID: this.civID,
        };
    }
}
exports.Leader = Leader;
//# sourceMappingURL=leader.js.map