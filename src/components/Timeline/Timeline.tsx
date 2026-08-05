import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Filter, X } from 'lucide-react';
import { Artist, Era, Language, Discipline, PositionedArtist, PositionedEra } from '../../types/timeline';
import { assignArtistRows, calculateEraLayout, calculateTimelineBounds, formatYear } from '../../lib/layoutMath';
import { getLocalizedString, getUIText } from '../../lib/i18n';
import { getFavorites } from '../../services/userStorage';
import './Timeline.css';

interface TimelineProps {
  eras: Era[];
  artists: Artist[];
  selectedArtist: Artist | null;
  selectedEra: Era | null;
  lang: Language;
  searchQuery: string;
  selectedNationality: string;
  selectedCentury: string;
  onlyTopMasters: boolean;
  onlyFavorites: boolean;
  onSelectArtist: (artist: Artist | null) => void;
  onSelectEra: (era: Era | null) => void;
  onToggleFilterBar?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  eras,
  artists,
  selectedArtist,
  selectedEra,
  lang,
  searchQuery,
  selectedNationality,
  selectedCentury,
  onlyTopMasters,
  onlyFavorites,
  onSelectArtist,
  onSelectEra,
  onToggleFilterBar
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hoveredArtist, setHoveredArtist] = useState<{ artist: Artist; x: number; y: number } | null>(null);

  const bounds = useMemo(() => calculateTimelineBounds(eras, artists), [eras, artists]);

  // Update container size on window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Set up D3 zoom behavior with intelligent vertical scroll vs zoom handling
  const zoomBehavior = useMemo(() => {
    return d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 20])
      .filter((event) => {
        if (event.type === 'mousedown' || event.type === 'touchstart' || event.type === 'touchmove') {
          return true;
        }
        if (event.type === 'wheel') {
          return event.ctrlKey || event.metaKey;
        }
        return true;
      })
      .on('zoom', (event) => {
        setTransform(event.transform);
      });
  }, []);

  // Helper to compute initial zoom transform focused on the far-right (Modern / Contemporary Era)
  const getFarRightTransform = (width: number, boundsObj: { minYear: number; maxYear: number }) => {
    const k = 2.0;
    const baseScale = d3.scaleLinear()
      .domain([boundsObj.minYear, boundsObj.maxYear])
      .range([100, Math.max(800, width - 80)]);
    const maxX = baseScale(boundsObj.maxYear);
    const tx = (width - 150) - k * maxX;
    return d3.zoomIdentity.translate(tx, 0).scale(k);
  };

  useEffect(() => {
    if (svgRef.current && dimensions.width > 0) {
      const initialTransform = getFarRightTransform(dimensions.width, bounds);
      d3.select(svgRef.current).call(zoomBehavior).call(zoomBehavior.transform, initialTransform);
    }
  }, [zoomBehavior, dimensions.width, bounds]);

  // Zoom control handlers
  const handleZoomIn = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.scaleBy, 0.67);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && dimensions.width > 0) {
      const initialTransform = getFarRightTransform(dimensions.width, bounds);
      d3.select(svgRef.current).transition().duration(400).call(zoomBehavior.transform, initialTransform);
    }
  };

  // Base X scale mapping years to pixel coordinates
  const xScaleBase = useMemo(() => {
    return d3.scaleLinear()
      .domain([bounds.minYear, bounds.maxYear])
      .range([100, dimensions.width - 80]);
  }, [bounds, dimensions.width]);

  // Rescaled X scale based on current zoom transform
  const xScale = transform.rescaleX(xScaleBase);

  // Semantic Zoom Level of Detail (LOD) tier calculation
  const lodTier = useMemo(() => {
    if (transform.k < 1.4) return 1;
    if (transform.k < 4.2) return 2; // Level 2 (Movements) active up to k = 4.2
    return 3; // Level 3 (Schools) appears at k >= 4.2
  }, [transform.k]);

  // Helper to test if artist belongs to selected era or movement
  const isArtistInEra = (artist: Artist, targetEra: Era) => {
    if (artist.era === targetEra.id) return true;
    if (artist.relationships.movements.includes(targetEra.id)) return true;
    if (targetEra.tier === 1 && artist.birthYear <= targetEra.endYear && artist.deathYear >= targetEra.startYear) {
      return true;
    }
    return false;
  };

  // User favorites list
  const userFavs = useMemo(() => getFavorites(), [selectedArtist]);

  // Search & Filter matching logic
  const isArtistMatch = useMemo(() => {
    return (artist: Artist) => {
      if (onlyTopMasters) {
        if (!artist.impactScore || artist.impactScore < 9.5) return false;
      }
      if (onlyFavorites) {
        if (!userFavs.includes(artist.id)) return false;
      }
      if (selectedNationality) {
        const nat = getLocalizedString(artist, 'nationality', lang) || artist.nationality;
        if (nat !== selectedNationality) return false;
      }
      if (selectedCentury) {
        const targetCent = parseInt(selectedCentury, 10);
        const birthCent = Math.floor(artist.birthYear / 100);
        const deathCent = Math.floor(artist.deathYear / 100);
        if (birthCent !== targetCent && deathCent !== targetCent) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = getLocalizedString(artist, 'name', lang).toLowerCase();
        const works = artist.notableWorks.join(' ').toLowerCase();
        const bio = getLocalizedString(artist, 'bio', lang).toLowerCase();
        if (!name.includes(q) && !works.includes(q) && !bio.includes(q)) return false;
      }
      return true;
    };
  }, [searchQuery, selectedNationality, selectedCentury, onlyTopMasters, onlyFavorites, userFavs, lang]);

  // Dynamic multi-discipline swimlanes layout
  const swimlanes = useMemo(() => {
    const disciplineOrder: Discipline[] = ['painting', 'music', 'literature', 'philosophy', 'architecture', 'sculpture'];
    const disciplineIcons: Record<string, string> = {
      painting: '🎨',
      music: '🎵',
      literature: '📖',
      philosophy: '💡',
      architecture: '🏛️',
      sculpture: '🗿'
    };

    let currentY = 50;
    const lanes: Array<{
      discipline: Discipline;
      title: string;
      icon: string;
      headerY: number;
      positionedEras: PositionedEra[];
      positionedArtists: Array<PositionedArtist & { y: number }>;
      axisY: number;
    }> = [];

    const allPositionedArtists: Array<PositionedArtist & { y: number }> = [];
    const allPositionedEras: PositionedEra[] = [];

    for (const disc of disciplineOrder) {
      const discEras = eras.filter(e => e.discipline === disc);
      const discArtists = artists.filter(a => a.discipline === disc);

      if (discEras.length === 0 && discArtists.length === 0) continue;

      const eraLayout = calculateEraLayout(discEras, lodTier, currentY + 22);
      const axisY = eraLayout.headerBottomY + 10;
      const artistStartY = axisY + 30;

      const posDiscArtists = assignArtistRows(discArtists);
      const posDiscArtistsWithY = posDiscArtists.map(a => ({
        ...a,
        y: artistStartY + a.row * 42
      }));

      const maxRow = posDiscArtists.reduce((max, a) => Math.max(max, a.row), -1);
      const artistSectionHeight = maxRow >= 0 ? (maxRow + 1) * 42 + 20 : 30;

      lanes.push({
        discipline: disc,
        title: getUIText(disc as any, lang),
        icon: disciplineIcons[disc] || '🎨',
        headerY: currentY,
        positionedEras: eraLayout.positionedEras,
        positionedArtists: posDiscArtistsWithY,
        axisY
      });

      allPositionedArtists.push(...posDiscArtistsWithY);
      allPositionedEras.push(...eraLayout.positionedEras);

      currentY = (artistStartY + artistSectionHeight) + 30;
    }

    return {
      lanes,
      allPositionedArtists,
      allPositionedEras,
      totalHeight: Math.max(dimensions.height, currentY + 40)
    };
  }, [eras, artists, lodTier, dimensions.height, lang]);

  const positionedArtists = swimlanes.allPositionedArtists;

  // Active filter flag
  const isFilterActive = searchQuery || selectedNationality || selectedCentury || onlyTopMasters || onlyFavorites;

  // Count active artists for selected era
  const selectedEraArtistsCount = useMemo(() => {
    if (!selectedEra) return 0;
    return artists.filter(a => isArtistInEra(a, selectedEra)).length;
  }, [selectedEra, artists]);

  // Map of relationship types for the selected artist
  const relationshipTypeMap = useMemo(() => {
    const map = new Map<string, 'influencedBy' | 'influenced' | 'contemporaries'>();
    if (!selectedArtist) return map;

    selectedArtist.relationships.influencedBy.forEach(id => map.set(id, 'influencedBy'));
    selectedArtist.relationships.influenced.forEach(id => map.set(id, 'influenced'));
    selectedArtist.relationships.contemporaries.forEach(id => map.set(id, 'contemporaries'));

    return map;
  }, [selectedArtist]);

  // Generate Year Ticks
  const ticks = useMemo(() => {
    const yearSpan = (bounds.maxYear - bounds.minYear) / transform.k;
    const step = yearSpan > 300 ? 100 : yearSpan > 120 ? 50 : yearSpan > 40 ? 25 : 10;
    const firstTick = Math.ceil(bounds.minYear / step) * step;
    const list: number[] = [];
    for (let y = firstTick; y <= bounds.maxYear; y += step) {
      list.push(y);
    }
    return list;
  }, [bounds, transform.k]);

  const rectHeight = 32;

  // Calculate visual connection curves for selected artist
  const connectionCurves = useMemo(() => {
    if (!selectedArtist) return [];

    const activeSelArtist = positionedArtists.find(a => a.id === selectedArtist.id);
    if (!activeSelArtist) return [];

    const selX1 = xScale(activeSelArtist.birthYear);
    const selX2 = xScale(activeSelArtist.deathYear);
    const selX = (selX1 + selX2) / 2;
    const selY = activeSelArtist.y + rectHeight / 2;

    const curves: { id: string; d: string; type: 'influencedBy' | 'influenced' | 'contemporaries'; marker: string }[] = [];

    // Helper to build quadratic curve
    const buildCurve = (targetId: string, type: 'influencedBy' | 'influenced' | 'contemporaries') => {
      const targetArtist = positionedArtists.find(a => a.id === targetId);
      if (!targetArtist) return;

      const tX1 = xScale(targetArtist.birthYear);
      const tX2 = xScale(targetArtist.deathYear);
      const tX = (tX1 + tX2) / 2;
      const tY = targetArtist.y + rectHeight / 2;

      let startX = selX;
      let startY = selY;
      let endX = tX;
      let endY = tY;
      let marker = '';

      if (type === 'influencedBy') {
        startX = tX;
        startY = tY;
        endX = selX;
        endY = selY;
        marker = 'url(#arrow-purple)';
      } else if (type === 'influenced') {
        startX = selX;
        startY = selY;
        endX = tX;
        endY = tY;
        marker = 'url(#arrow-emerald)';
      }

      const dx = Math.abs(endX - startX);
      const midX = (startX + endX) / 2;
      const archHeight = Math.min(90, Math.max(35, dx * 0.22));
      const controlY = Math.min(startY, endY) - archHeight;

      curves.push({
        id: `${type}-${targetId}`,
        d: `M ${startX} ${startY} Q ${midX} ${controlY} ${endX} ${endY}`,
        type,
        marker
      });
    };

    selectedArtist.relationships.influencedBy.forEach(id => buildCurve(id, 'influencedBy'));
    selectedArtist.relationships.influenced.forEach(id => buildCurve(id, 'influenced'));
    selectedArtist.relationships.contemporaries.forEach(id => buildCurve(id, 'contemporaries'));

    return curves;
  }, [selectedArtist, positionedArtists, xScale, rectHeight]);

  return (
    <div className="timeline-container" ref={containerRef}>
      {/* Selected Era Info Banner */}
      {selectedEra && (
        <div className="era-info-banner">
          <div className="era-banner-content">
            <div className="era-banner-title">
              <span style={{ color: selectedEra.color }}>● {getLocalizedString(selectedEra, 'name', lang)}</span>
              <span className="era-banner-years">({selectedEra.startYear} – {selectedEra.endYear} CE)</span>
              <span className="era-banner-count">{selectedEraArtistsCount} {getUIText('artistsActive', lang)}</span>
            </div>
            <p className="era-banner-desc">{getLocalizedString(selectedEra, 'description', lang)}</p>
          </div>
          <button
            className="era-banner-close"
            onClick={() => onSelectEra(null)}
            title={getUIText('clearSelection', lang)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Relationship Color Legend */}
      {selectedArtist && (
        <div className="relationship-legend">
          <span className="legend-title">{getUIText('networkLegend', lang)}</span>
          <div className="legend-items">
            <div className="legend-item"><span className="legend-dot selected"></span> {getUIText('selectedLegend', lang)}</div>
            {selectedArtist.relationships.influencedBy.length > 0 && (
              <div className="legend-item"><span className="legend-dot influencedBy"></span> {getUIText('influencedByLegend', lang)}</div>
            )}
            {selectedArtist.relationships.influenced.length > 0 && (
              <div className="legend-item"><span className="legend-dot influenced"></span> {getUIText('influencedLegend', lang)}</div>
            )}
            {selectedArtist.relationships.contemporaries.length > 0 && (
              <div className="legend-item"><span className="legend-dot contemporaries"></span> {getUIText('contemporariesLegend', lang)}</div>
            )}
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        className="timeline-svg"
        style={{ height: `${swimlanes.totalHeight}px`, minHeight: '100%' }}
      >
        <defs>
          <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#a78bfa" />
          </marker>
          <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#34d399" />
          </marker>

          {/* Strict ClipPaths for Era Bands */}
          {swimlanes.allPositionedEras.map(era => {
            const x1 = xScale(era.startYear);
            const x2 = xScale(era.endYear);
            const width = Math.max(0, x2 - x1);
            return (
              <clipPath key={`clip-era-${era.id}`} id={`clip-era-${era.id}`}>
                <rect x={x1 + 4} y={era.y} width={Math.max(0, width - 8)} height={era.height} />
              </clipPath>
            );
          })}

          {/* Strict ClipPaths for Artist Rectangles */}
          {positionedArtists.map(artist => {
            const x1 = xScale(artist.birthYear);
            const x2 = xScale(artist.deathYear);
            const rectWidth = Math.max(20, x2 - x1);
            const y = artist.y;
            return (
              <clipPath key={`clip-artist-${artist.id}`} id={`clip-artist-${artist.id}`}>
                <rect x={x1 + 3} y={y} width={Math.max(0, rectWidth - 6)} height={rectHeight} />
              </clipPath>
            );
          })}
        </defs>

          {/* Swimlane Discipline Section Headers and Dividers */}
          <g className="swimlane-headers-group">
            {swimlanes.lanes.map(lane => (
              <g key={`lane-header-${lane.discipline}`} className="swimlane-header-group">
                <line
                  x1={0}
                  y1={lane.headerY}
                  x2={dimensions.width}
                  y2={lane.headerY}
                  stroke="rgba(217, 167, 74, 0.25)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <rect
                  x={12}
                  y={lane.headerY - 12}
                  width={160}
                  height={24}
                  rx={12}
                  fill="rgba(15, 17, 23, 0.9)"
                  stroke="var(--accent-gold)"
                  strokeWidth={1}
                />
                <text
                  x={24}
                  y={lane.headerY + 4}
                  fill="var(--accent-gold)"
                  fontWeight={700}
                  fontSize={12}
                  letterSpacing="0.05em"
                >
                  {lane.icon} {lane.title.toUpperCase()}
                </text>
              </g>
            ))}
          </g>

        {/* Year Grid Lines */}
        <g className="grid-group">
          {ticks.map(year => {
            const x = xScale(year);
            if (x < 0 || x > dimensions.width) return null;
            return (
              <line
                key={`grid-${year}`}
                x1={x}
                y1={30}
                x2={x}
                y2={swimlanes.totalHeight}
                className="grid-line"
              />
            );
          })}
        </g>

        {/* Era Movement Bands */}
        <g className="eras-group">
          {swimlanes.allPositionedEras.map(era => {
            const x1 = xScale(era.startYear);
            const x2 = xScale(era.endYear);
            const width = Math.max(0, x2 - x1);

            if (x2 < 0 || x1 > dimensions.width) return null;

            const eraTier = era.tier || 1;
            const isEraSelected = selectedEra?.id === era.id;
            const eraName = getLocalizedString(era, 'name', lang);

            return (
              <g
                key={era.id}
                className="era-band"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEra(isEraSelected ? null : era);
                }}
              >
                <rect
                  x={x1}
                  y={era.y}
                  width={width}
                  height={era.height}
                  fill={era.color}
                  fillOpacity={isEraSelected ? 0.8 : eraTier === 1 ? 0.4 : eraTier === 2 ? 0.32 : 0.45}
                  stroke={isEraSelected ? '#ffffff' : era.color}
                  strokeOpacity={isEraSelected ? 1 : eraTier === 1 ? 0.8 : 0.6}
                  className={`era-band-rect tier-${eraTier} ${isEraSelected ? 'selected' : ''}`}
                />
                {width > 35 && (
                  <g clipPath={`url(#clip-era-${era.id})`}>
                    <text
                      x={x1 + width / 2}
                      y={era.y + (era.height / 2) + 4}
                      fill={isEraSelected ? '#ffffff' : era.color}
                      className={`era-label tier-${eraTier}`}
                      textAnchor="middle"
                    >
                      {eraName}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Dynamic Year Axis Headers per Swimlane */}
        <g className="axis-group">
          {swimlanes.lanes.map(lane => (
            <g key={`axis-lane-${lane.discipline}`}>
              <line
                x1={0}
                y1={lane.axisY}
                x2={dimensions.width}
                y2={lane.axisY}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth={1}
              />
              {ticks.map(year => {
                const x = xScale(year);
                if (x < 0 || x > dimensions.width) return null;
                return (
                  <g key={`tick-${lane.discipline}-${year}`} transform={`translate(${x}, ${lane.axisY})`}>
                    <line y1={-4} y2={4} className="major-tick-line" />
                    <text y={16} className="year-tick-text">
                      {formatYear(year)}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </g>

        {/* Artist Rectangles */}
        <g className="artists-group">
          {positionedArtists.map(artist => {
            const x1 = xScale(artist.birthYear);
            const x2 = xScale(artist.deathYear);
            const rectWidth = Math.max(20, x2 - x1);
            const y = artist.y;
            const xCenter = x1 + rectWidth / 2;

            if (x2 < 0 || x1 > dimensions.width) return null;

            const isSelected = selectedArtist?.id === artist.id;
            const relType = relationshipTypeMap.get(artist.id);
            const matchesSelectedEra = selectedEra ? isArtistInEra(artist, selectedEra) : false;
            const matchesFilter = isArtistMatch(artist);

            const era = eras.find(e => e.id === artist.era);
            const baseColor = era ? era.color : '#3b82f6';
            const artistName = getLocalizedString(artist, 'name', lang);

            // Distinct relationship color & search filter mapping
            let fillColor = baseColor;
            let fillOpacity = 0.5;
            let strokeColor = baseColor;
            let strokeWidth = 1.5;
            let extraClass = '';

            if (isFilterActive) {
              if (matchesFilter) {
                fillOpacity = 0.95;
                strokeColor = '#ffffff';
                strokeWidth = 2.5;
                fillColor = '#d9a74a';
              } else {
                fillOpacity = 0.12;
              }
            } else if (selectedEra) {
              if (matchesSelectedEra) {
                fillOpacity = 0.95;
                strokeColor = '#ffffff';
                strokeWidth = 2.5;
              } else {
                fillOpacity = 0.15;
              }
            } else if (selectedArtist) {
              if (isSelected) {
                fillColor = '#d9a74a'; // Gold
                fillOpacity = 0.95;
                strokeColor = '#ffffff';
                strokeWidth = 2.5;
                extraClass = 'selected';
              } else if (relType === 'influencedBy') {
                fillColor = '#8b5cf6'; // Purple for Teachers/Mentors
                fillOpacity = 0.9;
                strokeColor = '#c4b5fd';
                strokeWidth = 2;
                extraClass = 'rel-influencedBy';
              } else if (relType === 'influenced') {
                fillColor = '#10b981'; // Emerald Green for Followers
                fillOpacity = 0.9;
                strokeColor = '#6ee7b7';
                strokeWidth = 2;
                extraClass = 'rel-influenced';
              } else if (relType === 'contemporaries') {
                fillColor = '#0284c7'; // Sky Blue for Peers
                fillOpacity = 0.9;
                strokeColor = '#7dd3fc';
                strokeWidth = 2;
                extraClass = 'rel-contemporaries';
              } else {
                fillOpacity = 0.15;
              }
            }

            const showDates = rectWidth >= 85;
            const textYName = showDates ? y + 14 : y + 20;

            return (
              <g
                key={artist.id}
                className="artist-group"
                onClick={() => onSelectArtist(isSelected ? null : artist)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredArtist({ artist, x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setHoveredArtist(null)}
              >
                <rect
                  x={x1}
                  y={y}
                  width={rectWidth}
                  height={rectHeight}
                  fill={fillColor}
                  fillOpacity={fillOpacity}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  className={`artist-rect ${extraClass}`}
                />

                {/* Strict Centered & Clipped Name and Lifespan Dates */}
                <g clipPath={`url(#clip-artist-${artist.id})`}>
                  {rectWidth >= 30 && (
                    <text
                      x={xCenter}
                      y={textYName}
                      className="artist-text"
                      fillOpacity={(isFilterActive && !matchesFilter) || (selectedEra && !matchesSelectedEra) || (selectedArtist && !isSelected && !relType) ? 0.35 : 1}
                    >
                      {artist.impactScore && artist.impactScore >= 9.8 ? `★ ${artistName}` : artistName}
                    </text>
                  )}
                  {showDates && (
                    <text
                      x={xCenter}
                      y={y + 26}
                      className="artist-dates"
                      fillOpacity={(isFilterActive && !matchesFilter) || (selectedEra && !matchesSelectedEra) || (selectedArtist && !isSelected && !relType) ? 0.25 : 0.75}
                    >
                      {artist.birthYear} – {artist.deathYear}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </g>

        {/* Visual Directional Connection Curves Overlay */}
        <g className="connections-group">
          {connectionCurves.map(curve => (
            <path
              key={curve.id}
              d={curve.d}
              className={`connection-path ${curve.type}`}
              markerEnd={curve.marker}
            />
          ))}
        </g>
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredArtist && (
        <div
          className="artist-tooltip"
          style={{ left: `${hoveredArtist.x}px`, top: `${hoveredArtist.y}px` }}
        >
          <strong>{getLocalizedString(hoveredArtist.artist, 'name', lang)}</strong>
          {hoveredArtist.artist.impactScore && (
            <div style={{ color: 'var(--accent-gold)', fontSize: '11px', fontWeight: 700 }}>
              ★ CultureDB Score: {hoveredArtist.artist.impactScore.toFixed(1)} / 10
            </div>
          )}
          <div>
            {hoveredArtist.artist.birthYear} – {hoveredArtist.artist.deathYear} ({getLocalizedString(hoveredArtist.artist, 'nationality', lang) || hoveredArtist.artist.nationality})
          </div>
        </div>
      )}

      {/* Floating Zoom & Filter Controls */}
      <div className="timeline-controls">
        {onToggleFilterBar && (
          <button className="control-btn" onClick={onToggleFilterBar} title={lang === 'pl' ? 'Filtry Osi Czasu' : 'Timeline Filters'}>
            <Filter size={18} color="var(--accent-gold)" />
          </button>
        )}
        <button className="control-btn" onClick={handleZoomIn} title={getUIText('zoomIn', lang)}>
          <ZoomIn size={18} />
        </button>
        <button className="control-btn" onClick={handleZoomOut} title={getUIText('zoomOut', lang)}>
          <ZoomOut size={18} />
        </button>
        <button className="control-btn" onClick={handleResetZoom} title={getUIText('resetView', lang)}>
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};
