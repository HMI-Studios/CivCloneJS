export const leaderTemplates = [
  { color: '#820000', name: 'Rokun' }, // RICH RED
  { color: '#0a2ead', name: 'Azura' }, // BLUE
  { color: '#03a300', name: 'Vertos' }, // GREEN
  { color: '#bd9a02', name: 'Solei' }, // SAND YELLOW
  { color: '#560e8a', name: 'Imperius' }, // ROYAL PURPLE
  { color: '#bd7400', name: 'Baranog' }, // ORANGE
];

export interface LeaderData {
  id: number;
  color: string;
  name: string;
  civID: number | null;
}

export class Leader {
  private id: number;
  private color: string;
  private name: string;
  private civID: number | null;

  constructor(id: number) {
    const { color, name } = leaderTemplates[id];
    this.id = id;
    this.color = color;
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
      name: this.name,
      civID: this.civID,
    };
  }
}
