import { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Timeline } from './components/Timeline/Timeline';
import { ArtistPanel } from './components/ArtistPanel/ArtistPanel';
import { SearchFilter } from './components/SearchFilter/SearchFilter';
import { AuthModal } from './components/AuthModal/AuthModal';
import { HamburgerMenu } from './components/HamburgerMenu/HamburgerMenu';
import { loadEras, loadArtists } from './lib/dataLoader';
import { Artist, Discipline, Language, Era } from './types/timeline';
import { getUIText } from './lib/i18n';
import { getCurrentUser, supabase } from './lib/supabase';
import { getStudiedWorks, syncUserDataToCloud } from './services/cloudSync';
import { Search, Menu } from 'lucide-react';
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
  const [isHamburgerOpen, setIsHamburgerOpen] = useState<boolean>(false);
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
      {/* Clean & Uncluttered Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="brand-title">
            {getUIText('brandTitle', lang)}
            <span className="brand-subtitle">{getUIText('brandTagline', lang)} • {getUIText(activeDiscipline as any, lang)}</span>
          </h1>
        </div>

        <div className="header-actions">
          {/* Search Toggle Button */}
          <button
            className={`search-toggle-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(prev => !prev)}
            title="Search & Filters (Ctrl+K)"
          >
            <Search size={16} />
            <span>{lang === 'pl' ? 'Szukaj' : 'Search'}</span>
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
          setSelectedArtist(null);
          setSelectedEraId(null);
        }}
        onToggleLang={handleToggleLang}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
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
