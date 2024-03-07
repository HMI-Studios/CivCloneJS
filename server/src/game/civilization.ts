import { KnowledgeMap } from './map/tile/knowledge';

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
  id: number;
  color: string;
  textColor: string;
  secondaryColor: string;
  name: string;
  leaderID: number | null;
}

export class Civilization {
  private id: number;
  private color: string;
  private textColor: string;
  private secondaryColor: string;
  private name: string;
  private leaderID: number | null;

  public startingKnowledge: KnowledgeMap;

  constructor(id: number) {
    const { color, textColor, name, startingKnowledge } = civTemplates[id];
    this.id = id;
    this.color = color;
    this.textColor = textColor;
    this.secondaryColor = color;
    this.name = name;
    this.leaderID = null;

    this.startingKnowledge = {
      ...DEFAULT_START_KNOWLEDGE,
      ...startingKnowledge,
    };
  }

  static import(data: any): Civilization {
    const civ = new Civilization(data.id);
    civ.color = data.color;
    civ.textColor = data.textColor;
    civ.secondaryColor = data.secondaryColor;
    civ.name = data.name;
    civ.leaderID = null;
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
      id: this.id,
      color: this.color,
      textColor: this.textColor,
      secondaryColor: this.secondaryColor,
      name: this.name,
      leaderID: this.leaderID,
    };
  }
}
