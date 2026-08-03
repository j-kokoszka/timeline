import React from 'react';
import { X, LogOut, CheckCircle2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { signInWithGoogle, signOut, isSupabaseConfigured } from '../../lib/supabase';
import { Language } from '../../types/timeline';
import './AuthModal.css';

interface AuthModalProps {
  user: User | null;
  lang: Language;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ user, lang, onClose }) => {
  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>
          <X size={18} />
        </button>

        {user ? (
          <>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="user-avatar-circle"
                style={{ width: 58, height: 58, margin: '0 auto', objectFit: 'cover' }}
              />
            ) : (
              <div className="user-avatar-circle" style={{ width: 54, height: 54, fontSize: 22, margin: '0 auto' }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className="auth-modal-title">
              {lang === 'pl' ? 'Witaj' : 'Welcome'}, {displayName}!
            </h3>
            <p className="auth-modal-subtitle">
              {lang === 'pl'
                ? 'Twoje oceny, ulubieni twórcy i postępy w nauce sztuki są bezpiecznie zsynchronizowane w chmurze.'
                : 'Your ratings, favorite masters, and art learning progress are safely synced to the cloud.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#10b981', fontSize: 13, fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Cloud Sync Active
            </div>
            <button className="google-sso-btn" onClick={handleSignOut} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', marginTop: 12 }}>
              <LogOut size={16} /> {lang === 'pl' ? 'Wyloguj się' : 'Sign Out'}
            </button>
          </>
        ) : (
          <>
            <h3 className="auth-modal-title">
              {lang === 'pl' ? 'Zaloguj się do CultureDB' : 'Sign in to CultureDB'}
            </h3>
            <p className="auth-modal-subtitle">
              {lang === 'pl'
                ? 'Zaloguj się kontem Google, aby zapisywać oceny dzieł, tworzyć własne kolekcje i śledzić opanowane arcydzieła na dowolnym urządzeniu.'
                : 'Sign in with Google to save masterpiece ratings, build curated collections, and trace your art mastery across all your devices.'}
            </p>

            <button className="google-sso-btn" onClick={handleGoogleSignIn}>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {lang === 'pl' ? 'Zaloguj się przez Google' : 'Sign in with Google'}
            </button>

            {!isSupabaseConfigured && (
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                💡 {lang === 'pl' ? 'Tryb offline/lokalny jest aktywny. Wszystkie dane są zapisywane w Twojej przeglądarce.' : 'Offline local mode is active. All ratings are saved in your browser.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
