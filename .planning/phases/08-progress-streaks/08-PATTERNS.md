# Phase 8: Progress & Streaks - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 12
**Analogs found:** 8 / 12 (backend files have no in-repo analog — this is the first backend phase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/lib/components/StreakBadge.svelte` | component | request-response (renders fetched data) | `src/lib/components/IntervalChip.svelte` | role-match |
| `src/lib/components/PracticeItemRow.svelte` | component | transform (renders one stats row) | `src/lib/components/RecentChipRow.svelte` (list-of-items component) + `IntervalChip.svelte` (variant-styled leaf) | role-match |
| `src/lib/components/AccuracyTable.svelte` | component | transform | `src/lib/components/RecentChipRow.svelte` | role-match |
| `src/routes/progress/+page.svelte` | route/component | request-response (client fetch + states) | `src/routes/drills/+page.svelte` | partial-match (closest full-page precedent; no existing page does an async fetch with loading/empty/error states) |
| `src/routes/+layout.svelte` (modified) | component | request-response | itself (existing file, additive edit) | exact (modify in place) |
| `src/lib/copy/streak.ts` | utility | transform | `src/lib/copy/hints.ts` | exact |
| `src/lib/api/client.ts` (or similar; bearer-token fetch wrapper) | service | request-response | `src/lib/lookup/recentLookups.ts` (closest localStorage-based client persistence pattern; no fetch-wrapper precedent exists) | partial-match |
| `src/lib/api/progress.ts` (client-side queue/send helpers, token storage) | service | event-driven (fire-and-forget POST) + file-I/O (localStorage queue) | `src/lib/lookup/recentLookups.ts` | role-match (localStorage read/write/try-catch shape) |
| `src/routes/drills/+page.svelte` (modified: `recordGrade` hook) | controller (client) | event-driven | itself (existing file, additive edit) | exact (modify in place) |
| `server/src/index.ts` (or `api/src/index.ts`, backend entrypoint) | controller | request-response | none in repo | no analog (first backend code) |
| `server/src/db.ts` (SQLite schema/queries) | model | CRUD | none in repo | no analog (first backend code) |
| `docker-compose.yml` + backend `Dockerfile` | config | batch/deploy | none in repo | no analog (first backend code) |

## Pattern Assignments

### `src/lib/components/StreakBadge.svelte` (component)

**Analog:** `src/lib/components/IntervalChip.svelte`

**Props pattern** (lines 1-16):
```svelte
<script lang="ts">
	import type { IntervalRole } from '$lib/theory/types';

	interface Props {
		role: IntervalRole;
		label: string;
	}

	let { role, label }: Props = $props();
</script>
```
Adapt for StreakBadge: `interface Props { count: number; variant: 'compact' | 'hero'; loading?: boolean }`. Follow the same "typed Props interface + destructured `$props()`" shape used throughout the component set (also seen in `Button.svelte` and `RecentChipRow.svelte`).

**Variant-class pattern** (lines 18-45): use `class="streak-badge streak-badge--{variant}"` the same way `IntervalChip` does `interval-chip interval-chip--{role}`, with separate `<style>` blocks per variant using theme tokens (`var(--text-display)`, `var(--font-mono)`, `var(--color-vermilion)` / `var(--color-ink)` per the UI-SPEC's "vermilion only when active" rule). Do NOT hardcode hex; always reference the `--color-*` tokens from `src/app.css`.

**Loading/absent-render rule** (UI-SPEC): mirror the `RecentChipRow.svelte` pattern of rendering nothing (`{#if recent.length > 0}` wrapper) — for the compact masthead chip, wrap the whole component output in `{#if count > 0 && !loading}` so it renders nothing during load, at zero, or on error (per UI-SPEC masthead chip rule).

---

### `src/lib/components/PracticeItemRow.svelte` (component)

**Analog:** `src/lib/components/RecentChipRow.svelte` (list-row shape) + `IntervalChip.svelte` (variant-styled accent)

**Props/list-item pattern** (RecentChipRow lines 10-16):
```svelte
interface Props {
	recent: string[];
	onselect: (symbol: string) => void;
}

let { recent, onselect }: Props = $props();
```
PracticeItemRow takes a single item, not a list (AccuracyTable/Weakest-Spots section does the `{#each}`): `interface Props { item: { symbol: string; kind: 'chord' | 'scale'; attempts: number; accuracy: number }; onSelect?: () => void }`.

**Accent-bar-by-threshold pattern**: follow `IntervalChip`'s `class:` variant-suffix technique (`interval-chip--{role}`) but conditionally, e.g. `class:practice-row--weak={item.attempts >= 3 && item.accuracy < 0.7}` per the UI-SPEC's exact "needs practice" threshold (`attempts >= 3 AND accuracy < 70%`). The vermilion 4px left border only applies under this class.

**44px touch target**: copy the `Button.svelte` `min-height: 44px; min-width: 44px;` rule (lines 30-34) onto the row's clickable wrapper if/when the deep-link wiring lands (UI-SPEC OPEN QUESTION); otherwise the row is a plain non-interactive `<div>`/`<tr>` with the same min-height for visual consistency.

---

### `src/lib/components/AccuracyTable.svelte` (component)

**Analog:** `src/lib/components/RecentChipRow.svelte` (parent-iterates-and-renders-child pattern)

**Core list-rendering pattern** (lines 18-32):
```svelte
{#if recent.length > 0}
	<div class="mt-4 flex flex-wrap gap-2" data-testid="recent-chip-row">
		{#each recent as symbol (symbol)}
			<Button ...>...</Button>
		{/each}
	</div>
{/if}
```
Adapt: iterate `items` (array of stats rows) with a keyed `{#each items as item (item.symbol + item.kind)}` rendering `<PracticeItemRow {item} />` per row, wrapped in a `<table>` (per UI-SPEC's SYMBOL/KIND/ATTEMPTS/ACCURACY column headers) instead of a flex-wrap div. Use `text-label font-mono uppercase` for column headers, matching the existing `score-register` label styling in `drills/+page.svelte` line 128.

---

### `src/routes/progress/+page.svelte` (route)

**Analog:** `src/routes/drills/+page.svelte` (page shell, state machine, Button usage) — no existing page does an async fetch, so the loading/empty/error state machine itself has no in-repo precedent and should follow standard SvelteKit `$effect`/`onMount` + reactive state patterns, but structure/markup conventions below ARE established.

**Page shell pattern** (lines 125-131):
```svelte
<main class="bg-paper text-ink min-h-screen p-8 font-sans">
	<h1 class="text-heading mt-2 font-bold">Drills</h1>
	...
</main>
```
Reuse verbatim for Progress: `<h1 class="text-heading mt-2 font-bold">Progress</h1>` (per UI-SPEC section heading table).

**Card pattern** (lines 132):
```svelte
<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="drill-card">
```
Reuse this exact card shell (`border-ink bg-paper-bright border-2 p-...`) for the streak hero card, Weakest Spots card, and All Stats card, per UI-SPEC's explicit callback to "the existing `drill-card` pattern from Phase 3."

**Button usage pattern** (lines 144-152):
```svelte
<Button type="button" variant="primary" disabled={selected.size === 0} onclick={checkAnswer}>
	Check
</Button>
```
Use identically for "Practice Now" / "Start a Drill" (`variant="primary"`) and "Try Again" (`variant="ghost"`, per UI-SPEC error-state spec).

**State-driven conditional rendering pattern** (lines 133, 176, 225 — `{#if question.kind === ...}` / `{#if answered && feedback}` / `{#if answered}`): mirror this `{#if state === 'loading'}...{:else if state === 'empty'}...{:else if state === 'error'}...{:else}...{/if}` structure for the four Progress page states, using a single `$state<'loading' | 'empty' | 'error' | 'populated'>` variable.

**data-testid convention**: every major section/interactive block in `drills/+page.svelte` carries a `data-testid` (`score-register`, `drill-card`, `drill-feedback`, `choice-grid`, `interval-formula`, `played-diff`, `correct-diff`). Apply the same convention to new Progress page sections (`streak-hero`, `weakest-spots`, `accuracy-table`, `progress-error`, `progress-empty`, `progress-loading`).

---

### `src/routes/+layout.svelte` (modified — masthead)

**Analog:** itself

**navLinks array pattern** (lines 8-12):
```svelte
const navLinks = [
	{ href: '/', label: 'Lookup' },
	{ href: '/drills', label: 'Drills' },
	{ href: '/showcase', label: 'Showcase' }
];
```
Insert `{ href: '/progress', label: 'Progress' }` between the Drills and Showcase entries (per UI-SPEC nav ordering: Drills, Progress, Showcase).

**Active-link styling pattern** (lines 21-31, 51-56): unchanged, links iterate the same way; no new CSS needed for nav itself.

**Streak chip placement**: UI-SPEC says the chip goes "between the app name and the nav links on desktop." Insert `<StreakBadge variant="compact" count={...} loading={...} />` as a sibling between the `<span class="text-heading...">MUSIC LEARN</span>` (line 19) and the `<div class="flex gap-4">` nav-links wrapper (line 20). The chip's own internal `{#if}` (see StreakBadge pattern above) means the masthead itself needs no conditional wrapper — it just always renders `<StreakBadge>` and lets the component self-hide.

---

### `src/lib/copy/streak.ts`

**Analog:** `src/lib/copy/hints.ts` (exact structural match — this is the suggested home named directly in CONTEXT.md)

**Rotation-pool + anti-repeat-picker pattern** (lines 7-33):
```typescript
export const errorHints: string[] = [ /* ... */ ];

let lastIndex = -1;

export function pickHint(): string {
	if (errorHints.length === 1) {
		lastIndex = 0;
		return errorHints[0];
	}

	let index = Math.floor(Math.random() * errorHints.length);
	while (index === lastIndex) {
		index = Math.floor(Math.random() * errorHints.length);
	}
	lastIndex = index;
	return errorHints[index];
}
```
Copy this exact shape three times for the three streak-copy pools in the UI-SPEC (`activePracticedToday`, `activeNudge`, `zeroStreak`), each with its own `lastIndexN` variable (mirroring how `hints.ts` itself keeps `lastIndex` and `lastSuggestionIndex` fully independent per pool, lines 15 and 48). Export a single `pickStreakLine(kind, lastIndex)` per CONTEXT.md's suggested signature, or three named pickers matching the `pickHint`/`pickSuggestionHint` precedent — either is acceptable, but the anti-repeat while-loop and `{N}` placeholder substitution (mirroring `{SYMBOL}` in `suggestionHints`, lines 42-46) must be preserved.

**Placeholder substitution pattern** (lines 43-46, `{SYMBOL}` in suggestionHints, substituted by the caller): use the identical convention for `{N}` in streak copy — the copy module returns the raw string with the placeholder, the caller substitutes.

---

### `src/lib/api/client.ts` and `src/lib/api/progress.ts` (new — client-side backend integration)

**Analog:** `src/lib/lookup/recentLookups.ts` (localStorage read/write try-catch shape; closest thing to "client-side persistence with graceful degradation" in the repo)

**Storage-key + graceful-degradation pattern** (lines 12-58):
```typescript
const STORAGE_KEY = 'music-learn:recent-lookups';

export function getRecentLookups(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
			return [];
		}
		return [...new Set(parsed)].slice(0, MAX_RECENT);
	} catch {
		return [];
	}
}

export function addRecentLookup(symbol: string): string[] {
	const current = getRecentLookups();
	const next = [symbol, ...current.filter((entry) => entry !== symbol)].slice(0, MAX_RECENT);
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Quota exceeded or storage disabled: keep the loop working without
		// persistence rather than throwing (availability over durability).
	}
	return next;
}
```
Apply directly to:
1. **Bearer-token storage** (`music-learn:api-token` key, same try/catch/never-throw shape) — read once at app start, set via a settings/dev-entry UI (not specced this phase beyond "entered once per device," so a minimal input is Claude's discretion at plan time).
2. **Offline queue** (CONTEXT.md's "queue locally and replay" discretion item) — same JSON-array-in-localStorage shape, same corrupt-data-resets-to-empty-array defensive parsing, same "storage failure degrades to no-op, never throws" comment convention. This directly satisfies D-04's "drill UI never blocks on network" requirement: `recordAnswer()` fires `fetch(...).catch(() => queueForRetry(event))` and returns immediately, exactly mirroring how `addRecentLookup` swallows storage errors rather than propagating them.

**No existing fetch-wrapper precedent** — there is no `fetch()` call anywhere in the current codebase (fully static app through Phase 3). The bearer-token-attaching wrapper (`apiFetch(path, opts)`) itself has no analog; write it fresh following standard patterns (attach `Authorization: Bearer ${token}` header, JSON body, typed response). Keep it a plain exported function in `src/lib/**` per CONTEXT.md's "keep stats/streak computation pure and testable" convention — no class, no singleton client object, matching the function-only style of `recentLookups.ts` and `hints.ts`.

---

### `src/routes/drills/+page.svelte` (modified — wire `recordGrade`)

**Analog:** itself

**Existing hook point** (lines 60-72):
```typescript
function recordGrade(correct: boolean) {
	if (correct) {
		score = { correct: score.correct + 1, streak: score.streak + 1 };
		const [text, index] = pickVariant(CORRECT_VARIANTS, lastCorrectIndex);
		confirmationText = text;
		lastCorrectIndex = index;
	} else {
		score = { correct: score.correct, streak: 0 };
		const [text, index] = pickVariant(WRONG_VARIANTS, lastWrongIndex);
		headlineText = text;
		lastWrongIndex = index;
	}
}
```
Add a fire-and-forget call at the top or bottom of this function, e.g. `recordAnswerToBackend({ item: question.symbol, kind: question.kind === 'construction' || question.kind === 'identification' ? 'chord' : 'scale', correct })` (adjust field name/shape to match the actual `DrillQuestion` type in `src/lib/drills/generateQuestion.ts` — check `item identifier` vs `symbol` naming before finalizing the payload). Per D-04, this call must never be `await`ed inline in a way that blocks `checkAnswer`/`selectChoice` — call it and let it resolve in the background, consistent with the "no network wait ever inserted" constraint.

---

## Shared Patterns

### Component Props Interface Convention
**Source:** `src/lib/components/Button.svelte` (lines 10-15), `IntervalChip.svelte` (lines 8-15), `RecentChipRow.svelte` (lines 10-16)
**Apply to:** All new Svelte 5 components (StreakBadge, PracticeItemRow, AccuracyTable)
```svelte
interface Props {
	/* ... */
}
let { propA, propB }: Props = $props();
```
Always a typed `interface Props`, always destructured via `$props()`, always documented with a doc-comment above the component describing its role (see file-level JSDoc comments at the top of every existing component).

### Anti-Repeat Rotation Picker
**Source:** `src/lib/copy/hints.ts` (lines 15-33), `src/routes/drills/+page.svelte` (lines 27-35, `pickVariant`)
**Apply to:** `src/lib/copy/streak.ts`
Reuse the "track `lastIndex`, loop until a different index is drawn (unless pool length is 1)" pattern verbatim for all three streak copy pools.

### localStorage Read/Write with Graceful Degradation
**Source:** `src/lib/lookup/recentLookups.ts` (whole file)
**Apply to:** bearer-token storage, offline answer queue
Try/catch around every localStorage call; corrupt or missing data resets to a safe empty default; write failures are silently swallowed (never throw), preserving in-memory correctness for that call.

### Print Shop Card Shell
**Source:** `src/routes/drills/+page.svelte` (line 132)
**Apply to:** streak hero card, Weakest Spots card, All Stats card on the Progress page
```svelte
<div class="border-ink bg-paper-bright mt-8 border-2 p-6" data-testid="...">
```

### Theme Token Usage (never hardcode colors/spacing)
**Source:** `src/app.css` (whole `@theme` block), used throughout every component
**Apply to:** all new components/pages
Reference `var(--color-vermilion)`, `var(--color-ink)`, `var(--text-display)`, `var(--spacing-lg)` etc. — never hardcode hex or px values matching a token that already exists. The UI-SPEC's new "display + mono = big data numeral" rule (StreakBadge hero variant) is an additive convention on top of these existing tokens, not a new token.

### data-testid on Every Interactive/Distinct Block
**Source:** `src/routes/drills/+page.svelte` (`score-register`, `drill-card`, `drill-feedback`, `choice-grid`, `interval-formula`, `played-diff`, `correct-diff`)
**Apply to:** every new testable section on the Progress page and new components

### Vitest + localStorage Testing Pattern
**Source:** `src/lib/lookup/recentLookups.test.ts` (lines 1-11)
**Apply to:** new client-side persistence tests (token storage, offline queue)
```typescript
import { beforeEach, describe, expect, it } from 'vitest';

describe('...', () => {
	beforeEach(() => {
		localStorage.clear();
	});
	it('...', () => { /* ... */ });
});
```
Note: CONTEXT.md flags that Phase 02 P02 already fixed localStorage support in `vitest-setup.ts` specifically to unblock this kind of test.

## No Analog Found

Files with no close match in the codebase (planner should design fresh, following general Node/Fastify-or-Hono + better-sqlite3 conventions per CONTEXT.md D-01/D-02, since this is the project's first server-side code):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/src/index.ts` (backend entrypoint, route registration) | controller | request-response | No backend code exists anywhere in the repo; Phases 1-3 were fully `adapter-static` client-only |
| `server/src/db.ts` (SQLite schema + queries for raw answer events, computed stats/streak aggregates) | model | CRUD | No database/model layer exists; must be designed fresh per D-02 (raw events table is the substrate, aggregates computed server-side per request) |
| `server/src/auth.ts` (bearer-token middleware) | middleware | request-response | No middleware/auth code exists client or server side; D-03 specifies a single static shared-secret bearer token check |
| `docker-compose.yml` + backend `Dockerfile` | config | batch/deploy | No docker/deployment config exists in the repo yet; this phase creates the repo's entire backend + deploy footprint |

## Metadata

**Analog search scope:** `src/lib/**`, `src/routes/**`, `src/app.css`, `package.json`
**Files scanned:** 18 (all existing `.svelte`/`.ts` files in `src/`)
**Pattern extraction date:** 2026-07-13
