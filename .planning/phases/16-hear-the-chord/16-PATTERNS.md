# Phase 16: Hear the Chord - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 7 (2 create/modify audio+toggle, 3 component modifications, 1 route modification, plus app.css keyframe)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/audio/audio.ts` (add `playArpeggio`, `studyModeEnabled`/`setStudyModeEnabled`) | service/utility | event-driven (timed playback) | same file's `playChord` (lines 219-231) + `soundEnabled`/`setSoundEnabled` (lines 67-86) | exact |
| `src/lib/components/BuildSession.svelte` (`complete` block) | component | request-response (state-transition driven) | `RecallSession.svelte` `handleHearNamePlay` (lines 395-399) for on-demand replay; `BuildSession.svelte`'s own `feedbackTimer`/`sessionState = 'complete'` transition (lines 429-446) for the fire-once transition guard | exact (self-referential) |
| `src/lib/components/ChordGlyph.svelte` (add `stamped`/`pulseToken` props) | component | transform (presentational) | `PianoKeyboard.svelte`'s `stampedClass`/`pressedClass` pattern (lines 420-442) | role-match (same animation-class-toggle idiom, different component) |
| `src/lib/components/PianoKeyboard.svelte` (add pulse + `--pending` state) | component | transform (presentational) | same file's existing `stampedClass`/`wrongClass`/`selectedClass` composition (lines 396-442) | exact |
| `src/lib/components/Button.svelte` (no change — reuse ghost variant) | component | request-response | itself, `ghost` variant (lines 57-61, 68-70) | exact, no modification needed |
| `src/routes/progress/+page.svelte` (STUDY MODE toggle) | route | CRUD (localStorage read/write) | same file's `sound`/`toggleSound` block (lines 81, 88-91, 202-209) | exact |
| `src/app.css` (new `pulse-once` keyframe) | config/style | transform | same file's existing `stamp-in` keyframe + reduced-motion block (lines 100-126) | exact |

## Pattern Assignments

### `src/lib/audio/audio.ts`

**Analog:** the file's own `playChord` and `soundEnabled`/`setSoundEnabled` pair.

**Sound-gate + chord-strike pattern to copy for `playArpeggio`** (lines 219-231):
```typescript
export function playChord(notes: string[], opts: PlayOpts = {}): void {
	if (!soundEnabled()) return;
	if (notes.length === 0) return;
	const pitches = toAscendingPitches(notes);
	void withInstrument((instrument) => {
		instrument.triggerAttackRelease(
			pitches,
			opts.durationSec ?? CHORD_DURATION,
			undefined,
			opts.velocity ?? CHORD_VELOCITY
		);
	});
}
```
`playArpeggio(notes: string[], opts: { staggerMs: number })` should follow the same early-return-when-disabled shape, but internally stagger `playNote`-style single-note attacks (reuse `playNote`'s pitch normalization via `toAsciiPitchClass`, lines 173-186) via `setTimeout` per note at `i * opts.staggerMs`. Per D-06/UI-SPEC "Component Contract Additions" table: `playArpeggio` does NOT own pulse/key-lighting timing — that is a `BuildSession`-level concern (mirrors the file's own doc comment: "does not itself decide pulse timing").

**localStorage boolean toggle pattern to copy for `studyModeEnabled`/`setStudyModeEnabled`** (lines 34, 59-86):
```typescript
const STORAGE_KEY = 'music-learn:sound';
...
function readStoredEnabled(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) !== 'false';
	} catch {
		return true;
	}
}

export function soundEnabled(): boolean {
	if (enabled === null) enabled = readStoredEnabled();
	return enabled;
}

export function setSoundEnabled(value: boolean): void {
	enabled = value;
	try {
		localStorage.setItem(STORAGE_KEY, String(value));
	} catch {
		// Storage disabled or full: keep the in-memory toggle working.
	}
	if (!value) releaseAll();
}
```
For `studyModeEnabled()`/`setStudyModeEnabled()`: same lazy-read module-level `let studyMode: boolean | null = null` cache, own key `music-learn:study-mode`, **default `false`** (inverse of sound's default-`true` — per UI-SPEC "Study-Mode Toggle" section, `!== 'false'` becomes `=== 'true'`). No `releaseAll()` side effect needed (study mode isn't an audio-output toggle, just a playback-shape flag read at call time by `BuildSession`).

**Test-reset seam** — add the new module state to `_resetForTests()` (lines 258-268) alongside `enabled = null`, mirroring exactly how `enabled` is reset there.

---

### `src/lib/components/BuildSession.svelte`

**Analog A — fire-once-on-transition guard**, from this file's own `sessionState = 'complete'` transition (lines 429-446):
```typescript
clearTimeout(feedbackTimer);
feedbackTimer = setTimeout(() => {
	feedback = undefined;
	if (advancesPrompt) promptState = nextPromptState;
	if (willComplete) {
		sessionState = 'complete';
	}
}, 650);
```
This is the single call site where `sessionState` becomes `'complete'` (line 444, inside `handleConstructTap`). The reveal auto-play/pulse trigger belongs **right here** — call a new `triggerReveal()` function in the same branch as `sessionState = 'complete'`, NOT in a `$effect` watching `sessionState` (which could re-fire on unrelated re-renders). This directly satisfies UI-SPEC's "Guard against re-fire on re-render" note and matches the existing `recordConstructionOutcome` "fires exactly once" precedent (called inline at line 404 inside the correct-tap branch, not via effect).

**Analog B — on-demand chord replay**, `RecallSession.svelte:395-399`:
```typescript
function handleHearNamePlay(chord: ReturnType<typeof spellChord>): void {
	hearNamePlayCount += 1;
	void ensureAudioReady();
	playChord(chord.notes.map((note) => note.letter));
}
```
Copy this shape for the new "Hear again" handler: `void ensureAudioReady(); playChord(construction.earnedNotes.map((n) => n.letter))` (or `playArpeggio` when `studyModeEnabled()`), reading `soundEnabled()`/`studyModeEnabled()` live at call time (D-09) rather than a snapshot — this file already snapshots state for *async FSRS writes* (`recordConstructionOutcome`'s comment at lines 336-343) but that snapshot discipline is for avoiding stale-state-after-await bugs, not applicable here since `playChord`/`playArpeggio` calls are synchronous dispatch, not awaited before use.

**Complete block insertion points** (lines 724-756, current structure):
```svelte
{:else if sessionState === 'complete' && construction}
	<div class="mt-8" data-testid="build-complete">
		<p class="text-heading font-bold" data-testid="build-complete-heading">{headingFor()}</p>
		...
		<div class="mt-4">
			<PianoKeyboard notes={construction.earnedNotes} octaves={2} />
		</div>
		...
		<div class="mt-6 flex flex-wrap gap-2">
			{#if onComplete}
				<Button type="button" variant="primary" onclick={onComplete}>Next</Button>
			{:else}
				<Button type="button" variant="primary" onclick={resetPicker}>Build Another</Button>
				<Button variant="ghost" href="/recall">Recall It Now</Button>
			{/if}
		</div>
	</div>
```
Per UI-SPEC "Reveal Composition": insert `ChordGlyph` (chords only, gated `{#if kind === 'chords'}` exactly like the `building` state's own glyph gate at line 621) directly above the heading, mirroring the `building` state's `build-target` wrapper div (line 622-624):
```svelte
<div class="flex items-start gap-4" data-testid="build-complete-target">
	<ChordGlyph root={chordRootGlyph} quality={pickedQuality ?? ''} stamped pulseToken={pulseToken} />
</div>
```
And insert the ghost "Hear again" button FIRST in the action row (before `Next`/`Build Another`), reusing the exact `Button` ghost-variant call shape already used at line 753 (`<Button variant="ghost" href="/recall">Recall It Now</Button>`) but as a `type="button"` `onclick` handler like line 752's primary button.

---

### `src/lib/components/ChordGlyph.svelte`

**Analog:** `PianoKeyboard.svelte`'s class-composition idiom (`stampedClass`, lines 420-429; `pressedClass`, lines 431-442) — same "derive a CSS class name from a prop, concatenate into the template" pattern, applied to a much simpler single-element component.

Current component has NO animation classes at all (verified — plain `<span class="chord-glyph">` wrapper, lines 18-25). Add two opt-in props per UI-SPEC's "Component Contract Additions" table:
```typescript
interface Props {
	root: string;
	quality: string;
	/** Adds the stamp-in entrance class; omit to stay static (e.g. the `building`-state glyph). */
	stamped?: boolean;
	/** Bump this number to re-trigger a one-shot pulse-once cycle. */
	pulseToken?: number;
}
```
Reuse the shared `stamp-in`/`pulse-once` keyframes from `app.css` (do not duplicate CSS locally) — mirrors `PianoKeyboard.svelte`'s own comment at lines 692-696 ("keyframe now lives in app.css ... so both consumers reference one definition").

---

### `src/lib/components/PianoKeyboard.svelte`

**Analog:** the file's own existing class-composition functions (lines 396-455), directly reused for two new pieces:

**Pulse trigger** — add a `pulseToken?: number` prop (mirrors the `flashWrongKey` prop's transient-signal shape at lines 128-136) and a class function following `stampedClass`'s exact guard style (lines 420-429):
```typescript
function stampedClass(letter: string, role: IntervalRole | undefined): string {
	if (wrongLetters === undefined) return '';
	return role || wrongLetters.has(letter) ? 'piano-keyboard__key--stamped' : '';
}
```
New `pulseClass(letter, role)` should apply `.pulse-once` only to role-lit keys (never `--wrong`/`--selected` keys per the UI-SPEC "must be followed" mutual-exclusion note), concatenated alongside the other per-key classes exactly like `stampedClass`/`pressedClass` already are in the template (lines 468-476, 513-521).

**Pending state for study-mode roll** — add `pendingLetters?: Set<string>` (mirrors `wrongLetters?: Set<string>`'s shape at line 94) and a `pendingClass(letter, role)` guarded the same way as `selectedClass` (lines 406-408, `!role` guard — but inverted: pending only applies WHEN there IS a role, i.e. only on keys that are part of the completed chord, per UI-SPEC "`--pending` only applies to already-role-lit keys").

CSS: add `.piano-keyboard__key--pending { opacity: 0.28; }` alongside the existing role-fill rules (lines 618-644), and add both `.pulse-once` and `.piano-keyboard__key--pending` to the existing `@media (prefers-reduced-motion: reduce)` block (lines 745-750) per UI-SPEC's Reduced Motion section — do not create a second media rule.

---

### `src/routes/progress/+page.svelte`

**Analog:** the file's own `sound`/`toggleSound` block, verbatim sibling pattern.

**State + handler** (lines 81, 88-91):
```typescript
let sound = $state(soundEnabled());
...
function toggleSound(): void {
	sound = !sound;
	setSoundEnabled(sound);
}
```
Copy exactly for `studyMode`:
```typescript
let studyMode = $state(studyModeEnabled());
...
function toggleStudyMode(): void {
	studyMode = !studyMode;
	setStudyModeEnabled(studyMode);
}
```
Import addition alongside the existing import (line 6):
```typescript
import { setSoundEnabled, soundEnabled, setStudyModeEnabled, studyModeEnabled } from '$lib/audio/audio';
```

**Template block** (lines 202-209), sibling row directly below, same card, same `mt-6` spacing:
```svelte
<div class="mt-6">
	<p class="text-label font-mono uppercase">SOUND</p>
	<div class="mt-2">
		<Button type="button" variant="ghost" aria-label="Toggle sound" onclick={toggleSound}>
			{sound ? 'SOUND ON' : 'SOUND OFF'}
		</Button>
	</div>
</div>
<div class="mt-6">
	<p class="text-label font-mono uppercase">STUDY MODE</p>
	<div class="mt-2">
		<Button type="button" variant="ghost" aria-label="Toggle study mode" onclick={toggleStudyMode}>
			{studyMode ? 'STUDY MODE ON' : 'STUDY MODE OFF'}
		</Button>
	</div>
</div>
```

---

### `src/app.css`

**Analog:** the existing `stamp-in` keyframe + reduced-motion block (lines 100-126):
```css
@keyframes stamp-in {
	0% {
		transform: scale(0.96);
		opacity: 0;
	}
	60% {
		transform: scale(1.02);
		opacity: 1;
	}
	100% {
		transform: scale(1);
	}
}

@media (prefers-reduced-motion: reduce) {
	.stamp,
	.piano-keyboard__key--stamped {
		animation: none !important;
	}
}
```
Add the new `pulse-once` keyframe immediately alongside it (per UI-SPEC's exact CSS block, already fully specified) and extend the SAME reduced-motion rule (do not duplicate the `@media` block) to include `.pulse-once` and `.piano-keyboard__key--pending` (the latter via `transition: none` rather than `animation: none`, since it's an opacity transition not a keyframe animation).

## Shared Patterns

### Sound-gate convention
**Source:** `src/lib/audio/audio.ts` — every `play*` export (`playNote` line 175, `noteOn` line 190, `playChord` line 220) opens with `if (!soundEnabled()) return;`.
**Apply to:** `playArpeggio` must follow this exact convention. Conversely, the VISUAL pulse in `BuildSession.svelte`/`PianoKeyboard.svelte`/`ChordGlyph.svelte` must live entirely OUTSIDE this gate (D-07/D-10/D-11) — call the pulse-trigger regardless of `soundEnabled()`, and only branch on sound/study state for which audio call (if any) to make alongside it.

### Fire-exactly-once-on-state-transition
**Source:** `BuildSession.svelte`'s `recordConstructionOutcome` invocation (line 404, inside `handleConstructTap`'s correct-tap branch) and the `sessionState = 'complete'` assignment (line 444, inside the `feedbackTimer` callback).
**Apply to:** the new reveal auto-play/pulse trigger — call it inline at the same site as `sessionState = 'complete'` (line 444), not via a reactive `$effect` that re-runs on unrelated re-renders.

### Ghost Button for secondary/repeatable actions
**Source:** `Button.svelte` `ghost` variant (lines 57-61) and its existing usage for "Recall It Now" (`BuildSession.svelte:753`) and "Try Again" (`progress/+page.svelte:139`).
**Apply to:** "Hear again" button — ghost variant, not primary, since it is a repeatable secondary action alongside the primary `Next`/`Build Another` path (UI-SPEC Color section, explicit).

### Shared CSS keyframe placement (app.css, not component-scoped)
**Source:** `stamp-in` keyframe comment, `app.css:100-106` — "lives here (not component-scoped) so both consumers share one definition instead of duplicating the keyframe."
**Apply to:** `pulse-once` — one keyframe shared by `PianoKeyboard.svelte` keys and `ChordGlyph.svelte`, per UI-SPEC's explicit "ONE shared keyframe, not two" instruction.

## No Analog Found

None — every file in scope has a strong existing analog in the codebase (see table above). `playArpeggio`'s per-note staggered-timer sequencing has no exact prior analog (no existing code does sequential timed multi-note playback), but its two constituent parts — the sound-gate convention and single-note `playNote` pitch-normalization — are both directly reusable, and its timer-staggering shape should mirror `BuildSession.svelte`'s own `setTimeout`-based `feedbackTimer`/`flashTimer` pattern (lines 429-432, 439-446) for consistency with this file's existing timer-cleanup discipline (`clearTimeout(...)` before each `setTimeout(...)` reassignment).

## Metadata

**Analog search scope:** `src/lib/audio/`, `src/lib/components/`, `src/routes/progress/`, `src/app.css`
**Files scanned:** `audio.ts`, `BuildSession.svelte`, `RecallSession.svelte`, `ChordGlyph.svelte`, `PianoKeyboard.svelte`, `Button.svelte`, `progress/+page.svelte`, `app.css`
**Pattern extraction date:** 2026-07-16
