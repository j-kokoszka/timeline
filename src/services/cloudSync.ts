import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getFavorites,
  getUserRatings,
  getUserArtworkRatings
} from './userStorage';

const LEARNING_PROGRESS_KEY = 'culturedb_learning_progress';

export interface LearningProgressItem {
  workTitle: string;
  artistId: string;
  eraId: string;
  studiedAt: string;
}

export function getStudiedWorks(): Record<string, LearningProgressItem> {
  try {
    const raw = localStorage.getItem(LEARNING_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function toggleWorkStudied(workTitle: string, artistId: string, eraId: string): boolean {
  const items = getStudiedWorks();
  let isStudied = false;

  if (items[workTitle]) {
    delete items[workTitle];
  } else {
    items[workTitle] = {
      workTitle,
      artistId,
      eraId,
      studiedAt: new Date().toISOString()
    };
    isStudied = true;
  }

  try {
    localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage save learning progress error', e);
  }

  // Dual-mode sync to Supabase Cloud if user is authenticated
  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        if (isStudied) {
          client.from('user_learning_progress').upsert({
            user_id: data.user.id,
            work_title: workTitle,
            artist_id: artistId,
            era_id: eraId
          }).then();
        } else {
          client.from('user_learning_progress')
            .delete()
            .eq('user_id', data.user.id)
            .eq('work_title', workTitle)
            .then();
        }
      }
    });
  }

  return isStudied;
}

// Sync all local ratings to cloud on login
export async function syncUserDataToCloud(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  const userId = data.user.id;
  const favorites = getFavorites();
  const artistRatings = getUserRatings();
  const artworkRatings = getUserArtworkRatings();

  // Push Favorites
  if (favorites.length > 0) {
    const favRows = favorites.map(artist_id => ({ user_id: userId, artist_id }));
    await supabase.from('user_favorites').upsert(favRows, { onConflict: 'user_id,artist_id' });
  }

  // Push Artist Ratings
  const artistRatingRows = Object.entries(artistRatings).map(([artist_id, rating]) => ({
    user_id: userId,
    artist_id,
    rating
  }));
  if (artistRatingRows.length > 0) {
    await supabase.from('user_ratings').upsert(artistRatingRows, { onConflict: 'user_id,artist_id' });
  }

  // Push Artwork Ratings
  const artworkRatingRows = Object.entries(artworkRatings).map(([work_title, rating]) => ({
    user_id: userId,
    work_title,
    rating
  }));
  if (artworkRatingRows.length > 0) {
    await supabase.from('user_artwork_ratings').upsert(artworkRatingRows, { onConflict: 'user_id,work_title' });
  }
}
