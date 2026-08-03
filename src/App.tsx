import { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Timeline } from './components/Timeline/Timeline';
import { ArtistPanel } from './components/ArtistPanel/ArtistPanel';
import { SearchFilter } from './components/SearchFilter/SearchFilter';
import { AuthModal } from './components/AuthModal/AuthModal';
import { LearningTracker } from './components/LearningTracker/LearningTracker';
import { loadEras, loadArtists } from './lib/dataLoader';
import { Artist, Discipline, Language, Era } from './types/timeline';
import { getUIText } from './lib/i18n';
import { getCurrentUser, supabase } from './lib/supabase';
import { getStudiedWorks, syncUserDataToCloud } from './services/cloudSync';
import { Search, Globe, User as UserIcon } from 'lucide-react';
import './App.css';

export function App() {
  const [activeDiscipline, setActiveDiscipline] = useState<Discipline>('painting');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNationality, setSelectedNationality] = useState<string>('');
  const [selectedCentury, setSelectedCentury] = useState<string>('');
  const [topMastersOnly, setTopMastersOnly] = useState<boolean>(false);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>('en');

  // Auth & Learning Progress state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [studiedWorksMap, setStudiedWorksMap] = useState<Record<string, any>>({});

  const allEras = useMemo(() => loadEras(), []);
  const allArtists = useMemo(() => loadArtists(), []);

  // Filter items by discipline
  const eras = useMemo(() => allEras.filter(e => e.discipline === activeDiscipline), [allEras, activeDiscipline]);
  const artists = useMemo(() => allArtists.filter(a => a.discipline === activeDiscipline), [allArtists, activeDiscipline]);

  // Total count of masterworks across current dataset
  const totalMasterworksCount = useMemo(() => {
    return allArtists.reduce((acc, a) => acc + a.notableWorks.length, 0);
  }, [allArtists]);

  // Load Auth User session & Learning progress
  useEffect(() => {
    getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user) syncUserDataToCloud();
    });

    setStudiedWorksMap(getStudiedWorks());

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
        const user = session?.user || null;
        setCurrentUser(user);
        if (user) syncUserDataToCloud();
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const handleLearningProgressUpdate = () => {
    setStudiedWorksMap(getStudiedWorks());
  };

  const handleToggleLang = () => {
    setLang(prev => (prev === 'en' ? 'pl' : 'en'));
  };

  const handleSelectArtistFromSearch = (artist: Artist) => {
    if (artist.discipline !== activeDiscipline) {
      setActiveDiscipline(artist.discipline);
    }
    setSelectedArtist(artist);
  };

  const handleSelectEraFromSearch = (era: Era) => {
    if (era.discipline !== activeDiscipline) {
      setActiveDiscipline(era.discipline);
    }
    setSelectedEraId(era.id);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedNationality('');
    setSelectedCentury('');
    setTopMastersOnly(false);
    setFavoritesOnly(false);
  };

  const activeStudiedCount = Object.keys(studiedWorksMap).length;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="brand-title">
            {getUIText('brandTitle', lang)}
            <span className="brand-subtitle">{getUIText('brandTagline', lang)}</span>
          </h1>

          <nav className="discipline-tabs">
            {(['painting', 'sculpture', 'architecture', 'philosophy', 'music', 'literature'] as Discipline[]).map(disc => (
              <button
                key={disc}
                className={`tab-btn ${activeDiscipline === disc ? 'active' : ''}`}
                onClick={() => {
                  setActiveDiscipline(disc);
                  setSelectedArtist(null);
                  setSelectedEraId(null);
                }}
              >
                {getUIText(disc as any, lang)}
              </button>
            ))}
          </nav>
        </div>

        <div className="header-actions">
          {/* Learning Tracker Widget */}
          <LearningTracker
            studiedCount={activeStudiedCount}
            totalWorksCount={totalMasterworksCount}
            lang={lang}
            onClick={() => setIsAuthModalOpen(true)}
          />

          {/* User Auth Profile Button */}
          <button
            className="auth-header-btn"
            onClick={() => setIsAuthModalOpen(true)}
            title={currentUser ? (currentUser.user_metadata?.full_name || currentUser.email || 'User Profile') : 'Sign In'}
          >
            {currentUser ? (
              currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture ? (
                <img
                  src={currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture}
                  alt={currentUser.user_metadata?.full_name || 'User'}
                  className="user-avatar-circle"
                  style={{ width: 22, height: 22, objectFit: 'cover' }}
                />
              ) : (
                <div className="user-avatar-circle">
                  {(currentUser.user_metadata?.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )
            ) : (
              <UserIcon size={16} />
            )}
            <span>
              {currentUser
                ? (currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0])
                : (lang === 'pl' ? 'Zaloguj' : 'Sign In')}
            </span>
          </button>

          {/* Language Switcher Button */}
          <button
            className="lang-toggle-btn"
            onClick={handleToggleLang}
            title={lang === 'en' ? 'Switch to Polish' : 'Przełącz na angielski'}
          >
            <Globe size={16} />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Toggleable Search Button */}
          <button
            className={`search-toggle-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(prev => !prev)}
            title="Search & Filters (Ctrl+K)"
          >
            <Search size={16} />
            <span>Search</span>
          </button>
        </div>
      </header>

      {/* Floating Toggleable Search & Filter Bar */}
      {isSearchOpen && (
        <SearchFilter
          artists={artists}
          eras={eras}
          lang={lang}
          searchQuery={searchQuery}
          selectedNationality={selectedNationality}
          selectedCentury={selectedCentury}
          onlyTopMasters={topMastersOnly}
          onlyFavorites={favoritesOnly}
          onSearchChange={setSearchQuery}
          onNationalityChange={setSelectedNationality}
          onCenturyChange={setSelectedCentury}
          onTopMastersChange={setTopMastersOnly}
          onFavoritesChange={setFavoritesOnly}
          onSelectArtist={handleSelectArtistFromSearch}
          onSelectEra={handleSelectEraFromSearch}
          onResetFilters={handleResetFilters}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      <main className="app-main">
        <Timeline
          eras={eras}
          artists={artists}
          selectedArtist={selectedArtist}
          selectedEra={eras.find(e => e.id === selectedEraId) || null}
          searchQuery={searchQuery}
          selectedNationality={selectedNationality}
          selectedCentury={selectedCentury}
          onlyTopMasters={topMastersOnly}
          onlyFavorites={favoritesOnly}
          lang={lang}
          onSelectArtist={setSelectedArtist}
          onSelectEra={(era) => setSelectedEraId(era ? era.id : null)}
        />

        {selectedArtist && (
          <ArtistPanel
            artist={selectedArtist}
            eras={allEras}
            allArtists={allArtists}
            lang={lang}
            onClose={() => setSelectedArtist(null)}
            onSelectArtist={setSelectedArtist}
            onLearningProgressUpdate={handleLearningProgressUpdate}
          />
        )}
      </main>

      {/* Auth Modal & Profile Drawer */}
      {isAuthModalOpen && (
        <AuthModal
          user={currentUser}
          lang={lang}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
