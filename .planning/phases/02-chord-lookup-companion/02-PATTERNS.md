# Phase 2: Chord Lookup Companion - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 8 (new/modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/routes/+layout.svelte` (modify) | component (shell) | request-response (nav render) | `src/routes/+layout.svelte` (current, minimal) | exact (self, extend in place) |
| `src/routes/+page.svelte` (rewrite: lookup page) | component (page) | request-response (form submit → render) | `src/routes/showcase/+page.svelte` | exact — this IS the blueprint per CONTEXT.md |
| `src/lib/components/LookupForm.svelte` (new, extracted) | component | request-response | `src/routes/showcase/+page.svelte` (form + STARTER_CHORDS block, lines 102-137) | exact — extraction source |
| `src/lib/components/RecentChipRow.svelte` (new) | component | CRUD (localStorage read/render) | `src/routes/showcase/+page.svelte` starter-chip `{#each}` block (lines 125-136) + `Button` ghost variant | role-match |
| `src/lib/recent/recentLookups.ts` (new) | utility/store | CRUD (localStorage) | none in-repo (first persistence code) — pattern from `src/lib/theory/randomChord.ts` (pure function module style, no framework coupling) | partial — style-only analog |
| `src/lib/theory/didYouMean.ts` (new) | utility | transform (string heuristic) | `src/lib/theory/randomChord.ts` (pure, tested, no DOM) + `src/lib/copy/hints.ts` (rotating variants pattern) | role-match |
| `src/lib/copy/hints.ts` (modify — add suggestion variants) | utility (copy data) | transform | `src/lib/copy/hints.ts` (self, extend) | exact |
| `src/lib/lookup/showChord.ts` or similar extracted composition (new, per Discretion) | service/utility | transform + event-driven (page state orchestration) | `src/routes/showcase/+page.svelte` `formulaFor`/`aliasLine`/`showChord`/`showChordFromSymbol` functions (lines 34-95) | exact — extraction source |

## Pattern Assignments

### `src/routes/+page.svelte` (page component, request-response) — becomes the Lookup page

**Analog:** `src/routes/showcase/+page.svelte` (entire file — this is the explicit blueprint per `02-CONTEXT.md` canonical refs)

**Imports pattern** (lines 1-11):
```svelte
<script lang="ts">
	import { Interval } from 'tonal';
	import { spellChord } from '$lib/theory/chord';
	import { randomChord } from '$lib/theory/randomChord';
	import { pickHint } from '$lib/copy/hints';
	import { playChord } from '$lib/audio/playChord';
	import type { ChordResult, IntervalRole } from '$lib/theory/types';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import IntervalChip from '$lib/components/IntervalChip.svelte';
	import Button from '$lib/components/Button.svelte';
</script>
```
New page should follow the same import shape, swapping `randomChord`/"surprise me" out (showcase-only per CONTEXT.md) and adding `$lib/recent/recentLookups`, `$lib/theory/didYouMean`, and whichever extracted `$lib` module houses `formulaFor`/`aliasLine`/`showChord`.

**State + submit pattern** (lines 16-18, 92-95):
```svelte
let symbol = $state('');
let result = $state<ChordResult | null>(null);
let hint = $state('');
...
function handleSubmit(event: SubmitEvent) {
	event.preventDefault();
	showChord(symbol);
}
```
Reuse verbatim for the lookup page's `$state` shape. Add autofocus + type-over-select behavior (new, not in showcase) via a bound input element and `element.select()` after result renders — no existing analog for this specific interaction; implement directly in the page using Svelte's `bind:this` + `$effect` or the input's `oninput`/submit handler completing.

**Non-blocking error pattern** (lines 52-63) — critical, must be preserved exactly:
```typescript
function showChord(input: string) {
	const spelled = spellChord(input);
	if (spelled.recognized) {
		// Non-blocking success: replace the rendered result and clear any hint.
		result = spelled;
		hint = '';
	} else {
		// Non-blocking error (D-08): keep the previously rendered chord visible,
		// only surface a rotating hint in the error bar.
		hint = pickHint();
	}
}
```
For "did you mean," extend this exact branch: on the `else`, first attempt `didYouMean(input)`; if it returns a candidate, set a `suggestion` state var instead of (or alongside) `hint`; otherwise fall back to `pickHint()` unchanged. Preserve the "last result stays rendered" invariant — do not clear `result` in the else branch.

**Markup structure** (lines 98-168) — layout order to replicate for the new page (masthead now lives in layout, not here):
```svelte
<h1 class="text-heading font-bold uppercase tracking-tight">Music Learn</h1>
<h2 class="text-heading mt-2 font-bold">Chord showcase</h2>

<form class="mt-8 flex items-center gap-2" onsubmit={handleSubmit}>
	<input type="text" bind:value={symbol} placeholder="..." class="border-ink bg-paper-bright border-2 p-2" />
	<Button type="submit">Show chord</Button>
</form>

{#if hint}
	<p class="bg-ink text-mustard mt-4 p-3 font-mono text-label uppercase" data-testid="error-bar">
		{hint}
	</p>
{/if}

{#if !result} ... empty state with STARTER_CHORDS ... {/if}

{#if result?.recognized}
	<div class="stamp mt-8" data-testid="chord-result"> ... glyph, hear-it, alias line, keyboard, formula chips ... </div>
{/if}
```
Lookup page reorders per UI-SPEC layout contract: heading → input row (with ♯/♭ helpers + Stamp button) → recent-chips row → error bar → chord result. The `.stamp` CSS keyframe animation (lines 170-188) must be copied verbatim (or moved to a shared component) since `ChordGlyph.svelte` likely owns visuals but the `.stamp` wrapper class is page-level here.

**Alias/formula/hear-it helpers to extract to `$lib`** (lines 34-90): `formulaFor`, `toAsciiAccidentals`, `aliasLine`, `hearIt`'s `playChord` call — move these to a new shared module (e.g. `src/lib/lookup/chordPresentation.ts`) per CONTEXT.md's extraction guidance ("favor extracting a reusable lookup composition so Phase 3 drills can reuse pieces"). Both `+page.svelte` (new home page) and `showcase/+page.svelte` (left as-is per CONTEXT.md — "no effort spent evolving") can then both import from there if desired, though CONTEXT.md says showcase stays untouched, so extraction is primarily to let the new page and future Phase 3 drills share logic.

---

### `src/routes/+layout.svelte` (modify — add masthead/nav shell)

**Analog:** self (current file, minimal placeholder) + `$page.url.pathname` is the standard SvelteKit idiom (no existing repo usage yet, so this is a new pattern, low risk)

**Current file** (full, 8 lines):
```svelte
<script lang="ts">
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
```
Extend by adding a `<nav>`/masthead block above `{@render children()}`. Use `$app/stores`'s `page` (or `$app/state`'s `page` depending on SvelteKit version already used — check `+page.svelte`'s `import { goto } from '$app/navigation'` for the app-state import convention already in the codebase) to compute active-link state:
```typescript
import { page } from '$app/stores'; // or '$app/state' per installed SvelteKit version
$: isActive = (path: string) => $page.url.pathname === path;
```
Reuse `text-heading font-bold uppercase tracking-tight` (from showcase's `<h1>`, line 99) for the brand mark. Nav links use Label-size mono per UI-SPEC; no existing nav-link component exists in the repo — build from scratch using `--color-muted` (inactive) and ink underline (active) tokens already defined in `src/app.css` lines 12, 7.

---

### `src/lib/components/RecentChipRow.svelte` (new)

**Analog:** `Button` ghost-variant usage in showcase's starter-chip block (lines 125-136):
```svelte
<div class="mt-4 flex gap-2">
	{#each STARTER_CHORDS as starter (starter)}
		<Button
			type="button"
			variant="ghost"
			data-testid="starter-chord"
			onclick={() => showChordFromSymbol(starter)}
		>
			{starter}
		</Button>
	{/each}
{/div}
```
Copy this `{#each}` + ghost `Button` shape directly for recent chips: swap `STARTER_CHORDS` for a `recent: string[]` prop, add `aria-label="Look up {symbol} again"` per UI-SPEC copy contract, and wrap with `flex-wrap` (not `overflow-x-auto`) per the "wraps not scrolls" spec requirement — showcase's row does not wrap today (`flex gap-2` with no `flex-wrap`), so this is a deliberate addition, not a copy.

**Button component contract** (`src/lib/components/Button.svelte`, full file read):
```svelte
interface Props extends HTMLButtonAttributes {
	variant?: 'primary' | 'ghost';
	children: Snippet;
}
let { variant = 'primary', children, ...rest }: Props = $props();
```
`Button` already spreads `...rest`, so `aria-label`, `data-testid` pass through untouched — no modification to `Button.svelte` needed for recent chips or helper buttons. UI-SPEC flags a possible touch-target check (padding `sm md` = 8/16px around single-glyph content) — verify 44px minimum is met for ♯/♭ buttons and recent chips; if not, this is the one place `Button.svelte` might need a size prop addition (not decided yet, flag for planner).

---

### `src/lib/lookup/recentLookups.ts` (new — localStorage persistence)

**No close in-repo analog** (first localStorage/persistence code in the project). Follow the **style** of `src/lib/theory/randomChord.ts` and `src/lib/theory/chord.ts`: pure, framework-free exported functions with clear JSDoc explaining the "why," fully unit-testable in isolation (Vitest, no DOM needed for the storage logic itself, though `localStorage` requires the browser/jsdom test environment already configured for component tests).

**Suggested shape** (based on CONTEXT.md's "last 5 distinct, most-recent-first"):
```typescript
const STORAGE_KEY = 'music-learn:recent-lookups';
const MAX_RECENT = 5;

export function getRecentLookups(): string[] { /* JSON.parse(localStorage.getItem(...) ?? '[]') */ }
export function addRecentLookup(symbol: string): string[] { /* dedupe, unshift, slice(0, MAX_RECENT), persist */ }
```
Pair with a `.test.ts` file per repo convention (every `theory/*.ts` file has a co-located `*.test.ts`; e.g. `src/lib/theory/chord.test.ts`, `src/lib/theory/solfege.test.ts`) — mock/reset `localStorage` between tests.

---

### `src/lib/theory/didYouMean.ts` (new — suggestion heuristic)

**Analog:** `src/lib/theory/randomChord.ts` (pure module style, no DOM, exported function, JSDoc rationale) + `src/lib/copy/hints.ts` (rotating-variant list pattern for the "confident suggestion" copy variants).

**Style to copy from `randomChord.ts`** (full file, 23 lines):
```typescript
/**
 * Random supported-chord picker (D-10). Draws from the exact 12-root x 8
 * v1-quality space proven correct by the reference chord matrix
 * (reference-chords.test.ts) ...
 */
const ROOTS = [...];
const QUALITY_SUFFIXES = [...];
export function randomChord(): string { ... }
```
`didYouMean.ts` should similarly draw its candidate space from the same 12-root x 8-quality matrix (`ROOTS` and `QUALITY_SUFFIXES` constants) — consider importing/sharing these arrays from `randomChord.ts` rather than redefining, since `02-CONTEXT.md` describes the heuristic as operating against "the supported chord matrix." Keep it pure (input: raw string, output: single candidate symbol or `null`), so it can sit alongside `spellChord` and be tested the same way as `reference-chords.test.ts`.

**Copy-variant pattern to extend, from `src/lib/copy/hints.ts`** (full file, 34 lines) — see Shared Patterns below.

---

### `src/lib/copy/hints.ts` (modify — add suggestion variants)

**Analog:** self. Current exported shape:
```typescript
export const errorHints: string[] = [ /* 5 rotating strings */ ];
let lastIndex = -1;
export function pickHint(): string { /* avoid immediate repeat */ }
```
Add a parallel array + picker for the "did you mean" variants, following the exact same no-immediate-repeat logic:
```typescript
export const suggestionHints: string[] = [
	'NOT IN THE CATALOG. DID YOU MEAN {symbol}?',
	"WE DON'T STOCK THAT SPELLING. DID YOU MEAN {symbol}?",
	'CLOSE, BUT NOT QUITE. DID YOU MEAN {symbol}?'
];
// pickSuggestionHint(): string — same anti-repeat pattern as pickHint(), template with {symbol} substituted by caller
```
Keep as a separate exported array/function (do not conflate with `errorHints`/`pickHint` state, since `lastIndex` tracking should stay independent per list to avoid cross-contaminating the "avoid immediate repeat" logic).

---

## Shared Patterns

### Non-blocking error/result state (D-08, carried from Phase 1)
**Source:** `src/routes/showcase/+page.svelte` lines 52-63 (`showChord` function)
**Apply to:** the new lookup page's submit handler — the core invariant "last successful result stays rendered; only the hint/suggestion bar changes on error" must be preserved exactly when adding the did-you-mean branch.

### Rotating hint/copy pattern
**Source:** `src/lib/copy/hints.ts` (full file)
```typescript
let lastIndex = -1;
export function pickHint(): string {
	if (errorHints.length === 1) { lastIndex = 0; return errorHints[0]; }
	let index = Math.floor(Math.random() * errorHints.length);
	while (index === lastIndex) { index = Math.floor(Math.random() * errorHints.length); }
	lastIndex = index;
	return errorHints[index];
}
```
**Apply to:** the new `suggestionHints`/`pickSuggestionHint` pair in the same file.

### Ghost Button for secondary/tertiary actions
**Source:** `src/lib/components/Button.svelte` (`.ps-button--ghost` styles, lines 41-44, 52-54) and its usage in showcase lines 110, 127-134.
**Apply to:** ♯/♭ helper buttons, recent chips, "Hear it" action — all ghost variant per UI-SPEC ("helper buttons, recent chips: ghost variant, ink only... vermilion reserved for CTA only").

### Pure, framework-free theory/utility modules with co-located tests
**Source:** `src/lib/theory/chord.ts` + `src/lib/theory/chord.test.ts`, `src/lib/theory/randomChord.ts`, `src/lib/theory/solfege.ts` + `solfege.test.ts`.
**Apply to:** `didYouMean.ts` and `recentLookups.ts` — every new pure-logic module should have a co-located `*.test.ts` using Vitest, no Svelte/DOM coupling in the module itself (DOM/localStorage access is fine since it's a browser API, not a framework coupling, but keep the module free of Svelte imports).

### Svelte 5 runes state pattern
**Source:** `src/routes/showcase/+page.svelte` lines 16-18.
```typescript
let symbol = $state('');
let result = $state<ChordResult | null>(null);
let hint = $state('');
```
**Apply to:** the new lookup page's page-local state (`symbol`, `result`, `hint`, plus new `suggestion` and `recent` state).

### Component test pattern (Testing Library + Vitest)
**Source:** `src/lib/components/components.test.ts` (full file) — `render`/`screen` from `@testing-library/svelte`, queries by text/class, `data-testid` attributes used throughout showcase markup (`error-bar`, `chord-result`, `starter-chord`, `alias-line`, `interval-formula`) for test hooks.
**Apply to:** new components (`RecentChipRow`, masthead nav, lookup form) should expose similar `data-testid` attributes for their key testable regions.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/recent/recentLookups.ts` | utility/store | CRUD (localStorage) | First persistence code in the project; no existing localStorage/IndexedDB usage to model against. Style borrowed from pure-function modules instead (see Pattern Assignments above). |
| Autofocus + type-over-select input behavior | component behavior | event-driven | No existing input-focus-management code in the repo; implement directly using standard Svelte `bind:this`/`element.focus()`/`element.select()`, no in-repo precedent. |
| Masthead active-nav-link styling via `$page.url.pathname` | component | request-response | No existing route/nav-aware component in the repo (single-route app until now); this is genuinely new SvelteKit surface, standard idiom, not a repo-specific pattern to copy. |

## Metadata

**Analog search scope:** `src/routes/**`, `src/lib/components/**`, `src/lib/theory/**`, `src/lib/copy/**`, `src/lib/audio/**`, `src/app.css`
**Files scanned:** 17 (all files in `src/`)
**Pattern extraction date:** 2026-07-12
