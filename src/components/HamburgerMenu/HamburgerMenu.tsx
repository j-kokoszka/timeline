import React from 'react';
import { X, Globe, User as UserIcon, Search, Palette, Music, Book, Landmark, Compass, Feather } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Discipline, Language } from '../../types/timeline';
import { getUIText } from '../../lib/i18n';
import { LearningTracker } from '../LearningTracker/LearningTracker';
import './HamburgerMenu.css';

interface HamburgerMenuProps {
  isOpen: boolean;
  activeDiscipline: Discipline;
  lang: Language;
  user: User | null;
  studiedCount: number;
  totalWorksCount: number;
  onClose: () => void;
  onSelectDiscipline: (disc: Discipline) => void;
  onToggleLang: () => void;
  onOpenAuth: () => void;
  onOpenSearch: () => void;
  onOpenExplore: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  activeDiscipline,
  lang,
  user,
  studiedCount,
  totalWorksCount,
  onClose,
  onSelectDiscipline,
  onToggleLang,
  onOpenAuth,
  onOpenSearch,
  onOpenExplore
}) => {
  if (!isOpen) return null;

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const disciplines: { id: Discipline; icon: any }[] = [
    { id: 'painting', icon: Palette },
    { id: 'sculpture', icon: Compass },
    { id: 'architecture', icon: Landmark },
    { id: 'philosophy', icon: Feather },
    { id: 'music', icon: Music },
    { id: 'literature', icon: Book }
  ];

  return (
    <div className="hamburger-overlay" onClick={onClose}>
      <div className="hamburger-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="hamburger-header">
          <h2 className="hamburger-title">{lang === 'pl' ? 'Menu Główne' : 'Main Menu'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* User Account & Profile */}
        <div className="menu-section">
          <span className="menu-section-title">{lang === 'pl' ? 'Konto Użytkownika' : 'User Account'}</span>
          <div className="menu-item-row" onClick={() => { onOpenAuth(); onClose(); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {user ? (
                avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="user-avatar-circle" style={{ width: 32, height: 32 }} />
                ) : (
                  <div className="user-avatar-circle" style={{ width: 32, height: 32 }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                <UserIcon size={20} color="var(--accent-gold)" />
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{user ? displayName : (lang === 'pl' ? 'Zaloguj się' : 'Sign In')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user ? user.email : (lang === 'pl' ? 'Synchronizuj dane w chmurze' : 'Sync data to cloud')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Discipline Categories Grid */}
        <div className="menu-section">
          <span className="menu-section-title">{lang === 'pl' ? 'Dziedziny Kultury' : 'Cultural Disciplines'}</span>
          <div className="discipline-grid">
            {disciplines.map(({ id, icon: Icon }) => (
              <button
                key={id}
                className={`discipline-menu-btn ${activeDiscipline === id ? 'active' : ''}`}
                onClick={() => {
                  onSelectDiscipline(id);
                  onClose();
                }}
              >
                <Icon size={16} />
                <span>{getUIText(id as any, lang)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Art Learning Mastery Progress */}
        <div className="menu-section">
          <span className="menu-section-title">{lang === 'pl' ? 'Postępy w Nauce Sztuki' : 'Art Learning Mastery'}</span>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <LearningTracker
              studiedCount={studiedCount}
              totalWorksCount={totalWorksCount}
              lang={lang}
              onClick={() => { onOpenAuth(); onClose(); }}
            />
          </div>
        </div>

        {/* Actions: Explore, Search & Language */}
        <div className="menu-section">
          <span className="menu-section-title">{lang === 'pl' ? 'Odkrywaj i Ustawienia' : 'Explore & Settings'}</span>

          <div className="menu-item-row" onClick={() => { onOpenExplore(); onClose(); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
              <Compass size={18} color="var(--accent-gold)" />
              <span>{lang === 'pl' ? 'Odkrywaj Arcydzieła (Wikipedia API)' : 'Explore World Art (Wikipedia API)'}</span>
            </div>
          </div>
          
          <div className="menu-item-row" onClick={() => { onOpenSearch(); onClose(); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
              <Search size={18} color="var(--accent-gold)" />
              <span>{lang === 'pl' ? 'Wyszukiwarka i Filtry (Ctrl+K)' : 'Search & Multi-Filters (Ctrl+K)'}</span>
            </div>
          </div>

          <div className="menu-item-row" onClick={onToggleLang}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
              <Globe size={18} color="var(--accent-gold)" />
              <span>{lang === 'pl' ? 'Język / Language:' : 'Language / Język:'}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-gold)' }}>{lang.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
