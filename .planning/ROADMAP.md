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
- [x] **Phase 5: Smart Drill Design** - Interleaved sessions, scoped practice, and fading label scaffolds — SUPERSEDED by v2.0 Phase 13 (Multi-modal Recall) (completed 2026-07-15)
- [x] **Phase 6: Major Scales** - Drill and see fingerings for all 12 major scales, expanding from G major — SUPERSEDED by v2.0 Phase 10 (Scale Keyboard Drill) (completed 2026-07-15)
- [x] **Phase 7: Theory Lessons** - Short shape-first lessons explaining what the symbols mean — SUPERSEDED by v2.0 Phase 12 (Build-it Construction) (completed 2026-07-15)
- [x] **Phase 8: Progress & Streaks** - Cross-device answer history, weakness-aware stats, and a daily streak (completed 2026-07-13)
- [x] **Phase 9: Deploy to the Piano** - Live on the Oracle server over HTTPS, usable on laptop and phone (completed 2026-07-13)

### v2.0 Learning Upgrade

- [x] **Phase 10: Scale Keyboard Drill** - Play a scale on a movable tonic-anchored keyboard graded by pitch class; retires the confusing degree ladder (completed 2026-07-15)
- [x] **Phase 11: Memorization Engine** - Real spaced repetition (ts-fsrs): surface facts due today, reveal-and-grade, persist a card per (fact, mode), recall map (completed 2026-07-15)
- [x] **Phase 12: Build-it Construction** - Earn each note by stacking one interval at a time; derive chords and scales from the formula and feed the memorization engine (completed 2026-07-15)
- [x] **Phase 13: Multi-modal Recall** - Drill one fact across rotating modes (see-play, formula-build, hear-name) on top of the scheduler (completed 2026-07-15)

### v2.1 Playability & Comprehension

*(Phase 14 is the standalone `14-mastery-criterion` improvement; this v2.1 batch continues at 15. Design winners are Session 4 sketches 008–013.)*

- [x] **Phase 15: Playable Keyboard Everywhere** - A docked, always-playable keyboard on every keyboard-bearing page (sketch 008-A) (planned 2026-07-15) (completed 2026-07-15)
- [x] **Phase 16: Hear the Chord** - Auto-play + synced pulse on the BUILD reveal for audio memory (sketch 009-A) (completed 2026-07-16)
- [x] **Phase 17: Chord Explainer** - Escalating in-place hints for unknown chords in Recall (sketch 010-A) (completed 2026-07-17)
- [x] **Phase 18: Your Songs' Chords** - Song-provenance marks + a From-my-songs filter across the app (sketch 011-A) (planned 2026-07-15) (completed 2026-07-18)
- [x] **Phase 19: Interactive Theory** - Guided-step beginner lessons that hand off into the first drill (sketch 012-A) (planned 2026-07-15) (completed 2026-07-18)
- [x] **Phase 20: French Translation** - Header EN|FR toggle and a full French i18n layer (sketch 013-A) (planned 2026-07-15) (completed 2026-07-18)
- [x] **Phase 21: Drills Polish** - No-duplicate preset songs, a discrete /drills practice-pool filter bar, and on-demand full-chord replay in the answer reveal (completed 2026-07-19; DPOL-02 hover visual pending a human eyeball)

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

**Plans**: 6/6 plans complete

**Wave 1** *(parallel: disjoint file sets)*

- [x] 12-01-PLAN.md — Theory + SRS seams: phraseStep consecutive-interval phrasing, scale-formula factId, deck.ts formula-build mode
- [x] 12-02-PLAN.md — PianoKeyboard constructable gated mode (onConstructTap, flashWrongKey)
- [x] 12-03-PLAN.md — Pure construction engine (one engine, two grammars; MIDI/chroma grading; full-catalog reachability)

**Wave 2** *(blocked on Wave 1)*

- [x] 12-04-PLAN.md — BuildSession core: picker, route, nav, full step loop (both feedback branches, pacing, formula strip)

**Wave 3** *(blocked on Wave 2: shares BuildSession.svelte)*

- [x] 12-05-PLAN.md — Count-up hint, enharmonic teaching line, completion summary

**Wave 4** *(blocked on Wave 3: shares BuildSession.svelte)*

- [x] 12-06-PLAN.md — FSRS integration: record construction outcomes as formula-build mode cards

**UI hint**: yes

### Phase 13: Multi-modal Recall

**Goal**: One fact is drilled across rotating retrieval modes on top of the scheduler — see the symbol then play, given the formula then build, hear the chord then name it — so each chord is encoded through multiple paths, with ear-naming demoted to a non-gating multiple-choice check.
**Depends on**: Phase 11 (scheduler and card model), Phase 12 (formula-build is a recall mode)
**Requirements**: RECALL-01, RECALL-02, RECALL-03
**Success Criteria** (what must be TRUE):

  1. The user drills one chord across rotating modes: see the symbol then play the notes; given the formula/degrees then build it; hear the chord then name it.
  2. Ear-based naming is answered by multiple choice against same-root distractors and never gates progress or unlocks.
  3. Modes rotate per-fact when teaching a new item and are spaced across sessions when reviewing a known one.

**Plans:** 6/6 plans complete

Plans:

- [x] 13-01-PLAN.md — Widen deck.ts's Mode to 4 values and add the RECALL-03 rotation policy (rotation.ts)
- [x] 13-02-PLAN.md — RecallMap grows to 4 mode columns with the not-applicable cell treatment
- [x] 13-03-PLAN.md — Universal mode-signal chip + Mode A (see-play) surface
- [x] 13-04-PLAN.md — Mode B (hear-name) surface: same-root MC, never gates, auto-advance
- [x] 13-05-PLAN.md — Mode C: embed BuildSession as a recall mode
- [x] 13-06-PLAN.md — Wire the rotation policy into RecallSession's queue composition

**UI hint**: yes

### Phase 15: Playable Keyboard Everywhere

**Goal**: Every page that shows a piano keyboard carries a docked, always-playable keyboard — tapping any key sounds immediately through the existing audio engine — so practice input is uniform across Lookup, Drills, Recall, Scales, and Theory.
**Depends on**: Phase 3 (PianoKeyboard component + audio engine)
**Requirements**: KBD-01, KBD-02, KBD-03
**Success Criteria** (what must be TRUE):

  1. On every keyboard-bearing surface (root chord Lookup, /drills, /recall, /scales, /theory) a keyboard is present and tapping a key plays its pitch through the existing audio engine, honoring the persisted sound toggle.
  2. The keyboard is docked to the bottom of the viewport, thumb-reachable on a phone, with page content scrolling above it; a handle collapses/expands it and the collapsed state persists.
  3. Playing the docked keyboard for free exploration never corrupts the active drill/recall answer input on that page — exploration and answering stay distinguishable.

**Design reference**: `.planning/sketches/008-keyboard-everywhere/` (winner Variant A: docked bottom bar)
**UI hint**: yes
**Plans**: 7/7 plans complete
**Wave 1**

- [x] 15-01-PLAN.md — Dock foundations: collapse-state persistence (music-learn:docked-keyboard-collapsed) + Svelte context registration seam (KBD-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 15-02-PLAN.md — KeyboardDock chrome (handle/surface/register, collapse+persist, --dock-height clearance) + layout host wiring (KBD-01/02)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 15-03-PLAN.md — Lookup + Theory: docked always-inspectable tap-to-hear keyboards (Theory gains a new one) (KBD-01)
- [x] 15-04-PLAN.md — Scales Practice: relocate ScaleKeyboardDrill's key-strip into the dock, degree register stays in flow (KBD-01)
- [x] 15-05-PLAN.md — Drills: single mode-aware docked keyboard for all branches + short-landscape inline fallback (KBD-01/03)
- [x] 15-06-PLAN.md — Recall modes A/B/formula: one mode-aware docked keyboard (KBD-01/03)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 15-07-PLAN.md — Recall Mode C: dock the embedded BuildSession constructable keyboard, /build unchanged (KBD-01/03)

### Phase 16: Hear the Chord

**Goal**: When a BUILD (formula→build) answer is revealed, the chord sounds automatically with a visual pulse synced to the strike so audio memory forms; with sound off the reveal still pulses visually, never a silent dead-end.
**Depends on**: Phase 12 (BuildSession reveal), Phase 15 (playable keyboard)
**Requirements**: HEAR-01, HEAR-02
**Success Criteria** (what must be TRUE):

  1. On the BUILD reveal the correct chord plays via the existing `playChord` engine the instant the answer stamps in, and the lit keys plus the serif chord glyph pulse once in time; a "Hear again" control replays on demand.
  2. With sound disabled the same reveal still runs the visual pulse (no audio, no error); an optional roll-then-block "study" playback (arpeggiate root→3rd→5th→7th, each key lighting as it sounds, then the block chord) is available as a toggle.

**Design reference**: `.planning/sketches/009-hear-the-chord/` (winner Variant A: auto-play + pulse; C arpeggio kept as a study option). Reuses the `ChordGlyph` serif display + `stamp-in` reveal — locked house reference.
**UI hint**: yes
**Plans**: 6 original plans executed + 2 gap-closure plans (verification gaps)

**Wave 1**

- [x] 16-01-PLAN.md — Audio + CSS primitives: playArpeggio, studyMode persistence, pulse-once keyframe

**Wave 2** *(blocked on Wave 1)*

- [x] 16-02-PLAN.md — PianoKeyboard pulseToken + pendingLetters
- [x] 16-03-PLAN.md — ChordGlyph stamped + pulseToken
- [x] 16-04-PLAN.md — /progress STUDY MODE toggle

**Wave 3** *(blocked on Wave 2)*

- [x] 16-05-PLAN.md — BuildSession core reveal: glyph + fire-once auto-play + synced pulse + Hear again (HEAR-01, sound-off pulse)

**Wave 4** *(blocked on Wave 3)*

- [x] 16-06-PLAN.md — BuildSession study-mode arpeggio roll (HEAR-02 study playback)

**Gap Closure** *(closes 3 verification gaps in the study-mode roll — HEAR-02)*

- [x] 16-07-PLAN.md — Fix playArpeggio: ascending voicing (scale roll) + startDelayMs option (audio sync)
- [x] 16-08-PLAN.md — Sync roll audio to visual un-dim + pending keyed by {letter, octave} (duplicate tonic)

### Phase 17: Chord Explainer

**Goal**: In a Recall review, a learner who does not know the prompted chord can pull escalating help in place — plain-English family → formula → notes on a keyboard → full spelling — without leaving the review, then still grade honestly.
**Depends on**: Phase 11 (RecallSession)
**Requirements**: HINT-01, HINT-02, HINT-03
**Success Criteria** (what must be TRUE):

  1. Every Recall card offers a "Need a hint?" affordance that reveals help one layer at a time, each tap escalating: plain-English chord quality, then the formula as interval-color chips, then the notes lit on a mini keyboard, then the full spelling.
  2. The learner can stop at any layer; the Again/Hard/Good/Easy grading row stays present and grading still commits after help is used.
  3. Hint copy is sourced from the existing hints/mnemonics layer and stays beginner-plain (no jargon dumps).

**Design reference**: `.planning/sketches/010-chord-explainer/` (winner Variant A: hint ladder; C dossier folded into the deepest layer)
**UI hint**: yes
**Plans**: 4 plans

**Wave 1**

- [x] 17-01-PLAN.md — Copy/derivation helpers: familyLineFor (3 triads) + formulaSentence (generated Layer 2 copy) [HINT-03]

**Wave 2** *(blocked on Wave 1)*

- [x] 17-02-PLAN.md — HintLadder.svelte: cumulative escalating hint-ladder component, adaptive 4/3-layer [HINT-01, HINT-03]

**Wave 3** *(blocked on Wave 2)*

- [x] 17-03-PLAN.md — Wire ladder into RecallSession: see-play (pre-answer) + formula-build + hintLayersFor helper [HINT-01, HINT-02]

**Wave 4** *(blocked on Wave 3)*

- [x] 17-04-PLAN.md — Wire ladder into hear-name (post-answer, timer cancel + Continue) + end-of-phase visual verify [HINT-01, HINT-02]

### Phase 18: Your Songs' Chords

**Goal**: Chords that appear in songs the user has added surface throughout the app with a provenance mark, and drills/recall can be filtered to just those chords, so app practice reinforces the exact chords the user must play at the piano.
**Depends on**: Phase 3 (drills), Phase 11 (recall)
**Requirements**: SONG-01, SONG-02, SONG-03
**Success Criteria** (what must be TRUE):

  1. Any chord that belongs to one of the user's added songs carries a consistent letterpress provenance mark (e.g. "In: Autumn Leaves") wherever it appears — a Drills prompt, a Recall card, and a Chord Lookup result.
  2. Drills and Recall expose a "From my songs" filter that restricts the practiced set to chords drawn from the user's songs; with it off the full library is practiced but song chords still show their mark.
  3. The song→chord provenance is derived from the songs stored on the /songs profile surface (single source of truth).

**Design reference**: `.planning/sketches/011-your-songs-chords/` (winner Variant A: provenance mark + filter)
**UI hint**: yes
**Plans**: 4/4 plans complete

**Wave 1**

- [x] 18-01-PLAN.md — Shared primitives: songProvenance module + SongMark tag + SongFilterToggle bar (SONG-01/02/03)

**Wave 2** *(blocked on Wave 1)*

- [x] 18-02-PLAN.md — Drills surface: SongMark in prompt + From my songs filter restricting the chord pool (SONG-01, SONG-02)
- [x] 18-03-PLAN.md — Recall surface: SongMark across modes (hear-name spoiler-safe) + filter restricting the review queue (SONG-01, SONG-02)
- [x] 18-04-PLAN.md — Chord Lookup: SongMark in the result header (SONG-01)

### Phase 19: Interactive Theory

**Goal**: A returning classical pianist with beginner theory can work through short, interactive, do-then-check lessons (starting with major vs. minor third) on a real keyboard, each ending with a clean handoff into the matching first drill.
**Depends on**: Phase 15 (playable keyboard), Phase 3 (drill handoff)
**Requirements**: LEARN-01, LEARN-02, LEARN-03
**Success Criteria** (what must be TRUE):

  1. A lesson runs as a vertical sequence of small steps that each pair one plain-English sentence with a keyboard action (tap the note a major third above C); a correct tap advances with confirmation, a wrong tap gives a gentle retry.
  2. Steps can play their interval/chord so the learner hears what they are building.
  3. Each lesson ends with an explicit "Try this in a drill" handoff into the beginner course on /drills.

**Design reference**: `.planning/sketches/012-interactive-theory/` (winner Variant A: guided steps; B lesson-map as the later container)
**UI hint**: yes
**Plans**: 4/4 plans complete

**Wave 1**

- [x] 19-01-PLAN.md — Thirds lesson data + chroma grading + drill-seed pair (pure module) (LEARN-01)
- [x] 19-02-PLAN.md — Drill-seed handoff plumbing: lesson-seeds channel + 'seeded_lesson' source + FROM YOUR LESSON tag (LEARN-03)

**Wave 2** *(blocked on Wave 1)*

- [x] 19-03-PLAN.md — InteractiveLesson.svelte: guided steps, chroma-graded taps, per-step audio, handoff card (LEARN-01, LEARN-02, LEARN-03)

**Wave 3** *(blocked on Wave 2)*

- [x] 19-04-PLAN.md — /theory integration: interactive lesson as the first section, static lessons intact (LEARN-01)

### Phase 20: French Translation

**Goal**: The entire UI can switch to French via a header EN|FR toggle backed by a real i18n layer, while chord symbols stay language-neutral and no Print Shop surface overflows.
**Depends on**: Phases 15-19 (translate their copy once the surfaces are stable)
**Requirements**: I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):

  1. An EN|FR toggle in the page header switches all UI copy to correct French and persists the choice; chord symbols and the serif chord glyph never translate.
  2. An i18n layer holds every user-facing string as a keyed translation (English + French), replacing the loose inline strings.
  3. The tight Print Shop surfaces audited in sketch 013 (mono register labels, grading buttons, nav) render French without overflow — long terms are abbreviated or their slots widened per the audit.

**Design reference**: `.planning/sketches/013-french-fit-test/` (winner Variant A: header toggle; C stress-panel is the overflow audit)
**UI hint**: yes
**Plans**: 10/10 plans complete

**Wave 1**

- [x] 20-01-PLAN.md — i18n foundation: reactive locale store + t() + per-domain dictionaries + LocaleToggle + masthead nav flip (I18N-01/02)

**Wave 2** *(parallel: file-disjoint per-surface conversions, blocked on Wave 1)*

- [x] 20-02-PLAN.md — Recall surface: grades/modes/map + tight-surface fit (I18N-02/03)
- [x] 20-03-PLAN.md — Build surface: captions/steps/WHY, interval longFr seed (I18N-02)
- [x] 20-04-PLAN.md — Drills surface: prompts/feedback/CTAs + FROM YOUR LESSON tag (I18N-02)
- [x] 20-05-PLAN.md — Songs + Phase 18 shared song components (I18N-02)
- [x] 20-06-PLAN.md — Theory + Phase 19 interactive lesson (bilingual lesson data) (I18N-02)
- [x] 20-07-PLAN.md — Scales surface: drill + degree strip (I18N-02)
- [x] 20-08-PLAN.md — Progress + streak copy + masthead streak chip (I18N-02)
- [x] 20-09-PLAN.md — Lookup/home + shared reveal/inspect components + hints/mnemonics (I18N-02)

**Wave 3** *(blocked on Wave 2)*

- [x] 20-10-PLAN.md — French fit audit + cross-surface immunity/completeness gate + visual sign-off (I18N-01/02/03)

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
| 12. Build-it Construction | 6/6 | Complete    | 2026-07-15 |
| 13. Multi-modal Recall | 6/6 | Complete    | 2026-07-15 |
| 15. Playable Keyboard Everywhere | 7/7 | Complete    | 2026-07-15 |
| 16. Hear the Chord | 5/6 | In Progress|  |
| 17. Chord Explainer | 0/TBD | Pending | - |
| 18. Your Songs' Chords | 4/4 | Complete    | 2026-07-18 |
| 19. Interactive Theory | 4/4 | Complete    | 2026-07-18 |
| 20. French Translation | 10/10 | Complete    | 2026-07-18 |

### Phase 21: Drills Polish — prevent duplicate song selection; make practice-pool container discrete (desktop hover reveal) and persist its enabled state; replay played chord as a full chord for memorization

**Goal:** Polish the practice surfaces: adding a preset song can no longer create a duplicate; the /drills practice-pool filter bar recedes so it stops breaking immersion (discrete on desktop, revealing on hover/focus) while its on/off state keeps persisting; and after answering a chord the user can replay the full chord on demand to aid memorization.
**Requirements**: DPOL-01, DPOL-02, DPOL-03
**Depends on:** Phase 20

**Requirements delivered:**

- **DPOL-01** — Selecting a preset song already in the list does not create a duplicate; the already-added preset is marked and clicking it surfaces the existing song instead of saving a copy.
- **DPOL-02** — The /drills practice-pool (bassin de pratique) filter bar is visually discrete: it recedes during play and reveals on hover/focus on desktop, stays readable on touch, and its filter on/off state persists across sessions. Recall's use of the shared toggle is not broken.
- **DPOL-03** — In the /drills answer reveal, an on-demand control replays the full chord (chord questions, both directions), reusing the existing audio engine.

**Plans:** 1 plan

- [x] 21-01-PLAN.md — Prevent duplicate preset (DPOL-01), discrete /drills filter bar (DPOL-02), on-demand chord replay (DPOL-03)

### Phase 22: Installable PWA — add a service worker for offline app-shell caching, make the app installable on mobile (Android/Chrome + iOS add-to-home-screen polish), and surface a new-version update prompt

**Goal:** The app installs like a native app on the user's phone for one-tap access next to the piano: a service worker caches the app shell so it opens instantly and works offline, the install/add-to-home-screen experience is correct on Android and iOS, and a new deploy surfaces a gentle "update available" prompt instead of silently serving a stale cached build.
**Requirements**: PWA-01, PWA-02, PWA-03
**Depends on:** Phase 9 (deploy/HTTPS), Phase 21

**Requirements delivered:**

- **PWA-01** — A service worker precaches the built app shell + static assets on install, cleans stale caches on activate, and serves cache-first with network fallback so the app loads offline and instantly on repeat visits. Built on SvelteKit's native `$service-worker` module (no new runtime dependency).
- **PWA-02** — The app is installable on mobile: it meets Android/Chrome install criteria (manifest + active service worker over HTTPS) and the iOS add-to-home-screen presentation is correct (apple-mobile-web-app meta tags, title, status bar style, adequate apple-touch-icon). An in-app install affordance is optional.
- **PWA-03** — When a new version is deployed, the user gets an unobtrusive bilingual "update available, reload" prompt (service-worker update flow) rather than being stuck on a stale cached build.

**Plans:** 3 plans

- [x] 22-01-PLAN.md — Service worker + offline app-shell caching, samples excluded from install precache (PWA-01)
- [x] 22-02-PLAN.md — iOS add-to-home-screen meta tags + 180 apple-touch-icon + manifest installability guard (PWA-02)
- [x] 22-03-PLAN.md — Bilingual new-version update prompt with SW skipWaiting/reload flow (PWA-03)

### Phase 23: Phase-First UX for Phone — bottom tab bar nav (1A), Drills question-first reflow (1B), glanceable+actionable Progress (1C)

**Goal:** The app is phone-first where it matters most. Nav moves to a thumb-reachable bottom tab bar on phones (Lookup, Drills, Recall, Songs, More-sheet) with the top masthead slimmed to brand + streak; desktop keeps its full masthead. The Drills page puts the question first — LevelPicker/mode/song-filter fold into one compact strip, prompt sits directly under it, and keyboard + Check anchor in the thumb zone so no scroll per question. Progress becomes glanceable and actionable — a 7-day practiced strip on the streak hero, inline accuracy bars on weak-item rows and the All-Stats table, and a per-row DRILL button that seeds one item into /drills.
**Requirements**: UX-1A, UX-1B, UX-1C
**Depends on:** Phase 22
**Source spec:** `.planning/phases/23-phase-first-ux-for-phone-bottom-tab-bar-nav-1a-drills-questi/SOURCE-SPEC.md`
**Plans:** 4/4 plans complete

**Wave 1** *(parallel: disjoint file sets)*

- [x] 23-01-PLAN.md — 1B Drills question-first reflow: BottomSheet primitive + phone compact strip + grid reflow (UX-1B)
- [x] 23-02-PLAN.md — 1C server: GET /streak `last7` 7-day field + client StreakResult mirror + server tests (UX-1C)

**Wave 2** *(blocked on 23-02)*

- [x] 23-03-PLAN.md — 1C UI: 7-day streak strip + inline accuracy bars + per-row DRILL + "Drill all N" (UX-1C)

**Wave 3** *(blocked on 23-01: reuses BottomSheet; layout-wide)*

- [x] 23-04-PLAN.md — 1A bottom tab bar + slim phone header + safe-area bottom padding + masthead test split (UX-1A)

### Phase 24: Mobile UX fixes from issue #14 — review action dock (sketch 014-A), icon+micro-label tab bar for FR (sketch 015-B), lookup why-these-notes teaching panel with Am7/AM7 disambiguation (sketch 016 A+B)

**Goal:** Close the three GitHub issue #14 mobile-UX complaints using the Session 5 sketch winners. On phone, the Review (/recall) page gains a structural action dock (sketch 014-A) that pins Révéler + grade actions above the tab bar so the review loop is always completable without scrolling. The phone bottom tab bar shrinks to 56px with an icon + 9px micro-label per slot (sketch 015-B) so long French labels stop eating vertical space and the bar height is stable across FR/EN. The Lookup page gains input-time disambiguation chips for casing-ambiguous symbols (Am7 vs Amaj7) plus an expandable "Pourquoi ces notes ?" teaching panel on every result, with a folded minor-vs-major duo as the deepest content (sketch 016 A+B, C folded into A), turning the Am7/AM7 confusion into a teaching moment. (Issue #14's recall-hint wish reuses the already-shipped 010-A ladder and is out of this phase's scope.)
**Requirements**: none mapped (issue-#14 UX fixes; must-haves derived per-plan from the three sketch winners)
**Depends on:** Phase 23
**Plans:** 4/4 plans complete

**Wave 1** *(parallel: disjoint file sets)*

- [x] 24-01-PLAN.md — Review action dock: phone-only fixed dock above the tab bar hosting each review mode's primary advance action (sketch 014-A)
- [x] 24-02-PLAN.md — Icon + 9px micro-label bottom tab bar at 56px, stable FR/EN height, clearance token updated 64→56 (sketch 015-B)
- [x] 24-03-PLAN.md — Lookup casing-disambiguation chips + "Pourquoi ces notes ?" why-panel with folded m-vs-maj duo (sketch 016 A+B)
- [x] 24-04-PLAN.md — Gap closure (UAT Test 3): add `var(--spacing-md)` breathing room to shared `--tab-bar-clearance` so page bottoms (why-panel escape hatch) clear the tab bar at 390px

### Phase 25: Contextual learning from session 6 sketches — progression drill with earn-the-symbol lead sheet (sketch 017 synthesis), shell voicings with staged-by-card-state scaffold (sketch 019 synthesis), confidence calibration dots + progress payoff view (sketch 020-B)

**Goal:** A returning classical pianist can practice music in real context: naming and playing chords bar-by-bar through ii-V-I progressions on an earn-the-symbol lead sheet (symbols hidden until derived, then filled verdigris), learning shell voicings through help that fades with each chord's FSRS card maturity (meet → subtract → cold drill), and optionally rating pre-reveal confidence in Recall that feeds a calibration payoff view flagging over-confidence and the exact cards gotten wrong while feeling sure.
**Requirements**: none mapped (sketch-driven; must-haves derived per-plan from session-6 sketch winners 017/019/020-B)
**Depends on:** Phase 24
**Design reference:** `.claude/skills/sketch-findings-music-learn/references/contextual-learning-metacognition.md` (session 6 locked winners); `.planning/sketches/WRAP-UP-SUMMARY.md`
**Plans:** 3/8 plans executed

**Wave 1** *(parallel: disjoint file sets — four pure/primitive foundations)*

- [x] 25-01-PLAN.md — Pure progression engine (TDD): ii-V-I templates, roman numerals, per-bar symbols, same-key MC distractors, harmonic-function labels (sketch 017)
- [x] 25-02-PLAN.md — Pure shell-voicing engine (TDD): shell/rootless/full note subsets, droppable root+fifth markers, meet/subtract/drill staging from FSRS card state (sketch 019)
- [x] 25-03-PLAN.md — PianoKeyboard ghost-hatch optional-note prop (ghostKeys + R/5 markers), additive/byte-identical when omitted (sketch 019)
- [ ] 25-04-PLAN.md — Pure confidence log (TDD): capped localStorage review log + calibration/danger-card aggregation (sketch 020-B/020-C)

**Wave 2** *(blocked on Wave 1)*

- [ ] 25-05-PLAN.md — ProgressionDrill + /progressions route + nav + i18n: earn-the-symbol lead sheet, derive-then-play two-step (sketch 017) [depends 25-01]
- [ ] 25-06-PLAN.md — Recall confidence dots: optional ? ~ ! capture in RecallSession, never blocks Reveal, logs on grade (sketch 020-B) [depends 25-04]
- [ ] 25-08-PLAN.md — Progress calibration payoff view: 3-bar calibration chart + MISCALIBRATED flag + danger-cards drill CTA (sketch 020-C) [depends 25-04]

**Wave 3** *(blocked on Wave 2: shares +layout.svelte / i18n index / chrome nav with 25-05)*

- [ ] 25-07-PLAN.md — ShellVoicingDrill + /voicings route + nav + i18n: staged meet/subtract/drill by card maturity, ghost-hatch shell (sketch 019) [depends 25-02, 25-03, 25-05]
