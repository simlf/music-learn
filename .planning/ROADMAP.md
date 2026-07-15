# Roadmap: Music Learn — Jazz Piano Theory Companion

## Overview

Music Learn takes a returning classical pianist from "I freeze when I see `F♯ø7` in the sheet music" to "I know instantly what my left hand plays." The journey starts by establishing the design identity and a correct music-theory core (the single source of truth for notes, spelling, and dual naming), then delivers the first usable end-to-end capability — a chord lookup companion you can put next to the piano. From there each phase adds a complete user capability: on-screen practice drills, MIDI play-to-answer, learning-science drill design (interleaving, fading scaffolds, elaborative feedback), major scales, theory lessons, cross-device progress persistence with a weakness-aware stats view and streak, and finally deployment on the user's Oracle server over HTTPS. Every phase is a vertical slice that the user can actually try, keeping music-theory correctness and MIDI integration — the riskiest assumptions — testable early.

**v2.0 Learning Upgrade (Phases 10-13):** With the chord-fluency core shipped and deployed, v2 turns the app from a chord dictionary into a memory trainer, grounded in validated spikes 006-009. Four phases replace the old, unbuilt learning phases (5-7) with a pedagogy-first stack: a scale keyboard drill that fixes the confusing degree ladder, a real spaced-repetition memorization engine (ts-fsrs, card = fact x mode), a "Build it" construction mode where the learner earns each note from its interval formula, and multi-modal recall that drills one fact across rotating retrieval paths. Cross-cutting locked constraints for every v2 phase: grade notes by chroma/MIDI never letter strings; ear-naming is multiple-choice and never gates; local-first persistence (localStorage then Dexie); no em dashes in copy. Old Phase 4 (MIDI Play-to-Answer) stays deferred until hardware-in-the-loop testing is set up.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Print Shop Foundation & Theory Core** - Design identity + correct chord/spelling/dual-naming engine, testable in isolation (completed 2026-07-12)
- [x] **Phase 2: Chord Lookup Companion** - Type a symbol, see notes on a colored keyboard diagram next to the piano (completed 2026-07-12)
- [x] **Phase 3: On-Screen Drill Loop** - Construction & identification drills with instant elaborative feedback on the clickable keyboard (completed 2026-07-13)
- [ ] **Phase 4: MIDI Play-to-Answer** - Answer the same drills by playing the connected digital piano — DEFERRED (needs hardware present; out of v2.0 scope)
- [ ] **Phase 5: Smart Drill Design** - Interleaved sessions, scoped practice, and fading label scaffolds — SUPERSEDED by v2.0 Phase 13 (Multi-modal Recall)
- [x] **Phase 6: Major Scales** - Drill and see fingerings for all 12 major scales, expanding from G major — SUPERSEDED by v2.0 Phase 10 (Scale Keyboard Drill) (completed 2026-07-15)
- [ ] **Phase 7: Theory Lessons** - Short shape-first lessons explaining what the symbols mean — SUPERSEDED by v2.0 Phase 12 (Build-it Construction)
- [x] **Phase 8: Progress & Streaks** - Cross-device answer history, weakness-aware stats, and a daily streak (completed 2026-07-13)
- [x] **Phase 9: Deploy to the Piano** - Live on the Oracle server over HTTPS, usable on laptop and phone (completed 2026-07-13)

### v2.0 Learning Upgrade

- [x] **Phase 10: Scale Keyboard Drill** - Play a scale on a movable tonic-anchored keyboard graded by pitch class; retires the confusing degree ladder (completed 2026-07-15)
- [x] **Phase 11: Memorization Engine** - Real spaced repetition (ts-fsrs): surface facts due today, reveal-and-grade, persist a card per (fact, mode), recall map (completed 2026-07-15)
- [ ] **Phase 12: Build-it Construction** - Earn each note by stacking one interval at a time; derive chords and scales from the formula and feed the memorization engine
- [ ] **Phase 13: Multi-modal Recall** - Drill one fact across rotating modes (see-play, formula-build, hear-name) on top of the scheduler

## Phase Details

### Phase 1: Print Shop Foundation & Theory Core

**Goal**: The app has its "Print Shop" visual identity and interval color language in place, and a pure, unit-tested music-theory engine correctly spells every v1 chord across all 12 roots with dual letter/solfège naming.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: THEORY-01, THEORY-02, THEORY-03, THEORY-04, DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE):

  1. For any supported symbol (major/minor/dim triads, maj7, m7, dom7, ø7, °7) across all 12 roots, the app returns the correct notes — verifiable against a reference chord chart.
  2. Entering the same chord in different jazz spellings (Cm7, C-7, Cmin7; Cø7, Cm7♭5) resolves to the identical chord.
  3. Notes are spelled with one letter per scale degree from the root + interval formula (F♯m7 shows C♯, not D♭), never a flattened pitch-class list.
  4. Every note is displayed with its letter name primary and Do-Ré-Mi solfège alongside.
  5. The interface renders in the Print Shop direction (paper ground, ink borders, vermilion/mustard, sharp corners) with root/3rd/5th/7th shown in their fixed interval colors.

**Plans**: 4/4 plans complete
**Wave 1**

- [x] 01-01-PLAN.md — Walking Skeleton: scaffold SvelteKit static app, RED e2e test, thinnest Cm7 slice, 01-SKELETON.md

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Theory engine (TDD): spellChord across 8 qualities × 12 roots, aliases, enharmonics, dual letter/solfège naming
- [x] 01-03-PLAN.md — Print Shop design system: interval color tokens + PianoKeyboard, NoteLabel, ChordGlyph, Button, IntervalChip

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Full /showcase slice: stamp glyph, colored keyboard, formula readout, alias line, empty/error states, surprise-me, synth playback

**UI hint**: yes

### Phase 2: Chord Lookup Companion

**Goal**: The user can sit at the piano, type any chord symbol they meet in a lead sheet, and instantly see the notes on a keyboard diagram with dual naming and interval colors.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LOOK-01
**Success Criteria** (what must be TRUE):

  1. Typing a chord symbol shows its notes highlighted on an on-screen keyboard diagram fast enough to use mid-song.
  2. Each highlighted note shows letter + solfège naming and is colored by its interval role (root/3rd/5th/7th).
  3. Unrecognized or malformed input gives a clear, non-blocking message rather than a wrong answer.

**Plans**: 3/3 plans complete

**Wave 1**

- [x] 02-01-PLAN.md — Lookup page as app home + masthead shell: RED e2e, extract chordPresentation, type-symbol-to-stamp on keyboard with dual naming and interval colors (LOOK-01 core)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Mid-song ergonomics: recent-lookups localStorage + RecentChipRow, ♯/♭ helper buttons, autofocus + type-over-select

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Did-you-mean suggestion: single-candidate heuristic + suggestion copy variants + inline tappable suggestion in the error bar

**UI hint**: yes

### Phase 3: On-Screen Drill Loop

**Goal**: The user can practice both directions of chord fluency — build a chord from its symbol, and name a chord from highlighted notes — entirely on the clickable keyboard, with instant right/wrong feedback that teaches when wrong.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DRILL-01, DRILL-02, DRILL-03, INPUT-02
**Success Criteria** (what must be TRUE):

  1. Given a chord symbol, the user clicks the notes and any correct voicing — any inversion or octave — is accepted.
  2. Given highlighted notes on the keyboard, the user can name the chord symbol and be graded.
  3. Every answer produces instant right/wrong feedback; a wrong answer reveals the correct notes and the interval formula in interval colors.
  4. The on-screen keyboard is a fully equivalent input path that works on any browser or device.

**Plans**: 4/4 plans complete

**Wave 1** *(parallel: disjoint file sets)*

- [x] 03-01-PLAN.md — Pure logic substrate (TDD): matchChord chroma-set matcher (D-01/02/03) + generateQuestion question/distractor/type generation (D-05/06)
- [x] 03-02-PLAN.md — Extend PianoKeyboard in place with interactive/selected/onToggle mode + selected-key hatch, display-only non-regression test (D-11, INPUT-02)

**Wave 2** *(blocked on Wave 1)*

- [x] 03-03-PLAN.md — Construction drill vertical slice: /drills page + Drills nav, RED e2e first, keyboard→matcher→elaborative feedback + stamp reward (DRILL-01/03, INPUT-02, D-04/08/09/13)

**Wave 3** *(blocked on Wave 2: shares drills/+page.svelte)*

- [x] 03-04-PLAN.md — Identification drill + interleaving + Next + in-memory ScoreRegister (DRILL-02/03, D-05/06/07/10)

**UI hint**: yes

### Phase 4: MIDI Play-to-Answer

> **v2.0 note:** DEFERRED. This phase needs the digital piano connected during build/verify (hardware-in-the-loop). It is out of v2.0 scope and is not part of v2.0 execution. Revisit as its own milestone once hardware-in-the-loop testing is set up. Its requirements (INPUT-01, INPUT-03) stay mapped here.

**Goal**: When the digital piano is connected, the user answers the exact same drills by playing keys, with identical matching and feedback to the on-screen path.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: INPUT-01, INPUT-03
**Success Criteria** (what must be TRUE):

  1. On a Chromium browser with the piano connected, notes played on the piano register as drill answers.
  2. A played chord is matched the same way an on-screen answer is — same tolerance for voicing, octave, and order — and produces the same feedback.
  3. When Web MIDI is unavailable or permission is denied, the app clearly falls back to the on-screen keyboard without breaking the drill.

**Plans**: TBD

### Phase 5: Smart Drill Design

> **v2.0 note:** SUPERSEDED by Phase 13 (Multi-modal Recall). The interleaving, scoped-practice, and fading-scaffold intent is realized by the v2.0 memorization engine and multi-modal recall (per-fact mode rotation, spaced review, FSRS scheduling). Not part of v2.0 execution; kept for history. Its requirements (DRILL-04, DRILL-05, DRILL-06) stay mapped here and are not remapped to any v2.0 phase.

**Goal**: Practice sessions apply learning science by default — chord qualities are interleaved, the user can scope a session to chosen qualities/roots, and note labels fade as accuracy on each item grows.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: DRILL-04, DRILL-05, DRILL-06
**Success Criteria** (what must be TRUE):

  1. A default session mixes (interleaves) chord qualities rather than blocking by one quality.
  2. The user can opt in to scope a session to chosen chord qualities and/or roots (e.g., only m7 chords).
  3. As accuracy on a given item rises, its letter/solfège labels progressively fade, removing the scaffold as recall develops.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Major Scales

> **v2.0 note:** SUPERSEDED by Phase 10 (Scale Keyboard Drill). The v2.0 scale keyboard drill replaces the abstract degree ladder with a movable tonic-anchored keyboard graded by pitch class. Not part of v2.0 execution; kept for history. Its requirements (SCALE-01, SCALE-02) stay mapped here and are not remapped to any v2.0 phase.

**Goal**: The user can drill and reference all 12 major scales, expanding outward from the one scale they know (G major), with standard piano fingerings shown.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SCALE-01, SCALE-02
**Success Criteria** (what must be TRUE):

  1. The user can drill any of the 12 major scales by spelling or playing the notes, and the scale order can expand outward from G major.
  2. Each major scale displays its standard piano fingering.
  3. Scale drills reuse the same input paths and feedback as chord drills.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Theory Lessons

> **v2.0 note:** SUPERSEDED by Phase 12 (Build-it Construction). Instead of passive lessons, v2.0 teaches the "why" actively: the learner derives chords and scales from their interval formula, one earned note at a time. Not part of v2.0 execution; kept for history. Its requirements (LESSON-01, LESSON-02) stay mapped here and are not remapped to any v2.0 phase.

**Goal**: The user can read short, shape-first lessons that explain what the chord symbols mean and how chords are built from intervals, using the interval color language and keyboard examples.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LESSON-01, LESSON-02
**Success Criteria** (what must be TRUE):

  1. The user can read short lessons explaining symbol meanings (7, maj7, m7, ø, °, 9) with keyboard examples.
  2. The user can read lessons on intervals and chord construction framed shape-first (e.g., "m7 = minor triad + minor 3rd on top") using the interval colors.
  3. Lesson keyboard examples use the same dual naming and interval colors as the rest of the app.

**Plans**: TBD
**UI hint**: yes

### Phase 8: Progress & Streaks

**Goal**: The user's drill history persists across sessions and devices, surfaces their weakest chords/scales, and shows a daily practice streak that supports the habit goal.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: PROG-01, PROG-02, PROG-03
**Success Criteria** (what must be TRUE):

  1. Drill answers persist across sessions and across devices via the backend on the user's Oracle server (SQLite storage).
  2. The user can see per-chord and per-scale accuracy stats that highlight their weakest items.
  3. The user can see a daily practice streak counter.

**Plans**: 4/4 plans complete

**Wave 1**

- [x] 08-01-PLAN.md — Backend persistence service (server half of PROG-01): SQLite answers table + POST /answers + bearer auth + /health, integration-tested (D-01/D-02/D-03)

**Wave 2** *(blocked on Wave 1)*

- [x] 08-02-PLAN.md — Client wiring + docker compose: fire-and-forget recordAnswer + offline queue, drills hook, Dockerfile/compose/.env.example — completes PROG-01 end to end (D-04)

**Wave 3** *(blocked on Wave 2)*

- [x] 08-03-PLAN.md — Stats slice (PROG-02): GET /stats + computeStats, PracticeItemRow/AccuracyTable, Progress page (loading/empty/error/populated) + nav link

**Wave 4** *(blocked on Wave 3: shares progress page, layout, server index)*

- [x] 08-04-PLAN.md — Streak slice (PROG-03): GET /streak + computeStreak, streak copy pools, StreakBadge, Progress streak hero + masthead chip

**UI hint**: yes

### Phase 9: Deploy to the Piano

**Goal**: The app is live on the user's Oracle server over HTTPS and works responsively on both the laptop at the piano and the phone elsewhere.
**Mode:** mvp
**Depends on**: Phase 8
**Requirements**: PLAT-01, PLAT-02
**Success Criteria** (what must be TRUE):

  1. The app is reachable over HTTPS on the user's Oracle server (HTTPS required for Web MIDI).
  2. The layout is responsive and the on-screen keyboard is usable on a phone.
  3. The same app works from both laptop (at the piano, MIDI available) and phone (on-screen fallback), sharing one progress history.

**Scope note (Phase 9 planning):** Deployment to the Oracle server over HTTPS (criterion 1, and the cross-device part of criterion 3) is DEFERRED per the phase CONTEXT reframe — the user handles deployment himself outside these plans. These plans deliver criterion 2 in depth (responsive/mobile, PLAT-01); PLAT-02 is not claimed here.

**Plans**: 6/6 plans complete

**Wave 1** *(parallel: disjoint file sets)*

- [x] 09-01-PLAN.md — Responsive PianoKeyboard: width-derived octave count (1 phone / 2 wide), 44px floor, highlight wrapping, rotation continuity (D-01..D-04, PLAT-01)
- [x] 09-05-PLAN.md — Minimal PWA: manifest + Print Shop icons + head links for standalone Add to Home Screen (D-07)

**Wave 2** *(blocked on Wave 1)*

- [x] 09-02-PLAN.md — Merged wrong-answer feedback keyboard (Sketch 001 Variant A): one in-place keyboard with interval colors + gray ✕ extras + legend
- [x] 09-06-PLAN.md — Compact mobile masthead (drop Showcase) + mobile-fit accuracy table + Lookup/Progress verification pass (D-08, D-09)

**Wave 3** *(blocked on Wave 2)*

- [x] 09-03-PLAN.md — Mobile drills layout: portrait thumb-zone + landscape two-pane + one-time rotate hint + 2x2 choices (D-05, D-06, D-10, D-13)
- [x] 09-04-PLAN.md — Touch ergonomics: press cue + guarded haptic + keyboard gesture hygiene (D-11, D-12)

**UI hint**: yes

### Phase 10: Scale Keyboard Drill

**Goal**: The user practices a major scale by playing it up and down on a movable, tonic-anchored piano keyboard graded by pitch class, retiring the confusing degree-ladder Practice surface while leaving the Explore surface intact.
**Depends on**: Phase 3 (drill chrome and PianoKeyboard, complete)
**Requirements**: SCALE-04, SCALE-05
**Success Criteria** (what must be TRUE):

  1. The user practices a scale by tapping its notes ascending then descending on a keyboard whose leftmost highlighted key is the tonic, ending on the octave (degree 8).
  2. Taps are graded by pitch class (MIDI/chroma), so enharmonic scales grade correctly (e.g., Gb major's Cb is accepted on the B key).
  3. The degree-ladder Practice surface is gone, replaced by the keyboard with no keyboard-vs-ladder toggle; the Explore surface (degree strip + interval inspect) is unchanged.
  4. A wrong tap gives immediate feedback (wrong-key flash) and the drill reports a clean pass when the full ascending-and-descending scale is completed.

**Plans**: 2/2 plans complete

**Wave 1**

- [x] 10-01-PLAN.md — Pure chroma scale-drill sequence + ascending key placement (TDD): 15-target up-and-down run graded by pitch class, with a distinct octave key

**Wave 2** *(blocked on Wave 1)*

- [x] 10-02-PLAN.md — ScaleKeyboardDrill component + /scales wiring: tonic-anchored 2-octave keyboard, position register, wrong-tap flash, completion card; retires the degree-ladder surface

**UI hint**: yes

### Phase 11: Memorization Engine

**Goal**: A real spaced-repetition recall loop: the app surfaces the theory facts due today, the user reveals and grades each one, and FSRS scheduling state persists per (fact, mode) on the device, with a recall map that shows what is due, mastered, or weak.
**Depends on**: Phase 3 (theory engine supplies the facts)
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04
**Success Criteria** (what must be TRUE):

  1. The user starts a recall session that surfaces only the theory facts (chord formulas, interval sizes, scale degrees) due today, scheduled by FSRS on day-scale intervals.
  2. The user reveals each fact then grades it Again/Hard/Good/Easy; each grade button shows the day interval it will schedule, the item reschedules at a growing interval, and a lapse shortens it.
  3. Scheduling state persists across sessions and reloads on the same device as one card per (fact, mode), with Date fields correctly rehydrated after storage round-trip.
  4. The user sees a recall map showing which facts are due, mastered, or weak across modes.

**Plans**: 6/6 plans complete
**Wave 1** *(parallel: disjoint file sets)*

- [x] 11-01-PLAN.md — Pure FSRS scheduler wrapper (TDD): ts-fsrs config, fixed day intervals, grade preview vs commit
- [x] 11-02-PLAN.md — Fact catalog (TDD): 192 chord-formula/interval-size/scale-degree facts generated from the theory engine

**Wave 2** *(blocked on Wave 1)*

- [x] 11-03-PLAN.md — Dexie-backed card deck (TDD): per-(fact,mode) persistence, Zod Date rehydration, gradual card introduction, recall-map cell derivation
- [x] 11-04-PLAN.md — Session queue + day-interval formatter (TDD): Again re-enqueue, grade-button label formatting

**Wave 3** *(blocked on Wave 2)*

- [x] 11-05-PLAN.md — RecallSession UI + /recall route: reveal-then-grade session loop, 6-state page machine, masthead nav entry

**Wave 4** *(blocked on Wave 3: shares recall/+page.svelte)*

- [x] 11-06-PLAN.md — RecallMap UI: fact x mode grid, kind filters, Review/Map toggle, View Recall Map completion CTA

**UI hint**: yes

### Phase 12: Build-it Construction

**Goal**: The learner earns each note by stacking one interval at a time on a keyboard — deriving chords and scales from their formula instead of reading a finished list — and construction accuracy feeds the memorization engine as the formula-build mode of a fact.
**Depends on**: Phase 11 (construction accuracy feeds the engine, BUILD-04)
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04
**Success Criteria** (what must be TRUE):

  1. The user builds a chord from its symbol by tapping notes one interval at a time (stack a minor 3rd, then a major 3rd...), earning each note rather than reading the answer list.
  2. The user builds a major scale the same way, following its whole/half step pattern and closing on the octave.
  3. Each step shows a plain-English interval instruction and why that note belongs; a wrong tap gives diagnostic feedback (e.g., "2 half steps too high"), grading by pitch class while teaching the correct enharmonic spelling.
  4. Completing or missing construction steps records gradeable events into the memorization engine as that fact's formula-build mode.

**Plans**: 6 plans

**Wave 1** *(parallel: disjoint file sets)*

- [ ] 12-01-PLAN.md — Theory + SRS seams: phraseStep consecutive-interval phrasing, scale-formula factId, deck.ts formula-build mode
- [ ] 12-02-PLAN.md — PianoKeyboard constructable gated mode (onConstructTap, flashWrongKey)
- [ ] 12-03-PLAN.md — Pure construction engine (one engine, two grammars; MIDI/chroma grading; full-catalog reachability)

**Wave 2** *(blocked on Wave 1)*

- [ ] 12-04-PLAN.md — BuildSession core: picker, route, nav, full step loop (both feedback branches, pacing, formula strip)

**Wave 3** *(blocked on Wave 2: shares BuildSession.svelte)*

- [ ] 12-05-PLAN.md — Count-up hint, enharmonic teaching line, completion summary

**Wave 4** *(blocked on Wave 3: shares BuildSession.svelte)*

- [ ] 12-06-PLAN.md — FSRS integration: record construction outcomes as formula-build mode cards

**UI hint**: yes

### Phase 13: Multi-modal Recall

**Goal**: One fact is drilled across rotating retrieval modes on top of the scheduler — see the symbol then play, given the formula then build, hear the chord then name it — so each chord is encoded through multiple paths, with ear-naming demoted to a non-gating multiple-choice check.
**Depends on**: Phase 11 (scheduler and card model), Phase 12 (formula-build is a recall mode)
**Requirements**: RECALL-01, RECALL-02, RECALL-03
**Success Criteria** (what must be TRUE):

  1. The user drills one chord across rotating modes: see the symbol then play the notes; given the formula/degrees then build it; hear the chord then name it.
  2. Ear-based naming is answered by multiple choice against same-root distractors and never gates progress or unlocks.
  3. Modes rotate per-fact when teaching a new item and are spaced across sessions when reviewing a known one.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**

v1 phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Phases 1-3, 8, 9 are complete; phases 4-7 are deferred/superseded (see the v2.0 notes on each) and are not executed.

v2.0 Learning Upgrade executes in numeric order: 10 → 11 → 12 → 13. Phase 10 (Scale Keyboard Drill) is independent and may run first or in parallel; Phase 11 (Memorization Engine) is the SRS foundation; Phase 12 (Build-it Construction) depends on Phase 11; Phase 13 (Multi-modal Recall) depends on Phases 11 and 12.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Print Shop Foundation & Theory Core | 4/4 | Complete    | 2026-07-12 |
| 2. Chord Lookup Companion | 3/3 | Complete    | 2026-07-12 |
| 3. On-Screen Drill Loop | 4/4 | Complete   | 2026-07-13 |
| 4. MIDI Play-to-Answer | 0/TBD | Deferred | - |
| 5. Smart Drill Design | 0/TBD | Superseded (Phase 13) | - |
| 6. Major Scales | 0/TBD | Superseded (Phase 10) | - |
| 7. Theory Lessons | 0/TBD | Superseded (Phase 12) | - |
| 8. Progress & Streaks | 4/4 | Complete    | 2026-07-13 |
| 9. Deploy to the Piano | 6/6 | Complete   | 2026-07-13 |
| 10. Scale Keyboard Drill | 2/2 | Complete    | 2026-07-15 |
| 11. Memorization Engine | 6/6 | Complete    | 2026-07-15 |
| 12. Build-it Construction | 0/TBD | Not started | - |
| 13. Multi-modal Recall | 0/TBD | Not started | - |
