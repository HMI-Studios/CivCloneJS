import { InternalServerError } from '../utils/error';
import { Civilization, CivilizationData } from './civilization';
import { Tile } from './map/tile';
import { City, CityData } from './map/tile/city';
import { Unit } from './map/tile/unit';
import { Coords } from './world';

export enum DomainType {
  CIVILIZATION,
  CITY,
}

export type DomainID = {
  subID: number,
  type: DomainType,
};

type SpecificTypeDomainID<T extends DomainType> = DomainID & {
  type: T;
};
export type CivDomainID = SpecificTypeDomainID<DomainType.CIVILIZATION>;
export type CityDomainID = SpecificTypeDomainID<DomainType.CITY>;

export const compareDomainIDs = (a: DomainID, b: DomainID): boolean => a.type === b.type && a.subID === b.subID;
export const isCivDomain = (domainID: DomainID): domainID is CivDomainID => domainID.type === DomainType.CIVILIZATION;
export const isCityDomain = (domainID: DomainID): domainID is CityDomainID => domainID.type === DomainType.CITY;

export class Domain {
  public id: number;
  public type: DomainType;
  public units: Unit[];
  protected leader: Leader | null;

  constructor(id: number, type: DomainType) {
    this.id = id;
    this.type = type;
    this.units = [];
    this.leader = null;
  }
  
  public getData(): any {
    throw new InternalServerError('Attempted illegal call to Domain.getData.');
  }

  public getDomainID(): DomainID {
    return {
      subID: this.id,
      type: this.type,
    };
  }

  public setLeader(leader: Leader): void {
    this.leader = leader;
  }

  public clearLeader(): void {
    this.leader = null;
  }

  public hasLeader(): boolean {
    return this.leader !== null;
  }

  public getUnits(): Unit[] {
    return this.units;
  }

  public getUnitPositions(): Coords[] {
    return this.units.map(unit => unit.coords);
  }

  public addUnit(unit: Unit): void {
    this.units.push(unit);
  }

  public removeUnit(unit: Unit): void {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }

  public ownsUnit(unit: Unit): boolean {
    return compareDomainIDs(unit.domainID, this.getDomainID());
  }
}

export interface LeaderData {
  domains: (CivilizationData | CityData)[];
}

export class Leader {
  public id: number;
  private domains: Domain[];
  turnActive: boolean;
  turnFinished: boolean;

  constructor(id: number) {
    this.id = id;
    this.domains = [];
    this.turnActive = false;
    this.turnFinished = false;
  }

  export() {
    return {
      id: this.id,
      turnActive: this.turnActive,
      turnFinished: this.turnFinished,
    };
  }

  static import(data: any): Leader {
    const leader =  new Leader(data.id);
    leader.turnActive = data.turnActive;
    leader.turnFinished = data.turnFinished;
    return leader;
  }

  getData(): LeaderData {
    return {
      domains: this.domains.map(domain => domain.getData()),
    }
  }

  public addDomain(domain: Domain) {
    this.domains.push(domain);
  }

  public removeDomain(domain: Domain) {
    const domainIndex = this.domains.indexOf(domain);
    if (domainIndex > -1) {
      this.domains.splice(domainIndex, 1);
    }
  }

  public getDomainIDs(): DomainID[] {
    return this.domains.map(domain => domain.getDomainID());
  }

  public forEachCivDomainID(callback: (domainID: CivDomainID) => any): void {
    this.getDomainIDs().forEach((domainID => {
      if (isCivDomain(domainID)) callback(domainID);
    }));
  }

  public forEachCityDomainID(callback: (domainID: CityDomainID) => any): void {
    this.getDomainIDs().forEach((domainID => {
      if (isCityDomain(domainID)) callback(domainID);
    }));
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

  controlsUnit(unit: Unit): boolean {
    return this.domains.some(domain => domain.ownsUnit(unit));
  }

  controlsTile(tile: Tile): boolean {
    const owner = tile.owner;
    if (!owner) return false;
    return this.domains.some(domain => (owner.getDomainID() === domain.getDomainID()));
  }
}
