const FAVORITES_KEY = 'culturedb_favorites';
const RATINGS_KEY = 'culturedb_ratings';
const ARTWORK_RATINGS_KEY = 'culturedb_artwork_ratings';

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

export function getArtworkRatings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ARTWORK_RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// Toggleable Artwork Rating: clicking current rating clears it (resets to 0)
export function setArtworkRating(workTitle: string, rating: number): number {
  const ratings = getArtworkRatings();
  let newRating = rating;

  if (ratings[workTitle] === rating) {
    delete ratings[workTitle];
    newRating = 0;
  } else {
    ratings[workTitle] = rating;
  }

  try {
    localStorage.setItem(ARTWORK_RATINGS_KEY, JSON.stringify(ratings));
  } catch (e) {
    console.warn('LocalStorage error saving artwork rating', e);
  }

  return newRating;
}
