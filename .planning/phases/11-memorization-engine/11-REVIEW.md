---
phase: 11-memorization-engine
reviewed: 2026-07-15T13:03:30Z
depth: deep
files_reviewed: 12
files_reviewed_list:
  - src/lib/srs/scheduler.ts
  - src/lib/srs/scheduler.test.ts
  - src/lib/srs/facts.ts
  - src/lib/srs/facts.test.ts
  - src/lib/srs/deck.ts
  - src/lib/srs/deck.test.ts
  - src/lib/srs/session.ts
  - src/lib/srs/session.test.ts
  - src/lib/components/RecallSession.svelte
  - src/lib/components/recallSession.test.ts
  - src/lib/components/RecallMap.svelte
  - src/lib/components/recallMap.test.ts
  - src/routes/recall/+page.svelte
  - src/routes/+layout.svelte
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: resolved
resolved_at: 2026-07-15T15:20:30Z
resolution:
  CR-01: c726928
  WR-01: 127ace6
  WR-02: 20f9728
  WR-04: bc298a8
  WR-03: d3860be
  IN-01: 845f88a
  IN-02: 430cc6a
  IN-03: ca4d71e
---

# Phase 11: Code Review Report

**Reviewed:** 2026-07-15T13:03:30Z
**Depth:** deep
**Files Reviewed:** 12 source files (+ 2 files with a 1-line/49-line diff: `+layout.svelte`, `recall/+page.svelte`)
**Status:** issues_found

## Summary

Reviewed all six 11-01..11-06 plans' source output: the FSRS scheduler seam (`scheduler.ts`), the fact catalog (`facts.ts`), the Dexie persistence layer with Zod Date-rehydration (`deck.ts`), the in-memory session queue (`session.ts`), and the two Svelte 5 UI surfaces (`RecallSession.svelte`, `RecallMap.svelte`) plus their route wiring.

The FSRS math and Date-rehydration boundary are sound: I hand-verified with a throwaway script against the installed `ts-fsrs@5.4.1` that `enable_short_term:false` produces the documented day-scale intervals (New: Again=1d/Hard=2d/Good=3d/Easy=8d, all graduating straight to `Review`, never `Relearning`), that a lapse never drops `scheduled_days` below 1, and that `scheduler.repeat()`'s preview output is byte-identical to `scheduler.next()`'s committed output for the same rating/`now` — so the D-04 "preview matches commit" invariant genuinely holds. The Zod `.coerce.date()` boundary in `deck.ts` correctly repairs string-corrupted `due`/`last_review` fields (test-verified with a raw Dexie-bypassing corruption), and `deriveCellState`'s due-over-mastered precedence is correct. All 62 existing tests pass, and `svelte-check` reports 0 errors.

The one genuine correctness gap is in `RecallSession.svelte`: the grade-commit handler has no error handling around the persistence call, contradicting the phase's own documented threat mitigation (11-05-PLAN.md's T-11-09 claims "every awaited call is wrapped in try/catch" — that's true for `load()` but not for `handleGrade`). The remaining findings are accessibility gaps in the recall map and session (explicitly in scope per the review brief) and a fragile Svelte 5 reactivity pattern that currently works by coincidence rather than by contract.

## Critical Issues

### CR-01: `handleGrade` has no error handling around the persistence write — contradicts the phase's own documented threat mitigation

**File:** `src/lib/components/RecallSession.svelte:142-150`

**Issue:** `load()` wraps every deck call in try/catch and falls back to the `error` page state. `handleGrade` does not:

```ts
async function handleGrade(rating: Rating): Promise<void> {
	if (!currentCard) return;
	const updated = await recordGrade(currentCard, rating, new Date());
	cardsByKey.set(cardKey(updated.factId, updated.mode), updated);
	queue = advanceQueue(queue, rating);
	revealed = false;
	reviewedCount += 1;
	if (isSessionComplete(queue)) pageState = 'complete';
}
```

If `recordGrade`'s Dexie write throws (quota exceeded, storage blocked in a privacy-restricted context, IndexedDB unavailable mid-session — all realistic on the phone-between-piano-sessions usage pattern this app targets), this becomes an unhandled promise rejection inside a Svelte `onclick` handler. There is no console-visible app state change: the revealed card stays on screen, the grade is silently never persisted, and the user has no way to know the tap didn't register — they'll likely tap again, potentially double-grading or getting stuck, with no recovery path short of a full page reload.

This directly contradicts 11-05-PLAN.md's own threat-model row (T-11-09, Denial of Service): "Every awaited call is wrapped in try/catch, surfacing the dedicated `error` page state rather than an uncaught promise rejection." That claim is false for the grade-commit path, which is also the most frequently-exercised write in the whole feature (once per card, every session).

**Fix:**
```ts
async function handleGrade(rating: Rating): Promise<void> {
	if (!currentCard) return;
	try {
		const updated = await recordGrade(currentCard, rating, new Date());
		cardsByKey.set(cardKey(updated.factId, updated.mode), updated);
		queue = advanceQueue(queue, rating);
		revealed = false;
		reviewedCount += 1;
		if (isSessionComplete(queue)) pageState = 'complete';
	} catch {
		pageState = 'error';
	}
}
```
(Or a narrower per-card error affordance if losing session progress on `pageState = 'error'` is undesirable — either way, the failure must not be silent.)

## Warnings

### WR-01: `cardsByKey` is a plain `Map` inside `$state`, which Svelte 5 does not deeply proxy — in-place `.set()` mutation is a fragile, undocumented-contract dependency

**File:** `src/lib/components/RecallSession.svelte:64, 145`

**Issue:** `let cardsByKey = $state(new Map<string, CardRecord>());` then, in `handleGrade`:
```ts
cardsByKey.set(cardKey(updated.factId, updated.mode), updated);
```
Svelte 5's `$state` proxy (checked directly against the installed `svelte@5.56.4` source, `node_modules/svelte/src/internal/client/proxy.js`) only deep-wraps values whose prototype is `Object.prototype` or `Array.prototype`:
```js
const prototype = get_prototype_of(value);
if (prototype !== object_prototype && prototype !== array_prototype) {
	return value;
}
```
A `Map` instance's prototype is `Map.prototype`, so it is returned unwrapped — `.set()`/`.delete()` calls on it are **not** tracked as a reactivity source. This is exactly why Svelte ships `SvelteMap`/`SvelteSet` in `svelte/reactivity` for this use case (also present in this same `node_modules` tree at `svelte/src/reactivity/map.js`).

Today this doesn't visibly break anything only because every call site that mutates `cardsByKey` (`handleGrade`) also reassigns `queue` in the same synchronous block, and every derived that reads `cardsByKey.get(...)` (`currentCard`) also depends on `queue`-derived `currentItem` — so the queue reassignment happens to force the re-read. That's a coincidence of current control flow, not a reactive guarantee: any future change that mutates `cardsByKey` without also touching `queue` in the same tick (an optimistic UI update, a background sync, an undo feature, splitting the grade-commit into two steps) will silently render stale card data with no reactivity error to flag it.

**Fix:** Either use `SvelteMap` from `svelte/reactivity`:
```ts
import { SvelteMap } from 'svelte/reactivity';
let cardsByKey = $state(new SvelteMap<string, CardRecord>());
```
or reassign instead of mutating in place (matches the pattern `RecallMap.svelte` already correctly uses on load):
```ts
cardsByKey = new Map(cardsByKey).set(cardKey(updated.factId, updated.mode), updated);
```

### WR-02: Recall map cells carry no accessible name — state is conveyed by color/pattern only

**File:** `src/lib/components/RecallMap.svelte:101-114`

**Issue:**
```svelte
{#each MODE_COLUMNS as column (column.mode)}
	{@const state = deriveCellState(cardsByKey.get(`${fact.factId}|${column.mode}`), now)}
	<div class="recall-map__cell recall-map__cell--{state}" data-testid={...} data-cell-state={state}>
		{#if state === 'weak'}
			<span aria-hidden="true">!</span>
		{:else if state === 'mastered'}
			<span aria-hidden="true">✓</span>
		{/if}
	</div>
{/each}
```
`not-yet-seen` and `due` cells render completely empty, and the `weak`/`mastered` glyphs are explicitly `aria-hidden`. A screen-reader user tabbing/reading through this grid gets no distinguishing information per cell at all — the entire point of the recall map (glanceable per-fact status) is invisible to assistive technology, conveyed solely through `background-color`/`background-image` and a hidden glyph. `data-testid`/`data-cell-state` are not exposed to the accessibility tree.

**Fix:** Give each cell an accessible name derived from the row label and state, e.g.:
```svelte
<div
	class="recall-map__cell recall-map__cell--{state}"
	data-testid={...}
	data-cell-state={state}
	aria-label={`${rowLabelFor(fact)}: ${LEGEND.find((l) => l.state === state)?.label}`}
>
```
(or `role="img"` + `aria-label` on the cell, keeping the `!`/`✓` glyphs `aria-hidden` as visual reinforcement only).

### WR-03: No focus/announcement management across RecallSession's reveal/grade/advance transitions

**File:** `src/lib/components/RecallSession.svelte:239-296`

**Issue:** Only the "N LEFT TODAY" register (`recall-register`, line 216) has `aria-live="polite"`. The prompt content, the reveal content, and the grade-button grid are all conditionally swapped in and out of the DOM with no `aria-live` region and no explicit focus management:
- Clicking "Show Answer" (line 241) removes that button from the DOM and replaces it with the revealed answer + grade grid (line 244 onward) — focus is dropped to `<body>` with no announcement of the newly-revealed content.
- Clicking a grade button advances to the next card's prompt (or the completion screen) — again, no focus move and no live-region announcement, so a screen-reader user gets no signal that the prompt actually changed to a new fact.

For a rapid, repetitive-tap review loop this is a real usability/accessibility gap: keyboard and screen-reader users lose their place on every single grading action, the most frequent interaction in the whole feature.

**Fix:** Wrap the prompt/reveal region in an `aria-live="polite"` container (or call `.focus()` on the prompt heading after each `handleReveal`/`handleGrade` state change) so each transition is announced.

### WR-04: Recall map cell identity/testid is keyed only by `factId`, not `(factId, mode)` — will collide the moment a second mode column ships

**File:** `src/lib/components/RecallMap.svelte:92, 105`

**Issue:** Row `data-testid={`recall-map-row-${fact.factId}`}` is correctly per-fact (one row per fact, by design). But the per-cell `data-testid={`recall-map-cell-${fact.factId}`}` (line 105) is generated *inside* the `{#each MODE_COLUMNS as column}` loop without including `column.mode`. `MODE_COLUMNS` is explicitly designed (per the component's own doc comment) to grow in Phase 13 — the moment a second mode column is added, every fact will render two `<div>`s sharing the exact same `data-testid`, and `screen.getByTestId(...)` (used throughout `recallMap.test.ts`) throws on multiple matches. This is a forward-compatibility landmine in code whose own comments anticipate the exact change that breaks it.

**Fix:**
```ts
data-testid={`recall-map-cell-${fact.factId}-${column.mode}`}
```

## Info

### IN-01: `deriveCellState`'s final fallback branch is unreachable given this app's invariants

**File:** `src/lib/srs/deck.ts:196-199`

**Issue:** The trailing `return 'due';` (documented as "shouldn't occur in practice") is provably dead code today: I verified against the installed `ts-fsrs@5.4.1` with the app's exact `generatorParameters` that every New card is created with `due = now` (so the earlier `card.due <= now` branch always catches it first) and every grade on a New card transitions directly to `State.Review` (never leaves a not-yet-due card in `New`/`Learning`). Harmless as defensive programming, but worth a one-line acknowledgment that it's intentionally unreachable rather than a latent code path, to avoid a future reader assuming it's load-bearing.

**Fix:** No action required; optionally add `/* istanbul ignore next */` or an explicit comment confirming the branch is provably unreachable rather than "shouldn't occur."

### IN-02: `RecallMap`'s `now` is captured once at script init, before the async card load resolves

**File:** `src/lib/components/RecallMap.svelte:25`

**Issue:** `const now = new Date();` runs synchronously when the component script initializes, independent of the `onMount` async `getAllCards()` call. If the user leaves the `/recall` → Map tab open across a day boundary without reloading, `deriveCellState`'s due/mastered classification will silently go stale (a card that has since become due will still render as `mastered`). Low impact for what the component's own comment calls "a secondary, glanceable surface."

**Fix:** Move `const now = new Date()` inside `onMount`, computed alongside the `getAllCards()` call.

### IN-03: `facts` is wrapped in `$state` despite never being reassigned

**File:** `src/lib/components/RecallMap.svelte:22`

**Issue:** `let facts = $state<Fact[]>(allFacts());` — `allFacts()` returns the same static, module-level catalog array every time, and `facts` is never reassigned after initialization. Wrapping it in `$state` adds Svelte's deep-array-proxy overhead for no reactive benefit.

**Fix:** `const facts: Fact[] = allFacts();` (plain, non-reactive binding).

---

## Resolution

All 8 findings fixed, each in its own atomic commit. `npx vitest run` and `npm run check` were kept green after every commit.

| ID | Title | Commit |
|----|-------|--------|
| CR-01 | `handleGrade` had no error handling around the persistence write | `c726928` |
| WR-01 | `cardsByKey` Map mutation wasn't a reactivity contract | `127ace6` |
| WR-02 | Recall map cells had no accessible name | `20f9728` |
| WR-04 | Recall map cell testid wasn't keyed by mode | `bc298a8` |
| WR-03 | No focus/announcement management across reveal/grade transitions | `d3860be` |
| IN-01 | `deriveCellState`'s trailing branch clarified as unreachable | `845f88a` |
| IN-02 | `RecallMap`'s `now` moved inside `onMount` | `430cc6a` |
| IN-03 | `facts` unwrapped from `$state` | `ca4d71e` |

Notes on adaptation from the review's literal suggestions:
- CR-01 and WR-01 both touch `handleGrade`'s same three lines; applied as two separate atomic commits (try/catch first, then the Map-reassignment fix) rather than one combined edit, to keep each finding independently revertable.
- WR-01's regression test uses a single-card queue (not the two-card scenario in the review's own reasoning) because `advanceQueue`'s Again branch on a one-item queue returns the exact same queue-item object reference, which is the specific condition that defeats Svelte's derived memoization and exposes the bug. Verified by reverting the fix locally and confirming the new test fails (stale `8d` instead of the real graded `4d`) before reapplying it.
- WR-03 implemented via the aria-live wrapper option only (not additional explicit `.focus()` calls), per the finding's own "and/or" framing.
- WR-04's data-testid change required updating the existing cell-state assertions in `recallMap.test.ts` to the new `-{mode}`-suffixed format.

_Reviewed: 2026-07-15T13:03:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Resolved: 2026-07-15T15:20:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Depth: deep_
