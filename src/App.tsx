import { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { HomePage } from './components/HomePage/HomePage';
import { ExploreTab } from './components/ExploreTab/ExploreTab';
import { Timeline } from './components/Timeline/Timeline';
import { ArtistPanel } from './components/ArtistPanel/ArtistPanel';
import { SearchFilter } from './components/SearchFilter/SearchFilter';
import { AddArtistModal } from './components/AddArtistModal/AddArtistModal';
import { AuthModal } from './components/AuthModal/AuthModal';
import { HamburgerMenu } from './components/HamburgerMenu/HamburgerMenu';
import { loadEras, loadArtists } from './lib/dataLoader';
import { Artist, Discipline, Language, Era } from './types/timeline';
import { getUIText } from './lib/i18n';
import { getCurrentUser, supabase } from './lib/supabase';
import { getStudiedWorks, syncUserDataToCloud } from './services/cloudSync';
import { getFavorites, deleteCustomArtist } from './services/userStorage';
import { searchExternalWikipediaEntities, CulturalEntityData } from './services/cultureApi';
import { Search, Menu, X, ExternalLink, Sparkles, Image as ImageIcon } from 'lucide-react';
import './App.css';

export function App() {
  const [viewMode, setViewMode] = useState<'home' | 'timeline' | 'explore'>('home');
  const [activeDiscipline, setActiveDiscipline] = useState<Discipline>('painting');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);

  // Version tick to trigger dataset reload when user adds/deletes artists
  const [artistVersion, setArtistVersion] = useState<number>(0);

  // Local Timeline Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNationality, setSelectedNationality] = useState<string>('');
  const [selectedCentury, setSelectedCentury] = useState<string>('');
  const [topMastersOnly, setTopMastersOnly] = useState<boolean>(false);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAddArtistOpen, setIsAddArtistOpen] = useState<boolean>(false);

  // Upper Bar Global Search state
  const [globalQuery, setGlobalQuery] = useState<string>('');
  const [globalResults, setGlobalResults] = useState<CulturalEntityData[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<CulturalEntityData | null>(null);

  const [isHamburgerOpen, setIsHamburgerOpen] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>('en');

  // Auth & Learning Progress state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [studiedWorksMap, setStudiedWorksMap] = useState<Record<string, any>>({});
  const [favoritesCount, setFavoritesCount] = useState<number>(0);

  const allEras = useMemo(() => loadEras(), []);

  // Reload artists dynamically whenever artistVersion changes
  const allArtists = useMemo(() => {
    return loadArtists();
  }, [artistVersion]);

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

  // Debounced Upper Bar Global Search effect
  useEffect(() => {
    if (!globalQuery.trim() || globalQuery.trim().length < 2) {
      setGlobalResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsGlobalSearching(true);
      const res = await searchExternalWikipediaEntities(globalQuery);
      setGlobalResults(res);
      setIsGlobalSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [globalQuery]);

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

  const handleRemoveArtist = (artistId: string) => {
    deleteCustomArtist(artistId);
    setArtistVersion(v => v + 1);
    setSelectedArtist(null);
  };

  const activeStudiedCount = Object.keys(studiedWorksMap).length;
  const localMatches = globalQuery.trim()
    ? allArtists.filter(a => a.name.toLowerCase().includes(globalQuery.toLowerCase()))
    : [];

  return (
    <div className="app-container">
      {/* Upper Header Bar */}
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
            <span className="brand-subtitle">{getUIText('brandTagline', lang)}</span>
          </h1>
        </div>

        <div className="header-actions">
          {/* Upper Bar Inline Search Input */}
          <div className="header-search-container">
            <Search size={16} color="var(--accent-gold)" />
            <input
              type="text"
              className="header-search-input"
              placeholder={lang === 'pl' ? 'Szukaj w bazie danych (np. Da Vinci, Chopin)...' : 'Search global DB (e.g. Da Vinci, Chopin)...'}
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              onFocus={() => setIsSearchDropdownOpen(true)}
            />
            {globalQuery && (
              <button
                className="close-btn"
                onClick={() => {
                  setGlobalQuery('');
                  setGlobalResults([]);
                }}
                style={{ padding: 2 }}
              >
                <X size={14} />
              </button>
            )}

            {/* Upper Bar Dropdown Results */}
            {isSearchDropdownOpen && globalQuery.trim().length >= 2 && (
              <div className="header-search-dropdown" onMouseLeave={() => setIsSearchDropdownOpen(false)}>
                {isGlobalSearching && (
                  <div style={{ textAlign: 'center', padding: 12, color: 'var(--accent-gold)', fontSize: 12, fontWeight: 600 }}>
                    <Sparkles size={14} className="spin" style={{ display: 'inline', marginRight: 6 }} />
                    {lang === 'pl' ? 'Przeszukiwanie Wikipedii / Wikidata...' : 'Querying Wikipedia / Wikidata DB...'}
                  </div>
                )}

                {/* Local Curated Matches */}
                {localMatches.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.08em' }}>
                      ✦ CultureDB Curated
                    </span>
                    {localMatches.map(artist => (
                      <div
                        key={artist.id}
                        className="global-search-item"
                        style={{ padding: '8px 10px' }}
                        onClick={() => {
                          handleSelectArtistFromSearch(artist);
                          setIsSearchDropdownOpen(false);
                          setGlobalQuery('');
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{artist.name} ({artist.birthYear}–{artist.deathYear})</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{artist.nationality} • {artist.discipline} • ★ {artist.impactScore}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live External Wikipedia Matches */}
                {globalResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.08em' }}>
                      🌐 Global Wikipedia / Wikidata API
                    </span>
                    {globalResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="global-search-item"
                        style={{ padding: '8px 10px' }}
                        onClick={() => {
                          setSelectedEntity(item);
                          setIsSearchDropdownOpen(false);
                        }}
                      >
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="global-search-item-img" style={{ width: 36, height: 36 }} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="global-search-item-img" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={16} color="var(--text-muted)" />
                          </div>
                        )}
                        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{item.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.snippet || item.summary}</div>
                        </div>
                        <ExternalLink size={12} color="var(--accent-gold)" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
            onRemoveArtist={handleRemoveArtist}
          />
        )}
      </main>

      {/* External Entity Preview Lightbox Modal */}
      {selectedEntity && (
        <div className="lightbox-overlay" onClick={() => setSelectedEntity(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setSelectedEntity(null)}>
              <X size={18} />
            </button>
            {selectedEntity.originalImageUrl && (
              <img src={selectedEntity.originalImageUrl} alt={selectedEntity.title} className="lightbox-image" referrerPolicy="no-referrer" />
            )}
            <h3 className="lightbox-title">{selectedEntity.title}</h3>
            {selectedEntity.summary && <p className="lightbox-desc">{selectedEntity.summary}</p>}
            {selectedEntity.wikipediaUrl && (
              <a
                href={selectedEntity.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
                style={{ width: 'fit-content' }}
              >
                {lang === 'pl' ? 'Otwórz artykuł na Wikipedii' : 'Open full Wikipedia article'} <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Master Modal */}
      <AddArtistModal
        isOpen={isAddArtistOpen}
        lang={lang}
        eras={allEras}
        onClose={() => setIsAddArtistOpen(false)}
        onArtistAdded={(newArtist) => {
          setArtistVersion(v => v + 1);
          if (newArtist.discipline !== activeDiscipline) setActiveDiscipline(newArtist.discipline);
          setViewMode('timeline');
          setSelectedArtist(newArtist);
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
        onOpenSearch={() => {}}
        onOpenExplore={() => setViewMode('explore')}
        onOpenAddArtist={() => setIsAddArtistOpen(true)}
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
