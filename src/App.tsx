import { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { HomePage } from './components/HomePage/HomePage';
import { ExploreTab } from './components/ExploreTab/ExploreTab';
import { Timeline } from './components/Timeline/Timeline';
import { ArtistPanel } from './components/ArtistPanel/ArtistPanel';
import { SearchFilter } from './components/SearchFilter/SearchFilter';
import { GlobalSearchModal } from './components/GlobalSearchModal/GlobalSearchModal';
import { AuthModal } from './components/AuthModal/AuthModal';
import { HamburgerMenu } from './components/HamburgerMenu/HamburgerMenu';
import { loadEras, loadArtists } from './lib/dataLoader';
import { Artist, Discipline, Language, Era } from './types/timeline';
import { getUIText } from './lib/i18n';
import { getCurrentUser, supabase } from './lib/supabase';
import { getStudiedWorks, syncUserDataToCloud } from './services/cloudSync';
import { getFavorites } from './services/userStorage';
import { Search, Menu } from 'lucide-react';
import './App.css';

export function App() {
  const [viewMode, setViewMode] = useState<'home' | 'timeline' | 'explore'>('home');
  const [activeDiscipline, setActiveDiscipline] = useState<Discipline>('painting');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNationality, setSelectedNationality] = useState<string>('');
  const [selectedCentury, setSelectedCentury] = useState<string>('');
  const [topMastersOnly, setTopMastersOnly] = useState<boolean>(false);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>('en');

  // Auth & Learning Progress state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [studiedWorksMap, setStudiedWorksMap] = useState<Record<string, any>>({});
  const [favoritesCount, setFavoritesCount] = useState<number>(0);

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
    setFavoritesCount(getFavorites().length);

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

  // Ctrl+K / Cmd+K Global Search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLearningProgressUpdate = () => {
    setStudiedWorksMap(getStudiedWorks());
    setFavoritesCount(getFavorites().length);
  };

  const handleToggleLang = () => {
    setLang(prev => (prev === 'en' ? 'pl' : 'en'));
  };

  const handleSelectArtistFromSearch = (artist: Artist) => {
    if (artist.discipline !== activeDiscipline) {
      setActiveDiscipline(artist.discipline);
    }
    setViewMode('timeline');
    setSelectedArtist(artist);
  };

  const handleSelectEraFromSearch = (era: Era) => {
    if (era.discipline !== activeDiscipline) {
      setActiveDiscipline(era.discipline);
    }
    setViewMode('timeline');
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
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1
            className="brand-title"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setViewMode('home');
              setSelectedArtist(null);
              setSelectedEraId(null);
            }}
            title={lang === 'pl' ? 'Wróć do strony głównej' : 'Go to Home Page'}
          >
            {getUIText('brandTitle', lang)}
            <span className="brand-subtitle">{getUIText('brandTagline', lang)} • {getUIText(activeDiscipline as any, lang)}</span>
          </h1>
        </div>

        <div className="header-actions">
          {/* Global Search Command Prompt Button */}
          <button
            className="search-toggle-btn"
            onClick={() => setIsGlobalSearchOpen(true)}
            title="Global DB Search & Prompt (Ctrl+K)"
          >
            <Search size={16} color="var(--accent-gold)" />
            <span>{lang === 'pl' ? 'Szukaj w API' : 'Global Search'}</span>
          </button>

          {/* All-in-One Hamburger Menu Button */}
          <button
            className="auth-header-btn"
            onClick={() => setIsHamburgerOpen(true)}
            title="Open Menu"
            style={{ background: 'rgba(217, 167, 74, 0.12)', borderColor: 'var(--accent-gold)' }}
          >
            <Menu size={18} color="var(--accent-gold)" />
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>Menu</span>
          </button>
        </div>
      </header>

      {/* Floating Toggleable Timeline Local Filters Bar */}
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

      <main className={`app-main ${viewMode === 'timeline' ? 'timeline-mode' : 'home-mode'}`}>
        {viewMode === 'home' ? (
          <HomePage
            user={currentUser}
            lang={lang}
            studiedCount={activeStudiedCount}
            favoritesCount={favoritesCount}
            allArtists={allArtists}
            onNavigateToTimeline={(disc) => {
              if (disc) setActiveDiscipline(disc);
              setViewMode('timeline');
            }}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSelectArtist={(artist) => {
              if (artist.discipline !== activeDiscipline) setActiveDiscipline(artist.discipline);
              setViewMode('timeline');
              setSelectedArtist(artist);
            }}
          />
        ) : viewMode === 'explore' ? (
          <ExploreTab
            lang={lang}
            allArtists={allArtists}
            onSelectArtist={(artist) => {
              if (artist.discipline !== activeDiscipline) setActiveDiscipline(artist.discipline);
              setViewMode('timeline');
              setSelectedArtist(artist);
            }}
          />
        ) : (
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
            onToggleFilterBar={() => setIsSearchOpen(prev => !prev)}
          />
        )}

        {selectedArtist && viewMode === 'timeline' && (
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

      {/* Global External Database Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        lang={lang}
        allArtists={allArtists}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectArtist={(artist) => {
          if (artist.discipline !== activeDiscipline) setActiveDiscipline(artist.discipline);
          setViewMode('timeline');
          setSelectedArtist(artist);
        }}
      />

      {/* Hamburger All-in-One Slide Drawer */}
      <HamburgerMenu
        isOpen={isHamburgerOpen}
        activeDiscipline={activeDiscipline}
        lang={lang}
        user={currentUser}
        studiedCount={activeStudiedCount}
        totalWorksCount={totalMasterworksCount}
        onClose={() => setIsHamburgerOpen(false)}
        onSelectDiscipline={(disc) => {
          setActiveDiscipline(disc);
          setViewMode('timeline');
          setSelectedArtist(null);
          setSelectedEraId(null);
        }}
        onToggleLang={handleToggleLang}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
        onOpenExplore={() => setViewMode('explore')}
      />

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
