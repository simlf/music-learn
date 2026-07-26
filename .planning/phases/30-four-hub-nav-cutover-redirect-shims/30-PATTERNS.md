# Phase 30: Four-Hub Nav Cutover + Redirect Shims - Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 9 new/modified files + 8 redirect shims
**Analogs found:** 9 / 9 (100% coverage)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/routes/+layout.svelte` | layout | request-response | itself (existing nav) | exact |
| `src/routes/+page.svelte` (Lookup) | page | request-response | itself (existing Drill it) | exact |
| `src/routes/progress/+page.svelte` | page | request-response | itself (existing drill handoffs) | exact |
| `src/routes/practice/+page.svelte` (seed wiring) | page | CRUD + request-response | `src/routes/drills/+page.svelte` | exact |
| `src/routes/drills/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/routes/build/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/routes/voicings/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/routes/progressions/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/routes/scales/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/routes/theory/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/routes/recall/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/routes/songs/+page.ts` (redirect) | route | request-response | SvelteKit pattern | role-match |
| `src/lib/i18n/messages/chrome.ts` (i18n) | config | request-response | itself (existing nav keys) | exact |
| `tests/masthead.e2e.test.ts` (nav update) | test | request-response | itself (existing nav tests) | exact |
| `src/routes/lookupDrillIt.test.ts` (handoff update) | test | request-response | itself (existing handoff test) | exact |
| Redirect assertion test (8 routes) | test | request-response | per-route pattern | role-match |

---

## Pattern Assignments

### `src/routes/+layout.svelte` — Navigation Structure (Layout, Request-Response)

**Analog:** Current file itself (lines 17-72, 129-174)

#### navLinks Array Pattern (lines 17-28)
```typescript
const navLinks: { href: string; labelKey: MessageKey }[] = [
	{ href: '/', labelKey: 'nav.lookup' },
	{ href: '/drills', labelKey: 'nav.drills' },
	{ href: '/build', labelKey: 'nav.build' },
	{ href: '/recall', labelKey: 'nav.recall' },
	{ href: '/scales', labelKey: 'nav.scales' },
	{ href: '/songs', labelKey: 'nav.songs' },
	{ href: '/theory', labelKey: 'nav.theory' },
	{ href: '/progress', labelKey: 'nav.progress' },
	{ href: '/progressions', labelKey: 'nav.progressions' },
	{ href: '/voicings', labelKey: 'nav.voicings' }
];
```

**For Phase 30:** REDUCE to the 4-hub array:
```typescript
const navLinks: { href: string; labelKey: MessageKey }[] = [
	{ href: '/', labelKey: 'nav.lookup' },
	{ href: '/practice', labelKey: 'nav.practice' },
	{ href: '/learn', labelKey: 'nav.learn' },
	{ href: '/progress', labelKey: 'nav.progress' }
];
```

#### TAB_ICONS Map Pattern (lines 44-52)
```typescript
const TAB_ICONS: Record<string, string> = {
	'/': '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><line x1="15" y1="15" x2="21" y2="21"/></svg>',
	'/drills':
		'<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="12"/><line x1="8" y1="6" x2="8" y2="14"/><line x1="13" y1="6" x2="13" y2="14"/><line x1="18" y1="6" x2="18" y2="14"/></svg>',
	'/recall':
		'<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><rect x="4" y="5" width="13" height="16"/><rect x="8" y="3" width="13" height="16"/></svg>',
	'/songs':
		'<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><circle cx="7" cy="18" r="3"/><path d="M10 18V5l9-2v12"/><circle cx="16" cy="15" r="3"/></svg>'
};
```

**For Phase 30:** RE-KEY for `/practice`, `/learn`, `/progress` and REUSE the old `/drills` icon for `/practice`:
- `/practice` → reuse `/drills` keyboard glyph
- `/learn` → new open-book glyph from UI-SPEC.md
- `/progress` → new ascending-bars glyph from UI-SPEC.md
- Keep `/` lookup icon unchanged
- Do NOT remove dead `/recall`, `/songs` keys (cleanup deferred)

#### bottomTabHrefs Derivation (lines 63-64)
```typescript
const bottomTabHrefs = ['/', '/drills', '/recall', '/songs'];
const bottomTabLinks = navLinks.filter((link) => bottomTabHrefs.includes(link.href));
```

**For Phase 30:** CHANGE to:
```typescript
const bottomTabHrefs = ['/', '/practice', '/learn', '/progress'];
const bottomTabLinks = navLinks.filter((link) => bottomTabHrefs.includes(link.href));
```

#### moreHrefs, moreLinks, BottomSheet (lines 54-74, 158-174)
```typescript
const MORE_ICON = '...'; // lines 54-55
const moreHrefs = ['/build', '/scales', '/theory', '/progress', '/progressions', '/voicings'];
const moreLinks = navLinks.filter((link) => moreHrefs.includes(link.href));
let moreOpen = $state(false);
// ... later in markup:
<BottomSheet open={moreOpen} onClose={() => (moreOpen = false)} ariaLabel={t('nav.more')}>
	<div data-testid="more-sheet">
		{#each moreLinks as link (link.href)}
			<a href={link.href} class="more-sheet__link ..." onclick={() => (moreOpen = false)}>
				{t(link.labelKey)}
			</a>
		{/each}
		...
	</div>
</BottomSheet>
```

**For Phase 30:** DELETE ALL — with exactly 4 hubs, the More affordance disappears:
- Remove `MORE_ICON` constant
- Remove `moreHrefs` constant
- Remove `moreLinks` derivation
- Remove `moreOpen` state
- Remove `BottomSheet` import
- Remove the `<BottomSheet>` markup block entirely
- Remove the More `<button>` in the tab bar (lines 143-155)

#### Bottom Tab Bar Rendering (lines 129-142)
```typescript
<nav class="bottom-tab-bar sm:hidden" data-testid="bottom-tab-bar">
	{#each bottomTabLinks as link (link.href)}
		<a
			href={link.href}
			class="bottom-tab-bar__item font-mono"
			class:bottom-tab-bar__item--active={$page.url.pathname === link.href}
			aria-label={t(link.labelKey)}
		>
			<span class="bottom-tab-bar__icon">{@html TAB_ICONS[link.href]}</span>
			<span class="bottom-tab-bar__label uppercase" style="letter-spacing: 0.06em;"
				>{t(link.labelKey)}</span
			>
		</a>
	{/each}
	<button type="button" class="bottom-tab-bar__item font-mono" ...>
		<!-- More button - DELETE THIS BLOCK -->
	</button>
</nav>
```

**For Phase 30:** Keep the loop and styling byte-identical; just remove the More button. The `flex: 1` CSS already redistributes 4 items instead of 5.

#### Desktop Masthead (lines 115-126)
```typescript
<div class="hidden sm:flex flex-wrap gap-x-2 gap-y-1 md:gap-4">
	{#each navLinks as link (link.href)}
		<a
			href={link.href}
			class="masthead__link text-label font-mono uppercase"
			class:masthead__link--active={$page.url.pathname === link.href}
			style="letter-spacing: 0.08em;"
		>
			{t(link.labelKey)}
		</a>
	{/each}
</div>
```

**For Phase 30:** No changes — it still loops over `navLinks` (now 4 instead of 10). The `.masthead__link` styling is untouched.

---

### `src/routes/drills/+page.ts`, etc. — Redirect Shims (Route, Request-Response)

**Analog:** SvelteKit API pattern (no existing usage in this codebase, but documented in SvelteKit docs)

#### Redirect Shim Pattern (New File)
```typescript
import { redirect } from '@sveltejs/kit';

export const prerender = true;

export function load() {
	throw redirect(308, '/practice');
}
```

**Usage:**
- Replace each old route's `+page.svelte` with a minimal `+page.ts` containing ONLY the above pattern.
- **Redirect mapping:**
  - `/drills/+page.ts` → `throw redirect(308, '/practice')`
  - `/build/+page.ts` → `throw redirect(308, '/practice')`
  - `/voicings/+page.ts` → `throw redirect(308, '/practice')`
  - `/progressions/+page.ts` → `throw redirect(308, '/practice')`
  - `/scales/+page.ts` → `throw redirect(308, '/learn')`
  - `/theory/+page.ts` → `throw redirect(308, '/learn')`
  - `/recall/+page.ts` → `throw redirect(308, '/progress')`
  - `/songs/+page.ts` → `throw redirect(308, '/progress')`

**Note on prerender:** `src/routes/+layout.ts` has `export const prerender = true`, which applies to all routes. Each shim's `+page.ts` must also declare `export const prerender = true` to be prerendered as a static 308 response (not a server-side redirect). Verify via `npm run build` that the static output includes the 308s cleanly; if not, fall back to a client `goto()` in `onMount()`.

---

### `src/routes/practice/+page.svelte` — Drill Seed Wiring (Page, CRUD + Request-Response)

**Analog:** `src/routes/drills/+page.svelte` (lines 20, 143-166)

#### Import consumeDrillSeeds (line 20)
```typescript
import { consumeDrillSeeds, consumeLessonSeeds } from '$lib/practice/drillSeeds';
```

#### Seed Consumption in Session Init (lines 143-166)
In the `/drills` page, seeds are consumed when the session is created:

```typescript
let session = $state<Session>(
	createSession(
		(() => {
			// Both one-shot channels are consumed regardless of which wins, so
			// neither leaks into a later session; a lesson handoff takes
			// precedence over a Progress weak-list handoff when both are
			// somehow present.
			const lessonSeeds = consumeLessonSeeds().map((symbol) => ({
				symbol,
				family: 'chord' as const,
				origin: 'lesson' as const
			}));
			// Drill-these seeds are chord symbols (Progress filters to kind 'chord').
			const weakSeeds = consumeDrillSeeds().map((symbol) => ({
				symbol,
				family: 'chord' as const
			}));
			return {
				seeds: lessonSeeds.length > 0 ? lessonSeeds : weakSeeds,
				warmupCandidates: recentMisses(5)
			};
		})()
	)
);
```

**For Phase 30 Practice page:** MIRROR this pattern exactly — call `consumeDrillSeeds()` and `consumeLessonSeeds()` at session init, map them to the queue seed shape, and prioritize lesson seeds over drill seeds if both are present. The old `/drills` page's `createSession()` call is the reference implementation.

---

### `src/routes/+page.svelte` — Lookup "Drill It" Handoff (Page, Request-Response)

**Analog:** Itself (lines 1-4, 193-198)

#### Import Pattern (lines 1-4)
```typescript
import { goto } from '$app/navigation';
import { setDrillSeeds } from '$lib/practice/drillSeeds';
```

#### Drill It Handler (lines 193-198)
```typescript
/** Seeds the resolved chord into the one-shot drill queue and navigates to /drills. */
function drillIt() {
	if (!result) return;
	setDrillSeeds([result.symbol]);
	void goto('/drills');
}
```

**For Phase 30:** CHANGE `goto('/drills')` to `goto('/practice')`:
```typescript
function drillIt() {
	if (!result) return;
	setDrillSeeds([result.symbol]);
	void goto('/practice');
}
```

---

### `src/routes/progress/+page.svelte` — Progress Drill Handoffs (Page, Request-Response)

**Analog:** Itself (grep output shows multiple handoff patterns)

#### Drill Danger Cards Handler
```typescript
function drillDangerCards(): void {
	setDrillSeeds(chordDangerSymbols);
	void goto('/drills');
}
```

**For Phase 30:** Change to:
```typescript
function drillDangerCards(): void {
	setDrillSeeds(chordDangerSymbols);
	void goto('/practice');
}
```

#### Drill These Handler
```typescript
function drillThese(): void {
	setDrillSeeds(weakest.filter((item) => item.kind === 'chord').map((item) => item.item));
	void goto('/drills');
}
```

**For Phase 30:** Change to:
```typescript
function drillThese(): void {
	setDrillSeeds(weakest.filter((item) => item.kind === 'chord').map((item) => item.item));
	void goto('/practice');
}
```

#### Per-Symbol Drill Handler (inline in loop)
```typescript
onDrill={(symbol) => {
	setDrillSeeds([symbol]);
	void goto('/drills');
}}
```

**For Phase 30:** Change to:
```typescript
onDrill={(symbol) => {
	setDrillSeeds([symbol]);
	void goto('/practice');
}}
```

---

### `src/lib/i18n/messages/chrome.ts` — Navigation Message Keys (Config, Request-Response)

**Analog:** Itself (lines 9-52)

#### Existing Nav Keys Structure (sample)
```typescript
export const chrome = {
	en: {
		'nav.lookup': 'Lookup',
		'nav.drills': 'Drills',
		'nav.build': 'Build',
		'nav.recall': 'Recall',
		'nav.scales': 'Scales',
		'nav.songs': 'Songs',
		'nav.theory': 'Theory',
		'nav.progress': 'Progress',
		'nav.more': 'More',
		'nav.progressions': 'Progressions',
		'nav.voicings': 'Voicings',
		brand: 'MUSIC LEARN',
		...
	},
	fr: {
		'nav.lookup': 'Rechercher',
		'nav.drills': 'Exercices',
		...
		'nav.more': 'Plus',
		...
	}
};
```

**For Phase 30:** ADD two new keys to both `en` and `fr` objects (UI-SPEC.md specifies the exact strings):
```typescript
en: {
	// ... existing keys ...
	'nav.practice': 'Practice',
	'nav.learn': 'Learn',
	// ... rest ...
}

fr: {
	// ... existing keys ...
	'nav.practice': 'Pratiquer',
	'nav.learn': 'Apprendre',
	// ... rest ...
}
```

**Note:** Do NOT remove the now-unused `nav.drills`, `nav.build`, `nav.recall`, `nav.scales`, `nav.songs`, `nav.theory`, `nav.progressions`, `nav.voicings` keys — their cleanup is deferred (CONTEXT.md).

---

## Test Patterns

### `tests/masthead.e2e.test.ts` — Navigation E2E Assertions (Test, Request-Response)

**Analog:** Itself (lines 31-263)

#### Current Bottom Tab Bar Test (lines 95-114)
```typescript
it('renders Lookup/Drills/Recall/Songs links plus a More button', () => {
	const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
	render(RootLayout, { params: {}, data: {}, children: emptyChildren });
	const bar = within(screen.getByTestId('bottom-tab-bar'));

	expect(bar.getByRole('link', { name: 'Lookup' })).toHaveAttribute('href', '/');
	expect(bar.getByRole('link', { name: 'Drills' })).toHaveAttribute('href', '/drills');
	expect(bar.getByRole('link', { name: 'Recall' })).toHaveAttribute('href', '/recall');
	expect(bar.getByRole('link', { name: 'Songs' })).toHaveAttribute('href', '/songs');
	expect(bar.getByRole('button', { name: 'More' })).toBeInTheDocument();
});
```

**For Phase 30:** UPDATE to:
```typescript
it('renders Lookup/Practice/Learn/Progress links with no More button', () => {
	const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
	render(RootLayout, { params: {}, data: {}, children: emptyChildren });
	const bar = within(screen.getByTestId('bottom-tab-bar'));

	expect(bar.getByRole('link', { name: 'Lookup' })).toHaveAttribute('href', '/');
	expect(bar.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
	expect(bar.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
	expect(bar.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
	expect(bar.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
});
```

#### Masthead Links Test (lines 40-42)
```typescript
it('exposes Lookup, Drills, and Progress links on every viewport', () => {
	const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
	render(RootLayout, { params: {}, data: {}, children: emptyChildren });
	const masthead = within(screen.getByTestId('masthead'));

	expect(masthead.getByRole('link', { name: 'Lookup' })).toBeInTheDocument();
	expect(masthead.getByRole('link', { name: 'Drills' })).toBeInTheDocument();
	expect(masthead.getByRole('link', { name: 'Progress' })).toBeInTheDocument();
});
```

**For Phase 30:** UPDATE to assert the 4 hubs:
```typescript
it('exposes Lookup, Practice, Learn, and Progress links', () => {
	const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
	render(RootLayout, { params: {}, data: {}, children: emptyChildren });
	const masthead = within(screen.getByTestId('masthead'));

	expect(masthead.getByRole('link', { name: 'Lookup' })).toBeInTheDocument();
	expect(masthead.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
	expect(masthead.getByRole('link', { name: 'Learn' })).toBeInTheDocument();
	expect(masthead.getByRole('link', { name: 'Progress' })).toBeInTheDocument();
});
```

#### Test Updates for More Sheet (lines 196-230)
The tests for the More sheet opening/closing behavior (lines 196-230) should be DELETED entirely, as the More affordance no longer exists.

### `src/routes/lookupDrillIt.test.ts` — Lookup Handoff Test (Test, Request-Response)

**Analog:** Itself (lines 1-58)

#### Current Test (lines 45-57)
```typescript
describe('Drill it handoff on the Chord Lookup result', () => {
	it('seeds the resolved symbol and navigates to /drills', async () => {
		renderPage();

		await lookupChord('Cm7');

		const drillItButton = screen.getByTestId('drill-it');
		await fireEvent.click(drillItButton);

		expect(setDrillSeedsMock).toHaveBeenCalledWith(['Cm7']);
		expect(gotoMock).toHaveBeenCalledWith('/drills');
	});
});
```

**For Phase 30:** UPDATE to assert the new `/practice` target:
```typescript
describe('Drill it handoff on the Chord Lookup result', () => {
	it('seeds the resolved symbol and navigates to /practice', async () => {
		renderPage();

		await lookupChord('Cm7');

		const drillItButton = screen.getByTestId('drill-it');
		await fireEvent.click(drillItButton);

		expect(setDrillSeedsMock).toHaveBeenCalledWith(['Cm7']);
		expect(gotoMock).toHaveBeenCalledWith('/practice');
	});
});
```

### NEW: Redirect Assertion Test (8 Routes)

**Analog:** No existing redirect tests; structure based on SvelteKit load() pattern and the e2e test structure used elsewhere.

#### Test File Structure
```typescript
/**
 * Redirect shim assertions (Phase 30 HUB-03): each of the 8 old routes
 * (/drills, /build, /voicings, /progressions → /practice; /scales, /theory
 * → /learn; /recall, /songs → /progress) must prerender as 308 server
 * redirects to the correct hub.
 *
 * Because the load() function's throw redirect() is resolved at build time
 * (prerender: true), these are build-time tests, not runtime e2e tests. The
 * test verifies the shim's `load()` function throws the correct redirect.
 */

import { describe, it, expect, vi } from 'vitest';

describe('Redirect shims (Phase 30 HUB-03)', () => {
	it('/drills redirects to /practice', async () => {
		const { load } = await import('../src/routes/drills/+page');
		const redirectError = await load().catch((e) => e);
		expect(redirectError?.status).toBe(308);
		expect(redirectError?.location).toBe('/practice');
	});

	it('/build redirects to /practice', async () => {
		const { load } = await import('../src/routes/build/+page');
		const redirectError = await load().catch((e) => e);
		expect(redirectError?.status).toBe(308);
		expect(redirectError?.location).toBe('/practice');
	});

	// ... repeat for /voicings, /progressions, /scales, /theory, /recall, /songs
});
```

**Rationale:** A single test file covering all 8 shims keeps coverage compact. Each test imports the shim's `+page.ts`, calls its `load()`, and asserts the thrown redirect object has the correct status and location.

---

## Shared Patterns

### Handoff Pattern (Drill Seeds + Navigation)
**Applied to:** `src/routes/+page.svelte`, `src/routes/progress/+page.svelte`, `src/routes/practice/+page.svelte`

```typescript
import { goto } from '$app/navigation';
import { setDrillSeeds } from '$lib/practice/drillSeeds';

// In any handler:
function drillSomething(symbols: string[]): void {
	setDrillSeeds(symbols);
	void goto('/practice');  // ← Changed from '/drills' to '/practice'
}
```

### i18n Message Registration
**Applied to:** `src/lib/i18n/messages/chrome.ts`

When adding new nav keys, ensure they are added to BOTH `en` and `fr` objects with the same key names. The test suite (`src/lib/i18n/messages.test.ts`) automatically enforces parity via:
```typescript
const enKeys = Object.keys(messages.en).sort();
const frKeys = Object.keys(messages.fr).sort();
expect(frKeys).toEqual(enKeys);
```

---

## No Analog Found

None. All Phase 30 files have direct analogs in the existing codebase:
- Navigation structure: existing `+layout.svelte`
- Redirect shims: SvelteKit documented API pattern
- Seed wiring: existing `/drills` implementation
- Handoff repointing: existing link/navigation patterns
- i18n: existing message domain structure
- Tests: existing test file patterns

---

## Metadata

**Analog search scope:** `/src/routes`, `/src/lib/components`, `/src/lib/i18n`, `/tests`

**Files scanned:** 
- `/src/routes/+layout.svelte` (nav structure)
- `/src/routes/+layout.ts` (prerender)
- `/src/routes/+page.svelte` (Lookup handoff)
- `/src/routes/progress/+page.svelte` (Progress handoffs)
- `/src/routes/drills/+page.svelte` (seed consumption reference)
- `/src/lib/practice/drillSeeds.ts` (seed API)
- `/src/lib/i18n/messages/chrome.ts` (nav i18n)
- `/tests/masthead.e2e.test.ts` (nav test structure)
- `/src/routes/lookupDrillIt.test.ts` (handoff test structure)
- `/src/lib/i18n/messages.test.ts` (i18n test pattern)

**Pattern extraction date:** 2026-07-25
