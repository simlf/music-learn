# Roadmap: Music Learn — Jazz Piano Theory Companion

## Overview

Music Learn takes a returning classical pianist from "I freeze when I see `F♯ø7` in the sheet music" to "I know instantly what my left hand plays." Five shipped milestones: v1.0 built the chord-fluency core (theory engine, lookup companion, drill loop, progress backend, HTTPS deploy), v2.0 turned the app into a memory trainer (FSRS spaced repetition, Build-it construction, multi-modal recall), v2.1 made it playable and self-explaining (keyboard everywhere, audio reveals, hint ladders, song provenance, guided theory, French, PWA, phone-first UX, contextual learning drills), and v2.2 consolidated 10 flat routes into 4 hubs (Lookup / Practice / Learn / Progress) with one interleaved Practice session and a shared interval view (stacked-thirds + formula), no regression.

Milestone **v2.3 Beginner On-Ramp & Inversions** (shipped 2026-07-28, Phases 32-37) makes the drills legible and unblockable for a theory-beginner and adds inversion practice — all within the existing stack, no schema change. A shared counting-chip grammar (role-tinted tone chips + fill/outline gap chips) lands first on the name-it feedback surface, then is reused by a new escalating progression hint ladder and a brand-new inversion drill family; a leaner add/drop voicing flow replaces the 3-way toggle; and the hybrid-queue composer stops leading cold, low-mastery sessions with scaffold-heavy items. No new library, no data-schema migration.

Full phase details for everything shipped through v2.1: [milestones/v2.1-ROADMAP.md](milestones/v2.1-ROADMAP.md).

## Milestones

- ✅ **v1.0 Chord Fluency Core** — Phases 1-3, 8-9 (shipped 2026-07-13)
- ✅ **v2.0 Learning Upgrade** — Phases 10-13 (shipped 2026-07-15)
- ✅ **v2.1 Playability & Comprehension** — Phases 14-25 (shipped 2026-07-21)
- ✅ **v2.2 Hub Consolidation + Interval Theory** — Phases 26-31 (shipped 2026-07-25)
- ✅ **v2.3 Beginner On-Ramp & Inversions** — Phases 32-37 (shipped 2026-07-28, PR #28)

## Phases

### ✅ v2.3 Beginner On-Ramp & Inversions (Phases 32-37) — SHIPPED 2026-07-28

- [x] **Phase 32: Shape Legibility — Counting-Chip Grammar** - Name-it feedback shows the chord's third pattern as role-tinted tone chips with fill/outline gap chips, replacing the illegible grey mono line. (completed 2026-07-26)
- [x] **Phase 33: Voicing Lean Flow** - The voicing drill drops the 3-way toggle: start on the shell, reach full/rootless via contextual add/drop nudges. (completed 2026-07-26)
- [x] **Phase 34: Progression Scaffold & Beginner Keyboard** - An escalating optional counting-hint ladder (symbol still earned) plus a one-octave beginner keyboard so the earn-the-symbol drill never hard-blocks. (completed 2026-07-27; code verified 4/4 + 1538 tests green; on-device visual UAT run 2026-07-28: 1 passed low-confidence, 2 blocked on no deterministic progression-bar entry point, no code defects — see 34-UAT.md and 34-VERIFICATION.md "Acknowledged Gaps")
- [x] **Phase 35: Inversions — New Drill Family** - Drill a chord in a named inversion with the correct bass and a fading hint ladder, joined into the Practice queue as its own FSRS family. (completed 2026-07-27; code verified 12/12 + 1597 tests green; synthetic family for REG-01 safety; 1 blocker + 1 warning found and fixed in review; on-device visual UAT deferred, see 35-UAT.md)
- [x] **Phase 36: Cold-Session Queue Ordering** - A cold, low-mastery session never leads with a scaffold-heavy progression or inversion item. (completed 2026-07-27; verification PASSED 8/8, no human items; 1611 tests green, svelte-check clean)
- [x] **Phase 37: No-Regression Gate** - The milestone ships green: existing grading, FSRS, tiers, telemetry, song-filter, and ear-naming rules intact; every new surface covered by tests. (completed 2026-07-27; green gate PASSED: build 0 errors, 1620 tests 0 failures, svelte-check 0 errors; REG-01 delivered, all 9 v2.3 REQ-IDs traceable)

<details>
<summary>✅ v2.2 Hub Consolidation + Interval Theory (Phases 26-31) — SHIPPED 2026-07-25</summary>

- [x] **Phase 26: Shared IntervalView Component** - Any looked-up chord reveals its stacked-thirds and its formula, from existing chord data. (completed 2026-07-24)
- [x] **Phase 27: Practice Hub — One Smart Interleaved Session** - A single "Start practice" action runs one FSRS-scheduled session mixing all five drill types. (completed 2026-07-25)
- [x] **Phase 28: Learn Hub — Theory + Scales Explore + Interval Reference** - One Learn surface to read theory, explore the major scale, and reference chord intervals. (completed 2026-07-25)
- [x] **Phase 29: Progress Hub — Stats, Streak, Review Map, Songs** - One Progress surface for stats, streak, weak spots, the SRS review map, and song management. (completed 2026-07-25)
- [x] **Phase 30: Four-Hub Nav Cutover + Redirect Shims** - The app shows exactly 4 hubs everywhere; old bookmarks still land correctly; the orphan route is gone. (completed 2026-07-25)
- [x] **Phase 31: No-Regression Gate & Test Remap** - The whole restructure ships green: prior behavior intact, every route's tests remapped, new tests covering the merges. (completed 2026-07-25)

</details>

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

### Phase 32: Shape Legibility — Counting-Chip Grammar

**Goal**: After answering a name-it question, a beginner can read the chord's third-pattern as role-tinted tone chips with fill/outline gap chips, instead of the illegible grey mono line — and this chip grammar becomes the shared visual primitive the later hint-ladder phases reuse.
**Depends on**: Nothing (first phase of the milestone)
**Requirements**: SHAPE-01
**Success Criteria** (what must be TRUE):

  1. After answering a name-it (nomme cet accord) question, the correct chord's quality pattern renders as a row of role-tinted tone chips (root vermilion, third verdigris, fifth tan, seventh mustard) with a gap chip between each adjacent pair.
  2. Each gap chip renders a minor third as a solid ink fill and a major third as outline-only, so the shape reads at a glance (small-big-small = m7) without reading letters.
  3. A short legend maps the gap chips to their semitone counts (+m3 = 3 semitones, +M3 = 4 semitones).
  4. The old grey uppercase mono shape line (`M7: M3 · M3 · M3`) no longer appears on the name-it feedback surface.

**Plans**: 2/2 plans complete

- [x] 32-01-PLAN.md — Create the reusable CountingChipRow primitive (role-tinted tone chips + fill/outline gap chips + semitone legend) and wire it into the name-it feedback, removing the old grey mono shape line.

**UI hint**: yes
**Notes**: Foundational — sequenced FIRST so Phases 34 (progression hint ladder) and 35 (inversion hint ladder) embed the same tone-chip + gap-chip primitive rather than re-authoring it, mirroring how v2.2 shipped the shared IntervalView (Phase 26) before its consumers. Reuses the LOCKED interval color language (4 reserved tokens, never repurposed). Extract the chip row as a reusable component (the design doc's `.chiprow` / `.tone-chip` / `.gap-chip` grammar) so Phases 34-35 consume one source of truth. Design source: sketch 021-A + `counting-hint-grammar.md`. REG-01 binding: only the name-it feedback shape line changes; grading and scheduling stay untouched.

### Phase 33: Voicing Lean Flow

**Goal**: The voicing drill starts on the shell and reaches the full and rootless voicings through contextual add/drop nudges, with no always-on mode picker.
**Depends on**: Nothing (independent refactor of ShellVoicingDrill.svelte)
**Requirements**: VOICE-01
**Success Criteria** (what must be TRUE):

  1. The voicing drill's always-on `Fond. · Shell · Sans fond.` 3-way toggle is gone.
  2. The player starts on the shell (the core) and reaches the full voicing via "+ poser la fondamentale" and the rootless voicing via "− retirer la basse".
  3. The current voicing (Shell / Complet / Sans fondamentale) is shown as a by-product of what was added or removed, not as a mode picked up front.
  4. From-memory recall grading and staged-by-card-state (Meet / Subtract / Drill) behavior work exactly as before.

**Plans**: 1/1 plans complete

- [x] 33-01-PLAN.md — Kill the drill-stage 3-way `Fond. · Shell · Sans fond.` selector in ShellVoicingDrill.svelte; start on the shell, reach full/rootless via "+ poser la fondamentale" / "− retirer la basse" nudges with a current-voicing by-product label; preserve chroma grading + staged-by-card-state + embed seam (VOICE-01). [wave 1]

**UI hint**: yes
**Notes**: Independent of the chip grammar and of inversions — can be planned and executed any time after the milestone opens without blocking them. Scoped to `ShellVoicingDrill.svelte`; no other drill surface is touched. Design source: sketch 022-A (voicing lean flow) in `contextual-learning-metacognition.md`. REG-01 binding: preserve the from-memory recall grading (chroma, never letter strings) and the FSRS staged-by-card-state behavior; only the mode chrome changes. French register: abbreviate the nudge labels per the 013 fit rule if they overflow.

### Phase 34: Progression Scaffold & Beginner Keyboard

**Goal**: A beginner can climb an escalating optional counting-hint ladder on the earn-the-symbol progression drill without the symbol being given away, and drill on a one-octave keyboard that widens as level rises.
**Depends on**: Phase 32 (reuses the shared counting-chip grammar for the ladder's quality+count rung)
**Requirements**: SCAF-01, SCAF-02
**Success Criteria** (what must be TRUE):

  1. On the earn-the-symbol progression drill, the user can reveal an escalating, optional hint ladder rung by rung (degree → root note → semitone-count chips → ghost keys).
  2. The chord symbol stays hidden while the ladder is used — the earn-the-symbol payoff is preserved.
  3. The hint ladder fades as the FSRS card matures (fewer rungs offered as mastery rises), following the locked fold-into-deepest-rung / fading-scaffold pattern.
  4. At beginner level the progression keyboard shows only the tonic's one octave, widening to the full span as the level rises.

**Plans**: 2/2 plans complete
**Wave 1**

- [x] 34-01-PLAN.md — Self-contained per-bar FSRS maturity read (reuse `voicingStageForChord`) + explicit beginner keyboard span (1 octave until the card reaches Review, then 2) + beginner caption; add the mandatory `$lib/srs/deck` mock to the existing ProgressionDrill tests (SCAF-02). [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 34-02-PLAN.md — Inline escalating optional counting-hint ladder (degree → count `CountingChipRow` → ghost keys), symbol stays hidden, rungs fade by stage (meet 3 / subtract 2 / drill 0), ghost keys on the live keyboard (SCAF-01). [wave 2, depends 34-01]

**UI hint**: yes
**Notes**: Consumes the Phase 32 counting-chip component (one source of truth, not a second copy); establishes the escalating hint-ladder rung pattern that Phase 35 then reuses. Scoped to `ProgressionDrill.svelte`. Avoid the anti-patterns flagged in the design doc: no always-on inline hint (kills the earn-the-symbol payoff), no full 2-octave keyboard for a cold beginner item. Design source: sketch 024-A + `counting-hint-grammar.md`. REG-01 binding: the earn-the-symbol grading, roman-numeral display, and progression scheduling stay unchanged; only the optional hint ladder and beginner keyboard span are added.

### Phase 35: Inversions — New Drill Family

**Goal**: The user can drill a chord in a named inversion (root / 1st / 2nd / 3rd) with the correct bass, guided by a fading hint ladder, scheduled as its own FSRS family inside the Practice hybrid queue.
**Depends on**: Phase 32 (reuses the shared counting-chip grammar for its hint ladder); Phase 34 (reuses the escalating hint-ladder rung pattern)
**Requirements**: INV-01, INV-02, INV-03
**Success Criteria** (what must be TRUE):

  1. The user can drill a chord in a named inversion (root / 1st / 2nd / 3rd), playing the notes with the correct bass, graded by chroma plus the required bass (never letter strings).
  2. Role colors stay fixed across all inversions — only the note order changes — so the learner sees "same four notes, different bass" (the bass note carries an ink ring + "B" badge).
  3. An escalating, optional hint ladder (bass note → stack order from the bass → ghost keys) guides a beginner and fades as the FSRS card matures.
  4. The inversion drill runs inside the Practice hybrid queue as its own FSRS-scheduled family alongside the existing five (name-it, build-it, voicings, intervals, progressions), with no regression to their scheduling, grading, or telemetry.

**Plans**: 6/6 plans complete

**Wave 1** (parallel foundations)

- [x] 35-01-PLAN.md — Pure inversion engine (`inversions.ts`: count/bass-role/bass-note/ascending voicing from tonal) + chroma+bass grading (`matchInversion.ts`, composes `matchChord`) + tests. [INV-01, wave 1]
- [x] 35-02-PLAN.md — Shared-primitive extensions: `stackedThirdsFor` `startRole` param + `CountingChipRow` `rotateFromRole` prop + `PianoKeyboard` `bassHint` prop (ink ring + "B" badge, chroma+octave, not role-gated) + tests. [INV-01, INV-02, wave 1]
- [x] 35-03-PLAN.md — New `inversions.*` i18n domain (FR primary, Symbol Immunity, no em dashes) registered in index.ts + collision list. [INV-01, wave 1]

**Wave 2** (blocked on Wave 1)

- [x] 35-04-PLAN.md — Synthetic inversion family in `practiceQueue.ts` (`PracticeFamily 'inversion'`, `InversionQueueItem`, `syntheticInversionItems`, `filterInversionsBySong`; weave algorithm unchanged) + frozen-order REG-parity test. [INV-03, wave 2, depends 35-01]
- [x] 35-05-PLAN.md — `InversionDrill.svelte` (symbol shown, passive strip, 2-octave keyboard, chroma+bass grading, bass emphasis, inline fading hint ladder bass→stack→ghost via `voicingStageForChord`) + tests. [INV-01, INV-02, wave 2, depends 35-01/02/03]

**Wave 3** (blocked on Wave 2)

- [x] 35-06-PLAN.md — `/practice` host weave (gated + song-filtered like voicing/progression) + `InversionDrill` render branch + `completeSynthetic` (no FSRS write) + `practice.cue.inversion` + host integration test + REG gate (existing five byte-unchanged). [INV-03, wave 3, depends 35-04/05]

**Planner decision (Claude's Discretion, 35-CONTEXT carded-vs-synthetic):** the inversion family is SYNTHETIC (mirrors voicing/progression) — NO new `FactKind`, NO `chord-inversion` card, NO Dexie/Zod schema change — chosen for REG-01 safety in this highest-risk phase. INV-02's fade reads the drilled chord's own `chord-formula:{symbol}` cards via `voicingStageForChord` (ProgressionDrill precedent). Cold-session ordering stays untouched (Phase 36 owns `composePracticeQueue` reordering; this phase must not race it).

**UI hint**: yes
**Notes**: HIGHEST-RISK phase — a NEW drill family. Hard constraints: reuse the existing `PianoKeyboard`, `composePracticeQueue`, and FSRS card infra — do NOT introduce a new scheduler or a data-schema migration; derive the inversion note-rotation from existing `tonal` data; grade by chroma + required bass, never letter strings. SHARED-FILE COUPLING: INV-03 extends `composePracticeQueue` (adds the inversion family) — the SAME pure composer Phase 36 (QUEUE-01) then reorders. Phase 36 depends on this phase so the two never edit the composer in parallel: land the family here, tune cold-session ordering there. Design source: sketch 023-B + 024-A graft in `counting-hint-grammar.md`. REG-01 binding: the existing five families' scheduling, grading, and telemetry must be byte-for-byte unaffected.

### Phase 36: Cold-Session Queue Ordering

**Goal**: A cold, low-mastery practice session never leads with a scaffold-heavy progression or inversion item, so the first item is never a hard block.
**Depends on**: Phase 35 (extends the same `composePracticeQueue`, after the inversion family is added; also governs the Phase 34 progression family)
**Requirements**: QUEUE-01
**Success Criteria** (what must be TRUE):

  1. When mastery is low, the hybrid-queue composer (`composePracticeQueue`) orders simpler families first so a cold session's first item is never a scaffold-heavy progression or inversion item.
  2. The first item of a cold, low-mastery session is never a hard block for a beginner.
  3. Existing interleaving, the single-type-due gate, and song-filter steering still hold exactly as before after the ordering change.

**Plans**: 2/2 plans complete

Plans:
**Wave 1**

- [x] 36-01-PLAN.md — Pure composer: add options.lowMastery signal + first-pick guard + isLowMasterySession helper, with unit tests (warm/frozen-order preserved)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 36-02-PLAN.md — /practice host wiring: compute lowMastery from card state, pass it to composePracticeQueue, prove cold vs warm signal + green REG suite

**Notes**: SHARED-FILE COUPLING (flagged): this phase reorders `composePracticeQueue`, the same pure composer Phase 35's INV-03 extends. It is sequenced AFTER Phase 35 and depends on it so the two never race on the composer — the inversion family lands first, cold-session ordering is tuned here. Non-visual (pure module + tests), so no UI-SPEC and no UI hint. Design source: the "Non-visual follow-up" flag in `counting-hint-grammar.md` (the real reason a scaffold-heavy item "popped first" and stalled the session). REG-01 binding: interleaving, single-type-due gating, and song-filter behavior are preserved; only cold-session family ordering changes.

### Phase 37: No-Regression Gate

**Goal**: The whole milestone ships green — existing grading, FSRS scheduling, tiers, telemetry, song-filter, and ear-naming rules intact; every new surface covered by tests.
**Depends on**: Phases 32-36 (the full milestone must be in place)
**Requirements**: REG-01
**Success Criteria** (what must be TRUE):

  1. Existing drill grading (chroma/MIDI, never letter strings), FSRS scheduling, tiers, telemetry, and song-filter behavior work exactly as they did before v2.3.
  2. The multiple-choice-never-gates ear-naming rule still holds.
  3. Every new surface (chip grammar, voicing add/drop nudges, inversion family, hint ladders, cold-session queue ordering) is covered by tests.
  4. The full test suite and `svelte-check` both pass with zero errors.

**Plans**: 2/2 plans complete

Plans:
**Wave 1**

- [x] 37-01-PLAN.md — Audit REG-01 coverage matrix (preserved behaviors + every new v2.3 surface -> proving test file), fill only genuine gaps, and add the six-family cross-surface capstone integration test. [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 37-02-PLAN.md — Run the full milestone green gate (build + test + check, zero errors), confirm v2.3 REQUIREMENTS traceability, and mark REG-01 delivered. [wave 2, depends 37-01]

**Notes**: Matches the established milestone pattern (v2.2's Phase 31 was a dedicated final No-Regression gate). REG-01 is a binding constraint throughout Phases 32-36 (each feature phase preserves behavior and covers its own new surface as it goes); this phase is the milestone-wide green gate that consolidates coverage and confirms no behavior regression. No net-new visual surface — no UI-SPEC, no UI hint.

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

- [x] 32-02-PLAN.md

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

**Plans**: 5/5 plans complete

- [x] 27-01-PLAN.md — Pure practiceQueue.ts composer (hybrid FSRS + synthetic items, single-type-due gate, song-filter helpers) + queue tests
- [x] 27-02-PLAN.md — Embed seams on ShellVoicingDrill + ProgressionDrill (voicing/progression drivable from the queue) + tests
- [x] 27-03-PLAN.md — New family components PracticeChordDrill (name-it) + PracticeIntervalDrill (intervals) + tests
- [x] 27-04-PLAN.md — Thin /practice host: load/compose, pre-start "Start practice", empty tiers, carded-family session, family cue, FSRS grade commit, end-card, i18n
- [x] 27-05-PLAN.md — Weave synthetic voicing/progression families into the host + full REG-02 five-family e2e (interleaving, single-type-due gate, song-filter steering, grade-commit split)

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

**Plans**: 5/5 plans complete

- [x] 28-01-PLAN.md — Extract TheoryLessons.svelte; /theory becomes a thin wrapper (DRY foundation)
- [x] 28-02-PLAN.md — Extract ScaleExplorer.svelte (exploreOnly prop); /scales becomes a thin wrapper
- [x] 28-03-PLAN.md — Register the learn.* i18n domain (index.ts merge + messages.test.ts collision list)
- [x] 28-04-PLAN.md — Build the /learn hub (theory + explore + 5-quality interval reference) + render/smoke test (LEARN-01)
- [x] 28-05-PLAN.md — Additive Scale-practice disclosure on /practice + reachability test (LEARN-02)

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

**Plans**: 5/5 plans complete

Plans:

- [x] 29-01-PLAN.md — Register the progress-hub.* i18n domain (3 tab labels + aria) [wave 1]
- [x] 29-02-PLAN.md — Extract SongManager.svelte + thin /songs wrapper (heading prop; sole filter writer) [wave 1]
- [x] 29-03-PLAN.md — Extract RecallPanel.svelte ($bindable mode) + thin /recall wrapper (dock gate) [wave 1]
- [x] 29-04-PLAN.md — Extract ProgressStats.svelte + rewrite /progress into the 3-tab hub host [wave 2]
- [x] 29-05-PLAN.md — Progress hub smoke test (tab switch, filter write, review-dock gating) [wave 3]

**UI hint**: yes
**Notes**: REG-01 binding: stats/streak computation, review-map data, and the song-filter preference all behave exactly as before; only their display location moves. The song filter surfaced here is the same preference the Practice queue reads (PRAC-04). CRITICAL coupling: the fixed review-action dock (`data-review-dock`) is gated in the hub on BOTH `activeTab==='recall'` AND `recallMode==='review'` so it never leaks onto Stats/Songs. DRY: SongManager/RecallPanel/ProgressStats extracted once; /songs + /recall become thin wrappers (redirects are Phase 30). Existing progress/songs/coverage suites must pass unedited.

### Phase 30: Four-Hub Nav Cutover + Redirect Shims

**Goal**: The app presents exactly 4 hubs everywhere; old bookmarks and deep-links still land correctly; the orphan route is removed.
**Depends on**: Phases 26, 27, 28, 29 (all hub content must exist before nav flips and old routes become shims)
**Requirements**: HUB-01, HUB-02, HUB-03
**Success Criteria** (what must be TRUE):

  1. The desktop nav shows exactly 4 hubs (Lookup, Practice, Learn, Progress), replacing the 10 flat links.
  2. The phone tab bar shows the same 4 hubs, and the "More" bottom sheet is gone.
  3. Visiting any of the 8 old routes (`/drills`, `/scales`, `/voicings`, `/build`, `/progressions`, `/recall`, `/songs`, `/theory`) redirects to the hub that now owns it.
  4. The orphan `/showcase` route no longer exists.

**Plans**: 5/5 plans complete

- [x] 30-01-PLAN.md — Nav cutover to 4 hubs + nav.practice/nav.learn i18n + masthead test (Wave 1)
- [x] 30-02-PLAN.md — Wire drill/lesson seeds into /practice as prioritized name-it items (Wave 1)
- [x] 30-03-PLAN.md — Repoint Progress + Lookup drill handoffs to /practice + their tests (Wave 1)
- [x] 30-04-PLAN.md — Repoint Recall/Lesson to /practice, Build to /progress + their tests (Wave 1)
- [x] 30-05-PLAN.md — 8 redirect shims + delete showcase + coverage-test remap + delete 15 route tests + green gate (Wave 2)

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

**Plans**: 2/2 plans complete
Plans:

- [x] 31-01-PLAN.md — Audit REG-02 coverage matrix (fill only genuine gaps) + cross-hub capstone integration test (REG-01: 4-hub topology, 8 redirects, one flow per hub) [wave 1]
- [x] 31-02-PLAN.md — Full milestone green gate (build+prerender / test / svelte-check) + REQUIREMENTS.md traceability confirmation, mark REG-01/REG-02 delivered [wave 2]

**Notes**: REG-01 and REG-02 are binding constraints throughout Phases 26-30 (each merge phase preserves behavior and remaps its own route's tests as it goes). This phase is the milestone-wide green gate that consolidates the remapped suite and confirms no behavior regression across all four hubs. No UI (verification/test phase). UI-SPEC skipped (no net-new visual surface).

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
| v2.2 Hub Consolidation + Interval Theory | 26-31 | 26 | Complete | 2026-07-25 |
| v2.3 Beginner On-Ramp & Inversions | 32-37 | TBD | In progress | — |
