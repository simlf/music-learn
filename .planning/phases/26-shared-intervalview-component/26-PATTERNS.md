# Phase 26: Shared IntervalView Component - Pattern Map

**Mapped:** 2026-07-24  
**Files analyzed:** 6 new/modified files  
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/components/IntervalView.svelte` | component | request-response | `IntervalScaffold.svelte` + `LocaleToggle.svelte` | exact |
| `src/lib/lookup/intervalDerivations.ts` | utility | transform | `chordPresentation.ts` + `interval.ts` | exact |
| `src/lib/lookup/intervalDerivations.test.ts` | test | CRUD | `chordPresentation.test.ts` + `interval.test.ts` | exact |
| `src/lib/components/IntervalView.test.ts` | test | CRUD | `progressionDrill.test.ts` | role-match |
| `src/routes/+page.svelte` (modify) | component | request-response | existing lines 376-389 | exact |
| `src/lib/i18n/messages/lookup.ts` (new or modify) | config | data-driven | `drills.ts`, `recall.ts` | exact |

---

## Pattern Assignments

### `src/lib/components/IntervalView.svelte` (component, request-response)

**Analog:** `src/lib/components/IntervalScaffold.svelte` (rendering pattern) + `src/lib/components/LocaleToggle.svelte` (toggle pattern)

**Props runes shape** (`IntervalScaffold.svelte` lines 15-22):
```typescript
interface Props {
	/** The target chord's formula entries (from formulaFor). */
	entries: FormulaEntry[];
	/** How much scaffold to show, from the user's tier (intervalScaffoldLevel). */
	level: IntervalScaffoldLevel;
}

let { entries, level }: Props = $props();
```

**Toggle pattern** (`LocaleToggle.svelte` lines 18-37):
```svelte
<div class="locale-toggle" role="group" aria-label={t('locale.aria.group')}>
	<Button
		type="button"
		variant={currentLocale() === 'en' ? 'primary' : 'ghost'}
		aria-pressed={currentLocale() === 'en'}
		aria-label={t('locale.aria.en')}
		onclick={() => setLocale('en')}
	>
		EN
	</Button>
	<Button
		type="button"
		variant={currentLocale() === 'fr' ? 'primary' : 'ghost'}
		aria-pressed={currentLocale() === 'fr'}
		aria-label={t('locale.aria.fr')}
		onclick={() => setLocale('fr')}
	>
		FR
	</Button>
</div>
```

**Toggle styling** (`LocaleToggle.svelte` lines 39-54):
```css
.locale-toggle {
	display: flex;
	gap: var(--spacing-xs);
	font-family: var(--font-mono);
	font-size: var(--text-label);
	text-transform: uppercase;
	letter-spacing: 0.08em;
}

.locale-toggle :global(.ps-button[aria-pressed='true']) {
	background: var(--color-ink);
	color: var(--color-paper);
	border-color: var(--color-ink);
}
```

**Chip row rendering** (`IntervalScaffold.svelte` lines 25-41):
```svelte
{#if level !== 'off'}
	<div class="border-ink mt-4 border-2 px-3 py-3" data-testid="interval-scaffold">
		<p class="text-label text-muted font-mono uppercase" style="letter-spacing: 0.12em;">
			{t('drills.scaffold.caption')}
		</p>
		<div class="mt-2 flex flex-wrap gap-3" data-scaffold-level={level}>
			{#each entries as entry (entry.role + entry.label)}
				<div class="flex flex-col items-center gap-1">
					<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
					{#if level === 'full'}
						<span class="text-label text-muted font-mono">{entry.longFr}</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
```

**IntervalChip usage** (`IntervalScaffold.svelte` line 33):
```svelte
<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
```

**Button import pattern** (`LocaleToggle.svelte` line 14):
```typescript
import Button from './Button.svelte';
```

---

### `src/lib/lookup/intervalDerivations.ts` (utility, transform)

**Analog:** `src/lib/lookup/chordPresentation.ts` + `src/lib/theory/interval.ts`

**Pure function signature pattern** (`chordPresentation.ts` lines 32-43):
```typescript
/**
 * Interval-formula readout: root shown as "R", other tones as quality-first
 * labels ("m3", "P5", "m7"). Naming comes from the shared
 * $lib/theory/interval module.
 */
export function formulaFor(chord: ChordResult): FormulaEntry[] {
	return chord.notes.map((note) => {
		const info = intervalBetween(chord.root, note.letter);
		return {
			role: note.role,
			label: info.short,
			longFr: info.longFr,
			letter: note.letter,
			solfege: note.solfege
		};
	});
}
```

**Imports pattern** (`chordPresentation.ts` lines 1-8):
```typescript
import {
	intervalBetween,
	intervalFromShort,
	toAsciiAccidentals,
	toGlyphAccidentals
} from '$lib/theory/interval';
import type { ChordResult, IntervalRole } from '$lib/theory/types';
import { currentLocale } from '$lib/i18n/locale.svelte';
```

**Interface pattern** (`chordPresentation.ts` lines 16-23):
```typescript
export interface FormulaEntry {
	role: IntervalRole;
	label: string;
	/** French long name for tooltips/aria ("tierce mineure"; "fondamentale" for the root). */
	longFr: string;
	letter: string;
	solfege: string;
}
```

**Interval helper usage** (`chordPresentation.ts` lines 34-35):
```typescript
const info = intervalBetween(chord.root, note.letter);
return {
	// ... use info.short and info.longFr
};
```

**Total function pattern** (`interval.ts` lines 249-253):
```typescript
export function intervalFromShort(short: string): IntervalInfo {
	const tonalName = shortToTonalName(short);
	if (tonalName === null) return EMPTY_INTERVAL;
	return infoFromTonal(Interval.get(tonalName));
}
```

---

### `src/lib/lookup/intervalDerivations.test.ts` (test, CRUD)

**Analog:** `src/lib/lookup/chordPresentation.test.ts` + `src/lib/theory/interval.test.ts`

**Test structure pattern** (`chordPresentation.test.ts` lines 1-22):
```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import { formulaFor, aliasLine, displaySymbol, formulaSentence } from './chordPresentation';
import { setLocale } from '$lib/i18n/locale.svelte';

describe('formulaFor', () => {
	it('returns R, m3, P5, m7 labels in order for Cm7 with correct letters and solfege', () => {
		const entries = formulaFor(spellChord('Cm7'));
		expect(entries.map((e) => e.label)).toEqual(['R', 'm3', 'P5', 'm7']);

		const root = entries[0];
		expect(root.role).toBe('root');
		expect(root.letter).toBe('C');
		expect(root.solfege).toBe('Do');
	});
});
```

**Locale switching pattern** (`chordPresentation.test.ts` lines 120-130):
```typescript
describe('formulaSentence: FR locale (Phase 17 copy translated)', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('generates the canonical dim worked example in French', () => {
		setLocale('fr');
		expect(formulaSentence(spellChord('Cdim'))).toBe(
			'À partir de la fondamentale, empile une tierce mineure, puis une quinte diminuée.'
		);
	});
});
```

**Total function test pattern** (`interval.test.ts` lines 107-113):
```typescript
it('is total: unparseable input returns a recognizable empty IntervalInfo, never throws', () => {
	const info = intervalBetween('Zx', 'Q');
	expect(info.short).toBe('');
	expect(info.degree).toBe(0);
	expect(info.semitones).toBe(-1);
	expect(info.role).toBe('root');
});
```

---

### `src/lib/components/IntervalView.test.ts` (test, CRUD)

**Analog:** `src/lib/components/progressionDrill.test.ts`

**Component test setup pattern** (`progressionDrill.test.ts` lines 1-28):
```typescript
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressionDrill from './ProgressionDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { saveSong, type Song } from '$lib/practice/songs';

/**
 * Component test for ProgressionDrill (Phase 25 Plan 05, sketch-017
 * synthesis, SK-017): [detailed test strategy]
 */

function song(overrides: Partial<Song> = {}): Song {
	return {
		id: 'song-1',
		name: 'Autumn Leaves (my chart)',
		chordSymbols: ['Dm7'],
		createdAt: '2026-07-20T00:00:00.000Z',
		source: 'custom',
		active: true,
		...overrides
	};
}

beforeEach(() => {
	localStorage.clear();
});
```

**Cleanup pattern** (`progressionDrill.test.ts` line 49):
```typescript
beforeEach(() => {
	localStorage.clear();
});
```

**Button/interaction testing pattern** (from `progressionDrill.test.ts` lines 36-46):
```typescript
function clickKey(letter: string) {
	const keys = screen.getAllByRole('button', { name: `${letter} key` });
	fireEvent.click(keys[0]);
}

async function nameBar(symbol: string) {
	await fireEvent.click(screen.getByText(symbol));
}
```

---

### `src/routes/+page.svelte` (modification)

**Analog:** Current lines 376-389 (interval formula display)

**Current formula display** (lines 1-15, imports):
```typescript
import {
	formulaFor,
	aliasLine,
	displaySymbol,
	type FormulaEntry
} from '$lib/lookup/chordPresentation';
```

**Current render loop** (lines 376-389):
```svelte
<div class="mt-6 flex gap-4" data-testid="interval-formula">
	{#each formulaFor(result) as entry (entry.role + entry.letter)}
		<button
			type="button"
			class="formula-tap flex flex-col items-center gap-1"
			aria-label={`Inspect ${entry.letter}`}
			onclick={() => inspectFormulaEntry(entry)}
		>
			<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
			<span class="text-label font-mono">{entry.letter}</span>
			<span class="text-label font-mono">{entry.solfege}</span>
		</button>
	{/each}
</div>
```

**Current integration pattern** (lines 81-90 — the inspect handler):
```typescript
function inspectFormulaEntry(entry: FormulaEntry) {
	if (!result) return;
	playNote(`${toAsciiAccidentals(entry.letter)}4`);
	inspectPayload = {
		letter: entry.letter,
		solfege: entry.solfege,
		octave: 4,
		info: intervalFromRoot(result.root, entry.letter),
		inChord: true
	};
}
```

**Component import pattern** (line 18-26):
```typescript
import PianoKeyboard, { type InspectPayload } from '$lib/components/PianoKeyboard.svelte';
import ChordGlyph from '$lib/components/ChordGlyph.svelte';
import IntervalChip from '$lib/components/IntervalChip.svelte';
import InspectRegister from '$lib/components/InspectRegister.svelte';
import SongHook from '$lib/components/SongHook.svelte';
import SongMark from '$lib/components/SongMark.svelte';
import Button from '$lib/components/Button.svelte';
import RecentChipRow from '$lib/components/RecentChipRow.svelte';
import WhyTheseNotes from '$lib/components/WhyTheseNotes.svelte';
```

---

### `src/lib/i18n/messages/lookup.ts` (new or add to existing domain)

**Analog:** `src/lib/i18n/messages/drills.ts` + `src/lib/i18n/messages/recall.ts`

**Domain dictionary structure** (`drills.ts` lines 1-26):
```typescript
import type { LocaleDict } from './index';

/**
 * Drills domain dictionary (I18N-02, Phase 20 Plan 04): every literal the
 * drills page, IntervalScaffold, and LevelPicker render - mode row, score
 * register, rotate hint, question-source tags...
 * IMMUNITY (never keyed here, per 20-UI-SPEC "Chord Glyph & Symbol
 * Immunity"): chord symbols, the serif ChordGlyph, interval shorthand
 * (R/m3/P5/m7), solfège syllables (Do/Ré/Mi), and IntervalInfo.longFr...
 * stay untouched and are never routed through t().
 */
export const drills = {
	en: {
		'drills.page.title': 'Drills',
		// ... more keys
	},
	fr: {
		'drills.page.title': 'Exercices',
		// ... French translations
	}
};
```

**Message export pattern** (`drills.ts` lines 24-25):
```typescript
export const drills = {
	en: {
		// English keys and values
	},
	fr: {
		// French translations
	}
};
```

**Key naming convention** (`drills.ts` lines 26-32):
```typescript
'drills.page.title': 'Drills',

// Mode row (Track C deck selector).
'drills.aria.modeGroup': 'Drill mode',
'drills.mode.chords': 'Chords',
'drills.mode.intervals': 'Intervals',
'drills.mode.mix': 'Mix',
```

**Locale dict type import** (`drills.ts` line 1):
```typescript
import type { LocaleDict } from './index';
```

---

## Shared Patterns

### Locale-aware components and functions

**Source:** `src/lib/i18n/locale.svelte` usage in `chordPresentation.ts` + `LocaleToggle.svelte`

**Svelte locale state** (e.g., `LocaleToggle.svelte` line 15, `chordPresentation.ts` line 8):
```typescript
import { currentLocale, setLocale, t } from '$lib/i18n/locale.svelte';
```

**Applying to new code:**
- Import `currentLocale` and `t` in any component that needs to localize labels
- Use `$derived(currentLocale())` to react to locale changes in pure functions
- All UI strings (toggle labels, captions) go through `t()` and i18n keys
- Keep chord symbols, interval shorthand, and French interval names immune (never key them)

### Interval data model and naming

**Source:** `src/lib/theory/interval.ts` (IntervalInfo interface) + `src/lib/lookup/chordPresentation.ts` (FormulaEntry)

**FormulaEntry reuse** (lines 16-23):
```typescript
export interface FormulaEntry {
	role: IntervalRole;
	label: string;
	/** French long name for tooltips/aria ("tierce mineure"; "fondamentale" for the root). */
	longFr: string;
	letter: string;
	solfege: string;
}
```

**Applying to new code:**
- The `IntervalView.svelte` component receives `entries: FormulaEntry[]` from the host (Lookup page)
- Pure derivations in `intervalDerivations.ts` transform `ChordResult` → specialized views (stacked-thirds array, formula array)
- Both views use the same interval naming (short labels like "m3", "P5") and `longFr` tooltips

### Button component usage

**Source:** `src/lib/components/Button.svelte` (lines 1-5, props shape)

**Toggle button pattern** (`LocaleToggle.svelte` lines 19-37):
```typescript
<Button
	type="button"
	variant={currentLocale() === 'en' ? 'primary' : 'ghost'}
	aria-pressed={currentLocale() === 'en'}
	aria-label={t('locale.aria.en')}
	onclick={() => setLocale('en')}
>
	EN
</Button>
```

**Applying to new code:**
- Use `<Button variant="primary">` for the active toggle segment, `variant="ghost"` for inactive
- Set `aria-pressed={isActive}` on toggle buttons
- Pass `aria-label={t(...)}` for accessible button naming
- Wrap toggle buttons in a `<div role="group">` with an `aria-label`

### IntervalChip reuse in new views

**Source:** `src/lib/components/IntervalChip.svelte` (lines 9-22, props)

**Current usage** (`IntervalScaffold.svelte` line 33):
```typescript
<IntervalChip role={entry.role} label={entry.label} longName={entry.longFr} />
```

**Applying to new code:**
- Both the stacked-thirds and formula views render IntervalChip for each chord tone
- The chip's `role` determines the background color (DESIGN-02 semantic interval colors)
- The `label` is the short interval name ("R", "m3", "P5", "m7")
- The `longName` becomes the tooltip and aria-label ("tierce mineure", "quinte juste")

### Test data fixtures

**Source:** `chordPresentation.test.ts` + `interval.test.ts` imports

**Pattern** (line 2, `chordPresentation.test.ts`):
```typescript
import { spellChord } from '$lib/theory/chord';
```

**Applying to new code:**
- Use `spellChord(symbol)` to create a `ChordResult` fixture for testing derivations
- Test both recognized (valid jazz symbols) and unrecognized (empty/garbage) inputs to verify totality
- Use `setLocale('fr')` in `afterEach` cleanup to reset locale between tests

---

## No Analog Found

None. All patterns exist in the codebase for:
- Segmented toggle components
- Props runes patterns
- Pure derivation functions
- Interval naming and i18n
- Component tests
- Utility function tests

---

## Metadata

**Analog search scope:** `src/lib/components/`, `src/lib/lookup/`, `src/lib/theory/`, `src/lib/i18n/`, `src/routes/+page.svelte`  
**Files scanned:** 15  
**Pattern extraction date:** 2026-07-24
