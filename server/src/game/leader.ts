import { Civilization, CivilizationData } from './civilization';
import { City, CityData } from './map/tile/city';
import { Unit } from './map/tile/unit';
import { Coords } from './world';

export interface LeaderData {
  domains: (CivilizationData | CityData)[];
}

export class Leader {
  domains: (Civilization | City)[];
  turnActive: boolean;
  turnFinished: boolean;

  constructor() {
    this.domains = [];
    this.turnActive = false;
    this.turnFinished = false;
  }

  export() {
    return {
      turnActive: this.turnActive,
      turnFinished: this.turnFinished,
    };
  }

  static import(data: any): Leader {
    const leader =  new Leader();
    leader.turnActive = data.turnActive;
    leader.turnFinished = data.turnFinished;
    return leader;
  }

  getData(): LeaderData {
    return {
      domains: this.domains.map(domain => domain.getData()),
    }
  }

  getDomainIDs(): string[] {
    return this.domains.map(domain => domain instanceof Civilization ? `civ_${domain.id}` : `city_${domain.id}`);
  }

  newTurn() {
    this.turnActive = true;
    this.turnFinished = false;

    for (const domain of this.domains) {
      for (const unit of domain.units) {
        unit.newTurn();
      }
    }
  }

  endTurn() {
    this.turnActive = false;
  }

  getUnits(): Unit[] {
    const units: Unit[] = [];
    for (const domain of this.domains) {
      for (const unit of domain.units) {
        units.push(unit);
      }
    }
    return units;
  }

  getUnitPositions(): Coords[] {
    return this.getUnits().map(unit => unit.coords);
  }
}
