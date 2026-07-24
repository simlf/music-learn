# Roadmap: Music Learn — Jazz Piano Theory Companion

## Overview

Music Learn takes a returning classical pianist from "I freeze when I see `F♯ø7` in the sheet music" to "I know instantly what my left hand plays." Three shipped milestones: v1.0 built the chord-fluency core (theory engine, lookup companion, drill loop, progress backend, HTTPS deploy), v2.0 turned the app into a memory trainer (FSRS spaced repetition, Build-it construction, multi-modal recall), and v2.1 made it playable and self-explaining (keyboard everywhere, audio reveals, hint ladders, song provenance, guided theory, French, PWA, phone-first UX, contextual learning drills).

Milestone **v2.2 Hub Consolidation + Interval Theory** (in progress, Phases 26-31) is a UI + routing restructure of already-built features plus one new presentation component: collapse 10 flat routes into 4 clear hubs (Lookup / Practice / Learn / Progress) and add a shared interval view that shows any chord's stacked-thirds and its formula — with no regression in drills, SRS, stats, or song filtering. No data-schema migration, no new theory data source.

Full phase details for everything shipped through v2.1: [milestones/v2.1-ROADMAP.md](milestones/v2.1-ROADMAP.md).

## Milestones

- ✅ **v1.0 Chord Fluency Core** — Phases 1-3, 8-9 (shipped 2026-07-13)
- ✅ **v2.0 Learning Upgrade** — Phases 10-13 (shipped 2026-07-15)
- ✅ **v2.1 Playability & Comprehension** — Phases 14-25 (shipped 2026-07-21)
- 🚧 **v2.2 Hub Consolidation + Interval Theory** — Phases 26-31 (in progress)

## Phases

### 🚧 v2.2 Hub Consolidation + Interval Theory (Phases 26-31)

- [x] **Phase 26: Shared IntervalView Component** - Any looked-up chord reveals its stacked-thirds and its formula, from existing chord data. (completed 2026-07-24)
- [ ] **Phase 27: Practice Hub — One Smart Interleaved Session** - A single "Start practice" action runs one FSRS-scheduled session mixing all five drill types.
- [ ] **Phase 28: Learn Hub — Theory + Scales Explore + Interval Reference** - One Learn surface to read theory, explore the major scale, and reference chord intervals.
- [ ] **Phase 29: Progress Hub — Stats, Streak, Review Map, Songs** - One Progress surface for stats, streak, weak spots, the SRS review map, and song management.
- [ ] **Phase 30: Four-Hub Nav Cutover + Redirect Shims** - The app shows exactly 4 hubs everywhere; old bookmarks still land correctly; the orphan route is gone.
- [ ] **Phase 31: No-Regression Gate & Test Remap** - The whole restructure ships green: prior behavior intact, every route's tests remapped, new tests covering the merges.

<details>
<summary>✅ v1.0 Chord Fluency Core (Phases 1-9) — SHIPPED 2026-07-13</summary>

- [x] Phase 1: Print Shop Foundation & Theory Core (4/4 plans) — completed 2026-07-12
- [x] Phase 2: Chord Lookup Companion (3/3 plans) — completed 2026-07-12
- [x] Phase 3: On-Screen Drill Loop (4/4 plans) — completed 2026-07-13
- [ ] Phase 4: MIDI Play-to-Answer — DEFERRED (needs hardware present; carry to a future milestone)
- [x] Phase 5: Smart Drill Design — SUPERSEDED by Phase 13 (2026-07-15)
- [x] Phase 6: Major Scales — SUPERSEDED by Phase 10 (2026-07-15)
- [x] Phase 7: Theory Lessons — SUPERSEDED by Phase 12 (2026-07-15)
- [x] Phase 8: Progress & Streaks (4/4 plans) — completed 2026-07-13
- [x] Phase 9: Deploy to the Piano (6/6 plans) — completed 2026-07-13

</details>

<details>
<summary>✅ v2.0 Learning Upgrade (Phases 10-13) — SHIPPED 2026-07-15</summary>

- [x] Phase 10: Scale Keyboard Drill (2/2 plans) — completed 2026-07-15
- [x] Phase 11: Memorization Engine (6/6 plans) — completed 2026-07-15
- [x] Phase 12: Build-it Construction (6/6 plans) — completed 2026-07-15
- [x] Phase 13: Multi-modal Recall (6/6 plans) — completed 2026-07-15

</details>

<details>
<summary>✅ v2.1 Playability & Comprehension (Phases 14-25) — SHIPPED 2026-07-21</summary>

- [x] Phase 14: Mastery Criterion (standalone improvement) — completed 2026-07-20
- [x] Phase 15: Playable Keyboard Everywhere (7/7 plans) — completed 2026-07-15 (fixed dock later removed; keyboards inline)
- [x] Phase 16: Hear the Chord (6/6 plans) — completed 2026-07-16
- [x] Phase 17: Chord Explainer (4/4 plans) — completed 2026-07-17
- [x] Phase 18: Your Songs' Chords (4/4 plans) — completed 2026-07-18
- [x] Phase 19: Interactive Theory (4/4 plans) — completed 2026-07-18
- [x] Phase 20: French Translation (10/10 plans) — completed 2026-07-18
- [x] Phase 21: Drills Polish (completed 2026-07-19; DPOL-02 hover visual pending human eyeball)
- [x] Phase 22: Installable PWA (completed 2026-07-19; on-device PWA checks deferred)
- [x] Phase 23: Phase-First UX for Phone (4/4 plans) — completed 2026-07-20 (on-device visual UAT deferred)
- [x] Phase 24: Mobile UX fixes from issue #14 (4/4 plans) — completed 2026-07-20
- [x] Phase 25: Contextual Learning from Session 6 Sketches (8/8 plans) — completed 2026-07-21 (verified 24/24, SECURED)

</details>

## Phase Details

### Phase 26: Shared IntervalView Component

**Goal**: Any looked-up chord reveals its interval structure two ways, computed from the chord's existing `tonal` data.
**Depends on**: Nothing (first phase of the milestone)
**Requirements**: IVW-01, IVW-02, IVW-03
**Success Criteria** (what must be TRUE):

  1. For any looked-up chord in Lookup, the user sees its stacked-thirds bottom-up adjacent gaps by default (e.g. `Cm7 = root +m3 ♭3 +M3 5 +m3 ♭7`).
  2. The user can toggle the same chord to a formula view of intervals-from-root (e.g. `Cm7 = R, ♭3, 5, ♭7`).
  3. Solfège labels carry their accidentals through in both views (e.g. `E♭` renders as `Mi♭`).
  4. The view is one reusable component driven only by the chord's existing `tonal` intervals — no new theory data source is added.

**Plans**: 4/4 plans complete
Plans:

- [x] 26-01-PLAN.md — Pure `stackedThirdsFor` derivation + unit tests (per-quality gap patterns + E♭→Mi♭ carry-through) [wave 1]
- [x] 26-02-PLAN.md — `interval-view` i18n keys (EN/FR toggle + aria labels), merged into the catalog [wave 1]
- [x] 26-03-PLAN.md — `IntervalView.svelte` shared component + component test (stacked default, formula toggle, gap-vs-chip, inspect passthrough) [wave 2]
- [x] 26-04-PLAN.md — Lookup integration (REG-01 drop-in) + regression test retarget [wave 3]

**UI hint**: yes
**Notes**: Foundational per design — sequence first so the Learn hub (Phase 28) can embed the same shared component as an interval reference block (IVW-03 + LEARN-01). Pure presentation; REG-01 binding (Lookup's existing decode behavior stays unchanged). Reuses the corrected solfège accidental carry-through (`letterToSolfege`). Planner note: formula-view chip labels use the app's actual interval-quality shorthand (`R, m3, P5, m7`), NOT the design doc's illustrative scale-degree notation (`R, ♭3, 5, ♭7`) — REG-01 mandates byte-identical reproduction of today's row; only gap markers (`+m3`/`+M3`) use the design's notation.

### Phase 27: Practice Hub — One Smart Interleaved Session

**Goal**: A single "Start practice" action runs one FSRS-scheduled session that interleaves every drill type in a single queue.
**Depends on**: Nothing new (the existing `/drills` engine is the host)
**Requirements**: PRAC-01, PRAC-02, PRAC-03, PRAC-04, PRAC-05
**Success Criteria** (what must be TRUE):

  1. From the Practice hub the user starts practice with a single "Start practice" action — there is no mode-picker grid.
  2. One session interleaves questions from all five generators (name-it, build-it, voicings, intervals, progressions) in a single queue.
  3. The queue is ordered by the FSRS scheduler weighting due-date and weakness, with the existing tiers, grading, and telemetry preserved.
  4. With the song filter on, the Practice queue surfaces only questions drawn from the user's songs.
  5. When only one drill type is due, the session surfaces only that type — no artificial variety is injected (single-type-due gate).

**Plans**: 3/5 plans executed

- [x] 27-01-PLAN.md — Pure practiceQueue.ts composer (hybrid FSRS + synthetic items, single-type-due gate, song-filter helpers) + queue tests
- [x] 27-02-PLAN.md — Embed seams on ShellVoicingDrill + ProgressionDrill (voicing/progression drivable from the queue) + tests
- [x] 27-03-PLAN.md — New family components PracticeChordDrill (name-it) + PracticeIntervalDrill (intervals) + tests
- [ ] 27-04-PLAN.md — Thin /practice host: load/compose, pre-start "Start practice", empty tiers, carded-family session, family cue, FSRS grade commit, end-card, i18n
- [ ] 27-05-PLAN.md — Weave synthetic voicing/progression families into the host + full REG-02 five-family e2e (interleaving, single-type-due gate, song-filter steering, grade-commit split)

**UI hint**: yes
**Notes**: HIGHEST-RISK phase. Structural constraint (design §Practice hub): the five drill generators MUST stay as separate modules feeding one queue; the `/drills` host page (`+page.svelte`, already ~1380 lines) must NOT balloon into a monster file. REG-01 binding: existing drill grading, tiers, telemetry, SRS scheduling, and song-filter behavior must be preserved exactly — only the hosting and entry point change. The song filter preference already exists (moved to Songs by quick task 260720-v9u); this phase consumes it, Progress (Phase 29) relocates its management UI.

### Phase 28: Learn Hub — Theory + Scales Explore + Interval Reference

**Goal**: One Learn surface where the user reads shape-first theory, explores the major scale, and references chord intervals.
**Depends on**: Phase 26 (shared IntervalView reference block), Phase 27 (Scales "Practice" relocated to the Practice hub)
**Requirements**: LEARN-01, LEARN-02
**Success Criteria** (what must be TRUE):

  1. The Learn hub shows the existing shape-first theory lessons and the Scales "Explore" content (major-scale degrees/intervals) together on one surface.
  2. The shared IntervalView appears in Learn as an interval reference block.
  3. The Scales "Practice" drill is reached through the Practice hub, and Learn shows only "Explore."

**Plans**: TBD
**UI hint**: yes
**Notes**: Reuses the Phase 26 IntervalView instance (IVW-03 — one shared component, not a second copy). REG-01 binding: theory lesson content and its handoff into drills, plus scale Explore behavior, stay unchanged; only their location moves.

### Phase 29: Progress Hub — Stats, Streak, Review Map, Songs

**Goal**: One Progress surface presenting stats, streak, weak spots, the SRS review map, and song management.
**Depends on**: Nothing new (relocates the existing progress / recall / songs surfaces)
**Requirements**: PROG-01
**Success Criteria** (what must be TRUE):

  1. The Progress hub shows stats, streak, and weak spots (the former `progress` route).
  2. The Progress hub shows the SRS review map (the former `recall` route).
  3. The Progress hub shows song management, including the From-my-songs filter (the former `songs` route).
  4. All three formerly separate surfaces are reachable from the one Progress surface.

**Plans**: TBD
**UI hint**: yes
**Notes**: REG-01 binding: stats/streak computation, review-map data, and the song-filter preference all behave exactly as before; only their display location moves. The song filter surfaced here is the same preference the Practice queue reads (PRAC-04).

### Phase 30: Four-Hub Nav Cutover + Redirect Shims

**Goal**: The app presents exactly 4 hubs everywhere; old bookmarks and deep-links still land correctly; the orphan route is removed.
**Depends on**: Phases 26, 27, 28, 29 (all hub content must exist before nav flips and old routes become shims)
**Requirements**: HUB-01, HUB-02, HUB-03
**Success Criteria** (what must be TRUE):

  1. The desktop nav shows exactly 4 hubs (Lookup, Practice, Learn, Progress), replacing the 10 flat links.
  2. The phone tab bar shows the same 4 hubs, and the "More" bottom sheet is gone.
  3. Visiting any of the 8 old routes (`/drills`, `/scales`, `/voicings`, `/build`, `/progressions`, `/recall`, `/songs`, `/theory`) redirects to the hub that now owns it.
  4. The orphan `/showcase` route no longer exists.

**Plans**: TBD
**UI hint**: yes
**Notes**: Design guidance — the thin, one-release redirect shims are grouped with the nav restructure as a no-regression safety net for existing bookmarks/deep-links. Removing the shims is a deferred follow-up (out of scope this milestone). `/scales` redirects to Learn (which owns "Explore"); its "Practice" tab already moved to the Practice hub in Phase 28.

### Phase 31: No-Regression Gate & Test Remap

**Goal**: The whole restructure ships green — every prior behavior intact, every route's tests remapped to its absorbing hub, new tests covering the merges.
**Depends on**: Phase 30 (the full restructure must be in place)
**Requirements**: REG-01, REG-02
**Success Criteria** (what must be TRUE):

  1. Existing drills, SRS scheduling, progress/streak stats, and song-filter behavior work exactly as they did before the restructure.
  2. Each old route's test file is remapped to the absorbing hub, with no orphaned or duplicated coverage.
  3. New tests cover the merged Practice queue interleaving (including the single-type-due gate), the IntervalView (stacked vs formula per chord quality plus accidental carry-through), and each redirect shim.
  4. The full test suite and `svelte-check` both pass with zero errors.

**Plans**: TBD
**Notes**: REG-01 and REG-02 are binding constraints throughout Phases 26-30 (each merge phase preserves behavior and remaps its own route's tests as it goes). This phase is the milestone-wide green gate that consolidates the remapped suite and confirms no behavior regression across all four hubs. No UI (verification/test phase).

## Carry-overs beyond this milestone

- Phase 4: MIDI Play-to-Answer (deferred, needs hardware-in-the-loop)
- Delete the old-route redirect shims once the v2.2 release has settled (follow-up cleanup)
- Deferred on-device checks and todos: see STATE.md `## Deferred Items` and milestones/v2.1-MILESTONE-AUDIT.md tech_debt
- Backlog candidates: `.planning/v2.1-IMPROVEMENT-BACKLOG.md` (e.g. sketch 018 tempo-fluency I-03)

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Chord Fluency Core | 1-3, 8-9 | 21 | Complete | 2026-07-13 |
| v2.0 Learning Upgrade | 10-13 | 20 | Complete | 2026-07-15 |
| v2.1 Playability & Comprehension | 14-25 | 45 | Complete | 2026-07-21 |
| v2.2 Hub Consolidation + Interval Theory | 26-31 | TBD | In progress | — |
