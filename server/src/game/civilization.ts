import { Domain, DomainID, DomainType, Leader } from './leader';
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
  id: number;
  templateID: number;
  color: string;
  textColor: string;
  secondaryColor: string;
  name: string;
  leader: Leader | null;
}

export class Civilization extends Domain {
  private templateID: number;
  private color: string;
  private textColor: string;
  private secondaryColor: string;
  private name: string;

  public startingKnowledge: KnowledgeMap;

  constructor(id: number, templateID: number) {
    super(id, DomainType.CIVILIZATION);
    const { color, textColor, name, startingKnowledge } = civTemplates[templateID];
    this.templateID = templateID;
    this.color = color;
    this.textColor = textColor;
    this.secondaryColor = color;
    this.name = name;

    this.startingKnowledge = {
      ...DEFAULT_START_KNOWLEDGE,
      ...startingKnowledge,
    };
  }

  export() {
    return {
      ...super.baseExport(),
      templateID: this.templateID,
      color: this.color,
      textColor: this.textColor,
      secondaryColor: this.secondaryColor,
      name: this.name,
    };
  }

  static import(data: any): Civilization {
    const civ = new Civilization(data.id, data.templateID);
    civ.color = data.color;
    civ.textColor = data.textColor;
    civ.secondaryColor = data.secondaryColor;
    civ.name = data.name;
    return civ;
  }

  getData(): CivilizationData {
    return {
      id: this.id,
      templateID: this.templateID,
      color: this.color,
      textColor: this.textColor,
      secondaryColor: this.secondaryColor,
      name: this.name,
      leader: this.leader,
    };
  }
}
