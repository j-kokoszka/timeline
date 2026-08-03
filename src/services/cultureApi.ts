export interface CulturalEntityData {
  title: string;
  thumbnailUrl: string | null;
  originalImageUrl: string | null;
  summary: string | null;
  wikipediaUrl: string | null;
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
      console.warn('Cache write error:', e);
    }

    return data;
  } catch (err) {
    console.warn(`Could not fetch live Wikipedia data for ${artistName}:`, err);
    return {
      title: artistName,
      thumbnailUrl: null,
      originalImageUrl: null,
      summary: null,
      wikipediaUrl: `https://en.wikipedia.org/wiki/${formattedName}`
    };
  }
}

// Fetch high-res artwork image & description for a specific notable work (e.g. Mona Lisa, The Starry Night)
export async function fetchArtworkData(workTitle: string): Promise<ArtworkData> {
  const cacheKey = `${ARTWORK_CACHE_PREFIX}${workTitle.toLowerCase().replace(/\s+/g, '_')}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.data) {
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn('Artwork cache read error:', e);
  }

  const formattedTitle = encodeURIComponent(workTitle.replace(/\s+/g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${formattedTitle}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    } catch (e) {
      console.warn('Artwork cache write error:', e);
    }

    return data;
  } catch (err) {
    console.warn(`Could not fetch artwork data for ${workTitle}:`, err);
    return {
      title: workTitle,
      imageUrl: null,
      thumbnailUrl: null,
      description: null,
      wikipediaUrl: `https://en.wikipedia.org/wiki/${formattedTitle}`
    };
  }
}
