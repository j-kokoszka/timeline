# 1. Data Model and Stack Architecture

* **Status**: Accepted
* **Date**: 2026-08-03
* **Role**: Architect

## Context and Problem Statement

The Timeline project requires a scrollable, zoomable visualization of cultural history (eras, artists, lifespans, relationships). The project must be decoupled so content researchers can add data without modifying rendering code, and static deployment (zero backend cost) is required for the MVP.

## Decision Drivers

* **Zero Backend Hosting Costs**: Must ship as static files to GitHub Pages / Netlify / Vercel.
* **Decoupled Data**: Content authored in human-readable static files (Git-versioned).
* **Rich Interactivity**: Smooth zoom, pan, and responsive rendering for centuries of timeline data.
* **Developer Experience**: Modern TypeScript tooling, fast live reload, and strict validation.

## Considered Options

1. **Vite + React + TypeScript + SVG/Canvas (Client-side static JSON)**
2. **Next.js + Backend Database / Neo4j**
3. **Vanilla HTML/JS without bundler**

## Decision Outcome

Chosen Option: **Option 1 (Vite + React + TypeScript + Static JSON)**.

### Consequences

* **Data Model**:
  * Eras: Stored in `/data/eras.json`.
  * Artists: Stored individually in `/data/artists/<artist-id>.json`.
  * Relationships: Defined as graph-like edge arrays (`influencedBy`, `contemporaries`, `movements`) in each artist file.
* **Validation**: Run `npx tsx scripts/validate-data.ts` in CI and locally before commit to ensure schema validity and link integrity.
* **Timeline Rendering**: React + SVG using D3 scale/zoom utilities for smooth year-to-pixel coordinate transforms and stacked lifespan rows.
