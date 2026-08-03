# Timeline

An interactive, visual timeline of Western cultural history — painting, music, and
literature laid out side by side so you can see who was alive when, which era they
worked in, and how movements overlapped and influenced each other.

This repo is at the **planning stage**: no application code yet. This README is the
brief for whichever coding agent (Claude Code, Antigravity, Cursor, a human, ...)
picks up the implementation next.

## The idea

A single scrollable/zoomable timeline (think: centuries on the x-axis) with two
layers:

1. **Era bands** — horizontal bands of colour marking cultural/historical periods
   (Renaissance, Baroque, Romanticism, Modernism, ...), each spanning its start and
   end years.
2. **Artist rectangles** — one rectangle per artist, positioned on the timeline from
   their birth year to their death year. Clicking a rectangle opens a note/panel
   with a short biography, notable works, and their era/discipline.

Content is added incrementally, discipline by discipline:

1. **Painting** (first — this is the MVP)
2. **Music**
3. **Literature**

Each discipline can eventually get its own row/lane on the timeline so a viewer can
compare, e.g., which composers were active during the Baroque painters' lifetimes.

## Non-goals (for now)

- No user accounts, comments, or social features.
- No CMS/admin UI — content is authored as structured data files in the repo.
- No mobile app — responsive web only.
- No requirement to be exhaustive; depth and accuracy of a smaller set of entries
  beats a shallow, error-prone large set.

## Proposed data model

Keep content decoupled from rendering code so agents (and the human) can add
artists/eras without touching application logic.

```jsonc
// data/eras.json
{
  "id": "renaissance",
  "name": "Renaissance",
  "discipline": "painting",       // painting | music | literature | general
  "startYear": 1400,
  "endYear": 1600,
  "color": "#c9a24b",
  "description": "Short summary of the era's characteristics."
}
```

```jsonc
// data/artists/leonardo-da-vinci.json
{
  "id": "leonardo-da-vinci",
  "name": "Leonardo da Vinci",
  "discipline": "painting",
  "era": "renaissance",
  "birthYear": 1452,
  "deathYear": 1519,
  "bio": "Two or three short paragraphs.",
  "notableWorks": ["Mona Lisa", "The Last Supper"],
  "imageUrl": null,
  "sources": ["https://..."]
}
```

Open questions to resolve during implementation (flag these back to the human
rather than guessing silently):

- One JSON file per artist vs. one big `artists.json`? (Per-file is easier to
  review/diff and assign to agents in parallel; a single file is simpler tooling.)
- Undated/uncertain birth or death years (e.g. "c. 1400") — need a convention.
- Artists spanning multiple disciplines or eras.

## Suggested tech stack

Not locked in — an agent proposing a different stack should explain the tradeoff,
not just pick one.

- **Frontend**: React + TypeScript, built with Vite.
- **Timeline rendering**: SVG or Canvas via D3.js (need fine-grained control over
  era bands, artist rectangles, zoom/pan) rather than an off-the-shelf timeline
  widget, since the era-band + rectangle overlay is fairly custom.
- **Data**: static JSON files in `/data`, loaded at build time. No backend needed
  for the MVP — this can ship as a static site (GitHub Pages / Netlify / Vercel).
- **Testing**: component tests for the timeline interactions (click → panel open),
  plus a data-validation script that checks every artist references a real era and
  has sane year ranges.

## Repository structure (target)

```
/data
  eras.json
  artists/
    <artist-id>.json
/src
  components/         # Timeline, EraBand, ArtistRect, ArtistPanel, ...
  lib/                 # layout/positioning math, data loading
/docs
  decisions/           # short ADRs for non-obvious calls (stack swaps, schema changes)
README.md
```

## Roles & agents

This project is meant to be built collaboratively by multiple coding-agent
sessions (possibly running in parallel on different branches/worktrees). To keep
that from turning into chaos, each session should identify which of these roles it
is playing and stay inside that lane. One agent can play multiple roles in a
single session if the human hasn't split the work up.

### 1. Architect
Owns structural decisions: tech stack, folder layout, the data schema, how the
timeline positions elements (the year→pixel math), and how new eras/disciplines
get added later. Writes short ADRs in `/docs/decisions/` when it changes or locks
in a non-obvious decision. Does **not** need to hand-implement every feature, but
should scaffold enough (project setup, base components, data loader) that other
roles have a clear surface to build against.

### 2. Timeline Engineer
Implements the actual timeline: rendering era bands and artist rectangles,
zoom/pan, layout collision handling (overlapping artist rectangles need to stack
or offset sensibly), and the click → detail-panel interaction. This is the core
and hardest engineering piece — prioritize it early and keep it well-tested, since
everything else (content, styling) builds on top of it.

### 3. Content Researcher
Adds and edits entries in `/data`: artists, eras, dates, bios, notable works, and
sources. Must cite sources for factual claims (birth/death years, movement
attribution) since this is a history/education project and accuracy matters more
than volume. Follows painting → music → literature ordering unless told
otherwise. Should run/extend the data-validation script before handing off content.

### 4. UI/Design
Owns visual design: era colour palette (should be visually distinct but
historically evocative, and accessible — check contrast), the artist rectangle
style, the detail panel/modal layout, typography, and responsiveness. Coordinates
with the Timeline Engineer on what the component API needs to expose (e.g. does
the panel need an image slot, a "notable works" list, external links).

### 5. Reviewer / QA
Reviews changes from the other roles: checks factual accuracy of new content
against cited sources, verifies interactions work (click targets, keyboard
accessibility), checks that new eras/artists don't break the layout (e.g.
overlapping rectangles, out-of-range years), and runs the data validator. Flags
anything uncertain back to the human rather than approving guesses.

### How agents should collaborate

- Before starting, state which role(s) you're playing for the session.
- Keep architecture decisions in `/docs/decisions/` so a later session (playing a
  different role) doesn't have to reverse-engineer *why* something was built a
  certain way.
- Content and rendering code are deliberately decoupled — a Content Researcher
  session should never need to touch `/src`, and a Timeline Engineer session
  should treat `/data` as a fixture, not something to hand-edit for convenience.
- When a decision is genuinely the human's to make (naming, scope, which
  discipline to prioritize, disputed historical attribution), ask rather than
  guessing.

## Status

Planning stage. Next step: Architect role to scaffold the Vite + React + TS
project and the base data loader, per "Suggested tech stack" above.
