# Architecture Contracts — Overnight v2 Build

Architect-owned. Binding for all four build tracks. Deviations must be reported in the builder's final message, not silently applied. Research files in `.planning/spikes/research/` are the source of truth for detailed shapes; this doc pins the CROSS-TRACK surface.

## Tracks and merge order

Merge order (architect merges into main sequentially, fixing conflicts):

1. **Track A — audio** (branch `build/audio`): sampled piano engine, key-touch sound, answer-reveal sound.
2. **Track C — intervals + scales** (branch `build/intervals`): interval module, IntervalRole extension, inspectable keyboard, interval drill, light /scales explorer, server kind migration.
3. **Track D — theory content** (branch `build/theory`): /theory route, mnemonics lib, confusion-contrast lib, reveal-card integration.
4. **Track B1 — songs** (branch `build/songs`): `src/lib/practice/songs.ts` (model, localStorage, presets from R5), `/songs` route (list, create with validation + did-you-mean, edit, active toggles, preset shelf), nav link.
5. **Track B2 — practice engine** (branch `build/practice`): tiers, hybrid unlock, weighted question pool (imports `songs.ts` per contract), warm-up queue, micro-sessions with end card, weakness "Drill these" button, settings section on Progress. B2 codes against the `songs.ts` contract; merges after B1.

Later tracks merge onto earlier ones; architect resolves conflicts with the full test suite as the net.

## File ownership matrix

| File / area | Owner | Others may |
|---|---|---|
| `src/lib/audio/**`, `static/samples/**` | A | import only |
| `src/lib/theory/interval.ts` | C | import only |
| `src/lib/theory/types.ts` (IntervalRole extension) | C | read only, do NOT edit |
| `app.css` new degree color tokens | C | read only |
| `src/lib/components/PianoKeyboard.svelte` | A adds `onPress` prop; C adds `inspectable`/`onInspect` | additive props only, keep byte-identical-when-omitted contract |
| `src/lib/drills/generateQuestion.ts` | C converts to discriminated union; B adds pool seam | conflicts expected, architect merges |
| `src/lib/theory/contrast.ts`, `src/lib/copy/mnemonics.ts` | D | import only |
| `src/lib/practice/**` (tiers, levelState, songs, pool, session) | B | import only |
| `server/**` migration (kind enum + new columns) | C | B consumes new columns |
| `src/lib/api/progress.ts` (`postAnswer` tolerance) | C | B consumes |
| `src/routes/+layout.svelte` navLinks | each track adds ONLY its own link line | final order set by architect at merge |
| `src/routes/drills/+page.svelte` | shared hotspot: A (1 call), C (mode row + interval rendering), D (reveal-card additions), B (sessions/scaffolding) | keep page edits minimal, push logic into lib modules |

## Cross-track interfaces (binding signatures)

### Audio (A provides; B, C, D consume)

```ts
// src/lib/audio/audio.ts  (singleton, dynamic import('tone'), jsdom-safe)
export type InstrumentKind = 'sampled' | 'synth';
export interface PlayOpts { velocity?: number; durationSec?: number; }
export function ensureAudioReady(): Promise<void>;          // idempotent; call inside first user gesture
export function playNote(note: string, opts?: PlayOpts): void;   // "C4", "Eb3" style
export function noteOn(note: string): void;
export function noteOff(note: string): void;
export function playChord(notes: string[], opts?: PlayOpts): void; // octave voicing resolved internally via voicing.ts
export function releaseAll(): void;
export function audioState(): { instrument: InstrumentKind; samplesLoaded: boolean };
export function setSoundEnabled(enabled: boolean): void; // persisted to localStorage "music-learn:sound"; when false all play* are no-ops
export function soundEnabled(): boolean;                  // default true
```

- Behavior: synth (existing PolySynth path) plays instantly; Salamander sampler swaps in transparently once loaded. Never silence. `Tone.getContext().lookAhead = 0`.
- A must keep a compatibility path for existing `playChord` call sites (SpelledNote-based) or update them within Track A.
- Consumers in tests: `vi.mock('$lib/audio/audio')`. Never construct a real AudioContext in Vitest.
- Reveal rule (all drill types): EVERY answer reveal plays the correct chord/notes, correct answers included. On a miss, autoplay the correct one only.

### Intervals (C provides)

```ts
// src/lib/theory/interval.ts (pure, tonal-backed)
export interface IntervalInfo {
  short: string;      // "m3", "P5", "A4" (quality-first, matches formulaFor output)
  long: string;       // "minor 3rd"
  longFr: string;     // "tierce mineure" (gender-correct)
  degree: number; quality: string; semitones: number;
  role: IntervalRole; tonalName: string;
}
export function intervalBetween(a: string, b: string): IntervalInfo;
export function intervalFromRoot(root: string, note: string): IntervalInfo; // picks simpler enharmonic for black keys
```

- `IntervalRole` extended by C to `root|second|third|fourth|fifth|sixth|seventh` with 9→2, 11→4, 13→6 mapping. New tokens: `--color-second`, `--color-fourth`, `--color-sixth` in Print Shop temperature, verified against paper background.
- PianoKeyboard `inspectable` prop is mutually exclusive with `interactive`; tap plays note (via audio contract) and emits `onInspect(info)`.

### Theory content (D provides)

```ts
// src/lib/theory/contrast.ts
export function contrastLine(correctSymbol: string, givenSymbol: string): string | null;
// e.g. "Cm7 has Eb, C7 has E." null when symbols equal or diff not expressible in one line.

// src/lib/copy/mnemonics.ts
export function mnemonicFor(qualitySuffix: string): string | null; // null = none; NEVER invent filler
```

- Only the KEEP-rated structural mnemonics from R3-learning.md. When in doubt, return null. No em dashes anywhere.

### Practice (B provides)

```ts
// src/lib/practice/* (shapes detailed in R3/R5 research)
export interface Song { id: string; name: string; chordSymbols: string[]; createdAt: string; source: 'preset' | 'custom'; active: boolean; presetId?: string; }
// tiers.ts: TierDef[] per R3 (6 tiers; tiers 1-4 need zero engine work)
// levelState.ts: localStorage key "music-learn:level"; unlock check computed from fetchStats (client never re-derives accuracy)
// songs.ts (B1): localStorage key "music-learn:songs"; presets are code constants copied on add
export function listSongs(): Song[];
export function saveSong(song: Song): void;
export function deleteSong(id: string): void;
export function activeSongChordSymbols(): string[]; // deduped union across active songs, B2's pool input
// pool.ts (B2): buildQuestionPool(...) implementing 60/25/15 song/tier/review mix, scaffolding for above-tier song chords
```

- Persistence tonight: localStorage for level state and songs (established `music-learn:*` pattern). No new backend tables tonight.

## Server policy (critical)

Production server (Oracle, docker compose) is NOT redeployed tonight. Therefore:

- C ships the server change in `server/`: widen `kind` CHECK to include `'interval'`, add nullable `duration_ms` INTEGER and `given` TEXT columns, with a real migration path for the existing SQLite file, plus server tests.
- The CLIENT must tolerate the old deployed server: wrap answer posting so a 400 on `kind: 'interval'` or unknown fields degrades gracefully (drop-and-log-once, never break the drill loop). C owns this wrapper; B sends `duration_ms`/`given` through it.
- Redeploy is a UAT item for the user tomorrow.

## Navigation contract

Final nav (architect applies at merge): `Lookup / , Drills /drills, Scales /scales, Songs /songs, Theory /theory, Progress /progress`. Showcase route stays but leaves the nav. Each track adds only its own link during build. Practice settings (level override, sound toggle) live in a section on the Progress page, owner B. Masthead must survive 375px (wrap or horizontal scroll, Print Shop styling).

## Conventions (all tracks)

- **TDD mandatory**: failing test first, then implementation. Pure logic colocated `*.test.ts`; page-level tests follow `tests/*.e2e.test.ts` patterns (mock `$app/stores`, `$lib/api/progress`, and now `$lib/audio/audio`). Beware: drills e2e mocks Math.random by draw order; generator changes must update those mocks deliberately.
- **Design**: Print Shop rules are binding (read `.claude/skills/sketch-findings-music-learn/SKILL.md`): fixed interval colors reserved for revealed/correct notes, zero radius, 4 text sizes/2 weights, 44px touch floor, stamp-in reveal beat, French winks in copy, NO EM DASHES in any copy.
- **Static build**: everything prerenders (adapter-static strict). New routes: `export const prerender = true` compatible, data fetching in onMount, feature-detect browser APIs (jsdom lacks ResizeObserver/matchMedia).
- **Commits**: frequent, conventional (`feat(audio): ...`, `test(intervals): ...`). Run `npm test` and `npm run check` green before finishing.
- **Final report**: branch name, commit list, files touched, contract deviations, how to verify.

## Out of scope tonight

MIDI (phase 4), full scale fingerings (phase 6 full), rootless voicings, ear-training-first drills, ts-fsrs adoption (next milestone; `duration_ms` recorded now to feed it later), backend song storage, production redeploy.
