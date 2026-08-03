import React, { useState, useMemo, useEffect } from 'react';
import { Palette, Music, BookOpen, Sparkles, Landmark, Box, Globe, Search } from 'lucide-react';
import { loadArtists, loadEras } from './lib/dataLoader';
import { Artist, Era, Discipline, Language } from './types/timeline';
import { Timeline } from './components/Timeline/Timeline';
import { ArtistPanel } from './components/ArtistPanel/ArtistPanel';
import { SearchFilter } from './components/SearchFilter/SearchFilter';
import { getUIText } from './lib/i18n';
import './App.css';

export const App: React.FC = () => {
  const allEras = useMemo(() => loadEras(), []);
  const allArtists = useMemo(() => loadArtists(), []);

  const [activeDiscipline, setActiveDiscipline] = useState<Discipline>('painting');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedEra, setSelectedEra] = useState<Era | null>(null);
  const [lang, setLang] = useState<Language>('en');

  // Search, CultureDB Top Masters, and Multi-Filter State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNationality, setSelectedNationality] = useState('');
  const [selectedCentury, setSelectedCentury] = useState('');
  const [onlyTopMasters, setOnlyTopMasters] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Hotkey listener for Ctrl+K or / to open search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredEras = useMemo(() => {
    return allEras.filter(e => e.discipline === activeDiscipline || e.discipline === 'general');
  }, [allEras, activeDiscipline]);

  const filteredArtists = useMemo(() => {
    return allArtists.filter(a => a.discipline === activeDiscipline);
  }, [allArtists, activeDiscipline]);

  const handleSelectEra = (era: Era | null) => {
    setSelectedEra(era);
    if (era) {
      setSelectedArtist(null);
    }
  };

  const handleSelectArtist = (artist: Artist | null) => {
    setSelectedArtist(artist);
    if (artist) {
      setSelectedEra(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedNationality('');
    setSelectedCentury('');
    setOnlyTopMasters(false);
    setOnlyFavorites(false);
  };

  const hasActiveFilters = Boolean(searchQuery || selectedNationality || selectedCentury || onlyTopMasters || onlyFavorites);

  const disciplinesConfig: { id: Discipline; labelKey: keyof typeof import('./lib/i18n').translations.en; icon: React.ReactNode }[] = [
    { id: 'painting', labelKey: 'painting', icon: <Palette size={15} /> },
    { id: 'sculpture', labelKey: 'sculpture', icon: <Box size={15} /> },
    { id: 'architecture', labelKey: 'architecture', icon: <Landmark size={15} /> },
    { id: 'philosophy', labelKey: 'philosophy', icon: <Sparkles size={15} /> },
    { id: 'music', labelKey: 'music', icon: <Music size={15} /> },
    { id: 'literature', labelKey: 'literature', icon: <BookOpen size={15} /> }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <h1 className="brand-title">{getUIText('brandTitle', lang)}</h1>
          <span className="brand-tagline">{getUIText('brandTagline', lang)}</span>
        </div>

        <div className="header-actions">
          <nav className="discipline-filters">
            {disciplinesConfig.map(disc => {
              const isActive = activeDiscipline === disc.id;
              const hasData = disc.id === 'painting';

              return (
                <button
                  key={disc.id}
                  className={`filter-btn ${isActive ? 'active' : ''} ${!hasData && !isActive ? 'inactive-discipline' : ''}`}
                  onClick={() => {
                    setActiveDiscipline(disc.id);
                    setSelectedArtist(null);
                    setSelectedEra(null);
                  }}
                  title={hasData ? getUIText(disc.labelKey, lang) : `${getUIText(disc.labelKey, lang)} (${getUIText('soon', lang)})`}
                >
                  {disc.icon} {getUIText(disc.labelKey, lang)}
                  {!hasData && <span className="badge-coming-soon">{getUIText('soon', lang)}</span>}
                </button>
              );
            })}
          </nav>

          {/* Search & Filter Toggle Button */}
          <button
            className={`header-search-btn ${isSearchOpen || hasActiveFilters ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(prev => !prev)}
            title={getUIText('searchHint', lang)}
          >
            <Search size={14} />
            <span>Search</span>
            {hasActiveFilters && <span className="active-filter-dot" />}
          </button>

          {/* Language Switcher Toggle */}
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
              title="Switch to English"
            >
              <Globe size={13} /> EN
            </button>
            <button
              className={`lang-btn ${lang === 'pl' ? 'active' : ''}`}
              onClick={() => setLang('pl')}
              title="Przełącz na Polski"
            >
              PL
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Toggleable Universal Search & Multi-Filter Floating Bar */}
        {isSearchOpen && (
          <SearchFilter
            artists={filteredArtists}
            eras={filteredEras}
            lang={lang}
            searchQuery={searchQuery}
            selectedNationality={selectedNationality}
            selectedCentury={selectedCentury}
            onlyTopMasters={onlyTopMasters}
            onlyFavorites={onlyFavorites}
            onSearchChange={setSearchQuery}
            onNationalityChange={setSelectedNationality}
            onCenturyChange={setSelectedCentury}
            onTopMastersChange={setOnlyTopMasters}
            onFavoritesChange={setOnlyFavorites}
            onSelectArtist={handleSelectArtist}
            onSelectEra={handleSelectEra}
            onResetFilters={handleResetFilters}
            onClose={() => setIsSearchOpen(false)}
          />
        )}

        <Timeline
          eras={filteredEras}
          artists={filteredArtists}
          selectedArtist={selectedArtist}
          selectedEra={selectedEra}
          lang={lang}
          searchQuery={searchQuery}
          selectedNationality={selectedNationality}
          selectedCentury={selectedCentury}
          onlyTopMasters={onlyTopMasters}
          onlyFavorites={onlyFavorites}
          onSelectArtist={handleSelectArtist}
          onSelectEra={handleSelectEra}
        />

        {selectedArtist && (
          <ArtistPanel
            artist={selectedArtist}
            eras={allEras}
            allArtists={allArtists}
            lang={lang}
            onClose={() => setSelectedArtist(null)}
            onSelectArtist={handleSelectArtist}
          />
        )}
      </main>
    </div>
  );
};

export default App;
