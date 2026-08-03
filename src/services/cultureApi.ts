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

  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' art history OR painting OR sculpture OR philosophy OR music')}&utf8=&format=json&origin=*&srlimit=8`;

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
