# Phase 3: On-Screen Drill Loop - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 9 (new/modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/lib/drills/matchChord.ts` | utility (pure logic) | transform | `src/lib/theory/chord.ts` (`spellChord`) | role-match (pure theory-transform module) |
| `src/lib/drills/matchChord.test.ts` | test | transform | `src/lib/theory/chord.test.ts` | exact (co-located Vitest for a pure module) |
| `src/lib/drills/generateQuestion.ts` (question + distractor generation) | utility (pure logic) | transform | `src/lib/theory/randomChord.ts` | exact (random draw from the same 12x8 matrix) |
| `src/lib/drills/generateQuestion.test.ts` | test | transform | `src/lib/theory/chord.test.ts` / `recentLookups.test.ts` | exact |
| `src/lib/components/PianoKeyboard.svelte` (extend, interactive mode) | component | event-driven (click/keydown) + display (existing) | itself, prior version (Phase 1/2) | exact (extend in place, not fork) |
| `src/lib/components/components.test.ts` (extend) | test | event-driven | itself (existing file) | exact |
| `src/routes/drills/+page.svelte` | route/component (page) | request-response (session/state loop) | `src/routes/+page.svelte` (lookup page) | exact (page-level orchestrator composing lib modules + components) |
| `src/routes/+layout.svelte` (modify `navLinks`) | route (layout) | request-response | itself (existing file) | exact |
| `tests/drills.e2e.test.ts` | test (e2e) | event-driven / request-response | `tests/lookup.e2e.test.ts` | exact |

## Pattern Assignments

### `src/lib/drills/matchChord.ts` (utility, transform)

**Analog:** `src/lib/theory/chord.ts` (`spellChord`)

**Imports pattern** (chord.ts lines 1-3):
```typescript
import { Chord } from 'tonal';
import { letterToSolfege } from './solfege';
import type { ChordResult, IntervalRole, SpelledNote } from './types';
```
`matchChord.ts` should import the shared shape from `$lib/theory/types` (or define a local `MatchResult` type next to it, same convention as `chordPresentation.ts` defining `FormulaEntry` locally). No DOM/Svelte imports, consistent with the "pure, framework-free `$lib/theory` module" pattern this file extends into a new `$lib/drills` directory.

**Core pattern — pure function, total (never throws)** (chord.ts lines 18-52, the `spellChord` shape to mirror):
```typescript
export function spellChord(symbol: string): ChordResult {
	const normalized = normalizeSymbol(symbol);
	const chord = Chord.get(normalized);

	if (chord.empty) {
		return { input: symbol, symbol: '', root: '', quality: '', recognized: false, aliases: [], notes: [] };
	}
	// ... success path builds a fully-typed result object
}
```
Apply the same shape to `matchChord`: a pure function taking `(played: Set<number> | number[], target: ChordResult)` and returning a total result object (never throws), e.g. `{ correct: boolean; missing: number[]; extra: number[] }`. Derive target pitch classes from `target.notes` (map letter -> pitch class via `tonal`'s `Note.chroma`, since `spellChord`'s `SpelledNote.letter` is already glyph-normalized — reuse `toAccidentalGlyphs`/reverse via a local ASCII-conversion helper mirroring `chordPresentation.ts`'s `toAsciiAccidentals`, lines 19-21).

**Reused local-normalization pattern** (`chordPresentation.ts` lines 18-21):
```typescript
/** tonal's Interval.distance only understands ASCII accidentals (#/b), not display glyphs (♯/♭). */
function toAsciiAccidentals(letter: string): string {
	return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
}
```
Copy this exact helper (or import-share it) in `matchChord.ts` before feeding letters to `Note.chroma`/`Note.get(...).chroma` from `tonal`.

**Error handling:** No try/catch needed — pure set comparison over numbers is total. Follow `spellChord`'s "never throw, return a total result" discipline (chord.ts lines 76-92, the `roleForDegree` default-fallback comment) rather than any UI-facing error path.

---

### `src/lib/drills/matchChord.test.ts` (test, transform)

**Analog:** `src/lib/theory/chord.test.ts`

**Test structure pattern** (chord.test.ts lines 1-16):
```typescript
import { describe, expect, it } from 'vitest';
import { spellChord } from './chord';

describe('spellChord', () => {
	it('spells Cm7 as the four notes C, E♭, G, B♭', () => {
		const result = spellChord('Cm7');
		expect(result.notes.map((n) => n.letter)).toEqual(['C', 'E♭', 'G', 'B♭']);
	});
	...
```
Mirror this: `describe('matchChord', ...)` blocks per rule (D-01 exact set equality, D-02 extra/missing, enharmonic equivalence via chroma). Test cases to cover directly from CONTEXT.md decisions:
- correct set in any order/octave-duplication is accepted (chroma set, not array)
- extra note -> incorrect with `extra` populated
- missing note -> incorrect with `missing` populated
- enharmonic input (played chroma for C♯ matches a target spelled as D♭) -> correct

---

### `src/lib/drills/generateQuestion.ts` (utility, transform)

**Analog:** `src/lib/theory/randomChord.ts`

**Full pattern to extend** (randomChord.ts lines 1-30, reused directly, not duplicated):
```typescript
export const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7'];

export function randomChord(): string {
	const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
	const quality = QUALITY_SUFFIXES[Math.floor(Math.random() * QUALITY_SUFFIXES.length)];
	return `${root}${quality}`;
}
```
`generateQuestion.ts` should import `randomChord`, `ROOTS`, `QUALITY_SUFFIXES` from `$lib/theory/randomChord` (do not redefine the matrix — CONTEXT.md D-06 explicitly says "via the existing `randomChord`"). Build distractor generation as an additional pure function alongside it, e.g. `pickDistractors(correctSymbol: string, count = 3): string[]`, drawing from the same `ROOTS x QUALITY_SUFFIXES` space and filtering out any candidate that `spellChord`s to the same pitch-class set as the correct answer (enharmonic-identical exclusion, per Claude's Discretion in CONTEXT.md). Also add a `pickQuestionType(): 'construction' | 'identification'` pure random-choice function, same `Math.random()` style as `randomChord`.

**Error handling:** none needed — same total, no-throw style as `randomChord`.

---

### `src/lib/drills/generateQuestion.test.ts` (test, transform)

**Analog:** `src/lib/theory/chord.test.ts` (structure) + `src/lib/lookup/recentLookups.test.ts` (randomness/edge-case coverage style)

Follow the `describe`/`it` per-rule structure. Key cases: distractor set always has exactly 3 entries, none enharmonically equal to the correct answer, all distractors are parseable (`spellChord(...).recognized === true`), and repeated calls vary (non-deterministic but bounded — assert membership in `ROOTS`/`QUALITY_SUFFIXES`, not exact values, same spirit as `randomChord` having no dedicated test file currently — this phase adds the first one).

---

### `src/lib/components/PianoKeyboard.svelte` (extend, interactive mode)

**Analog:** itself (current display-only version)

**Existing prop/derived pattern to preserve unchanged when `interactive` is falsy** (PianoKeyboard.svelte lines 13-18, 112-116):
```typescript
interface Props {
	/** Spelled notes (from the theory engine) to highlight on the keyboard. */
	notes: SpelledNote[];
}

let { notes }: Props = $props();
...
const noteAssignment = $derived(assignNotesToKeys());
```
Extend `Props` with optional `interactive?: boolean`, `selected?: Set<string>`, and an `onToggle?: (letter: string) => void` callback prop (Svelte 5 callback-prop convention, matching `RecentChipRow`'s `onselect: (symbol: string) => void` pattern below). Default `interactive = false` so the existing lookup/showcase call sites (`<PianoKeyboard notes={result.notes} />` in `+page.svelte` line 189) render byte-for-byte identical output — add a non-regression test asserting this in `components.test.ts`.

**Callback-prop convention to copy** (`RecentChipRow.svelte` lines 10-16):
```typescript
interface Props {
	recent: string[];
	onselect: (symbol: string) => void;
}

let { recent, onselect }: Props = $props();
```
```svelte
onclick={() => onselect(symbol)}
```
Use the same shape for the keyboard's toggle callback: `onclick={() => onToggle?.(key.letter)}` per key, gated by `interactive`.

**Per-key rendering to extend** (PianoKeyboard.svelte lines 157-176, the `{#each whiteKeys}` / `{#each blackKeys}` blocks) — add conditionally, only when `interactive`:
```svelte
{#if interactive}
	role="button"
	tabindex="0"
	aria-pressed={selected?.has(key.letter)}
	aria-label={`${key.letter} key${selected?.has(key.letter) ? ', selected' : ''}`}
	onclick={() => onToggle?.(key.letter)}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(key.letter); } }}
{/if}
```
Add a `piano-keyboard__key--selected` CSS class (hatch texture via `repeating-linear-gradient`, per UI-SPEC) alongside the existing interval-role classes (lines 211-225: `.piano-keyboard__key--root`, `--third`, `--fifth`, `--seventh`), applied only when a key is in `selected` and NOT already carrying an interval-role class (selected and revealed-correct are mutually exclusive states per UI-SPEC).

**No `NoteLabel`s on merely-selected keys** — the existing conditional (`{#if key.note}<NoteLabel .../>{/if}`, lines 162-165 & 172-174) stays keyed off `key.note` (interval-highlight data) only; selection never triggers a `NoteLabel` render, per UI-SPEC constraint.

---

### `src/lib/components/components.test.ts` (extend)

**Analog:** itself (existing file — read its current PianoKeyboard assertions first, then append)

Add test cases for: (1) non-regression — `interactive` omitted/false renders identical markup/no `role="button"` on keys, matching current display-only assertions; (2) clicking a key in interactive mode calls `onToggle` with the correct letter; (3) `aria-pressed`/`aria-label` toggle correctly; (4) Enter/Space keydown also triggers `onToggle` (keyboard-accessibility parity, per UI-SPEC's aria-label pattern `"{letter} key, selected"`).

---

### `src/routes/drills/+page.svelte` (route/component, request-response session loop)

**Analog:** `src/routes/+page.svelte` (lookup page)

**Imports pattern to mirror** (+page.svelte lines 1-13):
```typescript
import { spellChord } from '$lib/theory/chord';
import { formulaFor, aliasLine } from '$lib/lookup/chordPresentation';
import type { ChordResult } from '$lib/theory/types';
import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
import ChordGlyph from '$lib/components/ChordGlyph.svelte';
import IntervalChip from '$lib/components/IntervalChip.svelte';
import Button from '$lib/components/Button.svelte';
```
`drills/+page.svelte` should additionally import `randomChord`/`generateQuestion` helpers from `$lib/drills/generateQuestion` and `matchChord` from `$lib/drills/matchChord`, plus `RecentChipRow`-style small components as needed for `ChoiceGrid` (reuse `Button` ghost variant per UI-SPEC).

**State-management convention (Svelte 5 runes)** (+page.svelte lines 18-23):
```typescript
let symbol = $state('');
let result = $state<ChordResult | null>(null);
let hint = $state('');
let suggestion = $state<string | null>(null);
let recent = $state<string[]>(getRecentLookups());
```
Mirror for drill state: `let currentQuestion = $state<DrillQuestion>(...)`, `let selected = $state<Set<string>>(new Set())`, `let answered = $state(false)`, `let feedback = $state<MatchResult | ChoiceFeedback | null>(null)`, `let score = $state({ correct: 0, streak: 0 })` — all plain in-memory runes state, no persistence (D-10, resets on reload by construction, same as `symbol`/`result` here resetting on reload).

**Action-handler pattern** (+page.svelte lines 43-68, `showChord`) — same shape to copy for `checkAnswer()`/`selectChoice()`: compute a result via a pure lib function, then branch success/failure by directly mutating `$state` variables (no local component classes, no external store):
```typescript
function showChord(input: string) {
	const cleaned = input.trim();
	const spelled = spellChord(cleaned);
	if (spelled.recognized) {
		result = spelled;
		...
	} else {
		...
	}
}
```

**Composition/markup pattern** (+page.svelte lines 175-202, the `{#if result?.recognized}` "stamp" result block) — reuse this exact structure for the wrong-answer teaching reveal:
```svelte
<div class="stamp mt-8" data-testid="chord-result">
	<ChordGlyph root={result.root} quality={...} />
	<PianoKeyboard notes={result.notes} />
	<div class="mt-6 flex gap-4" data-testid="interval-formula">
		{#each formulaFor(result) as entry (entry.role + entry.letter)}
			<IntervalChip role={entry.role} label={entry.label} />
			<span>{entry.letter}</span>
			<span>{entry.solfege}</span>
		{/each}
	</div>
</div>
```
This is directly reusable, unmodified, for `FeedbackBanner`'s "Here is the shape:" reveal (UI-SPEC), driven off the target `ChordResult` (from `spellChord`) rather than the lookup input.

**Stamp animation reuse** (+page.svelte lines 219-235, `<style>` block):
```css
.stamp {
	animation: stamp-in 240ms ease-out;
}
@keyframes stamp-in {
	0% { transform: scale(0.96); opacity: 0; }
	60% { transform: scale(1.02); opacity: 1; }
	100% { transform: scale(1); }
}
```
Copy verbatim into `drills/+page.svelte` (or hoist to a shared location if the planner prefers, but UI-SPEC explicitly says "reuses the existing `.stamp` keyframe... never a new animation" — do not redefine, duplicate the exact same CSS block since Svelte scopes `<style>` per-component and there is no existing shared stylesheet for animations beyond `app.css` tokens).

**Root markup shell** (+page.svelte lines 105-107):
```svelte
<main class="bg-paper text-ink min-h-screen p-8 font-sans">
	<h1 class="text-heading mt-2 font-bold">Chord lookup</h1>
```
Mirror with `<h1 class="text-heading mt-2 font-bold">Drills</h1>` per Copywriting Contract.

---

### `src/routes/+layout.svelte` (modify `navLinks`)

**Analog:** itself

**Exact change** (layout.svelte lines 8-11):
```typescript
const navLinks = [
	{ href: '/', label: 'Lookup' },
	{ href: '/showcase', label: 'Showcase' }
];
```
becomes:
```typescript
const navLinks = [
	{ href: '/', label: 'Lookup' },
	{ href: '/drills', label: 'Drills' },
	{ href: '/showcase', label: 'Showcase' }
];
```
No other change needed — the `{#each navLinks}` render block (lines 20-29) and all `.masthead__link` styling are untouched, per D-13 and the UI-SPEC's "Zero new visual contract" note.

---

### `tests/drills.e2e.test.ts` (e2e test)

**Analog:** `tests/lookup.e2e.test.ts`

**File-level setup pattern** (lookup.e2e.test.ts lines 1-16):
```typescript
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import LookupPage from '../src/routes/+page.svelte';

beforeEach(() => {
	localStorage.clear();
});
```
`drills.e2e.test.ts` imports `DrillsPage from '../src/routes/drills/+page.svelte'`. No localStorage dependency for this phase (in-memory score only, D-10), so `beforeEach` cleanup may be unnecessary unless `generateQuestion`'s randomness needs seeding/mocking for determinism — consider mocking `Math.random` (via `vi.spyOn(Math, 'random')`) for deterministic question/distractor assertions, a pattern not yet present in this codebase but consistent with "no flaky e2e" discipline.

**Test-per-scenario style** (lookup.e2e.test.ts throughout, e.g. lines 18-46, 118-135): one `describe` per user-facing behavior, `data-testid` driven queries (`getByTestId`, `within(...)`) over brittle CSS selectors, `getByRole`/`getByText` for accessible content. Scenarios to cover for drills: construction flow (select keys, Check enabled only when ≥1 selected, correct/incorrect feedback, `PlayedVsCorrectDiff` on wrong answer), identification flow (tap a `ChoiceGrid` option grades immediately, no Check step), `Next` advances to a new question and clears feedback, `ScoreRegister` increments/reset-on-wrong-streak text matches `{n} RIGHT · {n} STREAK` format exactly (mid-dot glyph, not em dash — assert the literal `·` character), masthead `Drills` link present (`getByRole('link', { name: 'Drills' })`, mirroring the note that masthead assertions are usually separate but this phase's own nav-link addition may warrant one focused assertion here or in a lightweight layout test).

---

## Shared Patterns

### Pure module conventions ($lib/theory, $lib/lookup, extending into $lib/drills)
**Source:** `src/lib/theory/chord.ts`, `src/lib/theory/randomChord.ts`, `src/lib/lookup/chordPresentation.ts`
**Apply to:** `matchChord.ts`, `generateQuestion.ts`
- No DOM, no Svelte, no audio imports — pure functions only, total (never throw).
- JSDoc block comment above each exported function/const explaining the "why," referencing which decision/requirement ID it satisfies (e.g. "D-01", "THEORY-02") when applicable.
- Co-located `*.test.ts` next to the source file, using `describe`/`it` from `vitest`.
- ASCII-accidental conversion helpers (`toAsciiAccidentals`/`toAccidentalGlyphs`) are duplicated locally per module rather than imported cross-module — follow that existing precedent rather than introducing a new shared utility file, unless the planner decides a `$lib/theory/accidentals.ts` extraction is warranted (not currently done, so default to the existing precedent of local copies).

### Svelte 5 runes state + callback props
**Source:** `src/routes/+page.svelte` (`$state`), `src/lib/components/RecentChipRow.svelte` (callback props), `src/lib/components/PianoKeyboard.svelte` (`$derived`)
**Apply to:** `drills/+page.svelte`, `PianoKeyboard.svelte` interactive-mode extension
```typescript
let selected = $state<Set<string>>(new Set());
const noteAssignment = $derived(assignNotesToKeys());
```
```svelte
<Component onaction={(arg) => handleSomething(arg)} />
```

### Button component reuse (no forking)
**Source:** `src/lib/components/Button.svelte`
**Apply to:** `Check`, `Clear`, `Next`, `ChoiceGrid` options
```svelte
<Button type="button" variant="ghost" onclick={...}>Clear</Button>
<Button type="button" variant="primary" onclick={...}>Check</Button>
```
`disabled` state for `Check` (until ≥1 key selected) uses the native `disabled` attribute passed through `HTMLButtonAttributes` (`Button.svelte` line 10, `interface Props extends HTMLButtonAttributes`), no new variant needed.

### `.stamp` animation reuse (never a new keyframe)
**Source:** `src/routes/+page.svelte` lines 219-235
**Apply to:** right-answer `FeedbackBanner`

### Interval-color rendering reuse (`PianoKeyboard`, `IntervalChip`, `NoteLabel`, `formulaFor`)
**Source:** `src/routes/+page.svelte` lines 175-201
**Apply to:** identification prompt's pre-highlighted keyboard, wrong-answer teaching reveal — unmodified, exact reuse per UI-SPEC's explicit "do not fork copies" instruction.

### Masthead nav pattern
**Source:** `src/routes/+layout.svelte` lines 8-11, 20-29
**Apply to:** `Drills` nav link — one-line array addition, zero new styling.

## No Analog Found

None — every new/modified file this phase has a clear, close analog already in the codebase (this phase is explicitly designed to extend Phase 1/2 patterns rather than introduce new architectural shapes).

## Metadata

**Analog search scope:** `src/lib/**`, `src/routes/**`, `tests/**` (entire existing app; codebase is small, ~10 source files + 2 e2e suites)
**Files scanned:** 19 (all existing `.svelte`/`.ts` files under `src/`, plus both `tests/*.e2e.test.ts` files, plus `src/app.css` for token contract confirmation)
**Pattern extraction date:** 2026-07-13
