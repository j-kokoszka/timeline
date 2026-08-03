import React from 'react';
import { User } from '@supabase/supabase-js';
import { Compass, Award, Star, Heart, ArrowRight, Palette, Music, Book, Landmark, Feather, Sparkles, CheckCircle2 } from 'lucide-react';
import { Discipline, Language, Artist } from '../../types/timeline';
import { getLocalizedString } from '../../lib/i18n';
import './HomePage.css';

interface HomePageProps {
  user: User | null;
  lang: Language;
  studiedCount: number;
  totalWorksCount: number;
  favoritesCount: number;
  allArtists: Artist[];
  onNavigateToTimeline: (disc?: Discipline) => void;
  onOpenAuth: () => void;
  onSelectArtist: (artist: Artist) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  user,
  lang,
  studiedCount,
  totalWorksCount,
  favoritesCount,
  allArtists,
  onNavigateToTimeline,
  onOpenAuth,
  onSelectArtist
}) => {
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Explorer';
  const percent = totalWorksCount > 0 ? Math.min(100, Math.round((studiedCount / totalWorksCount) * 100)) : 0;

  // Select a daily featured master (e.g. Leonardo da Vinci or Van Gogh)
  const featuredArtist = allArtists.find(a => a.id === 'leonardo-da-vinci') || allArtists[0];

  const disciplines: { id: Discipline; title: string; titlePl: string; icon: any; desc: string; descPl: string }[] = [
    { id: 'painting', title: 'Painting', titlePl: 'Malarstwo', icon: Palette, desc: 'Da Vinci, Caravaggio, Van Gogh, Picasso', descPl: 'Da Vinci, Caravaggio, Van Gogh, Picasso' },
    { id: 'sculpture', title: 'Sculpture', titlePl: 'Rzeźba', icon: Compass, desc: 'Michelangelo, Bernini, Rodin', descPl: 'Michał Anioł, Bernini, Rodin' },
    { id: 'architecture', title: 'Architecture', titlePl: 'Architektura', icon: Landmark, desc: 'Brunelleschi, Palladio, Le Corbusier', descPl: 'Brunelleschi, Palladio, Le Corbusier' },
    { id: 'philosophy', title: 'Philosophy', titlePl: 'Filozofia', icon: Feather, desc: 'Plato, Descartes, Kant, Nietzsche', descPl: 'Platon, Kartezjusz, Kant, Nietzsche' },
    { id: 'music', title: 'Music', titlePl: 'Muzyka', icon: Music, desc: 'Bach, Mozart, Beethoven, Chopin', descPl: 'Bach, Mozart, Beethoven, Szopen' },
    { id: 'literature', title: 'Literature', titlePl: 'Literatura', icon: Book, desc: 'Dante, Shakespeare, Goethe, Mickiewicz', descPl: 'Dante, Szekspir, Goethe, Mickiewicz' }
  ];

  return (
    <div className="home-page">
      <div className="home-container">

        {/* Hero Banner Section */}
        <section className="hero-section">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217, 167, 74, 0.15)', border: '1px solid var(--accent-gold)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>
            <Sparkles size={14} /> CultureDB & Visual Timeline
          </div>

          <h1 className="hero-title">
            {lang === 'pl' ? 'Odkrywaj 3000 Lat Historii Kultury' : 'Explore 3,000 Years of Human Culture'}
          </h1>

          <p className="hero-subtitle">
            {lang === 'pl'
              ? 'Interaktywna oś czasu łącząca malarstwo, rzeźbę, muzykę i filozofię. Śledź relacje mistrzów, oceniaj arcydzieła i buduj własną wiedzę o sztuce.'
              : 'An interactive timeline connecting painting, sculpture, music, and philosophy. Trace master-student relationships, rate masterpieces, and master cultural history.'}
          </p>

          <div className="hero-cta-group">
            <button className="primary-cta-btn" onClick={() => onNavigateToTimeline('painting')}>
              <span>{lang === 'pl' ? 'Otwórz Interaktywną Oś Czasu' : 'Launch Interactive Timeline'}</span>
              <ArrowRight size={18} />
            </button>
            {!user && (
              <button className="secondary-cta-btn" onClick={onOpenAuth}>
                <span>{lang === 'pl' ? 'Zaloguj się przez Google' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </section>

        {/* User Account & Mastery Dashboard */}
        <section>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span>{lang === 'pl' ? 'Twój Profil' : 'Your Profile'}</span>
                <CheckCircle2 size={16} color={user ? '#10b981' : 'var(--text-muted)'} />
              </div>
              <div className="stat-value" style={{ fontSize: 20 }}>{displayName}</div>
              <div className="stat-desc">
                {user ? (lang === 'pl' ? 'Synchronizacja w chmurze aktywna' : 'Cloud sync active') : (lang === 'pl' ? 'Tryb lokalny (zaloguj się, by synchronizować)' : 'Local mode (sign in to sync)')}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>{lang === 'pl' ? 'Opanowane Arcydzieła' : 'Masterpieces Studied'}</span>
                <Award size={18} color="var(--accent-gold)" />
              </div>
              <div className="stat-value">{studiedCount} / {totalWorksCount}</div>
              <div className="stat-desc">{percent}% {lang === 'pl' ? 'bazy opanowane' : 'dataset mastered'}</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span>{lang === 'pl' ? 'Ulubieni Mistrzowie' : 'Favorite Masters'}</span>
                <Heart size={18} fill="#ef4444" color="#ef4444" />
              </div>
              <div className="stat-value">{favoritesCount}</div>
              <div className="stat-desc">{lang === 'pl' ? 'zapisanych twórców' : 'bookmarked artists'}</div>
            </div>
          </div>
        </section>

        {/* Featured Daily Masterpiece Spotlight */}
        {featuredArtist && (
          <section>
            <div className="spotlight-card">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/600px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg"
                alt="Mona Lisa"
                className="spotlight-image"
              />
              <div className="spotlight-info">
                <span className="spotlight-badge">✦ {lang === 'pl' ? 'Dzieło Dnia' : 'Daily Masterpiece Spotlight'}</span>
                <h3 className="spotlight-title">Mona Lisa (La Gioconda)</h3>
                <div className="spotlight-artist">
                  {getLocalizedString(featuredArtist, 'name', lang)} (1503 CE) • High Renaissance
                </div>
                <p className="spotlight-desc">
                  {lang === 'pl'
                    ? 'Najsłynniejszy portret w historii sztuki zachodniej, namalowany przez Leonarda da Vinci z użyciem pionierskiej techniki sfumato.'
                    : 'The world-famous portrait of Lisa Gherardini painted by Leonardo da Vinci, pioneering subtle sfumato shading and mysterious expressions.'}
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button className="secondary-cta-btn" onClick={() => onSelectArtist(featuredArtist)}>
                    <Star size={16} fill="#d9a74a" color="#d9a74a" />
                    <span>{lang === 'pl' ? 'Zobacz profil Leonarda' : 'Explore Leonardo Profile'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cultural Disciplines Cards */}
        <section>
          <h3 className="disciplines-section-title">
            {lang === 'pl' ? 'Wybierz Dziedzinę Kultury' : 'Explore Cultural Disciplines'}
          </h3>
          <div className="disciplines-grid">
            {disciplines.map(disc => {
              const Icon = disc.icon;
              return (
                <div
                  key={disc.id}
                  className="discipline-card"
                  onClick={() => onNavigateToTimeline(disc.id)}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(217, 167, 74, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                    <Icon size={22} />
                  </div>
                  <span className="discipline-card-title">{lang === 'pl' ? disc.titlePl : disc.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{lang === 'pl' ? disc.descPl : disc.desc}</span>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};
