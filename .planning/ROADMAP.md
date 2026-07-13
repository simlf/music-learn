# Roadmap: Music Learn — Jazz Piano Theory Companion

## Overview

Music Learn takes a returning classical pianist from "I freeze when I see `F♯ø7` in the sheet music" to "I know instantly what my left hand plays." The journey starts by establishing the design identity and a correct music-theory core (the single source of truth for notes, spelling, and dual naming), then delivers the first usable end-to-end capability — a chord lookup companion you can put next to the piano. From there each phase adds a complete user capability: on-screen practice drills, MIDI play-to-answer, learning-science drill design (interleaving, fading scaffolds, elaborative feedback), major scales, theory lessons, cross-device progress persistence with a weakness-aware stats view and streak, and finally deployment on the user's Oracle server over HTTPS. Every phase is a vertical slice that the user can actually try, keeping music-theory correctness and MIDI integration — the riskiest assumptions — testable early.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Print Shop Foundation & Theory Core** - Design identity + correct chord/spelling/dual-naming engine, testable in isolation (completed 2026-07-12)
- [x] **Phase 2: Chord Lookup Companion** - Type a symbol, see notes on a colored keyboard diagram next to the piano (completed 2026-07-12)
- [x] **Phase 3: On-Screen Drill Loop** - Construction & identification drills with instant elaborative feedback on the clickable keyboard (completed 2026-07-13)
- [ ] **Phase 4: MIDI Play-to-Answer** - Answer the same drills by playing the connected digital piano
- [ ] **Phase 5: Smart Drill Design** - Interleaved sessions, scoped practice, and fading label scaffolds
- [ ] **Phase 6: Major Scales** - Drill and see fingerings for all 12 major scales, expanding from G major
- [ ] **Phase 7: Theory Lessons** - Short shape-first lessons explaining what the symbols mean
- [ ] **Phase 8: Progress & Streaks** - Cross-device answer history, weakness-aware stats, and a daily streak
- [ ] **Phase 9: Deploy to the Piano** - Live on the Oracle server over HTTPS, usable on laptop and phone

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

**Plans**: 4 plans

**Wave 1**

- [ ] 08-01-PLAN.md — Backend persistence service (server half of PROG-01): SQLite answers table + POST /answers + bearer auth + /health, integration-tested (D-01/D-02/D-03)

**Wave 2** *(blocked on Wave 1)*

- [ ] 08-02-PLAN.md — Client wiring + docker compose: fire-and-forget recordAnswer + offline queue, drills hook, Dockerfile/compose/.env.example — completes PROG-01 end to end (D-04)

**Wave 3** *(blocked on Wave 2)*

- [ ] 08-03-PLAN.md — Stats slice (PROG-02): GET /stats + computeStats, PracticeItemRow/AccuracyTable, Progress page (loading/empty/error/populated) + nav link

**Wave 4** *(blocked on Wave 3: shares progress page, layout, server index)*

- [ ] 08-04-PLAN.md — Streak slice (PROG-03): GET /streak + computeStreak, streak copy pools, StreakBadge, Progress streak hero + masthead chip

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

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Print Shop Foundation & Theory Core | 4/4 | Complete    | 2026-07-12 |
| 2. Chord Lookup Companion | 3/3 | Complete    | 2026-07-12 |
| 3. On-Screen Drill Loop | 4/4 | Complete   | 2026-07-13 |
| 4. MIDI Play-to-Answer | 0/TBD | Not started | - |
| 5. Smart Drill Design | 0/TBD | Not started | - |
| 6. Major Scales | 0/TBD | Not started | - |
| 7. Theory Lessons | 0/TBD | Not started | - |
| 8. Progress & Streaks | 0/4 | Planned | - |
| 9. Deploy to the Piano | 0/TBD | Not started | - |
