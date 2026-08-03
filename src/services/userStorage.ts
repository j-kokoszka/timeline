import { Artist } from '../types/timeline';

const FAVORITES_KEY = 'culturedb_favorites';
const RATINGS_KEY = 'culturedb_ratings';
const ARTWORK_RATINGS_KEY = 'culturedb_artwork_ratings';
const CUSTOM_ARTISTS_KEY = 'culturedb_custom_artists';
const HIDDEN_ARTISTS_KEY = 'culturedb_hidden_artists';

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleFavorite(artistId: string): boolean {
  const favorites = getFavorites();
  const index = favorites.indexOf(artistId);
  let isFav = false;

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(artistId);
    isFav = true;
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.warn('LocalStorage error saving favorites', e);
  }

  return isFav;
}

export function getUserRatings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// Toggleable Artist Rating: clicking current rating clears it (resets to 0)
export function setUserRating(artistId: string, rating: number): number {
  const ratings = getUserRatings();
  let newRating = rating;

  if (ratings[artistId] === rating) {
    delete ratings[artistId];
    newRating = 0;
  } else {
    ratings[artistId] = rating;
  }

  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  } catch (e) {
    console.warn('LocalStorage error saving rating', e);
  }

  return newRating;
}

export function getUserArtworkRatings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ARTWORK_RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function setUserArtworkRating(artworkId: string, rating: number): number {
  const ratings = getUserArtworkRatings();
  let newRating = rating;

  if (ratings[artworkId] === rating) {
    delete ratings[artworkId];
    newRating = 0;
  } else {
    ratings[artworkId] = rating;
  }

  try {
    localStorage.setItem(ARTWORK_RATINGS_KEY, JSON.stringify(ratings));
  } catch (e) {
    console.warn('LocalStorage error saving artwork rating', e);
  }

  return newRating;
}

/* Custom Artist Add & Remove Storage */
export function getCustomArtists(): Artist[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ARTISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCustomArtist(artist: Artist): void {
  const customList = getCustomArtists();
  const existingIndex = customList.findIndex(a => a.id === artist.id);
  if (existingIndex >= 0) {
    customList[existingIndex] = artist;
  } else {
    customList.push(artist);
  }
  try {
    localStorage.setItem(CUSTOM_ARTISTS_KEY, JSON.stringify(customList));
  } catch (e) {
    console.warn('LocalStorage error saving custom artist', e);
  }
}

export function deleteCustomArtist(artistId: string): void {
  const customList = getCustomArtists().filter(a => a.id !== artistId);
  try {
    localStorage.setItem(CUSTOM_ARTISTS_KEY, JSON.stringify(customList));
  } catch (e) {}

  // Also add to hidden list so it doesn't reappear
  hideArtist(artistId);
}

/* Hidden Artists Management */
export function getHiddenArtistIds(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_ARTISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function hideArtist(artistId: string): void {
  const hidden = getHiddenArtistIds();
  if (!hidden.includes(artistId)) {
    hidden.push(artistId);
    try {
      localStorage.setItem(HIDDEN_ARTISTS_KEY, JSON.stringify(hidden));
    } catch (e) {}
  }
}

export function unhideArtist(artistId: string): void {
  const hidden = getHiddenArtistIds().filter(id => id !== artistId);
  try {
    localStorage.setItem(HIDDEN_ARTISTS_KEY, JSON.stringify(hidden));
  } catch (e) {}
}
