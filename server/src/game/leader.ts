import { KnowledgeMap } from './map/tile/knowledge';

const DEFAULT_START_KNOWLEDGE = {
  'start': 100,
  'food_0': 100,
  'military_0': 100,
  'science_1': 100,
}

export const leaderTemplates = [
  { color: '#820000', textColor: '#ccc', name: 'Rokun', startingKnowledge: { 'science_1': 0, 'military_1': 100 } }, // RICH RED
  { color: '#0a2ead', textColor: '#ccc', name: 'Azura' }, // BLUE
  { color: '#03a300', textColor: '#222', name: 'Vertos' }, // GREEN
  { color: '#bd9a02', textColor: '#222', name: 'Solei' }, // SAND YELLOW
  { color: '#560e8a', textColor: '#ccc', name: 'Imperius' }, // ROYAL PURPLE
  { color: '#bd7400', textColor: '#333', name: 'Baranog' }, // ORANGE
];

export interface LeaderData {
  id: number;
  color: string;
  textColor: string;
  secondaryColor: string;
  name: string;
  civID: number | null;
}

export class Leader {
  private id: number;
  private color: string;
  private textColor: string;
  private secondaryColor: string;
  private name: string;
  private civID: number | null;

  public startingKnowledge: KnowledgeMap;

  constructor(id: number) {
    const { color, textColor, name, startingKnowledge } = leaderTemplates[id];
    this.id = id;
    this.color = color;
    this.textColor = textColor;
    this.secondaryColor = color;
    this.name = name;
    this.civID = null;

    this.startingKnowledge = {
      ...DEFAULT_START_KNOWLEDGE,
      ...startingKnowledge,
    };
  }

  static import(data: any): Leader {
    const leader = new Leader(data.id);
    leader.color = data.color;
    leader.textColor = data.textColor;
    leader.secondaryColor = data.secondaryColor;
    leader.name = data.name;
    leader.civID = null;
    return leader;
  }

  select(civID: number): void {
    this.civID = civID;
  }

  unselect(): void {
    this.civID = null;
  }

  isTaken(): boolean {
    return this.civID !== null;
  }

  getData(): LeaderData {
    return {
      id: this.id,
      color: this.color,
      textColor: this.textColor,
      secondaryColor: this.secondaryColor,
      name: this.name,
      civID: this.civID,
    };
  }
}
