# Research Summary: Interactive Jazz Piano Theory Learning Web App

**Project:** Music Learn (Interactive jazz piano theory learning web app)
**Domain:** Interactive music-theory education; Web MIDI + spaced repetition practice tool
**Researched:** 2026-07-12
**Confidence:** HIGH (core technologies verified against official sources; architecture patterns well-established in music-education apps; pitfalls grounded in real Web MIDI/music-notation gotchas)

## Executive Summary

This project synthesizes four proven patterns (chord-symbol drilling, MIDI-graded input, spaced repetition, and lookup-companion reference tool) into a single lightweight, single-user web app focused on jazz piano chord-symbol fluency. Experts in music-theory education converge on a clean architecture: a pure theory core at the center (note naming, chord/scale definitions, symbol parsing) surrounded by input adapters (MIDI, on-screen keyboard) and stateless feature consumers (drills, lookup companion, lessons). The recommended stack (SvelteKit + tonal.js + ts-fsrs + Web MIDI) is minimal, lightweight, and costs nothing to host—perfectly suited to a quick-start personal practice tool.

The highest-impact risks are not technical novelty but discipline and notation correctness: chord-symbol parsing must handle real-world ambiguity (multiple valid spellings per quality), enharmonic spelling logic must preserve letter-name uniqueness within chords (not just flatten everything to a pitch-class array), and MIDI note-matching must allow for natural voicing/octave variation while remaining strict about note accuracy. These are discovered problems from similar music-education projects and are expensive to fix late. Building these foundations correctly early eliminates cascading complexity downstream.

The roadmap should follow a dependency-driven sequence: theory core first (everything depends on it), then parallel development of input adapters and a simple reference tool to validate the theory core end-to-end, then the drill engine, then spaced-repetition scheduling, with lesson content and polish last. This order keeps the riskiest assumptions (music-theory correctness and MIDI integration) testable in isolation early, and prevents the lesson-content treadmill from competing with core functionality.

## Key Findings

### Recommended Stack

SvelteKit 2.69.x is the recommended framework: it's a compiler-based framework that ships 40-60% less JavaScript than React for the same UI (critical for a quick-start habit app), produces fully static builds deployable for free, and has excellent TypeScript support. Pin TypeScript to ^6.0 (not 7.0 latest) until SvelteKit's tooling officially supports the new Go compiler. 

**Core technologies:**
- **SvelteKit 2.69.x (Svelte 5.56.x)**: App framework, routing, static builds — lightweight baseline for a single-user, mostly-client app with no backend needs
- **tonal 6.4.3**: Pure music-theory engine — chord/scale definitions, symbol parsing with built-in jazz aliases (Δ, ø, °, sus4), interval math, enharmonic spelling. The only library purpose-built for exactly this problem domain
- **webmidi 3.1.16**: Web MIDI event wrapper — simpler than raw `navigator.requestMIDIAccess()`, handles note-on/note-off, channel abstraction, multi-device state management
- **Dexie.js 4.4.4**: IndexedDB wrapper for local persistence — review logs, spaced-repetition state, streaks. Far superior to localStorage's 5-10MB cap and synchronous API
- **ts-fsrs 5.4.1**: Modern spaced-repetition scheduler — FSRS is the state-of-the-art successor to old SM-2 (used by Anki). Note: v1 should use a simpler weighted-priority scheme instead; reserve FSRS for later if simple approach proves insufficient after real use
- **Tone.js 15.1.22** (optional for v1): Web Audio for feedback sounds — start with Synth (instant), upgrade to @tonejs/piano sampled sounds only if audio realism becomes important
- **Tailwind CSS 4.3.x**: Utility CSS for responsive UI (phone + laptop) — optional but speeds up building a clean, professional interface

**Development tools:**
- **Vitest 4.1.x** for unit tests (especially critical for the theory core, which is pure functions)
- **TypeScript 6.x** (pinned, not ^7.0) until SvelteKit's ecosystem catches up
- **ESLint + Prettier** for code quality

See STACK.md for installation instructions and alternatives considered. Key constraint: avoid react-piano (React-specific); build a small SVG-based on-screen keyboard in Svelte to avoid pulling in a full React runtime.

### Expected Features

**Must have for launch (table stakes):**
- Chord identification/construction drills with instant right/wrong feedback
- On-screen clickable keyboard input (required fallback for Safari/iOS, no Web MIDI)
- Web MIDI input support (Chromium) — key differentiator
- Chord lookup companion (symbol → notes + keyboard diagram)
- Major scale drills and basic theory lessons
- Dual note naming (letters primary, solfège alongside)
- Progress persistence across sessions
- Responsive layout (laptop + phone)

**Should have soon after (differentiators):**
- Spaced repetition tuned to weak chords/scales
- Streaks/progress view for habit formation
- Left-hand voicing suggestions

**Defer to v2+ (explicitly out of scope per PROJECT.md):**
- Minor scales and modes
- Advanced voicings (rootless, upper structures)
- Ear training / audio chord recognition
- Full lead-sheet rendering/playback
- Multi-user accounts, auth, billing

See FEATURES.md for detailed prioritization, feature dependencies, and competitor analysis.

### Architecture Approach

Music-theory apps converge on a proven pattern: a **pure, framework-free theory core** at the center surrounded by **input adapters** (MIDI, on-screen keyboard) that normalize to unified events, feeding a **drill/quiz engine** decoupled from persistence. Lessons and lookup are thin consumers of the same theory core—never re-implementing theory logic.

**Major components:**
1. **Theory core** (pure TypeScript, zero DOM/framework deps) — Note naming, intervals, scale/chord definitions, chord symbol parser, enharmonic spelling, solfège mapping. Single source of truth imported by drills, lookup, lessons
2. **Input adapters** — Normalize MIDI and on-screen keyboard to unified `NoteEvent` stream and `HeldNotesTracker` set for debouncing chords
3. **Drill engine** — Prompt generation, note-matching (pitch-class set equality, not exact MIDI matching), state machine, instant feedback
4. **Spaced-repetition scheduler** — Operates on opaque concept IDs with performance records. Start with simple weighted bucket/priority queue, not full SM-2/FSRS
5. **Persistence layer** — IndexedDB via Dexie. Abstracted behind interface so backend can be plugged in later for cross-device sync

Project structure: `src/theory/`, `src/input/`, `src/drills/`, `src/srs/`, `src/persistence/`, plus UI layers.

See ARCHITECTURE.md for detailed responsibilities, data flows, build order, and integration patterns.

### Critical Pitfalls

**1. Chord symbol parsing as simple lookup table instead of grammar**
Jazz symbols have multiple valid spellings per quality (Cm7/C-7/Cmin7, ø7/m7b5/m7♭5). Parser fails on real sheet music symbols if it only recognizes one spelling. Design as tokenizer + normalizer mapping all variants to canonical form. Test against real lead sheets. **Prevention: Phase building chord symbol lookup.**

**2. Wrong enharmonic spelling (D♯ vs E♭)**
MIDI only knows pitch numbers, not spelling. Pitch-class-indexed arrays teach wrong theory. Derive spelling from chord root + interval formula (one letter per scale degree). Preserve root spelling from user input. **Prevention: Foundational phase defining music-theory data model.**

**3. Chord-matching too strict or loose**
Too strict: rejects valid voicings. Too loose: accepts wrong chords. Solution: match on pitch-class set equality (ignore octave/order/duplicates). Decide per drill type on subset tolerance. Handle sustain pedal separately. **Prevention: Phase implementing MIDI drill answer-checking—explicit design decision before coding.**

**4. Assuming Web MIDI "just works" without fallback**
Safari/iOS have zero Web MIDI. Chrome 124+ gates behind permission. Firefox requires add-on install. On-screen keyboard isn't fallback—it's primary input for phone. Build both paths in parallel with same interface. Test on Safari/iOS (verify fallback), fresh Chrome profile (permission flow). **Prevention: Early phase building drill input; design MIDI and on-screen keyboard as same interface.**

**5. MIDI note-numbering using wrong octave convention**
MIDI 60 is "a C" but octave label differs by convention (middle C = C4 scientific vs C3 in some DAWs). Copy-pasted formulas lead to inconsistent labels. Pick scientific notation (middle C = C4), centralize conversion in one utility, document choice. **Prevention: Early phase building core MIDI utility layer.**

**6. Overengineering spaced-repetition before validating drill loop**
SM-2 "ease hell" and FSRS over-tuning risk small, structured pool (dozens items × 12 roots). Build simple weighted bucket/priority queue first. Persist raw performance history (cheap to swap algorithms later). Only reach for SM-2/FSRS if simple approach proves insufficient. **Prevention: Phase implementing "smart practice"—explicitly scope to simple weighted scheme.**

**7. Lesson content treadmill—content growing without bound**
Theory gaps surface constantly ("I also don't understand augmented chords"). Without firm boundary, lesson-writing competes indefinitely with core development. Hold PROJECT.md Out of Scope line explicitly; capture gaps as backlog, not mid-phase additions. Scope lessons exactly to drillable items. **Prevention: Scope guard at each phase transition.**

**8. Gamification doesn't sustain single-user engagement**
Streaks/badges don't reliably engage single self-motivated learner. Retention risk is friction (time-to-first-drill), not lack of reward. Prioritize quick-start UX over elaborate mechanics. Keep progress display simple and honest. **Prevention: Phase designing drill flow—bake "start in one tap" into UX spec early.**

## Implications for Roadmap

### Suggested Phase Structure

**Phase 1: Foundation — Music Theory Core + Data Model**
- **Rationale:** Everything depends on this. Unit-testable in isolation without UI/MIDI. Addresses Pitfalls 1, 2, 5 early
- **Delivers:** Note naming (letters + solfège), intervals, scale/chord definitions, chord symbol parser (jazz aliases + slash chords), enharmonic spelling, voicing suggestions
- **Addresses:** Chord data model, dual note naming, theory explainability
- **Avoids:** Pitfalls 1 (rigid parsing), 2 (wrong spelling), 5 (octave drift)
- **Scope:** Test against real lead sheets; verify one-letter-per-scale-degree spelling for all v1 qualities

**Phase 2: Input Layer + On-Screen Keyboard (Parallel)**
- **Rationale:** On-screen keyboard is primary input for phone/Safari (explicitly in scope). Validates theory core end-to-end before MIDI. Establishes `NoteEvent`/`HeldNotesTracker` abstraction MIDI plugs into
- **Delivers:** SVG keyboard UI (Svelte), click/touch handling, normalized NoteEvent adapter, held-notes tracker
- **Addresses:** On-screen keyboard input, responsive layout foundation
- **Avoids:** Pitfall 4 (Web MIDI fallback), Pitfall 8 (time-to-first-drill)
- **Scope:** 3-4 octaves for common voicings; reuse keyboard in lookup and drill feedback

**Phase 3: Chord Lookup Companion**
- **Rationale:** Simplest theory-core consumer (read-only, no scoring). Validates theory end-to-end before complex drill engine. Demonstrates "lookup while playing" use case
- **Delivers:** Symbol input → theory-core parsing → notes + keyboard diagram + voicing suggestions
- **Addresses:** Chord lookup companion, theory reference
- **Uses:** Theory core (Phase 1), keyboard UI (Phase 2)
- **Scope:** Support slash chords (Dm7/G) in v1

**Phase 4: Drill Engine (Core Practice Loop)**
- **Rationale:** Build stateless drill loop (prompt, matching, verdict, feedback) without scheduling. Validates core learning loop before SRS complexity
- **Delivers:** Chord/scale prompt generation, note-matching (pitch-class set equality), pass/fail verdict with detailed feedback, drill state machine
- **Addresses:** Chord ID/construction drills, MIDI-graded drills (both input paths), instant feedback, basic session tracking
- **Uses:** Theory core, input adapters, on-screen keyboard
- **Avoids:** Pitfall 3 (matching tolerance), Pitfall 4 (input path equivalence)
- **Scope:** Test staggered note entry and sustain-pedal; verify same chord validates in 3+ voicings

**Phase 5: Web MIDI Input Adapter**
- **Rationale:** Plugs into input abstraction (Phase 2). Adds key differentiator (MIDI on piano) after drills proven with on-screen input
- **Delivers:** MIDI device access/selection, note-on/off parsing, device state change handling, browser-specific permission/error UI
- **Addresses:** Web MIDI support, device state management
- **Uses:** Input adapter interface, held-notes tracker, drill engine
- **Avoids:** Pitfall 4 (explicit handling of unsupported/permission/denied states)
- **Scope:** Test Chrome (permission prompt), Firefox (add-on), Safari/iOS (fallback triggers)

**Phase 6: Spaced Repetition + Persistence Layer**
- **Rationale:** Layers scheduling and cross-session state on proven drill loop. Decoupled enough to run parallel with Phase 5
- **Delivers:** Per-concept performance record CRUD (IndexedDB/Dexie), simple weighted-priority scheduler, SRS-drill integration
- **Addresses:** Spaced repetition for weak chords, cross-session persistence
- **Uses:** Drill engine, theory core
- **Avoids:** Pitfall 6 (keep simple for single-user dataset)
- **Scope:** Weighted bucket system (not SM-2/FSRS v1). Persist raw history for future scheduler swaps

**Phase 7: Theory Lessons + Major Scale Drills**
- **Rationale:** Content explaining symbols and major scales. Lowest technical risk. Can run parallel with Phase 6 or defer slightly
- **Delivers:** Lesson content (symbol meanings, scale construction, spelling importance), interactive theory-core widgets, 12-root scale drills, fingering diagrams
- **Addresses:** Theory lessons, major scale drills, dual note naming context
- **Avoids:** Pitfall 7 (content treadmill; scope exactly to drillable items)
- **Scope:** Lessons linkable from drill feedback (optional), not mandatory

**Phase 8: Progress Dashboard + Habit Features (v1.x)**
- **Rationale:** Builds on stable foundation. Visualizes SRS progress and reinforces daily habits
- **Delivers:** Streak counter, per-chord mastery indicator, calendar heatmap, stats dashboard
- **Addresses:** Streaks/progress view
- **Avoids:** Pitfall 8 (simple/honest display; no badges/levels; prioritize quick-start)
- **Scope:** Only after "start drill in one tap" is achieved

### Phase Ordering Rationale

1. **Theory core first** — foundation, isolatable from UI/MIDI, highest-leverage testing
2. **Input adapters parallel** — establish abstraction; on-screen proves drill loop works without hardware
3. **Lookup companion** — simplest end-to-end validation of theory core
4. **Drill engine** — core learning loop without scheduling
5. **MIDI adapter** — key differentiator after drill proven; plugs into established interface
6. **SRS + persistence** — scheduling on proven drill loop; can run parallel with MIDI
7. **Lessons + scales** — low-risk but unbounded; comes after core features stable
8. **Dashboard + polish** — builds on stable foundation; lowest priority for validation

Keeps riskiest assumptions (theory correctness, MIDI integration, note-matching) testable early in isolation. Prevents feature dependencies from blocking fundamental work. Prevents lesson treadmill from competing with core.

### Research Flags

**Phases needing research during planning:**
- **Phase 1 (Theory Core):** Test `tonal` library chord-spelling logic against edge cases (F♯ø7 vs G♭ø7, C♯m7 vs D♭m7) to confirm jazz convention compliance. Small spike, low risk
- **Phase 4 (Drill Engine):** Explicit chord-matching rules before coding (exact set equality vs subset tolerance, extra-note handling, sustain-pedal behavior). Needs design documentation
- **Phase 5 (Web MIDI):** Cross-browser permission flow and device state change handling. Test Chrome/Firefox/Safari and actual MIDI hot-plug scenarios

**Phases with standard patterns (skip research-phase):**
- **Phase 2 (On-screen Keyboard):** SVG/Canvas keyboard rendering well-documented
- **Phase 3 (Chord Lookup):** Standard function-call → render pattern
- **Phase 6 (Persistence):** IndexedDB/Dexie proven for music-education apps
- **Phase 7 (Lessons):** Static content + interactive widgets is standard pattern
- **Phase 8 (Dashboard):** Simple stats visualization, no novel challenges

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Libraries verified against npm + official docs. SvelteKit choice based on aggregated 2026 commentary (bundle size, static builds proven). TypeScript 7.0 gap verified against Microsoft devblog and SvelteKit discussions |
| **Features** | MEDIUM | Landscape surveyed across 8+ music-theory apps. No single authority source but cross-checked across competitors. Scope derived from PROJECT.md constraints (single user, phone, major scales) |
| **Architecture** | HIGH | Component patterns, pure-core, adapters, SRS decoupling standard across music-education apps (6+ sources). Data flow and build order derived from architecture literature patterns |
| **Pitfalls** | HIGH | Pitfalls 1-5 verified against Web MIDI API (MDN, Chrome devblog, community code). Pitfall 6 validated by Anki docs. Pitfalls 7-8 from music-ed UX research and solo-dev logistics (3+ scope-creep sources). All grounded in real music-education gotchas |

**Overall confidence: HIGH** — core findings (technologies, features, architecture, pitfalls) verified against official sources or established patterns from similar projects. Main uncertainty is validation during real-world use—research can only establish "what" and "how," not "does it sustain daily practice for this user."

### Gaps to Address

- **Enharmonic spelling edge cases in tonal.js:** Recommend spike during Phase 1 planning to verify `tonal` matches jazz spelling conventions for all v1 roots (F♯ø7, C♯m7 especially). Small, low-risk
- **Exact chord-matching tolerance criteria:** Document explicit test cases before Phase 4 (e.g., "Dm7 with doubled root as D3-F3-A3-C4-D5 should pass; with extra E5 should fail with specific feedback")
- **User preference for simple vs. advanced SRS:** Single-user signal comes only from real practice. Phase 6 should plan v1.1 reassessment after 2-4 weeks to decide if weighted-bucket is sufficient or SM-2/FSRS needed
- **Cross-device progress sync:** Research confirms iOS/Safari lack Web MIDI. On-screen keyboard fallback is in scope. Per-device progress isolation is a feature boundary (not bug) for v1; defer multi-device sync to explicit later requirement

## Sources

All research files are primary sources:
- `.planning/research/STACK.md` — Technology verification against npm, official docs, 2026 community commentary
- `.planning/research/FEATURES.md` — Feature landscape (8+ existing apps), feature dependencies, scope from PROJECT.md
- `.planning/research/ARCHITECTURE.md` — Architecture patterns, component boundaries, data flows, build order from music-education app literature
- `.planning/research/PITFALLS.md` — Pitfalls verified against Web MIDI API docs, music notation standards, real music-education gotchas

All secondary sources (npm packages, MDN, official docs, community implementations) cited in detail in respective research files.

---
*Research synthesis completed: 2026-07-12*
*Ready for roadmap creation: yes*
