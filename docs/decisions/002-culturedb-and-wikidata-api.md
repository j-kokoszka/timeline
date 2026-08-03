# ADR 002: CultureDB Scoring System & Wikidata / Met Museum API Integration

## Status
Approved

## Context
To elevate the Timeline application into a rich cultural discovery platform (a "CultureDB / IMDb for Art & Culture"), we require:
1. Authoritative real-world artwork imagery and extended biographies without bundling gigabytes of static media in the repository.
2. Quantitative historical significance metrics (Cultural Impact Score 1-10) to help users identify master figures.
3. User engagement features (Favorites bookmarking and rating).

## Decision
1. **Wikidata & Met Open Access API Integration**:
   - Query Wikidata REST API (`https://www.wikidata.org/wiki/Special:EntityData/{wikidataId}.json`) and Wikipedia API (`https://en.wikipedia.org/api/rest_v1/page/summary/{title}`) to fetch official portrait images, artwork media, and extended summaries dynamically.
   - Cache API responses in `localStorage` to eliminate redundant network requests and avoid rate limits.
2. **CultureDB Scoring & Centrality**:
   - Store `impactScore` (range 1.0 – 10.0) in artist JSON definitions.
   - Provide a "Top Masters Only (Impact ≥ 9.0)" filter in the UI.
3. **Local User Storage**:
   - Persist user favorite bookmarks and 1-5 star user ratings in browser `localStorage`.

## Consequences
- High-resolution artwork images display dynamically in the Artist Drawer.
- Offline resilience via local caching.
- Zero extra heavy media assets stored in git repository.
