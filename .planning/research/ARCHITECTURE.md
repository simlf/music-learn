# Architecture Research

**Domain:** Interactive music-theory learning web app (jazz piano chord/scale drills, single-user)
**Researched:** 2026-07-12
**Confidence:** HIGH

## Standard Architecture

Interactive music-theory apps (Skoove, Yousician, Tenuto/theory apps, Noteflight's practice modes, flashcard-style ear/theory trainers) converge on the same shape: a **pure, framework-free music theory engine** at the center, surrounded by **input adapters** (MIDI, on-screen keyboard, keyboard/mouse) that normalize different input sources into one internal event shape, feeding a **drill/quiz engine** that is itself decoupled from the theory engine and from persistence. Lessons and a "lookup companion" are thin consumers of the same theory core — they never re-implement theory logic.

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER (adapters)                       │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐     │
│  │  Web MIDI      │  │  On-screen      │  │  (future: audio/    │     │
│  │  adapter       │  │  keyboard UI    │  │   mic pitch detect) │     │
│  │  (navigator.   │  │  (click/tap →   │  │                     │     │
│  │  requestMIDI-  │  │  note events)   │  │                     │     │
│  │  Access)       │  │                 │  │                     │     │
│  └───────┬────────┘  └────────┬───────┘  └──────────┬───────────┘     │
│          └───────────────────┬┴──────────────────────┘                │
│                    normalized NoteEvent stream                        │
│                (midi note number, on/off, velocity, ts)               │
├─────────────────────────────┬─────────────────────────────────────────┤
│                    THEORY CORE (pure, framework-free)                 │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │  note-naming · intervals · scale definitions · chord         │      │
│  │  definitions/spelling · chord symbol parser · enharmonic     │      │
│  │  spelling rules · solfège↔letter mapping                     │      │
│  │  (pure functions/data, zero DOM, zero framework deps)         │      │
│  └───────────────┬───────────────────────────┬───────────────────┘      │
├──────────────────┴───────────────────────────┴─────────────────────────┤
│         APPLICATION LAYER (features, all built ON theory core)         │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ Drill Engine │ │ Lesson       │ │ Chord Lookup  │ │ Progress /    │  │
│  │ (prompt gen, │ │ Content      │ │ Companion     │ │ Spaced-Rep    │  │
│  │ note-match   │ │ System       │ │ (symbol→      │ │ Scheduler     │  │
│  │ verdict)     │ │ (MDX/JSON    │ │ notes+diagram │ │ (SM-2 style)  │  │
│  │              │ │ lessons)     │ │ +voicing)     │ │               │  │
│  └──────┬───────┘ └──────┬───────┘ └───────┬───────┘ └───────┬───────┘  │
├─────────┴────────────────┴────────────────┴─────────────────┴──────────┤
│                          PRESENTATION LAYER (UI)                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐               │
│  │ Piano      │ │ Drill      │ │ Lesson     │ │ Progress   │               │
│  │ Keyboard   │ │ Screen     │ │ Reader     │ │ Dashboard  │               │
│  │ (SVG/Canvas│ │ (question, │ │ (theory    │ │ (streaks,  │               │
│  │ component) │ │ feedback)  │ │ pages)     │ │ mastery)   │               │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘               │
├──────────────────────────────────────────────────────────────────────────┤
│                       PERSISTENCE LAYER (single user)                    │
│  ┌────────────────────┐  ┌────────────────────────────────────────┐     │
│  │ Local-first store   │  │ Optional sync (e.g., IndexedDB → cloud │     │
│  │ (IndexedDB/localStorage) │ KV/Postgres for cross-device access) │     │
│  └────────────────────┘  └────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| MIDI input adapter | Requests MIDI access, listens to `midimessage`, parses note-on/note-off/velocity, emits normalized `NoteEvent`s, tracks currently-held-notes set | Raw `navigator.requestMIDIAccess()` + manual parsing, or `webmidi.js` for ergonomics (event names, channel abstraction) |
| On-screen keyboard adapter | Renders a clickable/tappable keyboard, converts DOM pointer events into the same `NoteEvent` shape as MIDI, supports "held note" state for chords (mousedown/up, touch) | SVG or Canvas component; must debounce mobile touch and support multi-touch for chords |
| Theory core | Single source of truth for: note↔MIDI-number mapping, interval math, scale/chord definitions, chord symbol parsing (`Cm7`, `F♯ø7`, `G7♭9`), enharmonic spelling, letter↔solfège mapping | Pure TypeScript module(s), zero UI/framework imports, fully unit-testable, exported as a standalone package/folder so lessons, drills, and lookup all import from it |
| Drill engine | Generates prompts (which chord/scale to play, which direction: "play X" vs "name these notes"), collects the currently-held-note set from input layer, compares against theory-core-computed expected note set, emits pass/fail verdict + which notes were wrong | State machine (idle → prompted → listening → verdict → next); framework-agnostic core with thin UI binding |
| Chord lookup companion | Given a typed/selected chord symbol, calls theory-core parser + chord-spelling function, renders notes, keyboard diagram, and left-hand voicing suggestion(s); read-only, no verdict/scoring | Thin UI component + theory-core calls; can reuse the same keyboard-diagram component the drill engine uses |
| Lesson content system | Stores/renders theory explanations (intervals, chord construction, symbol meanings); may embed interactive theory-core-powered widgets (e.g., "click an interval to hear/see it") | MDX or structured JSON/Markdown content, statically bundled; interactive widgets call theory core directly, same as drills |
| Spaced-repetition scheduler | Tracks per-item (chord type, scale, or symbol) performance history; computes next-due date and priority ordering; selects what the drill engine should prompt next | SM-2-derived algorithm (ease factor, interval, repetitions) keyed by "concept ID" (e.g., `chord:m7`, `scale:Fmajor`), stored per user |
| Progress/persistence layer | Stores spaced-repetition state, session history, streaks, settings (letters vs solfège display) | IndexedDB (or `localStorage` for MVP) as local-first store; optional lightweight backend (SQLite/Postgres via a serverless function) if cross-device sync is desired beyond browser storage |

## Recommended Project Structure

```
src/
├── theory/                    # Pure theory core — zero DOM/framework deps
│   ├── notes.ts               # MIDI number ↔ note name ↔ solfège mapping
│   ├── intervals.ts           # Interval calculation, distance math
│   ├── scales.ts              # Scale definitions (major scales + fingerings data)
│   ├── chords.ts              # Chord quality definitions (maj7, m7, dom7, ø7, °7, 9...)
│   ├── chord-symbol-parser.ts # Parses "Cm7", "F♯ø7", "G7♭9" → structured chord object
│   ├── spelling.ts            # Enharmonic spelling rules (C♯ vs D♭ choice logic)
│   ├── voicings.ts            # Left-hand voicing suggestion heuristics
│   └── theory.test.ts         # Unit tests — theory core is the highest-leverage test target
├── input/                     # Input adapters — normalize to NoteEvent
│   ├── midi-adapter.ts        # Web MIDI wrapper, held-notes tracking
│   ├── keyboard-ui-adapter.ts # On-screen keyboard → NoteEvent bridge
│   └── note-event.ts          # Shared NoteEvent type + held-note-set utility
├── drills/                    # Drill/quiz engine
│   ├── drill-engine.ts        # Prompt generation, verdict logic, state machine
│   ├── drill-types.ts         # Chord-spelling drill, chord-ID drill, scale drill definitions
│   └── drill-session.ts       # Session orchestration (drill loop + scheduler integration)
├── srs/                       # Spaced repetition
│   ├── scheduler.ts           # SM-2-derived scheduling algorithm
│   └── srs-store.ts           # Per-concept performance record CRUD
├── lessons/                   # Lesson content system
│   ├── content/                # MDX/JSON lesson files
│   └── lesson-renderer.tsx    # Renders lesson content + embeds interactive theory widgets
├── lookup/                     # Chord lookup companion
│   └── chord-lookup.tsx       # Symbol input → theory-core call → diagram + voicing render
├── components/                 # Shared UI
│   ├── PianoKeyboard.tsx       # SVG/Canvas keyboard, used by drills + lookup + lessons
│   └── ProgressDashboard.tsx
├── persistence/                 # Storage abstraction
│   └── store.ts                # IndexedDB/localStorage wrapper, versioned schema
└── app/                         # Routes/pages (framework-specific: Next.js/SvelteKit/etc.)
```

### Structure Rationale

- **`theory/` is isolated and dependency-free on purpose:** it is imported by drills, lookup, and lessons alike. This is the single most important boundary in the whole app — if theory logic leaks into UI components or gets duplicated between the drill engine and the lookup companion, the two will silently drift (e.g., different enharmonic spelling for the same chord in two places). Keeping it pure also makes it trivially unit-testable without a DOM or test-harness for MIDI.
- **`input/` normalizes before anything downstream sees it:** both MIDI and on-screen keyboard emit the same `NoteEvent` shape, so the drill engine and any future input method (e.g., audio pitch detection) never need to know the note's origin.
- **`drills/` and `lookup/` are siblings, not parent/child:** the lookup companion is explicitly *not* a drill (no verdict, no scheduling) — it's a stateless read view over the same theory core plus the same keyboard-diagram component. Keeping it separate from the drill engine prevents scope creep (don't accidentally give it scoring, don't let drills accidentally need chord-symbol string parsing they don't otherwise use).
- **`srs/` is decoupled from `drills/`:** the scheduler only knows about "concept IDs" and performance history; it does not know note names, MIDI numbers, or UI state. This keeps it swappable and testable in isolation (SM-2 math is pure arithmetic).
- **`persistence/` is a thin, swappable boundary:** starting with `localStorage`/IndexedDB (zero backend, fits "single-user, cheap/free hosting") but isolated behind a store interface so a later cross-device sync backend can replace it without touching drills/theory/lessons.

## Architectural Patterns

### Pattern 1: Pure theory core, framework-agnostic

**What:** All music theory logic (note math, chord/scale definitions, symbol parsing, enharmonic spelling) lives in plain TypeScript functions and data structures with no dependency on React/Vue/Svelte or the DOM.
**When to use:** Always, for this domain — theory logic is reused across drills, lessons, and the lookup companion, and it's inherently deterministic/testable (no side effects), so isolating it costs nothing and buys correctness guarantees.
**Trade-offs:** Slightly more upfront structuring (defining types/interfaces before writing UI) vs. just inlining chord math in a component. Pays off almost immediately once a second feature (lookup companion) needs the same logic as drills.

**Example:**
```typescript
// theory/chords.ts
export type ChordQuality = 'maj7' | 'm7' | 'dom7' | 'm7b5' | 'dim7' | ...;
export interface ParsedChord { root: NoteName; quality: ChordQuality; }

export function chordTones(chord: ParsedChord): NoteName[] {
  const intervals = CHORD_INTERVALS[chord.quality]; // e.g. m7 = [0,3,7,10]
  return intervals.map(i => transposeNote(chord.root, i));
}

// Both drills/drill-engine.ts and lookup/chord-lookup.tsx call chordTones()
// — never reimplement chord spelling in either place.
```

### Pattern 2: Normalized input event bus (adapter pattern)

**What:** MIDI and on-screen keyboard both funnel into one `NoteEvent { note: number, on: boolean, velocity?: number, source: 'midi'|'ui', ts: number }` shape and one "currently held notes" set abstraction.
**When to use:** Any time there are 2+ input sources answering the same question ("what notes are currently pressed"). Essential here because both MIDI chords (all keys pressed near-simultaneously but not exactly at once) and on-screen multi-touch need the same "debounce into a chord" logic.
**Trade-offs:** Requires a small timing-window heuristic (e.g., collect notes within ~50-100ms as "one chord attempt") — this logic must live once, in the input layer or drill engine, not duplicated per adapter.

**Example:**
```typescript
// input/note-event.ts
export interface NoteEvent { note: number; on: boolean; velocity?: number; source: 'midi' | 'ui'; ts: number; }

export class HeldNotesTracker {
  private held = new Set<number>();
  onEvent(e: NoteEvent) {
    e.on ? this.held.add(e.note) : this.held.delete(e.note);
  }
  current(): number[] { return [...this.held].sort((a,b) => a-b); }
}
// Drill engine subscribes to HeldNotesTracker regardless of whether
// events came from midi-adapter.ts or keyboard-ui-adapter.ts.
```

### Pattern 3: Concept-keyed spaced repetition (decoupled scheduler)

**What:** The SRS scheduler operates purely on opaque "concept IDs" (e.g. `chord:m7`, `scale:F-major`, `symbol:F#o7`) and a performance record `{easeFactor, interval, repetitions, dueDate}` per concept — it has zero knowledge of music theory or UI.
**When to use:** As soon as there is more than one drill type competing for "what should I practice next" — needed from day one here since chords and scales both need scheduling.
**Trade-offs:** Requires the drill engine to translate "concept due for review" into an actual playable prompt (theory core generates the specific instance, e.g., "spell Dm7" for concept `chord:m7`) — a small mapping layer, but keeps SRS math reusable/testable independent of what's being learned.

**Example:**
```typescript
// srs/scheduler.ts — classic SM-2, ~20 lines
export function review(record: SrsRecord, quality: 0|1|2|3|4|5): SrsRecord {
  if (quality < 3) return { ...record, repetitions: 0, interval: 1, dueDate: addDays(1) };
  const interval = record.repetitions === 0 ? 1 : record.repetitions === 1 ? 6
    : Math.round(record.interval * record.easeFactor);
  const easeFactor = Math.max(1.3, record.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  return { repetitions: record.repetitions + 1, interval, easeFactor, dueDate: addDays(interval) };
}
```

## Data Flow

### Drill Answer Flow (MIDI or on-screen)

```
[MIDI keydown / on-screen keyboard tap]
    ↓
[input adapter] → normalizes to NoteEvent → [HeldNotesTracker]
    ↓ (debounced ~75ms window, or "release" event for MIDI note-off)
[Drill Engine] compares held-notes set against expected note set
    ↓ (expected set computed by theory core from current prompt)
[Verdict: correct / incorrect / partial] → shown in [Drill Screen UI]
    ↓
[SRS Scheduler] receives quality signal (derived from correct/incorrect + latency)
    ↓
[Persistence Layer] writes updated SrsRecord for the concept
    ↓
[Progress Dashboard] reflects updated streak/mastery on next render
```

### Chord Lookup Flow (read-only, no scoring)

```
[User types "F#o7" in lookup input]
    ↓
[chord-symbol-parser] → ParsedChord { root: F#, quality: 'dim7' }
    ↓
[theory core: chordTones()] → note list
    ↓
[voicings.ts] → suggested left-hand voicing(s)
    ↓
[PianoKeyboard component] renders notes/voicing as a diagram — no SRS/persistence involved
```

### Key Data Flows

1. **Prompt generation:** SRS scheduler surfaces due concepts → drill engine maps concept ID to a concrete theory-core-generated prompt (specific chord/scale instance, possibly randomized root) → UI displays the prompt.
2. **Answer verification:** Input layer emits normalized note events → held-notes set compared against theory-core-computed expected notes → verdict → both UI feedback and SRS update happen from this single verdict object (no duplicate logic between "what UI shows" and "what SRS records").
3. **Shared rendering:** Both the drill's "show correct answer" feedback state and the lookup companion's diagram render through the *same* `PianoKeyboard` component, fed by theory-core note lists — one keyboard-drawing implementation for the whole app.

## Scaling Considerations

This app is explicitly single-user (per PROJECT.md), so classic multi-tenant scaling concerns don't apply. The real "scaling axes" here are content growth and feature growth, not traffic.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| v1 (chord fluency, single user, local storage) | Client-heavy SPA/static site; theory core + drills + persistence all run in-browser; no backend needed beyond static hosting (Vercel/Netlify/Cloudflare Pages free tier) |
| v1.x (scales, more chord qualities, cross-device sync) | Add a minimal backend (serverless function + small DB like Postgres/SQLite, or a hosted KV) purely to sync the SRS/progress store across devices; theory core and drill logic stay client-side/unchanged |
| Hypothetical multi-user future (out of scope per PROJECT.md) | Would require auth, per-user data isolation, and moving SRS state fully server-side — explicitly deferred; don't build this speculatively |

### Scaling Priorities

1. **First "bottleneck":** cross-device progress sync (laptop at the piano vs. phone elsewhere) — solved with a lightweight backend or a sync-capable local-first store (e.g., a small serverless API + Postgres, or a hosted sync layer), not by scaling infrastructure.
2. **Second "bottleneck":** content growth (more chord qualities, all 12 major scales with fingerings, later minor scales/modes) — solved by keeping lesson content and theory-core chord/scale *data* declarative and data-driven (adding a new chord quality should mean adding one entry to a table, not writing new logic).

## Anti-Patterns

### Anti-Pattern 1: Duplicating theory logic between drills and the lookup companion

**What people do:** Implement chord spelling / enharmonic naming inline inside the drill component, then re-implement similar-but-slightly-different logic inside the "chord lookup" feature because it feels like a separate small tool.
**Why it's wrong:** The two implementations drift — e.g., the drill spells `F♯ø7` differently than the lookup companion, confusing the one user this app is built for. It also doubles the testing/maintenance surface for the highest-risk logic in the app (music theory correctness).
**Do this instead:** Build the chord-symbol parser and chord/scale spelling functions once in `theory/`, and have both the drill engine and the lookup companion call them. Treat the lookup companion as "drills minus the quiz/scoring layer," sharing the same core and even the same keyboard-diagram component.

### Anti-Pattern 2: Coupling MIDI event handling directly to UI/React state

**What people do:** Attach the `onmidimessage` handler directly inside a React component, setting component state on every note-on/note-off, and doing chord-matching logic inline in the same handler.
**Why it's wrong:** MIDI events fire independently of the component lifecycle and can arrive in bursts; wiring them straight into framework state churns re-renders and makes the note-matching logic untestable outside a full component render (can't unit test "was Dm7 played correctly" without mounting a component and faking DOM events).
**Do this instead:** Keep a framework-agnostic `HeldNotesTracker`/input-adapter layer that owns MIDI/keyboard event handling and exposes a plain subscribe/callback or observable; the UI layer only subscribes to derived state (current held notes, verdict) — this keeps note-matching logic unit-testable with plain arrays of numbers, no MIDI hardware or DOM required.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Web MIDI API (browser built-in) | `navigator.requestMIDIAccess()` → `MIDIAccess.inputs` → attach `onmidimessage` per input port | Chrome-family only (per project constraint) — no Safari support as of current browsers; must feature-detect and show the on-screen keyboard as the graceful fallback, not an error state |
| `webmidi.js` (optional) | Wraps raw Web MIDI API in higher-level `Input`, event names (`noteon`/`noteoff`), channel abstraction | Optional convenience layer; raw API is small enough that a thin custom adapter (as in Pattern 2) is equally viable and keeps one fewer dependency |
| Static hosting (Vercel/Netlify/Cloudflare Pages) | Standard static/SPA deploy, no server required for v1 | Matches "cheap/free hosting" constraint; add a serverless function only when cross-device sync is introduced |
| (Optional, later) small backend + DB for sync | REST/tRPC endpoint + SQLite/Postgres or hosted KV, storing SRS records + settings keyed by a single implicit user | Only needed once cross-device progress sync becomes a real requirement — do not build this in v1 if local storage suffices for the MVP |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Input adapters ↔ Drill engine | Plain callback/subscription of normalized `NoteEvent`/held-notes state | No direct DOM or MIDI-object references cross this boundary |
| Theory core ↔ everything else | Direct function calls (pure, synchronous) | No framework imports allowed inside `theory/`; enforce via lint rule or folder-import restriction if using a monorepo-style linter |
| Drill engine ↔ SRS scheduler | Drill engine reports a `quality` outcome per attempt; scheduler returns updated `SrsRecord` | Scheduler never touches note/chord data, only concept IDs and performance numbers |
| Lessons ↔ Theory core | Interactive lesson widgets import theory-core functions directly, same as drills | Prevents lessons from silently becoming their own "third implementation" of theory logic |
| Any feature ↔ Persistence layer | Through a single store interface (`getSrsRecord`, `saveSrsRecord`, `getSettings`, etc.) | Keeps IndexedDB/localStorage swappable for a future sync backend without touching feature code |

## Suggested Build Order (dependency-driven)

1. **Theory core first** (`theory/`) — everything else depends on it; fully unit-testable in isolation with no UI/MIDI needed. Cover note naming, intervals, scale/chord definitions, chord symbol parsing, enharmonic spelling.
2. **On-screen keyboard UI + input adapter** — build the on-screen keyboard before MIDI; it's the fallback input method and lets drills/lookup be fully testable/usable without piano hardware in the loop. Establish the `NoteEvent`/`HeldNotesTracker` abstraction here so MIDI slots into the same interface later.
3. **Chord lookup companion** — the simplest consumer of the theory core (no scoring, no scheduling); a good "does the theory core actually work end-to-end with real UI" checkpoint before building the more stateful drill engine.
4. **Drill engine (using on-screen input only)** — prompt generation + note-matching + verdict, without MIDI or SRS yet; validates the core learning loop.
5. **MIDI input adapter** — plug into the same input abstraction defined in step 2; test against the drill engine built in step 4.
6. **Spaced repetition scheduler + persistence layer** — layer scheduling and cross-session state on top of a working drill loop; SRS math is independently testable and can be built in parallel with step 5 if resourcing allows.
7. **Lesson content system** — theory explanations, optionally embedding theory-core-powered interactive widgets; lowest technical risk, can be built last or interleaved based on content-writing pace rather than technical dependency.
8. **Progress dashboard + scale drills/fingerings expansion** — builds on all of the above being stable.

## Sources

- [MDN Web Docs — Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) — HIGH confidence (official browser API documentation)
- [W3C Web MIDI API Specification](https://www.w3.org/TR/webmidi/) — HIGH confidence (official spec)
- [Smashing Magazine — Getting Started With The Web MIDI API](https://www.smashingmagazine.com/2018/03/web-midi-api/) — MEDIUM confidence (community tutorial, confirms standard note-on/note-off message handling pattern)
- [djipco/webmidi (GitHub)](https://github.com/djipco/webmidi) — MEDIUM confidence (widely-used community library, confirms higher-level event-based abstraction pattern over raw Web MIDI API)
- [Jan Kleinert — Learning to Read Music with the Web MIDI API](https://jankleinert.com/blog/2020/01/22/learning-to-read-music-with-the-web-midi-api.html) — MEDIUM confidence (real-world music-education app build log, confirms module separation pattern: MIDI handling / audio / UI)
- [NIME — User-Friendly MIDI in the Web Browser](https://nime.pubpub.org/pub/user-friendly-midi-in-the-web-browser) — MEDIUM confidence (academic/conference source on Web MIDI UX patterns)
- [dev.to — How I Implemented the SM-2 Spaced Repetition Algorithm in My Flashcard App](https://dev.to/chelsy/how-i-implemented-the-sm-2-spaced-repetition-algorithm-in-my-flashcard-app-54g9) — MEDIUM confidence (confirms standard SM-2 implementation shape: ease factor, interval, repetitions)
- [cnnrhill/sm-2 (GitHub)](https://github.com/cnnrhill/sm-2) — MEDIUM confidence (reference ES6 implementation of SM-2, confirms algorithm structure)
- [VienDinhCom/supermemo (GitHub)](https://github.com/VienDinhCom/supermemo) — MEDIUM confidence (production npm package implementing SM-2, confirms this is a well-trodden, low-risk component to build or adopt)
- Domain-knowledge synthesis (component boundaries, layered architecture, build-order reasoning) — HIGH confidence for the general software-architecture patterns (adapter pattern, pure-core/thin-shell, concept-keyed scheduling), which are well-established, stack-agnostic engineering practices independent of this specific fast-moving library ecosystem

---
*Architecture research for: Interactive jazz piano theory learning web app*
*Researched: 2026-07-12*
