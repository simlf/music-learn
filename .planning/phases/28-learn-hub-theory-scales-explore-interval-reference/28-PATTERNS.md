# Phase 28: Learn Hub — Pattern Map

**Mapped:** 2026-07-25  
**Files analyzed:** 10 new/modified files  
**Analogs found:** 8 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|---|---|
| `src/routes/learn/+page.svelte` | page/route | read (prerender-safe) | `src/routes/theory/+page.svelte` + `src/routes/scales/+page.svelte` | exact + exact |
| `src/lib/components/TheoryLessons.svelte` | component | read (stateful, client-side lesson state) | sections extracted from theory/+page.svelte (lines 92-224) | exact |
| `src/lib/components/ScaleExplorer.svelte` | component | read + state (tonic picker, inspect payload, mode toggle) | scales/+page.svelte body (lines 42-102) | exact |
| `src/routes/theory/+page.svelte` | page/route (modified) | read | same file lines 81-230 | thin wrapper |
| `src/routes/scales/+page.svelte` | page/route (modified) | read | same file lines 42-102 | thin wrapper |
| `src/routes/practice/+page.svelte` | page/route (modified) | request-response + state | same file + disclosure precedent (LevelPicker.svelte) | additive pattern |
| `src/lib/i18n/messages/learn.ts` | config/data | i18n data | `src/lib/i18n/messages/theory.ts` | structure match |
| `src/lib/i18n/messages/index.ts` | config (modified) | i18n merge | same file lines 1-63 | same pattern |
| `src/lib/i18n/messages.test.ts` | test (modified) | i18n validation | same file lines 55-69 | same pattern |
| `src/routes/learn.test.ts` | test | route render/smoke | `src/routes/theoryInteractiveLesson.test.ts` + `src/routes/progressionsPage.test.ts` | pattern match |

## Pattern Assignments

### `src/routes/learn/+page.svelte` (page/route, read-prerender)

**Primary Analogs:** `src/routes/theory/+page.svelte` and `src/routes/scales/+page.svelte`

**Inherit from `/theory` (lines 81-90):**
```typescript
// Page shell structure (body, heading, subtitle, section layout)
<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<div class="mx-auto flex max-w-[42rem] flex-col gap-8">
		<header>
			<h1 class="text-heading mt-2 font-bold">{t('theory.page.title')}</h1>
			<p class="text-body text-muted mt-2">
				{t('theory.page.subtitle')}
			</p>
		</header>
		<!-- sections with gap-8 spacing -->
	</div>
</main>
```

**Inherit from `/scales` (lines 42-60):**
```typescript
// Tonic row pattern for Scale Explore section
<div class="mt-6 flex flex-wrap gap-2" data-testid="tonic-row">
	{#each MAJOR_SCALE_ROOTS as root (root)}
		<Button
			type="button"
			variant={root === tonic ? 'primary' : 'ghost'}
			aria-label={`${root} ${t('scales.tonic.qualitySuffix')}`}
			aria-pressed={root === tonic}
			onclick={() => pickTonic(root)}
		>
			{root}
		</Button>
	{/each}
</div>
```

**Page structure:** Compose three sections with eyebrow labels (section data-testid, text-label font-mono uppercase styling):
1. Theory part: extracted `TheoryLessons.svelte`
2. Scale Explore part: extracted `ScaleExplorer.svelte`
3. Interval Reference block: five `IntervalView` instances (see below)

**Footer CTA (replace `/theory`'s drills button):**
```typescript
// Line 226-228 from /theory, adapted
<div class="flex justify-center pb-8">
	<Button href="/practice">{t('learn.footer.practiceButton')}</Button>
</div>
```

**Imports pattern** (lines 1-10 from theory/+page.svelte):
```typescript
import { onDestroy } from 'svelte';
import { mnemonicFor } from '$lib/copy/mnemonics';
import { ensureAudioReady, playChord } from '$lib/audio/audio';
import ChordExample from '$lib/components/ChordExample.svelte';
import ChordGlyph from '$lib/components/ChordGlyph.svelte';
import NoteLabel from '$lib/components/NoteLabel.svelte';
import Button from '$lib/components/Button.svelte';
import InteractiveLesson from '$lib/components/InteractiveLesson.svelte';
import { t, type MessageKey } from '$lib/i18n/locale.svelte';
```

---

### `src/lib/components/TheoryLessons.svelte` (component, read-stateful)

**Analog:** Body of `src/routes/theory/+page.svelte` (lines 52-224)

**Extraction scope:** Everything from `let seventhPick = $state(...)` through the last `</section>` before the footer div. This includes:
- State declarations (seventhPick, anchorPick, resolutionTimer)
- The `hook` snippet (lines 69-79)
- All six lesson sections (Interactive, Symbol, Sevenths, Anchor, Dominant, Diminished, Solfège)
- Helper function `hearResolution()`
- onDestroy cleanup

**Structure pattern** (extract lines 52-224 verbatim, no copy-paste into /learn):
```typescript
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { mnemonicFor } from '$lib/copy/mnemonics';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import ChordExample from '$lib/components/ChordExample.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import NoteLabel from '$lib/components/NoteLabel.svelte';
	import Button from '$lib/components/Button.svelte';
	import InteractiveLesson from '$lib/components/InteractiveLesson.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	const SEVENTH_SHAPES = [...];
	const ANCHOR_CHORDS = [...];
	const SOLFEGE_MAP = [...];
	
	let seventhPick = $state(SEVENTH_SHAPES[0]);
	let anchorPick = $state(ANCHOR_CHORDS[0]);
	let resolutionTimer: ReturnType<typeof setTimeout> | undefined;
	
	function hearResolution() { ... }
	function onDestroy() { ... }
</script>

<!-- No <main> or <header> wrapper in component; just the section stack -->
<!-- First section: data-testid="section-interactive-lesson" -->
<!-- Through last section: data-testid="section-solfege" -->
```

**Reuse pattern:** Both `/theory` and `/learn` render the same extracted component to ensure one source of truth (CONTEXT's DRY mandate "only pages move, not lesson markup").

---

### `src/lib/components/ScaleExplorer.svelte` (component, read + state)

**Analog:** Explore branch of `src/routes/scales/+page.svelte` (lines 25-46, 62-96)

**Extraction scope:** The tonic picker, toggle/mode selection logic, and the conditional Explore branch. Extract these pieces:
- State: `let tonic`, `let mode`, `const notes`, `let inspectPayload`
- Functions: `pickTonic()`, `handleInspect()`
- Card container (lines 62-102 with mode toggle, conditional Explore branch)

**Structure pattern** (without the Explore/Practice mode toggle in Learn; see UI-SPEC):
```typescript
<script lang="ts">
	import { MAJOR_SCALE_ROOTS, majorScaleNotes } from '$lib/theory/scale';
	import ScaleDegreeStrip, { type InspectPayload } from '$lib/components/ScaleDegreeStrip.svelte';
	import InspectRegister from '$lib/components/InspectRegister.svelte';
	import Button from '$lib/components/Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	let tonic = $state('C');
	let inspectPayload = $state<InspectPayload | null>(null);
	const notes = $derived(majorScaleNotes(tonic));

	function pickTonic(next: string) {
		tonic = next;
		inspectPayload = null;
	}

	function handleInspect(payload: InspectPayload) {
		inspectPayload = payload;
	}
</script>

<!-- Tonic row -->
<div class="mt-6 flex flex-wrap gap-2" data-testid="tonic-row">
	{#each MAJOR_SCALE_ROOTS as root (root)}
		<Button
			type="button"
			variant={root === tonic ? 'primary' : 'ghost'}
			aria-label={`${root} ${t('scales.tonic.qualitySuffix')}`}
			aria-pressed={root === tonic}
			onclick={() => pickTonic(root)}
		>
			{root}
		</Button>
	{/each}
</div>

<!-- Card with Explore-only content (no mode toggle, no Practice branch) -->
<div class="border-ink bg-paper-bright mt-8 border-2 px-2 py-6 sm:px-6">
	<p class="text-label font-mono uppercase" data-testid="scale-title">
		{tonic} {t('scales.tonic.qualitySuffix')}
	</p>
	<div class="mt-4">
		<ScaleDegreeStrip {notes} {tonic} onInspect={handleInspect} />
	</div>
	<InspectRegister payload={inspectPayload} idleText={t('scales.inspect.idle')} />
</div>
```

**Reuse pattern:** Both `/scales` (in Practice mode) and `/learn` use the extracted component. `/scales` becomes a thin wrapper that adds the mode toggle around the Explore piece.

---

### Interval Reference Block (in `/learn`, uses `IntervalView.svelte`)

**Analog:** `src/lib/components/IntervalView.svelte` (lines 1-50, 52-135)

**Rendering pattern** (five instances, stacked, no toggle, no onInspectTone):

```typescript
// At the top of /learn's <script>
import IntervalView from '$lib/components/IntervalView.svelte';
import ChordGlyph from '$lib/components/ChordGlyph.svelte';
import { spellChord } from '$lib/theory/chord';

// In the Interval Reference section body:
{#each INTERVAL_REFERENCE_CHORDS as chord (chord.symbol)}
	<div class="mt-8 flex flex-col gap-4 last:mb-0">
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
			{chord.label}
		</p>
		<div class="flex items-start gap-4">
			<ChordGlyph root="C" quality={chord.quality} />
		</div>
		<IntervalView chord={spellChord(chord.symbol)} />
	</div>
{/each}
```

**Data constant (same order and shape as theory.ts SEVENTH_SHAPES):**
```typescript
const INTERVAL_REFERENCE_CHORDS = [
	{ symbol: 'Cmaj7', quality: 'maj7', label: 'MAJ7' },
	{ symbol: 'C7', quality: '7', label: 'DOM7' },
	{ symbol: 'Cm7', quality: 'm7', label: 'M7' },
	{ symbol: 'Cm7b5', quality: 'm7b5', label: 'M7♭5' },
	{ symbol: 'Cdim7', quality: 'dim7', label: 'DIM7' }
];
```

**IntervalView contract** (from lines 19-26):
```typescript
interface Props {
	chord: ChordResult;
	/**
	 * Optional tap-to-inspect passthrough. When omitted, tone chips render
	 * as inert non-button markup (gated-prop, byte-identical-when-omitted
	 * convention, per IntervalChip.longName precedent).
	 */
	onInspectTone?: (entry: FormulaEntry) => void;
}
```

**Spacing:** Use `gap-8` (32px) between the 5 sub-rows, same as outer section stack per UI-SPEC.

---

### `src/routes/practice/+page.svelte` (page/route, modified, additive)

**Analog:** Same file + disclosure pattern from `src/lib/components/LevelPicker.svelte` (lines 62-88)

**Placement:** After the `{#if pageState}` block (line 506), before `</main>`. This is OUTSIDE the pageState machine, matching LevelPicker's own placement pattern.

**Structure pattern** (from LevelPicker lines 62-88, adapted):
```typescript
// Script state
let scaleExpandedtoggle = $state(false);

// In markup, after {#if pageState...}{/if} block:
<div class="mt-8">
	<Button
		type="button"
		variant="ghost"
		aria-expanded={scaleExpandedToggle}
		onclick={() => (scaleExpandedToggle = !scaleExpandedToggle)}
	>
		{scaleExpandedToggle ? t('learn.scale-practice.close') : t('learn.scale-practice.toggle')}
	</Button>

	{#if scaleExpandedToggle}
		<div class="border-ink bg-paper-bright mt-4 border-2 px-4 py-6" data-testid="scale-practice-card">
			<!-- Heading + body -->
			<!-- Tonic row (reuse scales pattern) -->
			<!-- ScaleKeyboardDrill component -->
		</div>
	{/if}
</div>
```

**Key properties:**
- Ghost variant (not primary — reserves primary for the main "Start practice" CTA per UI-SPEC accent discipline)
- `aria-expanded` reflects the toggle state
- Collapsed by default (`$state(false)`)
- Card content matches scales/+page.svelte's card structure (border-ink bg-paper-bright border-2 px-4 py-6)

---

### `src/lib/i18n/messages/learn.ts` (config, i18n data)

**Analog:** `src/lib/i18n/messages/theory.ts` (lines 1-82) + `src/lib/i18n/messages/scales.ts` (lines 1-58)

**Structure pattern:**
```typescript
import type { LocaleDict } from './index';

/**
 * Learn domain dictionary (I18N-02, Phase 28 Plan XX): the `/learn` hub page
 * (theory + scale explore + interval reference sections), the Scale practice
 * affordance on `/practice`, and the extracted TheoryLessons/ScaleExplorer
 * components when rendered outside their original routes.
 *
 * IMMUNITY: (same as theory.ts and scales.ts) chord symbols, interval
 * shorthand, solfège syllables, scale degree numbers — all stay as raw values,
 * never routed through t().
 */
export const learn = {
	en: {
		// /learn page
		'learn.page.title': 'Learn',
		'learn.page.subtitle': 'Read the theory, explore the major scale, and see how any chord\'s intervals stack.',

		// Section eyebrow labels
		'learn.section.theory.label': 'Theory',
		'learn.section.explore.label': 'Scale Explore',
		'learn.section.explore.heading': 'Explore the major scale',
		'learn.section.interval.label': 'Interval Reference',
		'learn.section.interval.heading': 'How every seventh chord stacks',
		'learn.section.interval.intro': 'Five qualities, one repeating pattern of thirds. Compare the gaps below.',

		// Interval reference quality labels (match /theory SEVENTH_SHAPES captions)
		'learn.interval.maj7': 'MAJ7',
		'learn.interval.dom7': 'DOM7',
		'learn.interval.m7': 'M7',
		'learn.interval.m7b5': 'M7♭5',
		'learn.interval.dim7': 'DIM7',

		// Footer CTA
		'learn.footer.practiceButton': 'Go to Practice',

		// Scale practice disclosure on /practice
		'learn.scale-practice.toggle': 'Scale practice',
		'learn.scale-practice.close': 'Hide scale practice',
		'learn.scale-practice.heading': 'Practice a major scale',
		'learn.scale-practice.body': 'Pick a tonic, then play its scale ascending and back down.'
	},
	fr: {
		// (Same structure, French translations)
		'learn.page.title': 'Apprendre',
		'learn.page.subtitle': 'Lis la théorie, explore la gamme majeure et vois comment les intervalles de n\'importe quel accord s\'empilent.',
		'learn.section.theory.label': 'Théorie',
		'learn.section.explore.label': 'Explorer la gamme',
		'learn.section.explore.heading': 'Explorer la gamme majeure',
		'learn.section.interval.label': 'Référence des intervalles',
		'learn.section.interval.heading': 'Comment s\'empilent tous les accords de septième',
		'learn.section.interval.intro': 'Cinq qualités, un motif répétitif de tierces. Compare les écarts ci-dessous.',
		'learn.interval.maj7': 'MAJ7',
		'learn.interval.dom7': 'DOM7',
		'learn.interval.m7': 'M7',
		'learn.interval.m7b5': 'M7♭5',
		'learn.interval.dim7': 'DIM7',
		'learn.footer.practiceButton': 'Direction la pratique',
		'learn.scale-practice.toggle': 'Pratique de gamme',
		'learn.scale-practice.close': 'Masquer la pratique de gamme',
		'learn.scale-practice.heading': 'Pratiquer une gamme majeure',
		'learn.scale-practice.body': 'Choisis une tonique, puis joue sa gamme en montant puis en descendant.'
	}
} satisfies LocaleDict;
```

---

### `src/lib/i18n/messages/index.ts` (config, modified)

**Analog:** Same file, lines 1-63

**Modification pattern:**
1. Add import at top (after `import { practice } from './practice'`):
```typescript
import { learn } from './learn';
```

2. Add to `messages.en` object (after `...practice.en`):
```typescript
...learn.en
```

3. Add to `messages.fr` object (after `...practice.fr`):
```typescript
...learn.fr
```

---

### `src/lib/i18n/messages.test.ts` (test, modified)

**Analog:** Same file, lines 55-69 (domain collision guard)

**Modification pattern:**
1. Add import after `import { practice } from './messages/practice'`:
```typescript
import { learn } from './messages/learn';
```

2. Add to `domains` array (after the `['practice', practice.en]` entry):
```typescript
['learn', learn.en],
```

**Result:** The domains array will be 14 entries (learn added to existing 13).

---

### `src/routes/learn.test.ts` (test, new)

**Analog:** `src/routes/theoryInteractiveLesson.test.ts` + `src/routes/progressionsPage.test.ts`

**Test structure pattern:**
```typescript
import { render, screen, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * LEARN-01/LEARN-02 render/smoke test (Phase 28 Plan XX): proves the /learn
 * hub renders all three sections (Theory lessons, Scale Explore, Interval
 * Reference) with their expected content, and that the Scale practice
 * disclosure is reachable from /practice. Mirrors theoryInteractiveLesson
 * test's mock-then-import convention and i18n coverage.
 */

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => true
}));

const { default: LearnPage } = await import('./learn/+page.svelte');

function renderPage() {
	return render(LearnPage);
}

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('/learn: hub structure and section presence', () => {
	it('renders the Learn hub page', () => {
		renderPage();
		expect(screen.getByText('Learn')).toBeInTheDocument();
	});

	it('renders the Theory section with lesson sections (smoke test)', () => {
		renderPage();
		expect(screen.getByTestId('learn-theory')).toBeInTheDocument();
		expect(screen.getByTestId('section-interactive-lesson')).toBeInTheDocument();
		expect(screen.getByTestId('section-symbol')).toBeInTheDocument();
		expect(screen.getByTestId('section-sevenths')).toBeInTheDocument();
	});

	it('renders the Scale Explore section with tonic picker', () => {
		renderPage();
		expect(screen.getByTestId('learn-explore')).toBeInTheDocument();
		expect(screen.getByTestId('tonic-row')).toBeInTheDocument();
		expect(screen.getByTestId('scale-title')).toBeInTheDocument();
	});

	it('renders the Interval Reference block with five interval views', () => {
		renderPage();
		expect(screen.getByTestId('learn-interval-reference')).toBeInTheDocument();
		const views = screen.getAllByTestId('interval-view');
		expect(views).toHaveLength(5);
	});

	it('renders the footer "Go to Practice" button', () => {
		renderPage();
		const btn = screen.getByRole('link', { name: /Practice/ });
		expect(btn).toHaveAttribute('href', '/practice');
	});

	it('renders all copy in French (I18N-02)', () => {
		setLocale('fr');
		renderPage();
		expect(screen.getByText('Apprendre')).toBeInTheDocument();
	});
});

describe('/practice: Scale practice affordance reachability', () => {
	// TBD in Phase 28 Plan XX: /practice test that the disclosure is present
	// and can be toggled (mirrors LevelPicker's own test pattern).
});
```

---

## Shared Patterns

### Page Shell & Main Container

**Source:** `/theory` (lines 81-84) and `/scales` (lines 42-46)  
**Apply to:** `/learn`, `/theory`, `/scales`

```typescript
<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<div class="mx-auto flex max-w-[42rem] flex-col gap-8">
		<!-- content -->
	</div>
</main>
```

### Section Eyebrow Labels

**Source:** `/theory` (lines 103-104, 120-121, etc.)  
**Apply to:** All sectioned pages (theory, scales, learn)

```typescript
<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
	{t('theory.symbol.label')} <!-- or scales.mode.groupLabel, learn.section.theory.label -->
</p>
```

### Card Container (bordered sections)

**Source:** `/theory` (lines 92-97) and `/scales` (lines 62-66)  
**Apply to:** Any bounded card region

```typescript
<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-symbol"
>
	<!-- content -->
</section>
```

### Button Toggle Pattern (selected state via primary variant)

**Source:** `/theory` (lines 129-135) and `/scales` (lines 49-59, 73-88)  
**Apply to:** Tonic pickers, seventh-quality pickers, mode toggles, any selected-state button group

```typescript
<div class="flex flex-wrap gap-2">
	{#each items as item (item.id)}
		<Button
			type="button"
			variant={currentItem.id === item.id ? 'primary' : 'ghost'}
			aria-pressed={currentItem.id === item.id}
			onclick={() => (currentItem = item)}
		>
			{item.label}
		</Button>
	{/each}
</div>
```

### Disclosure Toggle Pattern (aria-expanded, ghost variant)

**Source:** `src/lib/components/LevelPicker.svelte` (lines 64-71, 73-88)  
**Apply to:** Scale practice disclosure on `/practice`

```typescript
// State
let isExpanded = $state(false);

// Toggle button
<Button
	type="button"
	variant="ghost"
	aria-expanded={isExpanded}
	onclick={() => (isExpanded = !isExpanded)}
>
	{isExpanded ? 'Hide...' : 'Show...'}
</Button>

// Conditional content
{#if isExpanded}
	<div class="border-ink bg-paper-bright mt-4 border-2 px-4 py-6">
		<!-- card content -->
	</div>
{/if}
```

### i18n Domain Structure

**Source:** `messages/theory.ts` and `messages/scales.ts`  
**Apply to:** `messages/learn.ts`

```typescript
import type { LocaleDict } from './index';

export const domainName = {
	en: {
		'domain.key.name': 'English text',
		// ... more keys
	},
	fr: {
		'domain.key.name': 'Texte français',
		// ... matching keys
	}
} satisfies LocaleDict;
```

---

## No Analog Found

None. All Phase 28 files have close existing precedents.

---

## Metadata

**Pattern search scope:** `/src/routes/`, `/src/lib/components/`, `/src/lib/i18n/`, `/src/lib/theory/`

**Files scanned:** 20+ (theory, scales, practice pages; components; i18n; tests)

**Pattern extraction date:** 2026-07-25

**Key extraction points:**
- Theory lessons: `src/routes/theory/+page.svelte` lines 52-224 (DRY extraction for /learn reuse)
- Scale Explore: `src/routes/scales/+page.svelte` lines 25-46, 62-96 (tonic + explore-only branch)
- IntervalView: `src/lib/components/IntervalView.svelte` lines 19-135 (gated onInspectTone prop, stacked-thirds default)
- Disclosure: `src/lib/components/LevelPicker.svelte` lines 62-88 (aria-expanded, ghost variant, conditional render)
- i18n registration: `src/lib/i18n/messages/index.ts` lines 32-46 (merge pattern, domain list), `messages.test.ts` lines 55-69 (collision guard)
- Page tests: `theoryInteractiveLesson.test.ts` (component fixture), `progressionsPage.test.ts` (page + layout fixture)
