import { KnowledgeMap } from './map/tile/knowledge';
import { Unit } from './map/tile/unit';
import { Coords } from './world';

const DEFAULT_START_KNOWLEDGE = {
  'start': 100,
  'food_0': 100,
  'military_0': 100,
  'science_1': 100,
}

export const civTemplates = [
  { color: '#820000', textColor: '#ccc', name: 'Rokun', startingKnowledge: { 'science_1': 0, 'military_1': 100 } }, // RICH RED
  { color: '#0a2ead', textColor: '#ccc', name: 'Azura' }, // BLUE
  { color: '#03a300', textColor: '#222', name: 'Vertos' }, // GREEN
  { color: '#bd9a02', textColor: '#222', name: 'Solei' }, // SAND YELLOW
  { color: '#560e8a', textColor: '#ccc', name: 'Imperius' }, // ROYAL PURPLE
  { color: '#bd7400', textColor: '#333', name: 'Baranog' }, // ORANGE
];

export interface CivilizationData {
  templateID: number;
  color: string;
  textColor: string;
  secondaryColor: string;
  name: string;
  leaderID: number | null;
}

export class Civilization {
  private templateID: number;
  private color: string;
  private textColor: string;
  private secondaryColor: string;
  private name: string;
  private leaderID: number | null;

  public units: Unit[];
  public startingKnowledge: KnowledgeMap;

  constructor(templateID: number) {
    const { color, textColor, name, startingKnowledge } = civTemplates[templateID];
    this.templateID = templateID;
    this.color = color;
    this.textColor = textColor;
    this.secondaryColor = color;
    this.name = name;
    this.leaderID = null;

    this.units = [];
    this.startingKnowledge = {
      ...DEFAULT_START_KNOWLEDGE,
      ...startingKnowledge,
    };
  }

  export() {
    return {
      templateID: this.templateID,
      color: this.color,
      textColor: this.textColor,
      secondaryColor: this.secondaryColor,
      name: this.name,
      leaderID: this.leaderID,
      units: this.units.map(unit => unit.export()),
    };
  }

  static import(data: any): Civilization {
    const civ = new Civilization(data.templateID);
    civ.color = data.color;
    civ.textColor = data.textColor;
    civ.secondaryColor = data.secondaryColor;
    civ.name = data.name;
    civ.leaderID = null;
    civ.units = data.units.map((unitData: any) => Unit.import(unitData));
    return civ;
  }

  select(leaderID: number): void {
    this.leaderID = leaderID;
  }

  unselect(): void {
    this.leaderID = null;
  }

  hasLeader(): boolean {
    return this.leaderID !== null;
  }

  getData(): CivilizationData {
    return {
      templateID: this.templateID,
      color: this.color,
      textColor: this.textColor,
      secondaryColor: this.secondaryColor,
      name: this.name,
      leaderID: this.leaderID,
    };
  }

  getUnits(): Unit[] {
    return this.units;
  }

  getUnitPositions(): Coords[] {
    return this.units.map(unit => unit.coords);
  }

  addUnit(unit: Unit): void {
    this.units.push(unit);
  }

  removeUnit(unit: Unit): void {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }
}
