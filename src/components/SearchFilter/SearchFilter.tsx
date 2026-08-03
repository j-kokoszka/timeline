import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Filter, RotateCcw, Star, Heart } from 'lucide-react';
import { Artist, Era, Language } from '../../types/timeline';
import { getLocalizedString, getUIText } from '../../lib/i18n';
import './SearchFilter.css';

interface SearchFilterProps {
  artists: Artist[];
  eras: Era[];
  lang: Language;
  searchQuery: string;
  selectedNationality: string;
  selectedCentury: string;
  onlyTopMasters: boolean;
  onlyFavorites: boolean;
  onSearchChange: (query: string) => void;
  onNationalityChange: (nationality: string) => void;
  onCenturyChange: (century: string) => void;
  onTopMastersChange: (top: boolean) => void;
  onFavoritesChange: (favs: boolean) => void;
  onSelectArtist: (artist: Artist) => void;
  onSelectEra: (era: Era) => void;
  onResetFilters: () => void;
  onClose: () => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  artists,
  eras,
  lang,
  searchQuery,
  selectedNationality,
  selectedCentury,
  onlyTopMasters,
  onlyFavorites,
  onSearchChange,
  onNationalityChange,
  onCenturyChange,
  onTopMastersChange,
  onFavoritesChange,
  onSelectArtist,
  onSelectEra,
  onResetFilters,
  onClose
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Focus input automatically on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Unique list of nationalities
  const nationalities = useMemo(() => {
    const set = new Set<string>();
    artists.forEach(a => {
      const nat = getLocalizedString(a, 'nationality', lang) || a.nationality;
      if (nat) set.add(nat);
    });
    return Array.from(set).sort();
  }, [artists, lang]);

  // Centuries list
  const centuries = [
    { value: '13', label: '14th C (1300s)' },
    { value: '14', label: '15th C (1400s)' },
    { value: '15', label: '16th C (1500s)' },
    { value: '16', label: '17th C (1600s)' },
    { value: '17', label: '18th C (1700s)' },
    { value: '18', label: '19th C (1800s)' },
    { value: '19', label: '20th C (1900s)' },
    { value: '20', label: '21st C (2000s)' }
  ];

  // Autocomplete matching results
  const dropdownResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    const matchedArtists = artists.filter(a => {
      const name = getLocalizedString(a, 'name', lang).toLowerCase();
      const works = a.notableWorks.join(' ').toLowerCase();
      const bio = getLocalizedString(a, 'bio', lang).toLowerCase();
      return name.includes(q) || works.includes(q) || bio.includes(q);
    }).map(a => ({ type: 'artist' as const, item: a }));

    const matchedEras = eras.filter(e => {
      const name = getLocalizedString(e, 'name', lang).toLowerCase();
      const desc = getLocalizedString(e, 'description', lang).toLowerCase();
      return name.includes(q) || desc.includes(q);
    }).map(e => ({ type: 'era' as const, item: e }));

    return [...matchedArtists, ...matchedEras].slice(0, 8);
  }, [searchQuery, artists, eras, lang]);

  const hasActiveFilters = searchQuery || selectedNationality || selectedCentury || onlyTopMasters || onlyFavorites;

  return (
    <div className="search-filter-bar">
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={getUIText('searchPlaceholder', lang)}
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {searchQuery ? (
          <button
            className="clear-search-btn"
            onClick={() => {
              onSearchChange('');
              setIsOpen(false);
            }}
          >
            <X size={13} />
          </button>
        ) : (
          <span className="kbd-shortcut">/</span>
        )}

        {/* Autocomplete Dropdown */}
        {isOpen && dropdownResults.length > 0 && (
          <div className="search-dropdown">
            {dropdownResults.map((res) => {
              if (res.type === 'artist') {
                const artist = res.item;
                const artistName = getLocalizedString(artist, 'name', lang);
                return (
                  <div
                    key={`art-${artist.id}`}
                    className="dropdown-item"
                    onClick={() => {
                      onSelectArtist(artist);
                      setIsOpen(false);
                    }}
                  >
                    <div className="dropdown-item-header">
                      <span className="dropdown-item-title">{artistName}</span>
                      <span className="dropdown-item-type">Artist</span>
                    </div>
                    <span className="dropdown-item-sub">
                      {artist.birthYear} – {artist.deathYear} • {artist.notableWorks.slice(0, 2).join(', ')}
                    </span>
                  </div>
                );
              } else {
                const era = res.item;
                const eraName = getLocalizedString(era, 'name', lang);
                return (
                  <div
                    key={`era-${era.id}`}
                    className="dropdown-item"
                    onClick={() => {
                      onSelectEra(era);
                      setIsOpen(false);
                    }}
                  >
                    <div className="dropdown-item-header">
                      <span className="dropdown-item-title">{eraName}</span>
                      <span className="dropdown-item-type">Movement</span>
                    </div>
                    <span className="dropdown-item-sub">
                      {era.startYear} – {era.endYear} CE
                    </span>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      <div className="filter-divider" />

      {/* Multi-Filter Selects */}
      <div className="filter-select-group">
        <Filter size={14} style={{ color: 'var(--text-dim)' }} />

        {/* Nationality Filter */}
        <select
          className="filter-select"
          value={selectedNationality}
          onChange={(e) => onNationalityChange(e.target.value)}
        >
          <option value="">{getUIText('allNationalities', lang)}</option>
          {nationalities.map(nat => (
            <option key={nat} value={nat}>{nat}</option>
          ))}
        </select>

        {/* Century Filter */}
        <select
          className="filter-select"
          value={selectedCentury}
          onChange={(e) => onCenturyChange(e.target.value)}
        >
          <option value="">{getUIText('allCenturies', lang)}</option>
          {centuries.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* CultureDB Top Masters Toggle */}
        <button
          className={`toggle-filter-btn ${onlyTopMasters ? 'active' : ''}`}
          onClick={() => onTopMastersChange(!onlyTopMasters)}
          title={getUIText('topMastersOnly', lang)}
        >
          <Star size={13} fill={onlyTopMasters ? '#eab308' : 'none'} />
          <span>Top Masters</span>
        </button>

        {/* Favorites Only Toggle */}
        <button
          className={`toggle-filter-btn ${onlyFavorites ? 'active' : ''}`}
          onClick={() => onFavoritesChange(!onlyFavorites)}
          title={getUIText('favoritesOnly', lang)}
        >
          <Heart size={13} fill={onlyFavorites ? '#ef4444' : 'none'} />
          <span>Favorites</span>
        </button>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button className="reset-all-btn" onClick={onResetFilters}>
            <RotateCcw size={12} /> {getUIText('clearFilters', lang)}
          </button>
        )}
      </div>

      <div className="filter-divider" />

      {/* Close Search & Filter Bar */}
      <button className="clear-search-btn" onClick={onClose} title="Close Search">
        <X size={15} />
      </button>
    </div>
  );
};
