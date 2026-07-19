# Phase 19: Interactive Theory - Pattern Map

**Mapped:** 2026-07-18
**Files analyzed:** 5 new/modified
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/components/InteractiveLesson.svelte` | component | interactive/event-driven | `src/lib/components/BuildSession.svelte` | exact |
| `src/routes/theory/+page.svelte` | route/page | request-response | `src/routes/theory/+page.svelte` (self) | exact |
| `src/routes/drills/+page.svelte` | route/page | request-response (modify SOURCE_TAGS) | `src/routes/drills/+page.svelte` (self) | role-match |
| `src/lib/practice/drillSeeds.ts` | service/utility | state management (readonly) | `src/lib/practice/drillSeeds.ts` (self) | exact |
| Keyboard integration | component reuse | interactive/event-driven | `src/lib/components/PianoKeyboard.svelte` | exact |

---

## Pattern Assignments

### `src/lib/components/InteractiveLesson.svelte` (component, interactive/event-driven)

**Analog:** `src/lib/components/BuildSession.svelte` (Phase 12)

**Core pattern** (component shape, state machine):
BuildSession already implements the exact pattern needed: a lesson with discrete steps, step-state advancement on correct taps, wrong-tap feedback with count hints, and audio playback on explicit "Hear it" controls. Structure closely mirrors:
- Local state for step progression (`sessionState = 'picking' | 'building' | 'complete'`)
- Per-tap grading via callback (`handleConstructTap`)
- Feedback with 650ms pacing timer (not needed for the lesson, but the pattern of deferred UI updates is reusable)
- Audio guarding via `soundEnabled()` and `ensureAudioReady()`

**Imports pattern** (`src/lib/components/BuildSession.svelte` lines 1–28):
```typescript
import { onDestroy, tick, untrack } from 'svelte';
import { Note } from 'tonal';
import { ensureAudioReady, playChord, soundEnabled } from '$lib/audio/audio';
import Button from './Button.svelte';
import PianoKeyboard from './PianoKeyboard.svelte';
```

**Step state machine** (`src/lib/components/BuildSession.svelte` lines 64–85):
```typescript
type SessionState = 'picking' | 'building' | 'complete';
interface Feedback {
  kind: 'correct' | 'wrong-pitch-class' | 'wrong-octave';
  headline: string;
  semitones?: number;
  direction?: 'high' | 'low';
}
let sessionState = $state<SessionState>('picking');
let feedback = $state<Feedback | undefined>();
```

**Tap handler + grading pattern** (`src/lib/components/BuildSession.svelte` lines 492–565):
The component's `handleConstructTap` method is the canonical pattern:
1. Guard early (if already feedback or construction pending, return)
2. Capture the target state BEFORE grading (for enharmonic teaching lines)
3. Grade via a pure function (here `gradeConstructionTap`, in the lesson use `gradeIntervalTap`)
4. Branch on outcome: 'correct' → advance state + fire audio, 'wrong' → flash keyboard + show feedback
5. Use a timeout to gate the cosmetic transition (650ms pacing)

This is NOT directly copy-paste (BuildSession's pacing is not needed for the lesson's simpler tap-to-advance model), but the structure of state capture → grade → branch → timeout is solid.

**Flash-key feedback pattern** (`src/lib/components/BuildSession.svelte` lines 546–549):
```typescript
clearTimeout(flashTimer);
flashTimer = setTimeout(() => {
  flashKey = null;
}, 320);  // BuildSession uses 320ms; the lesson can use ~450ms per UI-SPEC
```

**Audio playback guarding** (`src/lib/components/BuildSession.svelte` lines 450–463):
```typescript
function triggerReveal(): void {
  if (!construction) return;
  const letters = construction.earnedNotes.map((n) => n.letter);
  if (soundEnabled()) {
    void ensureAudioReady();
    playChord(letters);
  }
  revealPulseToken += 1;  // Pulse even with sound off
}
```

The pattern: always call `ensureAudioReady()` before `playChord()`, always respect `soundEnabled()`, always bump the pulse token for visual feedback independently of audio state.

---

### `src/lib/components/PianoKeyboard.svelte` (reuse, constructable mode)

**Analog:** `src/lib/components/PianoKeyboard.svelte` (self)

**Constructable mode interface** (`src/lib/components/PianoKeyboard.svelte` lines 114–127):
```typescript
interface Props {
  /** Spelled notes to highlight on the keyboard. */
  notes: SpelledNote[];
  /**
   * Tap-to-construct mode (Phase 12, D-06): every key becomes tappable
   * and fires `onConstructTap` with the tapped key's letter (sharp spelling for
   * black keys) and its octave number.
   */
  constructable?: boolean;
  /** Called with the tapped key's letter and octave; only meaningful when `constructable`. */
  onConstructTap?: (letter: string, octave: number) => void;
  /**
   * Transient, octave-specific wrong-tap indicator (Phase 12): when set,
   * only the exact key whose letter+octave match gets the wrong-fill.
   */
  flashWrongKey?: { letter: string; octave: number } | null;
  /**
   * Bump this number to re-trigger a one-shot `.pulse-once` animation
   * cycle on every currently role-lit key (Phase 16, HEAR-01).
   */
  pulseToken?: number;
  /**
   * Explicit octave-count override. When omitted, the component self-measures
   * its available width; 2 for two-octave spans, 1 for phone-width.
   */
  octaves?: 1 | 2;
}
```

**Usage pattern in BuildSession** (`src/lib/components/BuildSession.svelte` lines 612–621):
```svelte
<PianoKeyboard
  notes={construction.earnedNotes}
  constructable
  octaves={2}
  onConstructTap={handleConstructTap}
  flashWrongKey={flashKey}
/>
```

For the InteractiveLesson, the same pattern applies verbatim. The UI-SPEC specifies:
- `octaves={1}` (one-octave mini keyboard, phone-legible)
- `notes={earnedNotes}` (accumulated SpelledNote[] entries)
- `constructable={!stepDone && step.targetChroma !== null}` (conditional, only tappable until step done)
- `onConstructTap={handleTap}` (same callback signature)
- `flashWrongKey={wrongFlash}` (~450ms flash on wrong tap)
- `pulseToken={hearPulseToken}` (bumped on "Hear it" button tap)

---

### Audio Playback Pattern

**Analog:** `src/lib/audio/audio.ts`

**Module exports for audio control** (`src/lib/audio/audio.ts` lines 71–118):
```typescript
/** Whether app sound is on. Default true; persisted per device. */
export function soundEnabled(): boolean {
  if (enabled === null) enabled = readStoredEnabled();
  return enabled;
}

/** Unlocks the audio context and kicks off sample loading. Idempotent. */
export async function ensureAudioReady(): Promise<void> {
  if (!soundEnabled()) return;
  const t = await loadTone();
  await t.start();
  beginSampleLoad(t);
}
```

**Playback signatures** (`src/lib/audio/audio.ts` lines 206–263):
```typescript
/** One-shot note (key tap). Accepts "C4" / "E♭3" style; glyphs normalized. */
export function playNote(note: string, opts: PlayOpts = {}): void {
  if (!soundEnabled()) return;
  // ... (rest of implementation, caller does not need to understand)
}

/**
 * Plays spelled-note letters (e.g. ['C','E♭','G','B♭']) as a block chord.
 * Octave voicing is resolved internally.
 */
export function playChord(notes: string[], opts: PlayOpts = {}): void {
  if (!soundEnabled()) return;
  if (notes.length === 0) return;
  // ... (rest of implementation)
}
```

**Call pattern in InteractiveLesson:**
```typescript
// On correct tap (wrong tap never fires audio):
function handleTap(letter: string, octave: number) {
  const targetChroma = step.targetChroma;
  const tappedChroma = Note.chroma(toAsciiAccidentals(letter));
  if ((tappedChroma - C_CHROMA + 12) % 12 === targetChroma) {
    // Correct
    void ensureAudioReady();
    playNote(letter);  // Single note for single tap
    // ... advance step, set stepDone, etc.
  } else {
    // Wrong — NO audio, just flash + feedback text
  }
}

// On "Hear it" button:
function handleHearControl() {
  void ensureAudioReady();
  playChord([currentRootLetter, thirdLetter]);
  hearPulseToken += 1;  // Pulse the already-lit keys
}
```

---

### Grading Pattern: Chroma Comparison

**Analog:** `src/lib/drills/generateIntervalQuestion.ts` lines 126–131

**Interval tap grading (chroma-based, never letter-string)** (`src/lib/drills/generateIntervalQuestion.ts` lines 126–131):
```typescript
export function gradeIntervalTap(root: string, tappedLetter: string, semitones: number): boolean {
  const rootChroma = Note.chroma(toAsciiAccidentals(root));
  const tappedChroma = Note.chroma(toAsciiAccidentals(tappedLetter));
  if (rootChroma === undefined || tappedChroma === undefined) return false;
  return (tappedChroma - rootChroma + 12) % 12 === semitones % 12;
}
```

**Pattern for InteractiveLesson's `handleTap`:**
The lesson's grading is simpler than `gradeIntervalTap` (it doesn't need the root parameter, only compares tapped chroma to step's targetChroma):

```typescript
function handleTap(letter: string, octave: number) {
  if (!step.targetChroma || stepDone) return;
  const tappedChroma = Note.chroma(toAsciiAccidentals(letter));
  if (tappedChroma === step.targetChroma) {
    // Correct: add note, advance step
    earnedNotes = [...earnedNotes, { letter, solfege: letterToSolfege(letter), role: step.role }];
    stepDone = true;
    void ensureAudioReady();
    playNote(letter);
  } else {
    // Wrong: flash keyboard, show retry hint with semitone distance
    wrongFlash = { letter, octave };
    const hint = Math.abs(tappedChroma - step.targetChroma);
    // Render: "That's {hint} keys. A major third is 4..."
  }
}
```

The key pattern: **always use `Note.chroma(toAsciiAccidentals(letter))` for grading**, never compare letter strings directly. This handles enharmonics (C♯ vs D♭) correctly.

---

### Drill Handoff Pattern

**Analog:** `src/lib/practice/drillSeeds.ts` (lines 1–32)

**One-shot seed mechanism** (`src/lib/practice/drillSeeds.ts` lines 12–32):
```typescript
const DRILL_SEEDS_KEY = 'music-learn:drill-seeds';

export function setDrillSeeds(symbols: string[]): void {
  try {
    localStorage.setItem(DRILL_SEEDS_KEY, JSON.stringify(symbols));
  } catch {
    // Storage unavailable: the button degrades to plain navigation.
  }
}

/** Reads the pending seeds and clears them (one-shot). */
export function consumeDrillSeeds(): string[] {
  try {
    const raw = localStorage.getItem(DRILL_SEEDS_KEY);
    localStorage.removeItem(DRILL_SEEDS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}
```

**Usage in InteractiveLesson's handoff CTA:**
```svelte
<Button href="/drills" onclick={handleHandoffClick}>
  Try this in a drill →
</Button>

<script>
function handleHandoffClick() {
  setDrillSeeds(['C', 'Cm']);
  // Button's href="/drills" handles navigation automatically
}
</script>
```

**Consumption pattern in drills/+page.svelte** (`src/routes/drills/+page.svelte` lines 130–136):
```typescript
let session = $state<Session>(
  createSession({
    // Drill-these seeds are chord symbols (Progress filters to kind 'chord').
    seeds: consumeDrillSeeds().map((symbol) => ({ symbol, family: 'chord' as const })),
    warmupCandidates: recentMisses(5)
  })
);
```

The pattern is identical for the lesson's handoff: call `setDrillSeeds(['C', 'Cm'])` before navigating.

---

## Shared Patterns

### Step-Card Visual States

**Source:** Sketch 012 / UI-SPEC (no direct code analog, but matches card structure from existing /theory sections)

**Reusable card container pattern** (`src/routes/theory/+page.svelte` lines 89–91):
```svelte
<section
  class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
  data-testid="section-symbol"
>
```

**Apply to each step card:**
- locked: `opacity-40`, no keyboard/controls rendered
- active: `opacity-100`, left border `8px solid var(--color-vermilion)`
- done: `opacity-100`, left border `8px solid var(--color-verdigris)`

All three states inherit the base card classes; state is driven by a conditional render of the keyboard and a CSS class bind on the container.

---

### SOURCE_TAGS Extension

**Analog:** `src/routes/drills/+page.svelte` lines 663–667

**Current SOURCE_TAGS map** (`src/routes/drills/+page.svelte` lines 663–667):
```typescript
const SOURCE_TAGS: Partial<Record<QuestionSource, string>> = {
  warmup: 'BACK FOR ANOTHER GO',
  retry: 'ONE MORE TIME',
  seeded: 'FROM YOUR WEAK LIST'
};
```

**Required modification:**
The `seeded` tag currently renders `'FROM YOUR WEAK LIST'` for all seeded questions (from Progress's "Drill these" button). Phase 19 must distinguish lesson-seeded questions from weak-list-seeded ones, rendering `'FROM YOUR LESSON'` instead.

**Implementation seam (planner's discretion):**
- Add a new `QuestionSource` variant (e.g., `seeded_lesson`) OR
- Thread an origin flag through `consumeDrillSeeds()` (e.g., return `{ symbol, origin }` tuples) OR
- Use a separate localStorage key for lesson seeds (e.g., `music-learn:lesson-seeds`)

Whichever approach is chosen, the rendered string for lesson-originated seeded questions must be the locked copy: `'FROM YOUR LESSON'`.

---

### Type Imports for InteractiveLesson

**Analog:** `src/lib/theory/types.ts` and `src/lib/components/PianoKeyboard.svelte`

**Imports needed in InteractiveLesson.svelte:**
```typescript
import { Note } from 'tonal';
import { toAsciiAccidentals, letterToSolfege } from '$lib/theory/interval';
import type { SpelledNote } from '$lib/theory/types';
import { ensureAudioReady, playNote, playChord, soundEnabled } from '$lib/audio/audio';
import Button from './Button.svelte';
import PianoKeyboard from './PianoKeyboard.svelte';
```

**SpelledNote structure** (to populate `earnedNotes`):
```typescript
interface SpelledNote {
  letter: string;        // "C", "E", "E♭" (display glyphs)
  solfege: string;       // "Do", "Mi" (from letterToSolfege)
  role: 'root' | 'third' | null;  // Interval color/badge
}
```

---

## Page Integration

### /theory Page Structure

**Analog:** `src/routes/theory/+page.svelte` (self)

**Section placement rule** (`src/routes/theory/+page.svelte` lines 77–87):
```svelte
<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
  <div class="mx-auto flex max-w-[42rem] flex-col gap-8">
    <header>
      <h1 class="text-heading mt-2 font-bold">Theory</h1>
      <p class="text-body text-muted mt-2">
        The shop's field guide to chord symbols. Six short lessons, every one with real keys under it.
      </p>
    </header>
```

**InteractiveLesson is inserted as the first `<section>` after this header**, using the identical section wrapper:
```svelte
<section
  class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
  data-testid="section-interactive-lesson"
>
  <!-- InteractiveLesson component here -->
</section>

<!-- Existing static sections below, byte-identical: section-symbol, section-sevenths, etc. -->
```

No new header, no tab toggle; the page remains a single top-to-bottom scroll, interactive lesson first.

---

## Files with Strong Analogs

| File | Closest Analog | Key Seams | 
|------|----------------|-----------|
| `InteractiveLesson.svelte` | `BuildSession.svelte` | `handleConstructTap()`, `feedback` state machine, `flashTimer`, audio calling pattern, `revealPulseToken` bump on "Hear it" |
| Keyboard integration | `PianoKeyboard.svelte` | `constructable={true}`, `onConstructTap`, `flashWrongKey`, `pulseToken`, `octaves={1}` |
| Audio playback | `audio.ts` | `ensureAudioReady()`, `soundEnabled()`, `playNote()`, `playChord()` call signatures |
| Grading | `generateIntervalQuestion.ts` | `Note.chroma(toAsciiAccidentals(letter))` comparison, never letter strings |
| Drill handoff | `drillSeeds.ts` | `setDrillSeeds(symbols)` before navigation |
| /theory page | `theory/+page.svelte` | Section wrapper `border-2 border-ink bg-paper-bright px-4 py-6` |
| SOURCE_TAGS | `drills/+page.svelte` | Add `'FROM YOUR LESSON'` tag (planner to implement origin tracking) |

---

## No New Patterns Required

- **CSS/styling:** All utility classes (gap, opacity, border, background) exist in `src/app.css` and TailwindCSS config (no new tokens)
- **Form handling:** No forms; tap-based input only
- **Validation:** No schema validation; grading is chroma-based comparison, already a pure function
- **Testing:** Component tests should mock `audio.ts` (see BuildSession's test patterns)
- **Accessibility:** Step cards are document flow, no ARIA roles needed (existing `PianoKeyboard` constructable mode already provides `<button>` semantics)

---

## Metadata

**Analog search scope:** `/src/lib/components/`, `/src/lib/audio/`, `/src/lib/practice/`, `/src/lib/drills/`, `/src/lib/theory/`, `/src/routes/theory/`, `/src/routes/drills/`

**Files scanned:** 20+

**Pattern extraction date:** 2026-07-18

**Key insight:** Phase 19's InteractiveLesson is architecturally very close to BuildSession (Phase 12), minus the chord-picker UI and the 650ms pacing timer. Copying the tap-handler structure, state machine, and audio patterns directly from BuildSession is the lowest-risk approach. The only integration seam is extending SOURCE_TAGS to distinguish `'FROM YOUR LESSON'` from `'FROM YOUR WEAK LIST'`.
