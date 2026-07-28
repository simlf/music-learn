# Phase 35: Inversions — New Drill Family - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 9 (new/modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/components/InversionDrill.svelte` (new) | component (drill) | request-response (grade-on-check, embed-seam) | `src/lib/components/PracticeChordDrill.svelte` (embed-prop shape) + `src/lib/components/ProgressionDrill.svelte` (inline hint-ladder + maturity read) | exact (composite) |
| `src/lib/drills/matchInversion.ts` (new) | utility (pure grading) | transform | `src/lib/drills/matchChord.ts` | exact (compose-not-duplicate) |
| `src/lib/practice/practiceQueue.ts` (modified) | service (queue composer) | event-driven/batch | itself — extend `PracticeFamily`, `familyForCard`/synthetic-item precedent | exact |
| `src/lib/srs/facts.ts` (modified) | model (fact catalog) | CRUD (read-only catalog) | itself — `scaleFormulaFactId` non-CATALOG additive precedent | exact |
| `src/lib/components/PianoKeyboard.svelte` (modified — new `bassHint` prop) | component | request-response (render) | itself — `ghostKeys` prop precedent (same file) | exact |
| `src/lib/components/CountingChipRow.svelte` (modified — new `rotateFromRole` prop) | component | transform (render) | itself — `stackedThirdsFor` gap-derivation precedent (same file + `chordPresentation.ts`) | exact |
| `src/lib/i18n/messages/inversions.ts` (new) | config (i18n domain) | request-response (lookup) | `src/lib/i18n/messages/progressions.ts` (structural precedent, not read in this pass — see note) | role-match |
| `src/lib/practice/inversions.ts` (new, likely name — pool/rotation helper) | service (pure engine) | transform | `src/lib/practice/shellVoicing.ts` | exact |
| test files (`*.test.ts`, `*.embed.test.ts`) | test | — | `ShellVoicingDrill.embed.test.ts` / `ProgressionDrill.embed.test.ts` / `matchChord.test.ts` | exact |

## Pattern Assignments

### `src/lib/components/InversionDrill.svelte` (new)

**Analog A — embed-prop shape:** `src/lib/components/PracticeChordDrill.svelte`

**Props + one-shot init read** (lines 54-74):
```typescript
interface Props {
	symbol: string;
	onComplete: (correct: boolean) => void;
}
let { symbol, onComplete }: Props = $props();

const target = untrack(() => spellChord(symbol));
const question = untrack(
	() => generateQuestion({ symbol, direction: 'identification' }) as ChordQuestion
);
```
Copy this shape for `InversionDrill`'s props (`symbol`, `inversionIndex`, `onComplete`), both read once via `untrack()` per UI-SPEC §1 — a fresh component instance per queue item, never a reactive re-derivation.

**Completion callback** (lines 99-101):
```typescript
function handleNext(): void {
	onComplete(correct);
}
```

**Analog B — inline escalating hint ladder + maturity read:** `src/lib/components/ProgressionDrill.svelte`

**Self-contained staleness-guarded maturity read** (lines 108-141):
```typescript
let cards = $state<CardRecord[]>([]);
let cardsLoaded = $state(false);

async function loadCards(forSymbol: string) {
	cardsLoaded = false;
	try {
		const all = await getAllCards();
		if (forSymbol !== currentBar?.symbol) return; // stale response
		cards = all.filter((card) => card.factId === `chord-formula:${forSymbol}`);
	} catch {
		if (forSymbol === currentBar?.symbol) cards = [];
	} finally {
		if (forSymbol === currentBar?.symbol) cardsLoaded = true;
	}
}

$effect(() => {
	const symbol = currentBar?.symbol;
	if (symbol === undefined) return;
	void loadCards(symbol);
});

const stage = $derived.by((): VoicingStage => voicingStageForChord(cards));
```
For `InversionDrill`, key the `factId` filter to whatever inversion-card factId shape the planner settles on (e.g. `chord-inversion:{symbol}:{inversionIndex}` or a chord-formula variant) — same staleness guard, same `voicingStageForChord(cards)` call, no new maturity function (locked by 35-CONTEXT).

**Rung offering by stage** (lines 229-234):
```typescript
const offeredRungs = $derived.by((): HintLayer[] => {
	if (stage === 'meet') return ['degree', 'count', 'ghost'];
	if (stage === 'subtract') return ['count', 'ghost'];
	return [];
});
```
Rename layers to `'bass' | 'stack' | 'ghost'` per UI-SPEC §5/§7 table (meet: all 3; subtract: drops `bass`; drill: none) — identical shape, different layer names/copy keys.

**Depth state + reset-on-item-change-only (never on wrong Check)** (lines 237-247):
```typescript
let hintDepth = $state(0);
$effect(() => {
	void cursor;
	hintDepth = 0;
});
function revealHint(): void {
	hintDepth = Math.min(hintDepth + 1, offeredRungs.length);
}
```
For `InversionDrill`, since it's one-item-per-instance (no `cursor`), simply initialize `hintDepth = 0` at declaration — no reset effect needed (a fresh instance already gives depth 0).

**Ghost keys derivation pinned to fixed base octave** (lines 212-227):
```typescript
const KEYBOARD_BASE_OCTAVE = 4;
const GHOST_MARKER_BY_ROLE: Partial<Record<SpelledNote['role'], string>> = {
	root: 'R', third: '3', fifth: '5', seventh: '7'
};
const ghostKeysForCurrentBar = $derived.by(() => {
	if (!currentChord?.recognized) return [];
	return currentChord.notes.flatMap((note) => {
		const marker = GHOST_MARKER_BY_ROLE[note.role];
		return marker ? [{ letter: note.letter, octave: KEYBOARD_BASE_OCTAVE, marker }] : [];
	});
});
```
Reuse `KEYBOARD_BASE_OCTAVE = 4` verbatim for the new `bassHint` derivation (UI-SPEC §3): `{ letter: bassNote.letter, octave: KEYBOARD_BASE_OCTAVE }`.

**Rung markup / reveal control / closing line** (lines 447-486): copy the `{#if cardsLoaded && offeredRungs.length > 0 ...}` block structure, the `hint stamp` class + `data-layer` attribute, the reveal-button-vs-closing-line branch (`hintDepth < offeredRungs.length`), and `data-testid` prefixing convention (this phase uses `inversion-` per UI-SPEC §5 instead of `progression-`).

**Grading pattern to adapt (not copy verbatim — chroma+bass, not chroma-only)** (lines 310-323):
```typescript
function checkPlay(): void {
	if (!currentBar) return;
	const target = spellChord(currentBar.symbol);
	const playedChroma = new Set(
		[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
	);
	const result = matchChord(playedChroma, target);
	selected = new Set();
	if (!result.correct) { playRetry = true; return; }
	// ... earn + advance
}
```
`InversionDrill`'s `handleCheck` composes `matchInversion` instead of `matchChord` directly (see below), and needs the parallel `pressedOctaveByLetter: Map<string, number>` local state (fed by `PianoKeyboard`'s existing `onPress` callback, UI-SPEC §4) to derive `playedBassChroma` — this is genuinely new local state, not present in either analog, but wires into the SAME `onToggle`/`selected` pair `ProgressionDrill` already uses for the visual hatch (lines 300-308, 430-437):
```typescript
function toggleKey(letter: string): void {
	const next = new Set(selected);
	if (next.has(letter)) { next.delete(letter); } else { next.add(letter); }
	selected = next;
}
```
and:
```svelte
<PianoKeyboard
	notes={[]}
	interactive
	{selected}
	onToggle={toggleKey}
	octaves={stage === 'drill' ? 2 : 1}
	ghostKeys={ghostHintRevealed ? ghostKeysForCurrentBar : []}
/>
```
For `InversionDrill`: add `onPress={handlePress}` to populate `pressedOctaveByLetter`, and `bassHint={...}` per UI-SPEC §3 (NOT gated on `!role`, unlike `ghostKeys`).

**Retry/reveal line pattern (two distinct retry lines, per UI-SPEC copy contract)** — mirror `ProgressionDrill`'s `nameRetry`/`playRetry` two-boolean-state shape (lines 89-90, 320-325), but branch on `matchInversion`'s `chordCorrect`/`bassCorrect` fields instead of a single `matchChord.correct`.

**Stamp-in CSS** (lines 640-676): copy `.stamp { animation: stamp-in 240ms ease-out; }`, `.hints { display:flex; flex-direction:column; gap:3px; }`, `.hint { background: var(--color-paper-bright); padding: var(--spacing-md); }`, `.hint-cta :global(.ps-button--ghost) { border-style: dashed; ... }` verbatim — these are the exact CSS classes UI-SPEC §Spacing/Color says to reuse.

---

### `src/lib/drills/matchInversion.ts` (new)

**Analog:** `src/lib/drills/matchChord.ts`

**File shape + JSDoc style + pure-function signature to mirror** (full file, lines 1-41):
```typescript
import { Note } from 'tonal';
import { toAsciiAccidentals } from '$lib/theory/interval';
import type { ChordResult } from '$lib/theory/types';

export interface MatchResult {
	correct: boolean;
	missing: number[];
	extra: number[];
}

export function matchChord(played: Set<number> | number[], target: ChordResult): MatchResult {
	const playedChroma = new Set(played);
	const targetChroma = new Set(target.notes.map((note) => Note.chroma(toAsciiAccidentals(note.letter))));
	const missing = [...targetChroma].filter((chroma) => !playedChroma.has(chroma));
	const extra = [...playedChroma].filter((chroma) => !targetChroma.has(chroma));
	return { correct: missing.length === 0 && extra.length === 0, missing, extra };
}
```
`matchInversion` composes this (per 35-CONTEXT: "reuse the existing `matchChord` chroma-set path; add a bass-note check" — never duplicate the chroma-set arithmetic):
```typescript
export interface InversionMatchResult {
	correct: boolean;
	chordCorrect: boolean;
	bassCorrect: boolean;
	missing: number[];
	extra: number[];
}

export function matchInversion(
	played: Set<number>,
	playedBassChroma: number | undefined,
	target: ChordResult,
	bassChroma: number
): InversionMatchResult {
	const chordResult = matchChord(played, target);
	const bassCorrect = playedBassChroma === bassChroma;
	return {
		correct: chordResult.correct && bassCorrect,
		chordCorrect: chordResult.correct,
		bassCorrect,
		missing: chordResult.missing,
		extra: chordResult.extra
	};
}
```

**Test analog:** `src/lib/drills/matchChord.test.ts` — mirror its pure-function unit-test shape (Set/array inputs, boundary cases: empty played set, extra notes, missing notes) plus new bass-specific cases (right chroma wrong bass, right bass wrong chroma).

---

### `src/lib/practice/practiceQueue.ts` (modified)

**Analog:** itself — the existing `'voicing'`/`'progression'` synthetic-family addition precedent

**Family union to extend** (line 43):
```typescript
export type PracticeFamily = 'name-it' | 'build-it' | 'interval' | 'voicing' | 'progression';
```
→ append `| 'inversion'`.

**If inversion is FSRS-carded (like name-it/build-it/interval):** extend `familyForCard` (lines 89-97):
```typescript
export function familyForCard(card: CardRecord): CardedFamily | null {
	if (card.factKind === 'chord-formula') {
		return card.mode === 'formula-build' ? 'build-it' : 'name-it';
	}
	if (card.factKind === 'interval-size') {
		return 'interval';
	}
	return null;
}
```
Add a branch for the new `FactKind` (e.g. `'chord-inversion'`) returning `'inversion'`; also add `'inversion'` to `CardedFamily` (line 46) and to `isCardedItem`'s discriminant (lines 343-345):
```typescript
function isCardedItem(item: HybridQueueItem): item is CardedQueueItem {
	return item.family === 'name-it' || item.family === 'build-it' || item.family === 'interval';
}
```

**If inversion is synthetic (like voicing/progression):** mirror `syntheticVoicingItems` (lines 142-149):
```typescript
export function syntheticVoicingItems(symbolCards: Map<string, CardRecord[]>): VoicingQueueItem[] {
	return seventhChordSymbols().map((symbol) => ({
		id: `voicing:${symbol}`,
		family: 'voicing',
		symbol,
		stage: voicingStageForChord(symbolCards.get(symbol) ?? [])
	}));
}
```
and add a new `InversionQueueItem` to the `HybridQueueItem` union (line 79) mirroring `VoicingQueueItem`/`ProgressionQueueItem` (lines 62-76).

**REG-01 guard — `composePracticeQueue` itself needs NO change** (lines 241-340, especially the family-run/no-3-in-a-row loop at 266-337 and the G2 same-symbol anti-adjacency at 276-285): it iterates `byFamily` generically over whatever `PracticeFamily` values are present, so adding `'inversion'` to the union and emitting items with `family: 'inversion'` is sufficient — do not touch the weave algorithm (Phase 36 owns cold-session ordering changes to this same function; this phase must not race it).

**Test analog:** `src/lib/practice/practiceQueue.test.ts` — mirror its per-family fixture-building + `composePracticeQueue` interleave assertions for the new family.

---

### `src/lib/srs/facts.ts` (modified)

**Analog:** itself — the `scale-formula` additive-without-CATALOG-entry precedent (lines 120-130):
```typescript
export function scaleFormulaFactId(tonic: string): string {
	return `scale-formula:${tonic}`;
}
```
Note `'scale-formula'` IS in the `FactKind` union (line 28) but has NO corresponding `Fact` union member and is NEVER added to `CATALOG`/`allFacts()` (per the comment at lines 120-127) — `introduceNewCards` iterates `allFacts()` unconditionally and would break if a scale-formula fact were added there. **This is the load-bearing precedent for INV-03's "no schema migration" constraint**: if the planner chooses a new `'chord-inversion'` FactKind, follow this exact shape — add the string to `FactKind` (line 28), do NOT add a new `Fact` union member or push anything into `CATALOG`, and expose a pure `factId`-builder function analogous to `scaleFormulaFactId`, e.g.:
```typescript
export function chordInversionFactId(symbol: string, inversionIndex: number): string {
	return `chord-inversion:${symbol}:${inversionIndex}`;
}
```
This keeps `Dexie`'s stored `CardRecord.factKind`/`factId` shape (just strings) byte-compatible with zero schema version bump, satisfying 35-CONTEXT's binding rule.

**Alternative (chord-formula + inversion mode):** if the planner instead extends `Mode` (in `src/lib/srs/deck.ts`, not read in this pass — read it before finalizing) with an inversion-drill mode rather than a new FactKind, mirror `buildChordFormulaFacts`' existing loop shape (lines 54-71) — no new file needed, just a new `Mode` string value, which is equally additive (a `Mode` field is also just a string in the Dexie record).

---

### `src/lib/components/PianoKeyboard.svelte` (modified — new `bassHint` prop)

**Analog:** itself — the `ghostKeys` prop (lines 90-183 area, plus the gated-prop precedent generally)

**Prop shape to mirror** (`ghostKeys`, JSDoc + type):
```typescript
/**
 * { letter, octave, marker } keys whose already-role-lit key should sit dimmed... [chroma+octave matched, gated `!role`]
 */
ghostKeys?: { letter: string; octave: number; marker: string }[];
```

**Matching-by-chroma-and-octave helper to mirror** (`ghostEntryFor`/`ghostClass`, lines ~607-644):
```typescript
function ghostEntryFor(letter, octave, ...) {
	if (!ghostKeys?.length) return undefined;
	// chroma+octave match, not letter-string match
	return ghostKeys.find(/* chroma(letter)===chroma(entry.letter) && octave===entry.octave */);
}
function ghostClass(letter: string, octave: number, role: IntervalRole | undefined): string {
	return !role && ghostEntryFor(letter, octave) ? 'piano-keyboard__key--ghost' : '';
}
```
**Key difference for `bassHint` (UI-SPEC §3, explicitly called out):** unlike `ghostClass`/`selectedClass`/`pendingClass`, the new `bassHintClass` must NOT be gated on `!role` — it must render whether the matching key already carries a role fill, a ghost hatch, or neither, since "which of the 4 already-colored notes is the bass" is the pedagogy. New prop:
```typescript
bassHint?: { letter: string; octave: number } | null;
```
New CSS (verbatim from UI-SPEC, mirrors the `data-ghost`/`::after` idiom already at lines ~683/740):
```css
.piano-keyboard__key--bass-ring { outline: 3px solid var(--color-ink); outline-offset: -3px; z-index: 4; }
.piano-keyboard__key--bass-ring::after {
  content: attr(data-bass); position: absolute; top: 2px; left: 2px; z-index: 5;
  font-family: var(--font-mono); font-size: 8px; font-weight: 700;
  background: var(--color-ink); color: #fff; padding: 1px 3px;
}
```
Wire the `data-bass` attribute the same way `data-ghost={ghostMarker(...)}` is wired at the white/black key template lines (~683, ~740). Omitting `bassHint` must leave every existing render byte-identical (same convention as `ghostKeys`, `pendingKeys`).

**Test analog:** any existing `PianoKeyboard.svelte` test covering `ghostKeys` chroma+octave matching — mirror its fixture shape for `bassHint` tests (single-key match, enharmonic spelling, role-fill-present-and-absent cases since bass-ring is NOT role-gated).

---

### `src/lib/components/CountingChipRow.svelte` (modified — new `rotateFromRole` prop)

**Analog:** itself — `stackedThirdsFor` derivation (this component, lines 43-45, backed by `src/lib/lookup/chordPresentation.ts` lines 59-75)

**Current root-anchored derivation to extend, not replace:**
```typescript
// CountingChipRow.svelte
let stacked = $derived(stackedThirdsFor(chord));
```
```typescript
// chordPresentation.ts
export function stackedThirdsFor(chord: ChordResult): StackedThirds {
	const tones = formulaFor(chord);
	const gaps: StackedGap[] = chord.notes.slice(0, -1).map((note, i) => {
		const info = intervalBetween(note.letter, chord.notes[i + 1].letter);
		return { label: '+' + info.short, longFr: info.longFr };
	});
	return { tones, gaps };
}
```
**New prop** (per UI-SPEC §6, additive, omitted = byte-identical):
```typescript
/** Rotates the tone/gap row to start at this role instead of canonical root-first order (Phase 35, INV-02). */
rotateFromRole?: IntervalRole;
```
**Implementation approach:** when `rotateFromRole` is set, rotate `chord.notes` (not `stacked.tones`, since gaps must be recomputed on the rotated order) to start at the tone whose `role === rotateFromRole`, THEN call the same `intervalBetween(note.letter, next.letter)` gap logic `stackedThirdsFor` already uses on every CONSECUTIVE pair of the rotated array — do not hand-roll semitone math; either (a) add a `startRole?: IntervalRole` param to `stackedThirdsFor` itself in `chordPresentation.ts` (cleanest single-source-of-truth, since both `formulaFor` and the gap loop already iterate `chord.notes` in whatever order is passed) or (b) rotate the array locally in `CountingChipRow.svelte` before calling `stackedThirdsFor`. Prefer (a): it keeps the "one source of truth" derivation in the same pure module every existing caller (WhyTheseNotes, this component) already trusts.

**Existing neutral non-third-gap treatment to reuse verbatim** (lines 170-178 CSS, `gapModifier` function lines 56-60):
```typescript
function gapModifier(label: string): string {
	const stripped = label.replace(/^\+/, '');
	if (stripped === 'm3' || stripped === 'M3') return stripped;
	return 'other';
}
```
```css
.gap-chip.other {
	background: none;
	border: 2px dashed var(--color-faint);
	color: var(--color-muted);
}
```
This already-shipped "other" gap state (added for WR-02's sus4/6/9/13 case) is the exact treatment the rotated row's non-third gap(s) should fall into — no new visual state needed, confirmed by UI-SPEC §6.

**Role-tinted tone chip CSS to leave untouched** (lines 109-142): role colors (`root`/`third`/`fifth`/`seventh` etc.) stay fixed regardless of rotation — this is the whole teaching point, per both 35-CONTEXT and UI-SPEC's locked color section.

---

## Shared Patterns

### One-shot init-read via `untrack()` for embed-seam components
**Source:** `PracticeChordDrill.svelte` lines 61-74, `ProgressionDrill.svelte` lines 79-83
**Apply to:** `InversionDrill.svelte`'s `symbol`/`inversionIndex` props — read once at init, never re-derived reactively; a fresh component instance is expected per queue item (host remounts on queue advance).

### Self-contained staleness-guarded FSRS maturity read
**Source:** `ProgressionDrill.svelte` lines 108-141, reusing `shellVoicing.ts`'s `voicingStageForChord`
**Apply to:** `InversionDrill.svelte` — call `getAllCards()`, guard the response against the component having moved on (not applicable for single-shot InversionDrill unless it's reused across a rung of items; still worth keeping the try/catch-fails-closed-to-cold-default shape), filter to the drilled item's own factId, then `voicingStageForChord(cards)` verbatim — no new maturity metric.

### Inline (non-shared-component) escalating hint ladder
**Source:** `ProgressionDrill.svelte` lines 160-272 (state/logic) + 447-486 (markup) + 636-676 (CSS)
**Apply to:** `InversionDrill.svelte`'s hint ladder — same `hintDepth`/`offeredRungs`/`revealHint()`/stage-gated rung list shape, renamed to `'bass' | 'stack' | 'ghost'`, `data-testid` prefix `inversion-` per UI-SPEC §5. Do NOT extend the shared `HintLadder.svelte` (same rationale Phase 34 already established: fixed layer-kind API doesn't fit, and grafting a new layer kind risks REG-01 on `RecallSession`/`BuildSession`).

### Chroma-set grading, compose don't duplicate
**Source:** `matchChord.ts` (full file)
**Apply to:** `matchInversion.ts` — call `matchChord(played, target)` internally for the `chordCorrect` field rather than reimplementing chroma-set comparison; add only the bass-chroma equality check.

### Additive `FactKind`/queue-family extension without a Dexie migration
**Source:** `facts.ts` lines 28, 120-130 (the `scale-formula` non-CATALOG precedent); `practiceQueue.ts` lines 43, 89-97, 142-149
**Apply to:** `facts.ts` (new FactKind value, no new Fact union member if following the scale-formula shape) and `practiceQueue.ts` (`PracticeFamily` union + either `familyForCard` branch or a new synthetic-item builder). Both are pure string/type additions — no `Mode`/`FactKind`/`PracticeFamily` value removed or renamed, so every existing test asserting on the old unions stays green.

### Gated, chroma+octave-matched, additive `PianoKeyboard` props
**Source:** `PianoKeyboard.svelte`'s `ghostKeys`/`pendingKeys` precedent (component-wide convention, e.g. lines 183, 600-644)
**Apply to:** the new `bassHint` prop — matched by chroma+octave (never letter string, so enharmonic spellings still land correctly), omission leaves prior renders byte-identical. Exception to the pattern: `bassHint` must NOT be gated on `!role` (unlike every existing example) — call this out explicitly in the implementation since it is the one place this phase's new prop deviates from the established convention.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/i18n/messages/inversions.ts` | config (i18n domain) | request-response (lookup) | Not read in this pass (structural precedent `progressions.ts` identified by UI-SPEC §Copywriting but its exact file contents weren't loaded here — read it directly before authoring `inversions.ts`; UI-SPEC already specifies "mirror its Symbol-Immunity comment block verbatim" and registration in `messages/index.ts`). |
| `src/lib/practice/inversions.ts` (pool/rotation helper, name TBD by planner) | service (pure engine) | transform | Closest analog (`shellVoicing.ts`) covers maturity-stage and note-subset derivation but not inversion-rotation-from-bass or the triad-vs-seventh inversion-count table (UI-SPEC §8) — planner/executor will need to author this fresh, deriving inversion note-order from `tonal`/`spellChord` output per 35-CONTEXT's "no new theory source" constraint. |

## Metadata

**Analog search scope:** `src/lib/components/`, `src/lib/practice/`, `src/lib/drills/`, `src/lib/srs/`, `src/lib/lookup/`
**Files scanned:** ~20 (targeted Read/Grep, no full-tree scan)
**Pattern extraction date:** 2026-07-27
