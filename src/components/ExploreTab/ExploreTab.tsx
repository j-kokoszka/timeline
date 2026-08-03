import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Compass, ExternalLink, Image as ImageIcon, X, RefreshCw } from 'lucide-react';
import { Language, Artist } from '../../types/timeline';
import { fetchRandomCulturalMasterpiece, searchExternalWikipediaEntities, fetchArtworkData, ArtworkData, CulturalEntityData } from '../../services/cultureApi';
import './ExploreTab.css';

interface ExploreTabProps {
  lang: Language;
  allArtists: Artist[];
  onSelectArtist: (artist: Artist) => void;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({
  lang,
  allArtists,
  onSelectArtist
}) => {
  const [randomMasterpiece, setRandomMasterpiece] = useState<ArtworkData | null>(null);
  const [isLoadingRandom, setIsLoadingRandom] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CulturalEntityData[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<CulturalEntityData | null>(null);

  // Theme artwork images fetched dynamically from Wikipedia API
  const [themeImages, setThemeImages] = useState<Record<string, string>>({});

  // Fetch live images for curated themes
  useEffect(() => {
    let isMounted = true;
    const themesToFetch = [
      { key: 'renaissance', title: 'The School of Athens' },
      { key: 'dutch', title: 'The Night Watch' },
      { key: 'impressionism', title: 'Impression, Sunrise' },
      { key: 'baroque', title: 'Judith Beheading Holofernes' }
    ];

    themesToFetch.forEach(async ({ key, title }) => {
      const art = await fetchArtworkData(title);
      if (isMounted && art?.imageUrl) {
        setThemeImages(prev => ({ ...prev, [key]: art.imageUrl! }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Random Masterpiece Generator
  const handleGenerateRandom = async () => {
    setIsLoadingRandom(true);
    const data = await fetchRandomCulturalMasterpiece();
    setRandomMasterpiece(data);
    setIsLoadingRandom(false);
  };

  // Handle Live Wikipedia Database Search
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchExternalWikipediaEntities(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  // Curated historical themes
  const curatedThemes = [
    { key: 'renaissance', title: 'Florentine High Renaissance', titlePl: 'Włoski Wysoki Renesans', count: 'Da Vinci, Michelangelo, Raphael', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/The_School_of_Athens_%28Raphael%29.jpg/640px-The_School_of_Athens_%28Raphael%29.jpg' },
    { key: 'dutch', title: 'The Dutch Golden Age', titlePl: 'Złoty Wiek Malarstwa Holenderskiego', count: 'Rembrandt, Vermeer, Frans Hals', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Night_Watch_-_Rembrandt_van_Rijn.jpg/640px-The_Night_Watch_-_Rembrandt_van_Rijn.jpg' },
    { key: 'impressionism', title: 'Impressionist Revolution', titlePl: 'Rewolucja Impresjonistyczna', count: 'Monet, Renoir, Degas, Manet', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Claude_Monet%2C_Impression%2C_soleil_levant.jpg/640px-Claude_Monet%2C_Impression%2C_soleil_levant.jpg' },
    { key: 'baroque', title: 'Baroque Dramatic Chiaroscuro', titlePl: 'Dramatyzm Światłocienia Baroku', count: 'Caravaggio, Bernini, Artemisia', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Caravaggio_-_Judith_Beheading_Holofernes_-_Gallerie_Nazionali_di_Arte_Antica.jpg/640px-Caravaggio_-_Judith_Beheading_Holofernes_-_Gallerie_Nazionali_di_Arte_Antica.jpg' }
  ];

  return (
    <div className="explore-page">
      <div className="explore-container">

        {/* Explore Header */}
        <section className="explore-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217, 167, 74, 0.15)', border: '1px solid var(--accent-gold)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>
            <Compass size={14} /> Global Cultural Explorer
          </div>
          <h1 className="explore-title">
            {lang === 'pl' ? 'Odkrywaj Arcydzieła Świata' : 'Discover World Masterpieces'}
          </h1>
          <p className="explore-subtitle">
            {lang === 'pl'
              ? 'Przeszukuj miliony encyklopedycznych wpisów o sztuce, korzystaj z zewnętrznej bazy danych Wikipedia API i odkrywaj losowe arcydzieła.'
              : 'Search millions of encyclopedic art records powered by external Wikipedia APIs, discover random masterpieces, and explore curated historical themes.'}
          </p>
        </section>

        {/* "Surprise Me!" Random Masterpiece Generator */}
        <section className="random-card">
          {randomMasterpiece?.imageUrl ? (
            <img
              src={randomMasterpiece.imageUrl}
              alt={randomMasterpiece.title}
              className="random-image"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="random-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
              <Sparkles size={36} color="var(--accent-gold)" />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexGrow: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-gold)' }}>
              🎲 {lang === 'pl' ? 'Losowe Arcydzieło Świata' : 'Random World Masterpiece'}
            </span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--text-main)' }}>
              {randomMasterpiece ? randomMasterpiece.title : (lang === 'pl' ? 'Wylosuj Niezwykłe Dzieło Sztuki' : 'Roll for an Iconic Masterpiece')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {randomMasterpiece?.description || (lang === 'pl'
                ? 'Kliknij przycisk poniżej, aby połączyć się z zewnętrzną bazą danych i wylosować ikonę światowego dziedzictwa sztuki!'
                : 'Click the button below to fetch a surprise masterpiece directly from world encyclopedic repositories!')}
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button
                className="primary-cta-btn"
                onClick={handleGenerateRandom}
                disabled={isLoadingRandom}
                style={{ padding: '10px 20px', fontSize: 14 }}
              >
                <RefreshCw size={16} className={isLoadingRandom ? 'spin' : ''} />
                <span>{isLoadingRandom ? (lang === 'pl' ? 'Losowanie...' : 'Fetching...') : (lang === 'pl' ? 'Wylosuj Arcydzieło!' : 'Surprise Me!')}</span>
              </button>

              {randomMasterpiece?.wikipediaUrl && (
                <a
                  href={randomMasterpiece.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-cta-btn"
                  style={{ textDecoration: 'none' }}
                >
                  <span>Wikipedia</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Live Search across Global Wikipedia API */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
            🔍 {lang === 'pl' ? 'Szukaj w Światowej Bazie Danych (Wikipedia API)' : 'Search Global Art Database (Wikipedia API)'}
          </h3>

          <form onSubmit={handleSearchSubmit} className="live-search-box">
            <Search size={18} color="var(--accent-gold)" />
            <input
              type="text"
              className="live-search-input"
              placeholder={lang === 'pl' ? 'Wpisz dowolnego artystę, rzeźbę lub obraz (np. Caravaggio, Rodin, Chopin)...' : 'Type any global artist, sculpture, or painting (e.g. Caravaggio, Rodin, Chopin)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="primary-cta-btn" style={{ padding: '8px 18px', fontSize: 13 }}>
              {isSearching ? (lang === 'pl' ? 'Szukam...' : 'Searching...') : (lang === 'pl' ? 'Szukaj w API' : 'Search API')}
            </button>
          </form>

          {/* Search Results Grid */}
          {searchResults.length > 0 && (
            <div className="live-search-results-grid">
              {searchResults.map((res, i) => (
                <div key={i} className="result-card" onClick={() => setSelectedEntity(res)}>
                  {res.thumbnailUrl ? (
                    <img
                      src={res.thumbnailUrl}
                      alt={res.title}
                      className="result-card-img"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="result-card-img" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={32} color="var(--text-muted)" />
                    </div>
                  )}
                  <div className="result-card-body">
                    <div className="result-card-title">{res.title}</div>
                    <div className="result-card-snippet">{res.snippet || res.summary}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-gold)', fontSize: 12, fontWeight: 700, marginTop: 'auto' }}>
                      {lang === 'pl' ? 'Czytaj więcej' : 'Read details'} <ExternalLink size={12} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Curated Historical Collections */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
            🏛️ {lang === 'pl' ? 'Wybrane Kolekcje i Epoki' : 'Curated Historical Collections'}
          </h3>
          <div className="collection-grid">
            {curatedThemes.map((theme) => {
              const activeImg = themeImages[theme.key] || theme.fallbackImg;
              return (
                <div
                  key={theme.key}
                  className="collection-card"
                  onClick={() => {
                    const matched = allArtists.find(a => a.name.toLowerCase().includes('vinci') || a.name.toLowerCase().includes('rembrandt') || a.name.toLowerCase().includes('monet') || a.name.toLowerCase().includes('caravaggio'));
                    if (matched) onSelectArtist(matched);
                  }}
                >
                  <img
                    src={activeImg}
                    alt={theme.title}
                    className="collection-card-img"
                    referrerPolicy="no-referrer"
                  />
                  <div className="collection-card-overlay">
                    <div className="collection-card-title">{lang === 'pl' ? theme.titlePl : theme.title}</div>
                    <div className="collection-card-count">{theme.count}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Entity Details Lightbox Modal */}
      {selectedEntity && (
        <div className="lightbox-overlay" onClick={() => setSelectedEntity(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setSelectedEntity(null)}>
              <X size={18} />
            </button>
            {selectedEntity.originalImageUrl && (
              <img
                src={selectedEntity.originalImageUrl}
                alt={selectedEntity.title}
                className="lightbox-image"
                referrerPolicy="no-referrer"
              />
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
    </div>
  );
};
