export const leaderTemplates = [
  { color: '#820000', textColor: '#ccc', name: 'Rokun' }, // RICH RED
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

  constructor(id: number) {
    const { color, textColor, name } = leaderTemplates[id];
    this.id = id;
    this.color = color;
    this.textColor = textColor;
    this.secondaryColor = color;
    this.name = name;
    this.civID = null;
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
