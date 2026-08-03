import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, ExternalLink, Image as ImageIcon, PlusCircle } from 'lucide-react';
import { Language, Artist, Era } from '../../types/timeline';
import { searchExternalWikipediaEntities, autoDetectArtistDetails, CulturalEntityData } from '../../services/cultureApi';
import { saveCustomArtist, unhideArtist } from '../../services/userStorage';
import './GlobalSearchModal.css';

interface GlobalSearchModalProps {
  isOpen: boolean;
  lang: Language;
  allArtists: Artist[];
  allEras: Era[];
  onClose: () => void;
  onSelectArtist: (artist: Artist) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  lang,
  allArtists,
  allEras,
  onClose,
  onSelectArtist
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<CulturalEntityData[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<CulturalEntityData | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchExternalWikipediaEntities(query);
      setResults(res);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Add external Wikipedia entity as a new artist to user's timeline
  const handleAddExternalEntityToTimeline = (entity: CulturalEntityData) => {
    const id = entity.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const detected = autoDetectArtistDetails(entity.title, entity.summary, allEras);

    // Prepend real discipline label if it differs from the timeline discipline
    const bioPrefix = detected.realDiscipline !== 'Painting'
      ? `[${detected.realDiscipline}] `
      : '';

    const newArtist: Artist = {
      id,
      name: entity.title,
      discipline: detected.discipline,
      era: detected.eraId,
      birthYear: detected.birthYear,
      deathYear: detected.deathYear,
      nationality: 'Global',
      bio: bioPrefix + (entity.summary || ''),
      impactScore: 9.0,
      notableWorks: [],
      catalog: [],
      sources: [],
      relationships: {
        influencedBy: [],
        influenced: [],
        contemporaries: [],
        movements: [detected.eraId]
      }
    };

    unhideArtist(id);
    saveCustomArtist(newArtist);
    onSelectArtist(newArtist);
    onClose();
  };

  // Local matching artists
  const localMatches = query.trim()
    ? allArtists.filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Command Search Input Bar */}
        <div className="global-search-input-box">
          <Search size={20} color="var(--accent-gold)" />
          <input
            type="text"
            className="global-search-input"
            placeholder={lang === 'pl' ? 'Wpisz twórcę, rzeźbę lub obraz (np. Caravaggio, Rodin, Chopin)...' : 'Type any master, sculpture, or painting (e.g. Caravaggio, Rodin, Chopin)...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Results Container */}
        <div className="global-search-results">
          {isSearching && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--accent-gold)', fontSize: 13, fontWeight: 600 }}>
              <Sparkles size={16} className="spin" style={{ display: 'inline', marginRight: 6 }} />
              {lang === 'pl' ? 'Przeszukiwanie bazy danych Wikipedia / Wikidata...' : 'Querying global Wikipedia / Wikidata DB...'}
            </div>
          )}

          {!query && (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(217, 167, 74, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', marginBottom: 8 }}>
                <Search size={22} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                {lang === 'pl' ? 'Światowa Wyszukiwarka Sztuki' : 'Global Art Command Search'}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {lang === 'pl' ? 'Wpisz dowolne nazwisko twórcy, obraz lub rzeźbę, aby przeszukać zewnętrzne bazy danych.' : 'Type any global master, painting, or sculpture to query external databases in real time.'}
              </div>
            </div>
          )}

          {/* Local Curated Matches */}
          {localMatches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.08em' }}>
                ✦ CultureDB Curated Matches
              </span>
              {localMatches.map(artist => (
                <div
                  key={artist.id}
                  className="global-search-item"
                  onClick={() => {
                    onSelectArtist(artist);
                    onClose();
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 6, background: 'rgba(217,167,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', fontWeight: 800 }}>
                    {artist.name.charAt(0)}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div className="global-search-item-title">{artist.name} ({artist.birthYear}–{artist.deathYear})</div>
                    <div className="global-search-item-desc">{artist.nationality} • {artist.discipline} • Impact: ★ {artist.impactScore}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--accent-gold)', fontWeight: 700 }}>
                    {lang === 'pl' ? 'Pokaż na Osi' : 'View on Timeline'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Live External Wikipedia Matches */}
          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.08em' }}>
                🌐 Global External Database (Wikipedia API)
              </span>
              {results.map((item, idx) => (
                <div
                  key={idx}
                  className="global-search-item"
                  onClick={() => setSelectedEntity(item)}
                >
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} className="global-search-item-img" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="global-search-item-img" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={20} color="var(--text-muted)" />
                    </div>
                  )}
                  <div style={{ flexGrow: 1 }}>
                    <div className="global-search-item-title">{item.title}</div>
                    <div className="global-search-item-desc">{item.snippet || item.summary}</div>
                  </div>
                  <button
                    className="secondary-cta-btn"
                    style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddExternalEntityToTimeline(item);
                    }}
                  >
                    <PlusCircle size={14} color="var(--accent-gold)" />
                    <span>{lang === 'pl' ? '+ Dodaj' : '+ Add'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Entity Preview Lightbox Modal */}
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
            
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                className="primary-cta-btn"
                onClick={() => handleAddExternalEntityToTimeline(selectedEntity)}
                style={{ padding: '10px 18px', fontSize: 14 }}
              >
                <PlusCircle size={18} />
                <span>{lang === 'pl' ? 'Dodaj tego mistrza do mojej osi czasu' : 'Add master to my timeline'}</span>
              </button>

              {selectedEntity.wikipediaUrl && (
                <a
                  href={selectedEntity.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-cta-btn"
                  style={{ width: 'fit-content' }}
                >
                  Wikipedia <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
