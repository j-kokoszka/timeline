import { Language } from '../types/timeline';

export const translations = {
  en: {
    brandTitle: 'TIMELINE',
    brandTagline: 'Western Cultural History',
    painting: 'Painting',
    music: 'Music',
    literature: 'Literature',
    philosophy: 'Philosophy',
    architecture: 'Architecture',
    sculpture: 'Sculpture',
    soon: 'Soon',
    lod1: 'Major Eras Overview',
    lod2: 'Movements & Genres',
    lod3: 'Schools & Fine Detail',
    macroErasLane: 'Macro Eras',
    movementsLane: 'Movements',
    schoolsLane: 'Schools',
    networkLegend: 'Network:',
    selectedLegend: 'Selected',
    influencedByLegend: 'Influenced By (Mentors)',
    influencedLegend: 'Influenced (Followers)',
    contemporariesLegend: 'Contemporaries',
    artistsActive: 'Entities',
    clearSelection: 'Clear Selection',
    biography: 'Biography',
    notableWorks: 'Notable Works',
    networkConnections: 'Historical Network & Connections',
    influencedByLabel: 'Influenced By:',
    influencedLabel: 'Influenced:',
    contemporariesLabel: 'Contemporaries:',
    sourcesLabel: 'Sources',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetView: 'Reset View',
    searchPlaceholder: 'Search artists, movements, notable works...',
    allNationalities: 'All Nationalities',
    allCenturies: 'All Centuries',
    topMastersOnly: 'Top Masters (Score ≥ 9.5)',
    favoritesOnly: 'Favorites Only',
    clearFilters: 'Clear Filters',
    matchingCount: 'matching',
    searchHint: 'Press Ctrl+K or / to search'
  },
  pl: {
    brandTitle: 'AXIS CZASU',
    brandTagline: 'Historia Kultury Zachodniej',
    painting: 'Malarstwo',
    music: 'Muzyka',
    literature: 'Literatura',
    philosophy: 'Filozofia',
    architecture: 'Architektura',
    sculpture: 'Rzeźba',
    soon: 'Wkrótce',
    lod1: 'Przegląd Głównych Epok',
    lod2: 'Nurty i Gatunki',
    lod3: 'Szkoły i Detale',
    macroErasLane: 'Główne Epoki',
    movementsLane: 'Nurty i Style',
    schoolsLane: 'Szkoły',
    networkLegend: 'Relacje:',
    selectedLegend: 'Wybrany Twórca',
    influencedByLegend: 'Wpływy (Mentorzy)',
    influencedLegend: 'Wpływ na innych',
    contemporariesLegend: 'Współcześni',
    artistsActive: 'Postaci',
    clearSelection: 'Wyczyść wybór',
    biography: 'Biografia',
    notableWorks: 'Znaczące Dzieła',
    networkConnections: 'Sieć Powiązań Historycznych',
    influencedByLabel: 'Wpływ wywarli:',
    influencedLabel: 'Wpływ na:',
    contemporariesLabel: 'Współcześni:',
    sourcesLabel: 'Źródła',
    zoomIn: 'Przybliż',
    zoomOut: 'Oddal',
    resetView: 'Zresetuj Widok',
    searchPlaceholder: 'Szukaj twórców, nurtów, dzieł...',
    allNationalities: 'Wszystkie narodowości',
    allCenturies: 'Wszystkie wieki',
    topMastersOnly: 'Najwięksi Mistrzowie (Ocena ≥ 9.5)',
    favoritesOnly: 'Tylko Ulubione',
    clearFilters: 'Wyczyść filtry',
    matchingCount: 'wyników',
    searchHint: 'Naciśnij Ctrl+K lub / aby szukać'
  }
};

export function getUIText(key: keyof typeof translations.en, lang: Language): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}

export function getLocalizedString<T extends Record<string, any>>(
  obj: T,
  field: keyof T,
  lang: Language
): string {
  if (lang === 'pl') {
    const plField = `${String(field)}Pl` as keyof T;
    if (obj[plField] && typeof obj[plField] === 'string' && (obj[plField] as string).length > 0) {
      return obj[plField] as string;
    }
  }
  return (obj[field] as string) || '';
}
