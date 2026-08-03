import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Trigger Google OAuth SSO Login Flow
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!supabase) {
    return {
      error: new Error('Supabase project credentials not configured yet. Using local mode.')
    };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  return { error };
}

// Sign Out
export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
}

// Get current session user
export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}
