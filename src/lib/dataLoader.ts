import { Artist, Era } from '../types/timeline';
import erasData from '../../data/eras.json';

// Import all artist JSON files dynamically via Vite glob import
const artistModules = import.meta.glob('../../data/artists/*.json', { eager: true });

export function loadEras(): Era[] {
  return erasData as Era[];
}

export function loadArtists(): Artist[] {
  const artistMap = new Map<string, Artist>();

  for (const path in artistModules) {
    const mod = artistModules[path] as { default: Artist } | Artist;
    const artist = 'default' in mod ? mod.default : mod;
    if (artist && artist.id && !artistMap.has(artist.id)) {
      artistMap.set(artist.id, artist);
    }
  }

  // Sort artists by birth year ascending
  return Array.from(artistMap.values()).sort((a, b) => a.birthYear - b.birthYear);
}
