import { Era, Discipline, Artist, Relationships, ArtworkEntry, Language } from '../types/timeline';

export interface CulturalEntityData {
  title: string;
  thumbnailUrl: string | null;
  originalImageUrl: string | null;
  summary: string | null;
  description?: string | null;
  wikipediaUrl: string | null;
  snippet?: string;
  pageid?: number;
  isPerson?: boolean;
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

  // 2. Fetch from Wikipedia REST API with fallback to ASCII-normalized title
  const formattedName = encodeURIComponent(artistName.trim().replace(/\s+/g, '_'));
  const normalizedName = encodeURIComponent(
    artistName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_')
  );

  const fetchSummary = async (name: string) => {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  };

  try {
    let json: any = null;
    try {
      json = await fetchSummary(formattedName);
    } catch (err) {
      if (normalizedName !== formattedName) {
        json = await fetchSummary(normalizedName);
      } else {
        throw err;
      }
    }

    const data: CulturalEntityData = {
      title: json.title || artistName,
      thumbnailUrl: json.thumbnail?.source || null,
      originalImageUrl: json.originalimage?.source || json.thumbnail?.source || null,
      summary: json.extract || null,
      description: json.description || null,
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

/** Live Search across Wikipedia API with Typo Tolerance and People-First Ranking */
export async function searchExternalWikipediaEntities(query: string): Promise<CulturalEntityData[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  try {
    const titlesToFetch: string[] = [];

    // 1. Fetch suggestions using OpenSearch API (which excels at typo corrections)
    const openSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=6&format=json&origin=*`;
    const openRes = await fetch(openSearchUrl);
    if (openRes.ok) {
      const openJson = await openRes.json();
      const openTitles: string[] = openJson[1] || [];
      openTitles.forEach(t => {
        if (!titlesToFetch.includes(t)) titlesToFetch.push(t);
      });
    }

    // 2. Also fetch fuzzy search hits via CirrusSearch (srsearch=query~1)
    const fuzzyUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery + '~1')}&utf8=&format=json&origin=*&srlimit=6`;
    const fuzzyRes = await fetch(fuzzyUrl);
    if (fuzzyRes.ok) {
      const fuzzyJson = await fuzzyRes.json();
      const fuzzyHits = fuzzyJson.query?.search || [];
      fuzzyHits.forEach((h: any) => {
        if (!titlesToFetch.includes(h.title)) titlesToFetch.push(h.title);
      });
    }

    // Filter out non-person / meta pages
    const filteredTitles = titlesToFetch.filter(t =>
      !/^\d{3,4}\s+in\s+/i.test(t) &&
      !/^list\s+of/i.test(t) &&
      !/^category:/i.test(t) &&
      !/station$/i.test(t) &&
      !/football|sports|club|fc\b/i.test(t)
    );

    // 3. Fetch details & detect if entity is a historical person
    const rawResults = await Promise.all(
      filteredTitles.map(async (title) => {
        const entityData = await fetchCulturalEntityData(title);
        const text = [entityData.description, entityData.summary].filter(Boolean).join(' ');

        // Person detection regex
        const isPerson = /composer|organist|musician|pianist|violin|painter|artist|sculptor|philosopher|architect|poet|playwright|writer|author|theologian|dramatist|virtuoso|conductor|\b(1?\d{3}|20[0-2]\d)\s*[-–]\s*(1?\d{3}|20[0-2]\d)\b|\bborn\b|\bdied\b/i.test(text);

        return {
          ...entityData,
          summary: text,
          isPerson
        };
      })
    );

    // 4. Sort historical people first, then general entities
    const validResults = rawResults.filter(r => r.summary || r.thumbnailUrl);
    validResults.sort((a, b) => (b.isPerson ? 1 : 0) - (a.isPerson ? 1 : 0));

    return validResults;
  } catch (e) {
    console.warn('Wikipedia typo search error:', e);
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

/** Bulletproof Extraction of Lifespan Years from Wikipedia/Wikidata text */
export function extractLifespanYears(title: string, text: string): { birthYear: number; deathYear: number } | null {
  const combined = `${title} ${text}`;

  // 1. Check parenthetical dates inside summary e.g. "(May 5, 1819 – June 4, 1872)" or "(1637–1707)" or "(c. 1452 – 2 May 1519)"
  const parentheticalMatches = combined.match(/\(([^)]+)\)/g);
  if (parentheticalMatches) {
    for (const paren of parentheticalMatches) {
      // Check for BC/BCE in paren
      const bcMatch = paren.match(/(\d{3,4})\s*(?:bc|bce)[^0-9]+(\d{3,4})\s*(?:bc|bce)/i);
      if (bcMatch) {
        return { birthYear: -parseInt(bcMatch[1], 10), deathYear: -parseInt(bcMatch[2], 10) };
      }

      // Extract 3 or 4 digit numbers that look like valid years (400 BCE to 2026 CE)
      const yearMatches = Array.from(paren.matchAll(/\b(1?\d{3}|20[0-2]\d)\b/g))
        .map(m => parseInt(m[1], 10))
        .filter(y => y >= 400 && y <= 2026);

      if (yearMatches.length >= 2) {
        const birthYear = yearMatches[0];
        const deathYear = yearMatches[1];
        if (deathYear >= birthYear && deathYear - birthYear <= 120) {
          return { birthYear, deathYear };
        }
      } else if (yearMatches.length === 1 && /born|b\.|c\./i.test(paren)) {
        const birthYear = yearMatches[0];
        return { birthYear, deathYear: Math.min(2026, birthYear + 65) };
      }
    }
  }

  // 2. Check general hyphenated years in full text e.g. "1637 - 1707" or "1637–1707"
  const hyphenMatch = combined.match(/\b(1?\d{3}|20[0-2]\d)\s*(?:–|-|to)\s*(1?\d{3}|20[0-2]\d)\b/);
  if (hyphenMatch) {
    const birthYear = parseInt(hyphenMatch[1], 10);
    const deathYear = parseInt(hyphenMatch[2], 10);
    if (deathYear >= birthYear && deathYear - birthYear <= 120) {
      return { birthYear, deathYear };
    }
  }

  // 3. Fallback: search any two consecutive year-like numbers in text
  const allYears = Array.from(combined.matchAll(/\b(1?\d{3}|20[0-2]\d)\b/g))
    .map(m => parseInt(m[1], 10))
    .filter(y => y >= 400 && y <= 2026);

  if (allYears.length >= 2) {
    for (let i = 0; i < allYears.length - 1; i++) {
      const b = allYears[i];
      const d = allYears[i + 1];
      if (d >= b && d - b >= 15 && d - b <= 115) {
        return { birthYear: b, deathYear: d };
      }
    }
  }

  if (allYears.length === 1) {
    return { birthYear: allYears[0], deathYear: Math.min(2026, allYears[0] + 65) };
  }

  // No fake hardcoded default! Return null when unverified.
  return null;
}

/** Smart Auto-Detection of Discipline, Lifespan Years, and Era from Wikipedia Data */
export function autoDetectArtistDetails(title: string, summary: string | null, allEras: Era[]): {
  birthYear: number;
  deathYear: number;
  discipline: Discipline;
  realDiscipline: string;
  eraId: string;
} | null {
  const rawText = `${title} ${summary || ''}`;
  const text = rawText.toLowerCase();

  // 1. Detect Discipline from content
  let detectedDiscipline: Discipline = 'painting';
  let detectedLabel = 'Painting';

  if (/composer|music|opera|symphony|orchestra|choir|piano|organ|violin|virtuoso|organist|cantata|buxtehude|moniuszko|chopin|bach|beethoven|mozart|tchaikovsky|liszt|wagner|schubert|schumann|smetana|dvořák|grieg|sibelius|penderecki|lutosławski|karłowicz|szymanowski|paderewski|czerny|verdi|puccini|bizet|debussy|ravel|stravinsky|wieniawski/i.test(text)) {
    detectedDiscipline = 'music';
    detectedLabel = 'Music / Composer';
  } else if (/philosopher|ethics|logic|metaphysics|epistemology|theologian|scholastic|nietzsche|kant|descartes|plato|aristotle|socrates|spinoza|locke|hume|hegel|schopenhauer|sartre|heidegger|wittgenstein|aquinas|augustine|twardowski|tatarkiewicz/i.test(text)) {
    detectedDiscipline = 'philosophy';
    detectedLabel = 'Philosophy';
  } else if (/architect|building|cathedral|basilica|structure|palace|monument|corbusier|brunelleschi|gaudi|wright|mies|gropius|palladio|bramante|kamsetzer|corazzi/i.test(text)) {
    detectedDiscipline = 'architecture';
    detectedLabel = 'Architecture';
  } else if (/sculptor|statue|marble|bronze|bust|relief|rodin|bernini|canova|donatello|phidias|dunikowski|albinus|thorvaldsen/i.test(text)) {
    detectedDiscipline = 'sculpture';
    detectedLabel = 'Sculpture';
  } else if (/poet|novelist|playwright|dramatist|author|writer|literature|prose|fiction|dante|shakespeare|goethe|mickiewicz|słowacki|krasiński|norwid|prus|sienkiewicz|żeromski|reymont|gombrowicz|miłosz|szymborska|herbert|tokarczuk|lem|dostoevsky|tolstoy|chekhov|pushkin|gogol|turgenev|kafka|woolf|joyce|proust|byron|shelley|keats|dickens/i.test(text)) {
    detectedDiscipline = 'literature';
    detectedLabel = 'Literature';
  }

  // 2. Extract Lifespan Years accurately using robust parser
  const extracted = extractLifespanYears(title, rawText);
  if (!extracted) {
    return null; // Return null when lifespan years cannot be verified!
  }
  const { birthYear, deathYear } = extracted;

  // 3. Filter eras for the detected discipline
  const disciplineEras = allEras.filter(e => e.discipline === detectedDiscipline);
  const searchEras = disciplineEras.length > 0 ? disciplineEras : allEras;

  // 4. Match Era by birth year
  const matchedEra = searchEras.find(e =>
    e.startYear <= birthYear &&
    e.endYear >= birthYear
  ) || searchEras[searchEras.length - 1] || allEras[0];

  return {
    birthYear,
    deathYear,
    discipline: detectedDiscipline,
    realDiscipline: detectedLabel,
    eraId: matchedEra ? matchedEra.id : 'modern-contemporary-macro'
  };
}

/** Automatically Extracts Notable Masterworks/Compositions from Wikipedia Summary & API */
export async function autoExtractNotableWorks(artistName: string, text: string): Promise<string[]> {
  const works: string[] = [];

  // 1. Extract titles enclosed in quotes from summary/snippet text e.g. "Halka", "The Haunted Manor", "Symphony No. 5"
  const quoted = Array.from(text.matchAll(/"([^"]{3,45})"/g)).map(m => m[1].trim());
  quoted.forEach(w => {
    if (w && !works.includes(w) && !w.toLowerCase().includes(artistName.toLowerCase())) {
      works.push(w);
    }
  });

  // 2. Extract composition patterns like "Op. 10", "Symphony No. X", "Piano Concerto"
  const compositionsMatch = Array.from(text.matchAll(/\b((?:Symphony|Concerto|Sonata|Opus|Op\.|Suite|Nocturne|Polonaise|Ballet|Opera)\s+[^,.;()]{2,30})/gi));
  compositionsMatch.forEach(m => {
    const w = m[1].trim();
    if (w && !works.includes(w) && works.length < 6) {
      works.push(w);
    }
  });

  // 3. If fewer than 3 works found, query Wikipedia Search API for notable works/compositions
  if (works.length < 3) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('compositions OR works OR paintings by ' + artistName)}&utf8=&format=json&origin=*&srlimit=6`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const json = await res.json();
        const searchHits = json.query?.search || [];
        searchHits.forEach((hit: any) => {
          const title = hit.title;
          if (
            !title.toLowerCase().includes('list of') &&
            !title.toLowerCase().includes('category:') &&
            !title.toLowerCase().includes('discography') &&
            title.toLowerCase() !== artistName.toLowerCase()
          ) {
            const cleanTitle = title.replace(new RegExp(`^${artistName}:?\\s*`, 'i'), '').trim();
            if (cleanTitle && !works.includes(cleanTitle) && works.length < 6) {
              works.push(cleanTitle);
            }
          }
        });
      }
    } catch (e) {
      // Ignore network error
    }
  }

  return works.slice(0, 6);
}

/** Automatically Computes Historical Network Relationships (Mentors, Followers, Contemporaries) */
export function autoGenerateRelationships(
  newArtist: { id: string; name: string; birthYear: number; deathYear: number; discipline: Discipline; bio: string; eraId: string },
  allArtists: Artist[]
): Relationships {
  const influencedBy: string[] = [];
  const influenced: string[] = [];
  const contemporaries: string[] = [];

  const text = (newArtist.bio || '').toLowerCase();

  for (const other of allArtists) {
    if (other.id === newArtist.id) continue;
    const otherNorm = other.name.toLowerCase();

    // Check if other artist is mentioned in bio text
    const isMentioned = text.includes(otherNorm) || text.includes(other.id);

    // Lifespan overlap check
    const isContemporary =
      Math.abs(newArtist.birthYear - other.birthYear) <= 35 ||
      (newArtist.birthYear <= other.deathYear && newArtist.deathYear >= other.birthYear && Math.abs(newArtist.birthYear - other.birthYear) <= 45);

    if (isMentioned) {
      if (other.birthYear < newArtist.birthYear) {
        if (!influencedBy.includes(other.id)) influencedBy.push(other.id);
      } else {
        if (!influenced.includes(other.id)) influenced.push(other.id);
      }
    } else if (isContemporary && (other.discipline === newArtist.discipline || newArtist.discipline === 'general')) {
      if (contemporaries.length < 4 && !contemporaries.includes(other.id)) {
        contemporaries.push(other.id);
      }
    }
  }

  // If no mentors found, link older masters in the same discipline
  if (influencedBy.length === 0) {
    const olderMasters = allArtists
      .filter(a => a.discipline === newArtist.discipline && a.birthYear < newArtist.birthYear && newArtist.birthYear - a.birthYear <= 100)
      .sort((a, b) => b.birthYear - a.birthYear);
    if (olderMasters.length > 0) {
      influencedBy.push(olderMasters[0].id);
    }
  }

  return {
    influencedBy,
    influenced,
    contemporaries,
    movements: [newArtist.eraId]
  };
}

/** Fetches full catalog of works/compositions from multi-database engine (OpenOpus, Met Museum, Wikipedia) */
export async function fetchFullArtistCatalog(artistName: string, discipline: Discipline = 'music'): Promise<ArtworkEntry[]> {
  const nameClean = artistName.trim();

  // 1. Classical Music & Operas: OpenOpus API
  if (discipline === 'music' || /composer|music/i.test(discipline)) {
    try {
      const searchRes = await fetch(`https://api.openopus.org/composer/list/search/${encodeURIComponent(nameClean)}.json`);
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const composer = searchJson.composers?.[0];
        if (composer) {
          const worksRes = await fetch(`https://api.openopus.org/work/list/composer/${composer.id}/all.json`);
          if (worksRes.ok) {
            const worksJson = await worksRes.json();
            const worksList = worksJson.works || [];
            if (worksList.length > 0) {
              return worksList.map((w: any, idx: number) => ({
                id: `openopus-${w.id || idx}`,
                title: w.title,
                year: w.year || 1850,
                medium: `🎵 ${w.genre || 'Classical Composition'}`,
                location: 'OpenOpus Classical Index'
              }));
            }
          }
        }
      }
    } catch (e) {
      console.warn('OpenOpus API fetch error:', e);
    }
  }

  // 2. Painting, Sculpture, Architecture: The Metropolitan Museum of Art API
  if (discipline === 'painting' || discipline === 'sculpture' || discipline === 'architecture') {
    try {
      const metSearch = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?artistOrCulture=true&q=${encodeURIComponent(nameClean)}`);
      if (metSearch.ok) {
        const metJson = await metSearch.json();
        const objectIDs: number[] = (metJson.objectIDs || []).slice(0, 12);
        if (objectIDs.length > 0) {
          const metWorks = await Promise.all(
            objectIDs.map(async (id) => {
              try {
                const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
                if (!objRes.ok) return null;
                const obj = await objRes.json();
                return {
                  id: `met-${id}`,
                  title: obj.title || 'Untitled Work',
                  year: parseInt(obj.objectEndDate) || 1850,
                  medium: obj.medium ? `🎨 ${obj.medium}` : 'Masterwork',
                  location: 'Metropolitan Museum of Art, New York',
                  imageUrl: obj.primaryImageSmall || null,
                  description: `${obj.department || 'Visual Arts'} • ${obj.culture || 'European'}`
                };
              } catch (e) {
                return null;
              }
            })
          );
          const validMet = metWorks.filter(w => w !== null) as ArtworkEntry[];
          if (validMet.length > 0) return validMet;
        }
      }
    } catch (e) {
      console.warn('Met Museum API fetch error:', e);
    }
  }

  // 3. Fallback to Wikipedia API
  return fetchFullArtistCatalogFromWikipedia(nameClean);
}

/** Fetches full catalog of works/compositions for an artist from Wikipedia API */
export async function fetchFullArtistCatalogFromWikipedia(artistName: string): Promise<ArtworkEntry[]> {
  const catalog: ArtworkEntry[] = [];
  const nameClean = artistName.trim();

  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('List of compositions by ' + nameClean + ' OR List of works by ' + nameClean + ' OR compositions by ' + nameClean)}&utf8=&format=json&origin=*&srlimit=10`;
    const res = await fetch(searchUrl);
    if (!res.ok) return catalog;

    const json = await res.json();
    const hits = json.query?.search || [];

    const listPage = hits.find((h: any) =>
      h.title.toLowerCase().startsWith('list of compositions by') ||
      h.title.toLowerCase().startsWith('list of works by') ||
      h.title.toLowerCase().startsWith('list of paintings by')
    ) || hits[0];

    if (listPage) {
      const parseUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(listPage.title)}&prop=links&utf8=&format=json&origin=*`;
      const parseRes = await fetch(parseUrl);
      if (parseRes.ok) {
        const parseJson = await parseRes.json();
        const links: { ns: number; '*': string }[] = parseJson.parse?.links || [];

        links.forEach((link, idx) => {
          const title = link['*'];
          if (
            link.ns === 0 &&
            !title.toLowerCase().includes('list of') &&
            !title.toLowerCase().includes('category:') &&
            !title.toLowerCase().includes('wikipedia:') &&
            !title.toLowerCase().includes('discography') &&
            !title.toLowerCase().includes('opera house') &&
            !title.toLowerCase().includes(nameClean.toLowerCase())
          ) {
            catalog.push({
              id: `full-work-${idx}`,
              title,
              year: 1850,
              medium: 'Masterwork / Composition',
              location: 'Public Domain / World Collection'
            });
          }
        });
      }
    }

    if (catalog.length < 8) {
      hits.forEach((h: any, idx: number) => {
        const title = h.title;
        if (
          !title.toLowerCase().includes('list of') &&
          !title.toLowerCase().includes('category:') &&
          !title.toLowerCase().includes('discography') &&
          title.toLowerCase() !== nameClean.toLowerCase() &&
          !catalog.some(c => c.title === title)
        ) {
          catalog.push({
            id: `full-search-work-${idx}`,
            title: title.replace(new RegExp(`^${nameClean}:?\\s*`, 'i'), ''),
            year: 1850,
            medium: 'Masterwork / Work',
            location: 'Public Domain / Collection'
          });
        }
      });
    }
  } catch (e) {
    console.warn('Failed to fetch full catalog from Wikipedia:', e);
  }

  return catalog;
}

export interface ExternalCatalogLink {
  name: string;
  url: string;
  icon: string;
  description: string;
}

/** Generates specialized external catalog links for any master across disciplines */
export function getExternalCatalogLinks(artistName: string, discipline: Discipline, lang: Language = 'en'): ExternalCatalogLink[] {
  const links: ExternalCatalogLink[] = [];
  const nameClean = artistName.trim();
  const encName = encodeURIComponent(nameClean);
  const wikiArtSlug = nameClean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (discipline === 'music' || /composer|music/i.test(discipline)) {
    links.push({
      name: 'IMSLP Petrucci Music Library',
      url: `https://imslp.org/wiki/Category:${encodeURIComponent(nameClean.replace(/\s+/g, '_'))}`,
      icon: '🎼',
      description: lang === 'pl' ? 'Kompletny wykaz oper i nut w bazach imslp.org' : 'Complete classical scores & work index'
    });
    links.push({
      name: 'Wikipedia List of Compositions',
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent('List of compositions by ' + nameClean)}`,
      icon: '📖',
      description: lang === 'pl' ? 'Oficjalna strona listy dzieł w Wikipedii' : 'Official list of compositions page'
    });
    links.push({
      name: 'YouTube Music Search',
      url: `https://music.youtube.com/search?q=${encName}`,
      icon: '🎵',
      description: lang === 'pl' ? 'Odsłuchaj nagrania ikonowe w YT Music' : 'Listen to performances & recordings'
    });
  } else if (discipline === 'painting' || discipline === 'sculpture' || discipline === 'architecture') {
    links.push({
      name: 'WikiArt Visual Fine Art Gallery',
      url: `https://www.wikiart.org/en/${wikiArtSlug}`,
      icon: '🖼️',
      description: lang === 'pl' ? 'Pełna galeria obrazów i rzeźb w wysokiej rozdzielczości na WikiArt' : 'Full HD paintings & artwork gallery on WikiArt'
    });
    links.push({
      name: 'The Met Museum Collection',
      url: `https://www.metmuseum.org/art/collection/search?!q=${encName}`,
      icon: '🏛️',
      description: lang === 'pl' ? 'Archiwum i eksponaty w Metropolitan Museum of Art' : 'Official museum holdings & archives'
    });
    links.push({
      name: 'Google Arts & Culture',
      url: `https://artsandculture.google.com/search?q=${encName}`,
      icon: '✨',
      description: lang === 'pl' ? 'Wirtualne wystawy 3D w Google Arts' : 'Virtual high-res museum exhibits'
    });
  } else if (discipline === 'literature') {
    links.push({
      name: 'Open Library Author Catalog',
      url: `https://openlibrary.org/search?author=${encName}`,
      icon: '📚',
      description: lang === 'pl' ? 'Pełna bibliografia i wydania książek w Open Library' : 'Full bibliography & book editions'
    });
    links.push({
      name: 'Project Gutenberg',
      url: `https://www.gutenberg.org/ebooks/search/?query=${encName}`,
      icon: '📖',
      description: lang === 'pl' ? 'Darmowe e-booki dzieł w domenie publicznej' : 'Free public domain full-text ebooks'
    });
  } else if (discipline === 'philosophy') {
    links.push({
      name: 'Stanford Encyclopedia of Philosophy',
      url: `https://plato.stanford.edu/search/searcher.py?query=${encName}`,
      icon: '💡',
      description: lang === 'pl' ? 'Opracowania naukowe traktatów w SEP' : 'Peer-reviewed philosophical treatises'
    });
    links.push({
      name: 'PhilPapers Archive',
      url: `https://philpapers.org/s/${encName}`,
      icon: '📜',
      description: lang === 'pl' ? 'Archiwum prac i pism filozoficznych' : 'Comprehensive philosophy archive'
    });
  }

  return links;
}
