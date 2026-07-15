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
- [x] **PROG-02**: User can see per-chord/per-scale accuracy stats highlighting their weakest items
- [x] **PROG-03**: User can see a daily practice streak counter

### Platform

- [x] **PLAT-01**: User can access the app from laptop and phone (responsive layout, on-screen keyboard usable on mobile)
- [ ] **PLAT-02**: App is deployed on the user's Oracle server over HTTPS (required for Web MIDI)

## v2.0 Milestone Requirements — Learning Upgrade (active)

Grounded in validated spikes 006-009 (`.planning/spikes/MANIFEST.md` Session 2, `.claude/skills/spike-findings-music-learn/`). Cross-cutting locked constraints: grade notes by chroma/MIDI never letter strings; render tonal's own spelling; local-first persistence (localStorage then Dexie); no em dashes in copy.

### Memorization Engine

- [x] **MEM-01**: User runs a recall session that surfaces the theory facts due today (chord formulas, interval sizes, scale degrees), scheduled by spaced repetition (FSRS)
- [x] **MEM-02**: User reveals then grades each fact (Again/Hard/Good/Easy) and the item reschedules at a growing day-scale interval (a lapse shortens it); each grade button shows the interval it will schedule
- [x] **MEM-03**: Recall scheduling state persists across sessions and reloads on the same device, with a card per (fact, mode)
- [x] **MEM-04**: User sees which facts are due, mastered, or weak across modes (recall map)

### Build-it Construction

- [x] **BUILD-01**: User builds a chord from its symbol by tapping notes on a keyboard one interval at a time (stack a minor 3rd, a major 3rd...), earning each note instead of reading a finished list
- [x] **BUILD-02**: User builds a scale the same way, following its whole/half step pattern and closing on the octave
- [x] **BUILD-03**: Each construction step shows a plain-English interval instruction and why that note belongs; wrong taps give diagnostic feedback (e.g. "N half steps too high"); enharmonic spelling is taught and grading is by pitch class
- [x] **BUILD-04**: Construction accuracy feeds the memorization engine as gradeable events (Build-it is the formula mode of a fact)

### Multi-modal Recall

- [x] **RECALL-01**: User drills one chord across rotating modes: see the symbol then play the notes; given the formula/degrees then build it; hear the chord then name it
- [x] **RECALL-02**: Ear-based naming is answered by multiple choice against same-root distractors and never gates progress or unlocks
- [x] **RECALL-03**: Modes rotate per-fact when teaching a new item and are spaced across sessions when reviewing a known one

### Scale Practice

- [x] **SCALE-04**: User practices a scale by playing it ascending and descending on a movable piano keyboard whose leftmost key is the tonic, graded by pitch class, ending on the octave
- [x] **SCALE-05**: The confusing degree-ladder Practice surface is replaced by the keyboard drill; the Explore surface (degree strip + interval inspect) stays

## v2.1 Milestone Requirements — Playability & Comprehension (active)

Grounded in Session 4 sketches 008–013 (`.planning/sketches/MANIFEST.md`). Locked house reference: reuse the `ChordGlyph` serif display + `stamp-in` reveal for every chord reveal. Same cross-cutting constraints as v2.0 (grade by chroma, tonal's spelling, local-first, no em dashes).

### Playable Keyboard Everywhere

- [ ] **KBD-01**: Every keyboard-bearing page (Lookup, /drills, /recall, /scales, /theory) shows a keyboard whose keys sound on tap through the existing audio engine, honoring the persisted sound toggle
- [ ] **KBD-02**: The keyboard is docked to the bottom of the viewport, thumb-reachable on phone with content scrolling above it, and collapses/expands via a handle whose state persists
- [ ] **KBD-03**: Free exploration on the docked keyboard never corrupts the active drill/recall answer input — exploration and answering stay distinguishable

### Hear the Chord

- [ ] **HEAR-01**: On the BUILD reveal the correct chord auto-plays via `playChord` the instant the answer stamps in, with the lit keys and serif glyph pulsing once in time; a "Hear again" control replays
- [ ] **HEAR-02**: With sound off the reveal still runs the visual pulse (no dead-end); an optional roll-then-block "study" playback (arpeggiate root→3rd→5th→7th, each key lighting) is available as a toggle

### Chord Explainer

- [ ] **HINT-01**: Every Recall card offers a "Need a hint?" affordance that escalates one layer per tap: plain-English quality → formula chips → notes on a mini keyboard → full spelling
- [ ] **HINT-02**: The learner can stop at any layer; the Again/Hard/Good/Easy grading row stays present and grading still commits after help is used
- [ ] **HINT-03**: Hint copy comes from the existing hints/mnemonics layer and stays beginner-plain

### Your Songs' Chords

- [ ] **SONG-01**: Any chord in one of the user's added songs carries a consistent provenance mark wherever it appears (Drills prompt, Recall card, Chord Lookup result)
- [ ] **SONG-02**: Drills and Recall expose a "From my songs" filter restricting the practiced set to song chords; with it off the full library shows but song chords keep their mark
- [ ] **SONG-03**: Provenance is derived from the songs stored on the /songs profile surface (single source of truth)

### Interactive Theory

- [ ] **LEARN-01**: A lesson runs as a vertical sequence of small do-then-check steps pairing a plain-English sentence with a keyboard action; correct advances with confirmation, wrong gives a gentle retry
- [ ] **LEARN-02**: Steps can play their interval/chord so the learner hears what they build
- [ ] **LEARN-03**: Each lesson ends with an explicit "Try this in a drill" handoff into the beginner course on /drills

### French Translation

- [ ] **I18N-01**: A header EN|FR toggle switches all UI copy to correct French and persists the choice; chord symbols and the serif glyph never translate
- [ ] **I18N-02**: An i18n layer holds every user-facing string as a keyed EN/FR translation, replacing loose inline strings
- [ ] **I18N-03**: The tight Print Shop surfaces audited in sketch 013 (mono register labels, grading buttons, nav) render French without overflow

## Future Requirements

Deferred beyond v2.0.

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
- **ML-tuned / weight-optimized FSRS** — spike 006 validated ts-fsrs with its DEFAULT weights as the right backbone (not a hand-rolled scheduler); optimizing the weight vector against personal review history stays out of scope (single user won't generate enough data, and defaults schedule well). The scheduler itself is now IN scope as MEM-01..04.
- **MIDI Play-to-Answer (old Phase 4)** — deferred: needs the digital piano connected during build/verify; revisit as its own milestone when hardware-in-the-loop testing is set up

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
| SCALE-04 | Phase 10 |
| SCALE-05 | Phase 10 |
| MEM-01 | Phase 11 |
| MEM-02 | Phase 11 |
| MEM-03 | Phase 11 |
| MEM-04 | Phase 11 |
| BUILD-01 | Phase 12 |
| BUILD-02 | Phase 12 |
| BUILD-03 | Phase 12 |
| BUILD-04 | Phase 12 |
| RECALL-01 | Phase 13 |
| RECALL-02 | Phase 13 |
| RECALL-03 | Phase 13 |
| KBD-01 | Phase 15 |
| KBD-02 | Phase 15 |
| KBD-03 | Phase 15 |
| HEAR-01 | Phase 16 |
| HEAR-02 | Phase 16 |
| HINT-01 | Phase 17 |
| HINT-02 | Phase 17 |
| HINT-03 | Phase 17 |
| SONG-01 | Phase 18 |
| SONG-02 | Phase 18 |
| SONG-03 | Phase 18 |
| LEARN-01 | Phase 19 |
| LEARN-02 | Phase 19 |
| LEARN-03 | Phase 19 |
| I18N-01 | Phase 20 |
| I18N-02 | Phase 20 |
| I18N-03 | Phase 20 |

**Coverage:** 25/25 v1 requirements mapped (Phases 1-9). v2.0 Learning Upgrade: 13/13 requirements mapped (Phases 10-13), no orphans, no duplicates. Old Phases 4-7 retain their original v1 mappings and are deferred/superseded (see ROADMAP.md); no v2.0 requirement is mapped onto Phases 4-7.

---
*Last updated: 2026-07-14 — mapped v2.0 Learning Upgrade requirements to Phases 10-13 (Scale Keyboard Drill, Memorization Engine, Build-it Construction, Multi-modal Recall)*
