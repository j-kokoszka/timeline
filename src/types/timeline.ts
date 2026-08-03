export type Discipline = 'painting' | 'music' | 'literature' | 'philosophy' | 'architecture' | 'sculpture' | 'general';
export type Language = 'en' | 'pl';

export interface Era {
  id: string;
  name: string;
  namePl?: string;
  discipline: Discipline;
  startYear: number;
  endYear: number;
  color: string;
  description: string;
  descriptionPl?: string;
  tier?: 1 | 2 | 3;
  minZoom?: number;
}

export interface PositionedEra extends Era {
  subRow: number;
  y: number;
  height: number;
}

export interface Relationships {
  influencedBy: string[];
  influenced: string[];
  contemporaries: string[];
  movements: string[];
}

export interface ArtworkEntry {
  id: string;
  title: string;
  titlePl?: string;
  year: number;
  medium?: string;
  location?: string;
  locationPl?: string;
  imageUrl?: string | null;
  description?: string;
  descriptionPl?: string;
}

export interface Artist {
  id: string;
  name: string;
  namePl?: string;
  discipline: Discipline;
  era: string;
  birthYear: number;
  deathYear: number;
  nationality?: string;
  nationalityPl?: string;
  bio: string;
  bioPl?: string;
  notableWorks: string[];
  notableWorksPl?: string[];
  catalog?: ArtworkEntry[]; // Detailed Masterworks Catalog / Oeuvre
  imageUrl?: string | null;
  impactScore?: number; // CultureDB Significance Score (1.0 - 10.0)
  wikidataId?: string;  // Wikidata Entity Q-ID (e.g., Q762 for Leonardo da Vinci)
  metObjectId?: number; // Met Museum Object ID
  relationships: Relationships;
  sources: string[];
}

export interface PositionedArtist extends Artist {
  row: number;
}

export interface TimelineBounds {
  minYear: number;
  maxYear: number;
}
