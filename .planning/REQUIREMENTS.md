# Requirements — Music Learn (Jazz Piano Theory Companion)

**Defined:** 2026-07-12
**Core value:** See a jazz chord symbol and know instantly what to play with the left hand.

## v1 Requirements

### Theory Core

- [x] **THEORY-01**: User sees correct notes for any supported chord symbol — qualities: major, minor, diminished triads + maj7, m7, dom7, ø7 (m7♭5), °7 — across all 12 roots
- [x] **THEORY-02**: User can enter a chord symbol in any common jazz notation variant (Cm7, C-7, Cmin7; Cø7, Cm7♭5) and the app recognizes it as the same chord
- [x] **THEORY-03**: User sees correctly spelled notes (enharmonics derived from root + interval formula — F♯m7 shows C♯, not D♭)
- [x] **THEORY-04**: User sees every note labeled with letters primary (C, D, E) and solfège alongside (Do, Ré, Mi)

### Drills

- [x] **DRILL-01**: User can do construction drills — given a chord symbol, play/click the notes; any inversion or octave accepted as correct
- [x] **DRILL-02**: User can do identification drills — given highlighted notes on a keyboard, name the chord symbol
- [x] **DRILL-03**: User gets instant right/wrong feedback after each answer; wrong answers show the correct notes AND the interval formula in interval colors (elaborative feedback)
- [ ] **DRILL-04**: User can scope a practice session to chosen chord qualities and/or roots (e.g., only m7 chords this session)
- [ ] **DRILL-05**: Drill sessions interleave chord qualities by default (mixed practice), with scoped/blocked practice as the opt-in exception
- [ ] **DRILL-06**: Note labels (letters/solfège) fade progressively as the user's accuracy on each item grows — recognition scaffolds removed as recall develops

### Input

- [ ] **INPUT-01**: User can answer drills by playing on a connected MIDI digital piano (Web MIDI, Chromium browsers)
- [x] **INPUT-02**: User can answer drills on an on-screen clickable keyboard — fully equivalent input path, works on any browser/device
- [ ] **INPUT-03**: Both input methods produce identical drill behavior (same matching logic, same feedback)

### Chord Lookup Companion

- [x] **LOOK-01**: User can type a chord symbol and see its notes on a keyboard diagram with dual naming — fast enough to use mid-song at the piano

### Scales

- [ ] **SCALE-01**: User can drill major scales (spell/play the notes) across all 12 keys, expanding outward from G major
- [ ] **SCALE-02**: User sees standard piano fingerings for each major scale

### Lessons

- [ ] **LESSON-01**: User can read short lessons explaining chord symbol meanings (7, maj7, m7, ø, °, 9) with keyboard examples
- [ ] **LESSON-02**: User can read lessons on intervals and how chords are constructed from them, framed shape-first ("m7 = minor triad + minor 3rd on top") using the interval color language

### Design

- [x] **DESIGN-01**: App follows the "Print Shop" artistic direction — warm paper ground (#f2ecdd), ink (#221e17), vermilion accent (#c8502e), mustard (#f0c948), sharp corners, heavy 2px borders, offset-shadow buttons, misregistered print shadow on chord glyphs, serif chord symbols + monospace data labels (see `.planning/design/`)
- [x] **DESIGN-02**: Interval color language — root, 3rd, 5th, 7th each have a fixed color applied consistently across drills, lookup, and lessons (root=vermilion, 7th=mustard confirmed; 3rd/5th colors settled in UI design phase)

### Progress

- [x] **PROG-01**: User's drill answer history persists across sessions and devices (backend on user's Oracle server, SQLite storage)
- [ ] **PROG-02**: User can see per-chord/per-scale accuracy stats highlighting their weakest items
- [ ] **PROG-03**: User can see a daily practice streak counter

### Platform

- [ ] **PLAT-01**: User can access the app from laptop and phone (responsive layout, on-screen keyboard usable on mobile)
- [ ] **PLAT-02**: App is deployed on the user's Oracle server over HTTPS (required for Web MIDI)

## v2 Requirements

Deferred — becomes active once v1 is validated.

- **SRS-01**: Spaced repetition scheduling over drill items — deliberately deferred until 1–2 weeks of real answer history exists (research: don't overbuild scheduling before there's data; simple weighted scheme preferred over full SM-2/FSRS)
- **LOOK-02**: Left-hand voicing suggestions (shell voicings: 3rd + 7th) per looked-up chord — after basic lookup proves useful during real song practice
- **LOOK-03**: Equivalent symbol variants displayed alongside lookup results (Cm7 = C-7 = Cmin7) — parsing is v1 (THEORY-02); the educational display layer can follow
- **LESSON-03**: Lessons linked from drill feedback ("wrong — here's why")
- **SCALE-03**: Scale construction lessons (whole/half steps, key signatures, circle of fifths)
- **THEORY-05**: Extended chords — 9ths, sus, 6th chords, slash chords

## Out of Scope

- **Minor scales and modes** — defer until major scales are fluent (user's explicit choice)
- **Advanced jazz voicings (rootless, upper structures, altered)** — fundamentals first; revisit post-v1
- **Ear training / audio recognition** — different skill axis (aural vs visual→keyboard); dilutes v1 focus
- **Full sheet music / lead-sheet rendering and playback** — massive scope; iReal Pro already exists; this app translates symbols, not scores
- **Multi-user accounts / social features** — single-user personal tool; auth kept trivial or absent
- **Native mobile app** — responsive web covers the stated usage
- **Full SRS engine (FSRS/ML-tuned)** — single user won't generate enough review history to tune it; simple scheduling suffices when SRS lands

## Traceability

| Requirement | Phase |
|-------------|-------|
| THEORY-01 | Phase 1 |
| THEORY-02 | Phase 1 |
| THEORY-03 | Phase 1 |
| THEORY-04 | Phase 1 |
| DESIGN-01 | Phase 1 |
| DESIGN-02 | Phase 1 |
| LOOK-01 | Phase 2 |
| DRILL-01 | Phase 3 |
| DRILL-02 | Phase 3 |
| DRILL-03 | Phase 3 |
| INPUT-02 | Phase 3 |
| INPUT-01 | Phase 4 |
| INPUT-03 | Phase 4 |
| DRILL-04 | Phase 5 |
| DRILL-05 | Phase 5 |
| DRILL-06 | Phase 5 |
| SCALE-01 | Phase 6 |
| SCALE-02 | Phase 6 |
| LESSON-01 | Phase 7 |
| LESSON-02 | Phase 7 |
| PROG-01 | Phase 8 |
| PROG-02 | Phase 8 |
| PROG-03 | Phase 8 |
| PLAT-01 | Phase 9 |
| PLAT-02 | Phase 9 |

**Coverage:** 25/25 v1 requirements mapped, no orphans, no duplicates.

---
*Last updated: 2026-07-12 after roadmap creation*
