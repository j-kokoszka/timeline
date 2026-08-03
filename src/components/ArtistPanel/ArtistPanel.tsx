import React, { useEffect, useState, useMemo } from 'react';
import { X, ExternalLink, Star, Heart, Image as ImageIcon, BookOpen, Layers, CheckCircle2, Trash2 } from 'lucide-react';
import { Artist, Era, Language, ArtworkEntry } from '../../types/timeline';
import { getLocalizedString, getUIText } from '../../lib/i18n';
import { fetchCulturalEntityData, fetchArtworkData, CulturalEntityData, ArtworkData } from '../../services/cultureApi';
import { getFavorites, toggleFavorite, getUserRatings, setUserRating, getUserArtworkRatings, setUserArtworkRating } from '../../services/userStorage';
import { getStudiedWorks, toggleWorkStudied } from '../../services/cloudSync';
import './ArtistPanel.css';

interface ArtistPanelProps {
  artist: Artist;
  eras: Era[];
  allArtists: Artist[];
  lang: Language;
  onClose: () => void;
  onSelectArtist: (artist: Artist) => void;
  onLearningProgressUpdate?: () => void;
  onRemoveArtist?: (artistId: string) => void;
}

export const ArtistPanel: React.FC<ArtistPanelProps> = ({
  artist,
  eras,
  allArtists,
  lang,
  onClose,
  onSelectArtist,
  onLearningProgressUpdate,
  onRemoveArtist
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog'>('overview');
  const [liveData, setLiveData] = useState<CulturalEntityData | null>(null);
  const [artworksMap, setArtworksMap] = useState<Record<string, ArtworkData>>({});
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkData | null>(null);
  const [zoomPortraitUrl, setZoomPortraitUrl] = useState<string | null>(null);

  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [userStars, setUserStars] = useState<number>(0);
  const [artworkRatings, setArtworkRatingsState] = useState<Record<string, number>>({});
  const [studiedWorks, setStudiedWorksState] = useState<Record<string, any>>({});

  const era = eras.find(e => e.id === artist.era);
  const eraColor = era ? era.color : '#3b82f6';
  const artistName = getLocalizedString(artist, 'name', lang);
  const nationality = getLocalizedString(artist, 'nationality', lang) || artist.nationality;
  const bio = getLocalizedString(artist, 'bio', lang);

  // Effective Catalog: uses artist.catalog if present, or synthesizes from notableWorks
  const effectiveCatalog: ArtworkEntry[] = useMemo(() => {
    if (artist.catalog && artist.catalog.length > 0) {
      return artist.catalog;
    }
    return artist.notableWorks.map((work, idx) => ({
      id: `${artist.id}-work-${idx}`,
      title: work,
      titlePl: lang === 'pl' && artist.notableWorksPl?.[idx] ? artist.notableWorksPl[idx] : work,
      year: Math.round(artist.birthYear + (artist.deathYear - artist.birthYear) * 0.6),
      medium: 'Masterwork / Painting',
      location: 'Museum & Public Collection'
    }));
  }, [artist, lang]);

  // Load live Wikidata / Wikipedia API image & bio data
  useEffect(() => {
    let isMounted = true;
    setLiveData(null);
    setArtworksMap({});
    setSelectedArtwork(null);
    setZoomPortraitUrl(null);

    fetchCulturalEntityData(artist.name, artist.wikidataId).then(data => {
      if (isMounted) setLiveData(data);
    });

    // Fetch thumbnails for effective catalog items
    effectiveCatalog.forEach(item => {
      fetchArtworkData(item.title).then(artData => {
        if (isMounted && artData) {
          setArtworksMap(prev => ({ ...prev, [item.title]: artData }));
        }
      });
    });

    // Check user favorites, ratings, and learning progress
    const favs = getFavorites();
    setIsFavorite(favs.includes(artist.id));

    const ratings = getUserRatings();
    setUserStars(ratings[artist.id] || 0);

    const artRatings = getUserArtworkRatings();
    setArtworkRatingsState(artRatings);

    const studied = getStudiedWorks();
    setStudiedWorksState(studied);

    return () => {
      isMounted = false;
    };
  }, [artist, effectiveCatalog]);

  const handleToggleFav = () => {
    const updated = toggleFavorite(artist.id);
    setIsFavorite(updated);
  };

  const handleRateArtist = (star: number) => {
    const updatedScore = setUserRating(artist.id, star);
    setUserStars(updatedScore);
  };

  const handleRateArtwork = (workTitle: string, star: number) => {
    const updatedScore = setUserArtworkRating(workTitle, star);
    setArtworkRatingsState(prev => {
      const copy = { ...prev };
      if (updatedScore === 0) {
        delete copy[workTitle];
      } else {
        copy[workTitle] = updatedScore;
      }
      return copy;
    });
  };

  const handleToggleStudied = (e: React.MouseEvent, workTitle: string) => {
    e.stopPropagation();
    toggleWorkStudied(workTitle, artist.id, artist.era);
    setStudiedWorksState(getStudiedWorks());
    if (onLearningProgressUpdate) onLearningProgressUpdate();
  };

  const findArtistName = (id: string) => {
    const found = allArtists.find(a => a.id === id);
    return found ? getLocalizedString(found, 'name', lang) : id;
  };

  const portraitUrl = liveData?.originalImageUrl || liveData?.thumbnailUrl;

  return (
    <>
      <div className="artist-panel" onWheel={(e) => e.stopPropagation()}>
        {/* Header with Artist Avatar & Name */}
        <div className="panel-header">
          <div className="artist-header-row">
            {portraitUrl ? (
              <img
                src={portraitUrl}
                alt={artistName}
                className="artist-avatar"
                onClick={() => setZoomPortraitUrl(portraitUrl)}
                title="Click to zoom portrait"
              />
            ) : (
              <div className="artist-avatar" style={{ background: eraColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px', color: '#fff', fontWeight: 700 }}>{artistName.charAt(0)}</span>
              </div>
            )}

            <div className="artist-title-group">
              <h2 className="artist-name">{artistName}</h2>
              <div className="artist-years">
                {artist.birthYear} – {artist.deathYear} {nationality && `• ${nationality}`}
              </div>
            </div>
          </div>

          <div className="header-action-btns">
            {onRemoveArtist && (
              <button
                className="close-btn"
                onClick={() => {
                  if (confirm(lang === 'pl' ? `Usuąć ${artistName} z osi czasu?` : `Remove ${artistName} from your timeline?`)) {
                    onRemoveArtist(artist.id);
                    onClose();
                  }
                }}
                title={lang === 'pl' ? 'Usuń z Osi Czasu' : 'Remove from Timeline'}
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              className={`fav-btn ${isFavorite ? 'active' : ''}`}
              onClick={handleToggleFav}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart size={18} fill={isFavorite ? '#ef4444' : 'none'} />
            </button>
            <button className="close-btn" onClick={onClose} title={getUIText('clearSelection', lang)}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation: Overview vs Catalogue Raisonné */}
        <nav className="panel-nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Layers size={13} style={{ display: 'inline', marginRight: '4px' }} /> Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <BookOpen size={13} style={{ display: 'inline', marginRight: '4px' }} /> Catalogue Raisonné ({effectiveCatalog.length})
          </button>
        </nav>

        {activeTab === 'overview' ? (
          <>
            {/* High-Res Image Banner */}
            {liveData?.originalImageUrl && (
              <div className="artist-image-container" onClick={() => setZoomPortraitUrl(liveData.originalImageUrl)}>
                <img
                  src={liveData.originalImageUrl}
                  alt={artistName}
                  className="artist-image"
                  loading="lazy"
                  title="Click to zoom image"
                />
              </div>
            )}

            {/* Meta Badges Row: CultureDB Impact Rating & Star Ratings */}
            <div className="meta-badges-row">
              {era && (
                <div
                  className="era-badge"
                  style={{
                    backgroundColor: `${eraColor}25`,
                    borderColor: eraColor,
                    color: eraColor,
                    border: `1px solid ${eraColor}`
                  }}
                >
                  {getLocalizedString(era, 'name', lang)}
                </div>
              )}

              {artist.impactScore && (
                <div className="impact-badge" title="CultureDB Historical Significance Score">
                  <Star size={14} fill="#d9a74a" color="#d9a74a" />
                  <span>CultureDB {artist.impactScore.toFixed(1)} / 10</span>
                </div>
              )}
            </div>

            {/* User 1-5 Star Rating */}
            <div className="panel-section">
              <div className="user-star-rating">
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginRight: '8px' }}>Your Rating:</span>
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    title={star === userStars ? 'Click to remove rating' : `Rate ${star} stars`}
                    onClick={() => handleRateArtist(star)}
                  >
                    <Star
                      size={16}
                      className={`star-icon-btn ${star <= userStars ? 'active' : ''}`}
                      fill={star <= userStars ? '#eab308' : 'none'}
                    />
                  </span>
                ))}
              </div>
            </div>

            {/* Biography */}
            <div className="panel-section">
              <h3 className="section-title">{getUIText('biography', lang)}</h3>
              <p className="artist-bio">{liveData?.summary || bio}</p>
            </div>

            {/* Notable Works Interactive Gallery Grid */}
            {artist.notableWorks.length > 0 && (
              <div className="panel-section">
                <h3 className="section-title">{getUIText('notableWorks', lang)} (Click to View & Rate)</h3>
                <div className="artwork-gallery-grid">
                  {artist.notableWorks.map((work) => {
                    const art = artworksMap[work];
                    const workRating = artworkRatings[work] || 0;
                    const isStudied = Boolean(studiedWorks[work]);
                    return (
                      <div
                        key={work}
                        className="artwork-card"
                        onClick={() => art && setSelectedArtwork(art)}
                      >
                        {art?.imageUrl ? (
                          <img src={art.imageUrl} alt={work} className="artwork-card-thumb" />
                        ) : (
                          <div className="artwork-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={20} color="var(--text-muted)" />
                          </div>
                        )}
                        <span className="artwork-card-title">{work}</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          {workRating > 0 && (
                            <span style={{ fontSize: '10px', color: '#eab308', fontWeight: 700 }}>
                              ★ {workRating}/5
                            </span>
                          )}
                          <button
                            onClick={(e) => handleToggleStudied(e, work)}
                            title={isStudied ? 'Marked as Mastered' : 'Mark as Studied'}
                            style={{ background: 'none', border: 'none', color: isStudied ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Graph Relationships Section */}
            <div className="panel-section">
              <h3 className="section-title">{getUIText('networkConnections', lang)}</h3>
              <div className="relationships-grid">
                {artist.relationships.influencedBy.length > 0 && (
                  <div className="relationship-category">
                    <span className="rel-label">{getUIText('influencedByLabel', lang)}</span>
                    <div className="rel-chips">
                      {artist.relationships.influencedBy.map(id => {
                        const target = allArtists.find(a => a.id === id);
                        return (
                          <button
                            key={id}
                            className="rel-chip-btn"
                            onClick={() => target && onSelectArtist(target)}
                          >
                            ← {findArtistName(id)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {artist.relationships.influenced.length > 0 && (
                  <div className="relationship-category">
                    <span className="rel-label">{getUIText('influencedLabel', lang)}</span>
                    <div className="rel-chips">
                      {artist.relationships.influenced.map(id => {
                        const target = allArtists.find(a => a.id === id);
                        return (
                          <button
                            key={id}
                            className="rel-chip-btn"
                            onClick={() => target && onSelectArtist(target)}
                          >
                            → {findArtistName(id)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {artist.relationships.contemporaries.length > 0 && (
                  <div className="relationship-category">
                    <span className="rel-label">{getUIText('contemporariesLabel', lang)}</span>
                    <div className="rel-chips">
                      {artist.relationships.contemporaries.map(id => {
                        const target = allArtists.find(a => a.id === id);
                        return (
                          <button
                            key={id}
                            className="rel-chip-btn"
                            onClick={() => target && onSelectArtist(target)}
                          >
                            ↔ {findArtistName(id)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sources & Wikipedia External Link */}
            <div className="panel-section">
              <h3 className="section-title">{getUIText('sourcesLabel', lang)}</h3>
              <div className="sources-list">
                {liveData?.wikipediaUrl && (
                  <a
                    href={liveData.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    Wikipedia Article <ExternalLink size={12} />
                  </a>
                )}
                {artist.sources.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    {new URL(url).hostname} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Detailed Catalogue Raisonné (Oeuvre List) */
          <div className="panel-section">
            <h3 className="section-title">Catalogue Raisonné ({effectiveCatalog.length} Masterworks)</h3>
            <div className="catalog-list">
              {effectiveCatalog.map(item => {
                const art = artworksMap[item.title];
                const workTitle = lang === 'pl' && item.titlePl ? item.titlePl : item.title;
                const location = lang === 'pl' && item.locationPl ? item.locationPl : item.location;
                const rating = artworkRatings[item.title] || 0;
                const isStudied = Boolean(studiedWorks[item.title]);

                return (
                  <div
                    key={item.id}
                    className="catalog-item-card"
                    onClick={() => {
                      setSelectedArtwork({
                        title: item.title,
                        imageUrl: art?.imageUrl || null,
                        thumbnailUrl: art?.thumbnailUrl || null,
                        description: item.description || art?.description || null,
                        wikipediaUrl: art?.wikipediaUrl || null
                      });
                    }}
                  >
                    {art?.imageUrl ? (
                      <img src={art.imageUrl} alt={workTitle} className="catalog-thumb" />
                    ) : (
                      <div className="catalog-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={20} color="var(--text-muted)" />
                      </div>
                    )}

                    <div className="catalog-info">
                      <div className="catalog-title-row">
                        <span className="catalog-item-title">{workTitle}</span>
                        <span className="catalog-item-year">{item.year}</span>
                      </div>
                      {item.medium && (
                        <div className="catalog-item-meta">🎨 {item.medium}</div>
                      )}
                      {location && (
                        <div className="catalog-item-meta">🏛️ {location}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        {rating > 0 && (
                          <div style={{ fontSize: '11px', color: '#eab308', fontWeight: 700 }}>
                            ★ Rating: {rating}/5
                          </div>
                        )}
                        <button
                          onClick={(e) => handleToggleStudied(e, item.title)}
                          style={{
                            background: isStudied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${isStudied ? '#10b981' : 'var(--border-subtle)'}`,
                            color: isStudied ? '#10b981' : 'var(--text-muted)',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <CheckCircle2 size={12} /> {isStudied ? (lang === 'pl' ? 'Opanowane' : 'Mastered') : (lang === 'pl' ? 'Oznacz jako wyuczone' : 'Mark Studied')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Artist Portrait Zoom Lightbox */}
      {zoomPortraitUrl && (
        <div className="lightbox-overlay" onClick={() => setZoomPortraitUrl(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setZoomPortraitUrl(null)}>
              <X size={18} />
            </button>
            <img src={zoomPortraitUrl} alt={artistName} className="lightbox-image" />
            <h3 className="lightbox-title">{artistName} ({artist.birthYear} – {artist.deathYear})</h3>
          </div>
        </div>
      )}

      {/* Full-Screen Artwork Lightbox Modal with Per-Work Star Rating */}
      {selectedArtwork && (
        <div className="lightbox-overlay" onClick={() => setSelectedArtwork(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setSelectedArtwork(null)}>
              <X size={18} />
            </button>

            {selectedArtwork.imageUrl && (
              <img
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                className="lightbox-image"
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h3 className="lightbox-title">{selectedArtwork.title}</h3>

              {/* Per-Artwork Star Rating Control */}
              <div className="user-star-rating">
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginRight: '6px' }}>Rate Work:</span>
                {[1, 2, 3, 4, 5].map(star => {
                  const currentWorkRating = artworkRatings[selectedArtwork.title] || 0;
                  return (
                    <span
                      key={star}
                      title={star === currentWorkRating ? 'Click to remove artwork rating' : `Rate ${star} stars`}
                      onClick={() => handleRateArtwork(selectedArtwork.title, star)}
                    >
                      <Star
                        size={18}
                        className={`star-icon-btn ${star <= currentWorkRating ? 'active' : ''}`}
                        fill={star <= currentWorkRating ? '#eab308' : 'none'}
                      />
                    </span>
                  );
                })}
              </div>
            </div>

            {selectedArtwork.description && (
              <p className="lightbox-desc">{selectedArtwork.description}</p>
            )}

            {selectedArtwork.wikipediaUrl && (
              <a
                href={selectedArtwork.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
                style={{ width: 'fit-content' }}
              >
                View on Wikipedia <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
};
