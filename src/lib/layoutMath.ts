import { Artist, Era, PositionedArtist, PositionedEra, TimelineBounds } from '../types/timeline';

export function calculateTimelineBounds(eras: Era[], artists: Artist[], paddingYears = 30): TimelineBounds {
  let minYear = Infinity;
  let maxYear = -Infinity;

  eras.forEach(e => {
    if (e.startYear < minYear) minYear = e.startYear;
    if (e.endYear > maxYear) maxYear = e.endYear;
  });

  artists.forEach(a => {
    if (a.birthYear < minYear) minYear = a.birthYear;
    if (a.deathYear > maxYear) maxYear = a.deathYear;
  });

  if (minYear === Infinity) minYear = 1300;
  if (maxYear === -Infinity) maxYear = 1900;

  return {
    minYear: Math.floor((minYear - paddingYears) / 10) * 10,
    maxYear: Math.ceil((maxYear + paddingYears) / 10) * 10
  };
}

export interface EraLayoutResult {
  positionedEras: PositionedEra[];
  headerBottomY: number;
  laneYMap: Map<number, number>;
}

/**
 * Assigns eras sub-rows to prevent overlapping movement rectangles within the same tier.
 */
export function calculateEraLayout(eras: Era[], lodTier: number, startY = 48): EraLayoutResult {
  const visibleEras = eras.filter(era => {
    const eraTier = era.tier || 2;
    if (lodTier === 1) return eraTier === 1;
    if (lodTier === 2) return eraTier === 1 || eraTier === 2;
    return true;
  });

  const positionedEras: PositionedEra[] = [];
  const laneYMap = new Map<number, number>();

  let currentY = startY;
  const maxTier = lodTier === 1 ? 1 : lodTier === 2 ? 2 : 3;

  for (let tier = 1; tier <= maxTier; tier++) {
    const tierEras = visibleEras
      .filter(e => (e.tier || 2) === tier)
      .sort((a, b) => a.startYear - b.startYear);

    if (tierEras.length === 0) continue;

    const eraHeight = tier === 1 ? 26 : tier === 2 ? 24 : 22;
    laneYMap.set(tier, currentY + eraHeight / 2 + 3);

    const subRowsEndYears: number[] = [];

    for (const era of tierEras) {
      let subRow = -1;
      for (let r = 0; r < subRowsEndYears.length; r++) {
        if (era.startYear >= subRowsEndYears[r]) {
          subRow = r;
          subRowsEndYears[r] = era.endYear;
          break;
        }
      }

      if (subRow === -1) {
        subRow = subRowsEndYears.length;
        subRowsEndYears.push(era.endYear);
      }

      const y = currentY + subRow * (eraHeight + 4);
      positionedEras.push({
        ...era,
        subRow,
        y,
        height: eraHeight
      });
    }

    const totalSubRows = subRowsEndYears.length || 1;
    currentY += totalSubRows * (eraHeight + 4) + 6;
  }

  return {
    positionedEras,
    headerBottomY: currentY,
    laneYMap
  };
}

/**
 * Assigns each artist a row index to avoid overlapping lifespans.
 */
export function assignArtistRows(artists: Artist[], minYearGap = 5): PositionedArtist[] {
  // Sort artists by birth year
  const sorted = [...artists].sort((a, b) => a.birthYear - b.birthYear);
  const rowsEndYears: number[] = []; // tracks the end year of the last artist in each row

  const positioned: PositionedArtist[] = [];

  for (const artist of sorted) {
    let assignedRow = -1;

    // Find first row where artist fits
    for (let r = 0; r < rowsEndYears.length; r++) {
      if (artist.birthYear >= rowsEndYears[r] + minYearGap) {
        assignedRow = r;
        rowsEndYears[r] = artist.deathYear;
        break;
      }
    }

    // If no existing row fits, create a new row
    if (assignedRow === -1) {
      assignedRow = rowsEndYears.length;
      rowsEndYears.push(artist.deathYear);
    }

    positioned.push({
      ...artist,
      row: assignedRow
    });
  }

  return positioned;
}

export function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year} CE`;
}
