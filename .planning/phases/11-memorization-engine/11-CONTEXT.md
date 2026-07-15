# Phase 11: Memorization Engine - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (overnight run). User delegated all decisions to Claude; grey areas resolved with documented defaults grounded in the spike-findings blueprint (spikes 006 + 009) and the v2.0 PROJECT decisions. Consistent with Phase 1/2/3 delegation.

<domain>
## Phase Boundary

A real spaced-repetition recall loop over the theory facts the app already knows how to generate (chord formulas, interval sizes, scale degrees). The user starts a session that surfaces only facts due today, reveals and grades each one, and FSRS scheduling state persists per (fact, mode) on the device. A recall map shows what is due, mastered, or weak.

In scope (MEM-01..04):
1. **MEM-01 / SC-1:** A recall session surfaces only facts due today, scheduled by FSRS on day-scale intervals.
2. **MEM-02 / SC-2:** Reveal-then-grade with Again/Hard/Good/Easy; each button shows the day interval it will schedule; growing intervals on success, contraction on lapse.
3. **MEM-03 / SC-3:** Scheduling state persists across sessions and reloads on the same device as one card per (fact, mode), with Date fields correctly rehydrated after storage round-trip.
4. **MEM-04 / SC-4:** A recall map showing which facts are due, mastered, or weak across modes.

Explicitly NOT in scope (later phases): the "Build it" construction mode is Phase 12 (it feeds this engine as mode C but is built next); full multi-modal recall UI (see-play / hear-name / notes-symbol rotation surfaces) is Phase 13 (RECALL-01..03). Phase 11 establishes the SRS foundation: the scheduler, the per-(fact,mode) deck/storage, the reveal-grade session loop, and the recall map. It ships with at least the recognition modes that already have surfaces (formula recall on reveal), leaving new drill surfaces to Phase 13. No server; per-device local-first.
</domain>

<decisions>
## Implementation Decisions (auto-resolved from blueprint)

### SRS core (scheduler)
- **D-01 (library):** ts-fsrs@5.4.1 (already the stack choice). Never hand-roll SM-2.
- **D-02 (load-bearing config):** `fsrs(generatorParameters({ enable_short_term: false, request_retention: 0.9, enable_fuzz: false }))`. `enable_short_term:false` is mandatory — the default true gives ~10 min learning steps and breaks a once-a-day recall app. `enable_fuzz:false` keeps tests deterministic (revisit later to spread same-day piles).
- **D-03 (module split, mirrors audio.ts):** `src/lib/srs/scheduler.ts` = pure ts-fsrs wrapper, Vitest-tested against fixed intervals (New+Again=1d, Hard=2d, Good=3d, Easy=8d; a Good chain grows 3→14→57→196→586d; a lapse contracts stability hard). `src/lib/srs/deck.ts` = persistence.
- **D-04 (grade preview):** Grade buttons are labelled with the day interval each rating will schedule, computed via `scheduler.repeat(card, now)` (RecordLog, no commit). Commit a rating via `scheduler.next(card, now, Rating)`.

### Card model
- **D-05 (card unit = (fact, mode)):** The FSRS card unit is (factId, mode), NOT fact. `Cm7|see-play`, `Cm7|formula-build`, etc. are separate cards sharing a factId, each an independent retrieval path with its own stability. This is the load-bearing model from spike 009 and the v2.0 PROJECT decision.
- **D-06 (stored shape):** Per card store the raw FSRS `Card` (due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review) + stable `factId` + `factKind` (chord-formula | interval-size | scale-degree) + `mode`. Facts are generated from tonal so the deck stays in sync with the theory engine.
- **D-07 (Phase 11 mode scope):** Phase 11 seeds the recognition/formula recall path (the reveal-and-grade spine). Modes C (formula-build, Phase 12) and the full see-play / hear-name / notes-symbol drill surfaces (Phase 13) attach to the same deck later. Stagger mode introduction so FSRS never gets four brand-new cards for one fact at once.

### Storage
- **D-08 (layer):** Dexie/IndexedDB (dexie@4.4.4), not localStorage — review log grows and we query by due-date. Schema versioned. Reuse the existing local-first persistence conventions from Phase 8 where applicable.
- **D-09 (Date rehydration — critical trap):** `Card.due` / `Card.last_review` are Date objects and silently become strings through IndexedDB/JSON. Coerce back with Zod `.coerce.date()` at the read boundary before any `repeat()`/`next()` call. This is a silent-no-throw bug if missed.
- **D-10 (session queue):** due = `card.due <= now`. Keep an in-memory session queue; re-enqueue `Again` cards within the current session regardless of FSRS due date (Anki-style second look). Do NOT read `lapses` as "total times wrong" — it only counts Review→Again transitions.

### Recall map (MEM-04)
- **D-11:** A fact × mode grid (cells ✓ mastered / due / weak / not-yet-seen) is the progress UI. It makes "multiple retrieval paths to one fact" legible and motivating. Derive cell state from card.state + due date + recent lapses. This is a new surface, likely under /progress or a dedicated /recall route (planner's discretion, reuse app chrome + design tokens).

### Constraints carried from PROJECT (locked)
- Grade by chroma/MIDI, never letter-string equality (applies when any played-note grading is added; formula recall here is reveal-then-self-grade so no letter compare).
- No em dashes in any UI copy.
- Local-first, per-device for v1, no server.
- ear/notes→symbol modes (Phase 13) are multiple-choice only and never gate; not built here.
</decisions>

<code_context>
## Existing Code Insights

- Theory engine (Phase 1-3): `Chord.get(sym).notes`, interval helpers in `$lib/theory/interval`, `randomChord` 12-root × 8-quality matrix, `matchChord` chroma comparison. Facts should be generated from these so the deck mirrors the theory engine.
- `audio.ts` isolates its engine from UI — mirror that split for srs/scheduler.ts vs srs/deck.ts.
- Phase 8 established local persistence patterns and a /progress page; the recall map may live there or in a new route.
- App design tokens live in app.css (interval color language, spacing/typography scale, shop voice). Reuse, do not redefine.
- Existing drill chrome (Button, ChordGlyph, IntervalChip, PianoKeyboard) is reusable for reveal surfaces.
</code_context>

<specifics>
## Specific Ideas

- Split scheduler (pure) from deck (persistence); unit-test scheduler against fixed FSRS intervals.
- Grade-from-elapsed-time is a nice-to-have (wrong→Again, slow→Hard, correct→Good, fast→Easy) but manual grade buttons are the baseline requirement; keep buttons as source of truth, optional time-hinting later.
- Recall map: fact × mode grid, ✓✗ cells, filterable by kind.
</specifics>

<deferred>
## Deferred Ideas

- FSRS weight optimization from review-log history (keep the ReviewLog, optimize later).
- enable_fuzz:true to spread same-day due piles (after correctness is proven).
- Grade-from-answer-time heuristic (Phase 11 ships manual grade buttons).
- Full multi-modal drill surfaces (Phase 13).
</deferred>
