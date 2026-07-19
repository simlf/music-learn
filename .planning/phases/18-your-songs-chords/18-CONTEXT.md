# Phase 18: Your Songs' Chords - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning
**Mode:** Autonomous (smart-discuss auto-resolved from sketch 011 winner A + success criteria; user away, yolo mode)

<domain>
## Phase Boundary

Chords that appear in the user's added songs surface throughout the app with a consistent provenance mark, and Drills + Recall can be filtered to just those chords, so app practice reinforces the exact chords the user must play at the piano.

In scope: a shared provenance mark rendered wherever a chord appears (Drills prompt, Recall card, Chord Lookup result); a "From my songs" filter toggle on Drills and Recall; deriving song→chord provenance from the songs stored on `/songs` as the single source of truth.

Out of scope: a new song-first navigation lane (sketch variant B), ambient SRS weighting toward song chords (variant C), song editing (already exists on `/songs`).
</domain>

<decisions>
## Implementation Decisions

### Provenance Mark (SONG-01)
- One shared provenance component ("SongMark") rendered consistently across every surface a chord appears on, so it reads as the same object everywhere. Reuse it in the Drills prompt, the Recall card, and the Lookup result.
- Style: letterpress uppercase **mono** tag (e.g. `♪ AUTUMN LEAVES`), typographically distinct from the **serif** chord name. This preserves the app's serif-name / mono-metadata split.
- Single song: show the song name. Multi-song chord: collapse to a count tag `N SONGS` with a double border (per sketch 011-A). Do not enumerate every song in the inline mark.
- The mark shows regardless of the filter state — even with "From my songs" off, a chord that is in a song still carries its mark.

### From-My-Songs Filter (SONG-02)
- A "FROM MY SONGS" toggle on both Drills and Recall. Off (default) = full library is practiced, song chords still show their mark. On = the practiced set is restricted to chords drawn from the user's active songs.
- Persist the toggle per-surface in localStorage (local-first, matches app convention). Default off so the app still teaches the whole library unless the user opts in.
- Empty/edge state: if the filter is on but there are no active songs / no derivable chords, show a gentle non-blocking message pointing to `/songs` and fall back to the full library rather than a dead-end empty session.

### Provenance Source & Matching (SONG-03)
- Single source of truth: derive provenance from the songs stored via `src/lib/practice/songs.ts` (`listSongs()` / `activeSongChordSymbols()`). Only **active** songs contribute (matches the existing active-song concept already used by Drills).
- A chord "belongs to" a song when its chord identity matches a symbol in that song's `chordSymbols`. Match by normalized chord identity (pitch-class set / theory-engine normalization), not raw string equality, so enharmonic and alias spellings (Cm7 = C-7; F♯ø7 = G♭ø7) count. Reuse the existing theory engine for normalization.
- Build a derived `symbol -> Song[]` provenance index once from active songs; surfaces query it.

### Claude's Discretion
- Exact placement/size of the mark within each surface's layout, the provenance-index module location, and the filter toggle's visual form (segmented vs checkbox) are at implementation discretion, following Print Shop patterns and the sketch mock.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/practice/songs.ts` — `STORAGE_KEY` "music-learn:songs", `Song` shape (id, name, chordSymbols, source, active, presetId), `listSongs()`, `activeSongChordSymbols()`. Single source of truth for songs.
- `src/lib/practice/presets.ts` — `SONG_PRESETS` (Autumn Leaves, Blue Bossa, etc.).
- `src/lib/components/ChordGlyph.svelte` — serif chord symbol (mark sits alongside, never replaces).
- `src/lib/components/NoteLabel.svelte`, `IntervalChip.svelte` — shared chord/interval display primitives.
- Theory engine (chord normalization / spelling) — reuse for enharmonic-aware matching.

### Established Patterns
- Local-first persistence via localStorage keys (`music-learn:*`).
- Serif chord names + mono uppercase metadata is the house typographic split.

### Integration Points
- `src/routes/drills/+page.svelte:142-155` — `poolContext()` already supplies `songSymbols` to the pool picker; the "From my songs" filter extends this existing seam.
- `src/routes/drills/+page.svelte:54` — already imports `activeSongChordSymbols`.
- `src/lib/components/RecallSession.svelte` + `src/lib/srs/deck.ts:147` `getDueCards()` — recall card picker seam; add song-filter restriction here (no filter today).
- `src/routes/recall/+page.svelte` — Recall page (Review/Map modes) hosts the toggle.
- `src/routes/+page.svelte` / `src/lib/lookup/chordPresentation.ts` — Lookup result surface for the mark.
</code_context>

<specifics>
## Specific Ideas

- Reference mock: `.planning/sketches/011-your-songs-chords/` (winner Variant A). Drills prompt with the tag, the toggle in on/off states, a Lookup result carrying the same mark, and the double-border `2 songs` tag for multi-song chords.
- The mark must read as one recurring object across surfaces — a single shared component, not per-surface reimplementations.
- Avoid visual noise: once a few songs cover most of the library, the mark is common; keep it small and quiet (mono, letterpress), not a loud badge.
</specifics>

<deferred>
## Deferred Ideas

- Variant B: a pinned "PRACTICE YOUR SONGS" lane that expands a song into a ready-made deck (new navigation surface).
- Variant C: ambient SRS weighting toward song chords with a per-drill motivational line and a "why am I seeing this?" affordance.
- Naming every song inline instead of collapsing multi-song chords to a count.
- Weighting/prioritizing the scheduler toward song chords (belongs with variant C, not A's explicit-control model).
</deferred>
