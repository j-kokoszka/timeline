import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, ExternalLink, Image as ImageIcon, PlusCircle } from 'lucide-react';
import { Language, Artist, Era } from '../../types/timeline';
import { searchExternalWikipediaEntities, autoDetectArtistDetails, autoExtractNotableWorks, autoGenerateRelationships, CulturalEntityData } from '../../services/cultureApi';
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
  const handleAddExternalEntityToTimeline = async (entity: CulturalEntityData) => {
    const normId = entity.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');

    // 1. Check if artist already exists in dataset (by ID or name)
    const existing = allArtists.find(a => {
      const aNormId = a.id.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const aNormName = a.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      return aNormId === normId || aNormName === normId;
    });

    if (existing) {
      unhideArtist(existing.id);
      onSelectArtist(existing);
      onClose();
      return;
    }

    // 2. Auto-detect details & extract works from API + text
    const rawText = `${entity.title} ${entity.description || ''} ${entity.summary || ''} ${entity.snippet || ''}`;
    const detected = autoDetectArtistDetails(entity.title, rawText, allEras);

    if (!detected) {
      alert(lang === 'pl'
        ? `⚠️ Nie udało się automatycznie odczytać dat życia dla "${entity.title}" z Wikipedii. Użyj formularza "Dodaj Nowego Mistrza", aby wpisać lata ręcznie.`
        : `⚠️ Could not automatically verify lifespan dates for "${entity.title}" from Wikipedia. Please use the "Add Custom Master" form to specify birth & death years.`
      );
      return;
    }

    const notableWorks = await autoExtractNotableWorks(entity.title, rawText);

    const bioPrefix = detected.realDiscipline !== 'Painting'
      ? `[${detected.realDiscipline}] `
      : '';

    const tempArtist = {
      id: normId,
      name: entity.title,
      birthYear: detected.birthYear,
      deathYear: detected.deathYear,
      discipline: detected.discipline,
      bio: bioPrefix + (entity.summary || entity.snippet || ''),
      eraId: detected.eraId
    };

    const relationships = autoGenerateRelationships(tempArtist, allArtists);

    const newArtist: Artist = {
      ...tempArtist,
      era: detected.eraId,
      nationality: 'Global',
      impactScore: 9.0,
      notableWorks,
      catalog: notableWorks.map((work, idx) => ({
        id: `${normId}-work-${idx}`,
        title: work,
        year: Math.round(detected.birthYear + (detected.deathYear - detected.birthYear) * 0.5),
        medium: `${detected.realDiscipline} / Masterwork`
      })),
      sources: entity.wikipediaUrl ? [entity.wikipediaUrl] : [],
      relationships
    };

    unhideArtist(normId);
    saveCustomArtist(newArtist);
    onSelectArtist(newArtist);
    onClose();
  };

  // Local matching artists with typo-tolerant fuzzy matching
  const localMatches = query.trim()
    ? allArtists.filter(a => {
        const nameNorm = a.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const qNorm = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        if (nameNorm.includes(qNorm) || qNorm.includes(nameNorm)) return true;

        if (qNorm.length >= 4) {
          let matches = 0;
          for (let i = 0; i < qNorm.length - 1; i++) {
            const sub = qNorm.substring(i, i + 2);
            if (nameNorm.includes(sub)) matches++;
          }
          return (matches / (qNorm.length - 1)) >= 0.6;
        }
        return false;
      })
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
              {results.map((item, idx) => {
                const existingArtist = allArtists.find(a => {
                  const normId = item.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                  const aNormId = a.id.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                  const aNormName = a.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                  return aNormId === normId || aNormName === normId;
                });

                return (
                  <div
                    key={idx}
                    className="global-search-item"
                    onClick={() => {
                      if (existingArtist) {
                        unhideArtist(existingArtist.id);
                        onSelectArtist(existingArtist);
                        onClose();
                      } else {
                        setSelectedEntity(item);
                      }
                    }}
                  >
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="global-search-item-img" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="global-search-item-img" style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={20} color="var(--text-muted)" />
                      </div>
                    )}
                    <div style={{ flexGrow: 1 }}>
                      <div className="global-search-item-title">
                        {item.title}
                        {existingArtist && (
                          <span style={{ fontSize: 10, marginLeft: 8, color: 'var(--accent-gold)', background: 'rgba(217,167,74,0.15)', padding: '2px 6px', borderRadius: 4 }}>
                            ✓ {lang === 'pl' ? 'W Bazie' : 'In Timeline'}
                          </span>
                        )}
                      </div>
                      <div className="global-search-item-desc">{item.snippet || item.summary}</div>
                    </div>
                    {existingArtist ? (
                      <button
                        className="secondary-cta-btn"
                        style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0, borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          unhideArtist(existingArtist.id);
                          onSelectArtist(existingArtist);
                          onClose();
                        }}
                      >
                        <span>{lang === 'pl' ? '✓ Pokaż na Osi' : '✓ View'}</span>
                      </button>
                    ) : (
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
                    )}
                  </div>
                );
              })}
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
