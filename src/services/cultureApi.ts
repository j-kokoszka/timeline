import { Era, Discipline } from '../types/timeline';

export interface CulturalEntityData {
  title: string;
  thumbnailUrl: string | null;
  originalImageUrl: string | null;
  summary: string | null;
  wikipediaUrl: string | null;
  snippet?: string;
  pageid?: number;
}

export interface ArtworkData {
  title: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  wikipediaUrl: string | null;
}

const CACHE_KEY_PREFIX = 'culturedb_cache_';
const ARTWORK_CACHE_PREFIX = 'culturedb_artwork_cache_';

export async function fetchCulturalEntityData(
  artistName: string,
  wikidataId?: string
): Promise<CulturalEntityData> {
  const cacheKey = `${CACHE_KEY_PREFIX}${wikidataId || artistName.toLowerCase().replace(/\s+/g, '_')}`;

  // 1. Check localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object' && parsed.timestamp && (Date.now() - parsed.timestamp < 7 * 24 * 3600 * 1000)) {
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e);
  }

  // 2. Fetch from Wikipedia REST API
  const formattedName = encodeURIComponent(artistName.replace(/\s+/g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${formattedName}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    const data: CulturalEntityData = {
      title: json.title || artistName,
      thumbnailUrl: json.thumbnail?.source || null,
      originalImageUrl: json.originalimage?.source || json.thumbnail?.source || null,
      summary: json.extract || null,
      wikipediaUrl: json.content_urls?.desktop?.page || null
    };

    // Store in cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (e) {
      // Storage quota exceeded
    }

    return data;
  } catch (err) {
    console.warn(`Failed to fetch Wikipedia data for ${artistName}:`, err);
    return {
      title: artistName,
      thumbnailUrl: null,
      originalImageUrl: null,
      summary: null,
      wikipediaUrl: `https://en.wikipedia.org/wiki/${formattedName}`
    };
  }
}

export async function fetchArtworkData(workTitle: string): Promise<ArtworkData | null> {
  const cacheKey = `${ARTWORK_CACHE_PREFIX}${workTitle.toLowerCase().replace(/\s+/g, '_')}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (Date.now() - parsed.timestamp < 7 * 24 * 3600 * 1000)) {
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignore cache error
  }

  const formattedTitle = encodeURIComponent(workTitle.replace(/\s+/g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${formattedTitle}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();

    const data: ArtworkData = {
      title: json.title || workTitle,
      imageUrl: json.originalimage?.source || json.thumbnail?.source || null,
      thumbnailUrl: json.thumbnail?.source || null,
      description: json.extract || null,
      wikipediaUrl: json.content_urls?.desktop?.page || null
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (e) {}

    return data;
  } catch (err) {
    return null;
  }
}

/** Live Search across Wikipedia API for any cultural entity worldwide */
export async function searchExternalWikipediaEntities(query: string): Promise<CulturalEntityData[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' art history OR painting OR sculpture OR philosophy OR music OR composer')}&utf8=&format=json&origin=*&srlimit=8`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const searchHits = json.query?.search || [];

    const results = await Promise.all(
      searchHits.map(async (hit: any) => {
        const entityData = await fetchCulturalEntityData(hit.title);
        return {
          ...entityData,
          snippet: hit.snippet?.replace(/<\/?[^>]+(>|$)/g, ""),
          pageid: hit.pageid
        };
      })
    );

    return results.filter(r => r.thumbnailUrl || r.summary);
  } catch (e) {
    console.warn('Wikipedia search error:', e);
    return [];
  }
}

/** Featured World Masterpieces Pool for Random Exploration */
const RANDOM_MASTERPIECES_POOL = [
  'The Starry Night', 'The School of Athens', 'The Night Watch',
  'Girl with a Pearl Earring', 'David (Michelangelo)', 'The Birth of Venus',
  'The Last Supper (Leonardo)', 'The Creation of Adam', 'The Scream',
  'Guernica (Picasso)', 'Las Meninas', 'The Hay Wain', 'The Kiss (Klimt)',
  'Liberty Leading the People', 'Nighthawks (painting)', 'The Great Wave off Kanagawa',
  'The Garden of Earthly Delights', 'Wanderer above the Sea of Fog'
];

export async function fetchRandomCulturalMasterpiece(): Promise<ArtworkData | null> {
  const randomIndex = Math.floor(Math.random() * RANDOM_MASTERPIECES_POOL.length);
  const selectedTitle = RANDOM_MASTERPIECES_POOL[randomIndex];
  return fetchArtworkData(selectedTitle);
}

/** Smart Auto-Detection of Discipline, Lifespan Years, and Era from Wikipedia Data */
export function autoDetectArtistDetails(title: string, summary: string | null, allEras: Era[]): {
  birthYear: number;
  deathYear: number;
  discipline: Discipline;
  eraId: string;
} {
  const text = `${title} ${summary || ''}`.toLowerCase();

  // 1. Detect Discipline from content
  let discipline: Discipline = 'painting';
  if (/composer|music|opera|symphony|orchestra|choir|piano|violin|moniuszko|chopin|bach|beethoven|mozart|tchaikovsky|liszt/i.test(text)) {
    discipline = 'music';
  } else if (/philosopher|ethics|logic|metaphysics|epistemology|nietzsche|kant|descartes|plato|aristotle/i.test(text)) {
    discipline = 'philosophy';
  } else if (/architect|building|cathedral|basilica|structure|palace|corbusier|brunelleschi|gaudi/i.test(text)) {
    discipline = 'architecture';
  } else if (/sculptor|statue|marble|bronze|bust|relief|michelangelo|rodin|bernini|canova/i.test(text)) {
    discipline = 'sculpture';
  } else if (/poet|novelist|playwright|writer|literature|prose|dante|shakespeare|goethe|mickiewicz|słowacki/i.test(text)) {
    discipline = 'literature';
  }

  // 2. Extract Lifespan Years via RegEx
  let birthYear = 1800;
  let deathYear = 1870;

  const yearMatch = text.match(/\b(\d{3,4})\s*(?:–|-|to)\s*(\d{3,4})\b/);
  if (yearMatch) {
    birthYear = parseInt(yearMatch[1]);
    deathYear = parseInt(yearMatch[2]);
  } else {
    const bornMatch = text.match(/\b(?:born|b\.)\s*(\d{3,4})\b/i);
    if (bornMatch) {
      birthYear = parseInt(bornMatch[1]);
      deathYear = birthYear + 65;
    }
  }

  // 3. Check if eras exist for the detected discipline
  const disciplineEras = allEras.filter(e => e.discipline === discipline);

  // If no eras exist for the detected discipline, fall back to 'painting' for timeline placement
  // (currently only painting eras are defined in the data)
  const effectiveDiscipline: Discipline = disciplineEras.length > 0 ? discipline : 'painting';
  const searchEras = disciplineEras.length > 0 ? disciplineEras : allEras.filter(e => e.discipline === 'painting');

  // 4. Match Era by birth year
  const matchedEra = searchEras.find(e =>
    e.startYear <= birthYear &&
    e.endYear >= birthYear
  ) || searchEras[searchEras.length - 1] || allEras[0];

  return {
    birthYear,
    deathYear,
    discipline: effectiveDiscipline,
    eraId: matchedEra ? matchedEra.id : 'modern-contemporary-macro'
  };
}
