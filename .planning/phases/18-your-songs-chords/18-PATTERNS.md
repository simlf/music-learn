# Phase 18: Your Songs' Chords - Pattern Map

**Mapped:** 2026-07-18
**Files analyzed:** 6 new/modified
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/components/SongMark.svelte` | component | render | `src/lib/components/SongHook.svelte` | exact |
| `src/lib/practice/songProvenance.ts` | service | transform | `src/lib/practice/songs.ts` | exact |
| `src/routes/drills/+page.svelte` | route | request-response | existing file | same |
| `src/routes/recall/+page.svelte` | route | request-response | existing file | same |
| `src/lib/srs/deck.ts` (filter wrapper) | service | CRUD | existing file | same |
| Filter toggle (integrated) | component | request-response | `src/lib/components/LevelPicker.svelte` | role-match |

---

## Pattern Assignments

### `src/lib/components/SongMark.svelte` (component, render)

**Analog:** `src/lib/components/SongHook.svelte`

**Rationale:** SongHook is the template for a read-only display component that:
- Renders nothing when there's no data (`{#if tune !== null}`)
- Uses mono font with `text-label` and `uppercase`
- Applies `border-ink` 2px solid styling with padding using spacing tokens
- Is self-contained and purely presentational (no interaction in v1)

**Component structure pattern** (lines 1-25 of SongHook.svelte):
```typescript
<script lang="ts">
	import { songHookFor } from '$lib/theory/songHooks';

	interface Props {
		/** Interval shorthand code (e.g. "m3", "P5"). */
		short: string;
	}

	let { short }: Props = $props();

	const tune = $derived(songHookFor(short));
	let revealed = $state(false);

	function toggle() {
		revealed = !revealed;
	}
</script>

{#if tune !== null}
	<!-- render content -->
{/if}
```

**Mono tag styling pattern** (lines 38-68 of SongHook.svelte):
```css
.song-hook__tune {
	margin-top: var(--spacing-xs);
	color: var(--color-muted);
	font-style: italic;
}
```

And from `IntervalChip.svelte` (lines 31-42), the 2px solid mono tag baseline:
```css
.interval-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-family: var(--font-mono);
	font-size: var(--text-label);
	font-weight: 700;
	letter-spacing: var(--text-label--letter-spacing);
	padding: var(--spacing-xs) var(--spacing-sm);
	border: 2px solid var(--color-ink);
}
```

**SongMark contract:** Accept `songs: string[]`, render nothing if empty. Single song: `♪ {song}` with 2px solid border. Multi-song (length >= 2): `{count} SONGS` with `border-style: double`. Use existing tokens only (no new CSS variables per UI-SPEC).

---

### `src/lib/practice/songProvenance.ts` (service, transform)

**Analog:** `src/lib/practice/songs.ts`

**Rationale:** songProvenance lives in the same domain (practice data), follows the same module conventions (pure functions, no exports of internal helpers), and is a direct derivation from the same Song data source.

**Module pattern** (songs.ts structure, lines 14-60):
```typescript
const STORAGE_KEY = 'music-learn:songs';

export type SongSource = 'preset' | 'custom';

export interface Song {
	id: string;
	name: string;
	chordSymbols: string[];
	createdAt: string;
	source: SongSource;
	active: boolean;
	presetId?: string;
}

/**
 * Reads the persisted song list. Returns [] when the store is empty,
 * missing, or not an array; individual malformed entries are dropped so one
 * corrupt record never wipes the rest of the library.
 */
export function listSongs(): Song[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return [];

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(isSong);
	} catch {
		return [];
	}
}
```

**songProvenance.ts contract:** No localStorage of its own (derive from listSongs). Export:

```typescript
/**
 * Builds a symbol → song-names index from all ACTIVE songs.
 * symbol is normalized via theory engine before comparison.
 * Returns a Map where each symbol key maps to the song names (in first-seen order)
 * that contain a matching chord symbol.
 */
export function buildProvenanceIndex(): Map<string, string[]>;

/**
 * Convenience lookup for a single chord symbol.
 * Returns the song names in first-seen order.
 * symbol is normalized internally before matching.
 */
export function songsForSymbol(symbol: string, index?: Map<string, string[]>): string[];
```

**Chord normalization pattern** (from `src/lib/theory/chord.ts`, lines 58-64):
```typescript
/**
 * Normalizes chord-symbol accidentals and the half-diminished glyph into the
 * ASCII form tonal's Chord.get accepts. tonal accepts ASCII #/b and the °
 * glyph directly, but not ♯/♭ glyphs or ø - so those are converted here.
 */
function normalizeSymbol(symbol: string): string {
	return symbol
		.replace(/♯/g, '#')
		.replace(/♭/g, 'b')
		.replace(/ø7?/g, 'm7b5');
}
```

**Reuse pattern:** Import `spellChord` from `$lib/theory/chord` or call `normalizeSymbol` directly to match by normalized identity. The provenance index matches Cm7 with C-7 and Cmin7 (and F♯ø7 with Gbø7) via this normalization.

---

### `src/routes/drills/+page.svelte` (route, request-response)

**Analogs:** Existing drills page + `poolContext()` pattern

**Integration points:**

1. **Import SongMark** (top of script, alongside other component imports, line 60-67):
```typescript
import ChordGlyph from '$lib/components/ChordGlyph.svelte';
import IntervalChip from '$lib/components/IntervalChip.svelte';
import RevealInsight from '$lib/components/RevealInsight.svelte';
import SongHook from '$lib/components/SongHook.svelte';
import Button from '$lib/components/Button.svelte';
// ADD:
import SongMark from '$lib/components/SongMark.svelte';
```

2. **Import provenance** and **filter state** (top of script):
```typescript
import { buildProvenanceIndex, songsForSymbol } from '$lib/practice/songProvenance';
import { activeSongChordSymbols } from '$lib/practice/songs';

// ADD near other state vars:
let provenanceIndex = $state(buildProvenanceIndex());
let songFilterOn = $state(() => {
	try {
		return localStorage.getItem('music-learn:drills-song-filter') === 'true';
	} catch {
		return false;
	}
})();
```

3. **Toggle filter and persist** (add to script, near other toggles):
```typescript
function toggleSongFilter() {
	songFilterOn = !songFilterOn;
	try {
		localStorage.setItem('music-learn:drills-song-filter', String(songFilterOn));
	} catch {
		// Swallow quota/disabled-storage errors (matches songs.ts pattern).
	}
}
```

4. **Modify poolContext** to apply song filter (line 142-155):
```typescript
function poolContext(): PoolContext {
	return {
		songSymbols: songFilterOn ? activeSongChordSymbols() : [],
		// ^ if filter is ON, restrict to song symbols; otherwise pass []
		// (pool.ts interprets empty[] as "no song restriction")
		currentTier: levelState.currentTier,
		unlockedTiers: levelState.unlockedTiers,
		stats,
		weakest,
		recentMisses: recentMisses(8),
		scaffolds: readScaffolds(),
		lastQualities,
		log: readPracticeLog(),
		today: localDateString()
	};
}
```

5. **Render filter bar above prompt** (in template, add before the `drill-card` div around line 830):
```svelte
<div class="border-ink bg-paper-bright border-2 px-4 py-4 space-between flex justify-between items-center">
	<p class="text-label font-mono uppercase">PRACTICE POOL</p>
	<button
		class="song-filter-toggle"
		aria-pressed={songFilterOn}
		onclick={toggleSongFilter}
	>
		<span class="song-filter-toggle__box"></span>
		<span>From my songs</span>
	</button>
</div>
```

6. **Render SongMark below chord prompt** (in construction and identification prompt sections, e.g., after line 852):
```svelte
<ChordGlyph root={target.root} quality={target.symbol.slice(target.root.length)} />
<!-- ADD: -->
<SongMark songs={songsForSymbol(question.symbol, provenanceIndex)} />
```

---

### `src/routes/recall/+page.svelte` (route, request-response)

**Analog:** Existing recall page + filter toggle pattern from RecallMap/LevelPicker

**Integration points:**

1. **Import SongMark and provenance** (top of script):
```typescript
import RecallSession from '$lib/components/RecallSession.svelte';
import RecallMap from '$lib/components/RecallMap.svelte';
import Button from '$lib/components/Button.svelte';
// ADD:
import SongMark from '$lib/components/SongMark.svelte';
import { buildProvenanceIndex, songsForSymbol } from '$lib/practice/songProvenance';
```

2. **Add filter state** (below existing `mode` state, line 14):
```typescript
type Mode = 'review' | 'map';
let mode = $state<Mode>('review');

// ADD:
let provenanceIndex = $state(buildProvenanceIndex());
let songFilterOn = $state(() => {
	try {
		return localStorage.getItem('music-learn:recall-song-filter') === 'true';
	} catch {
		return false;
	}
})();

function toggleSongFilter() {
	songFilterOn = !songFilterOn;
	try {
		localStorage.setItem('music-learn:recall-song-filter', String(songFilterOn));
	} catch {}
}
```

3. **Render filter bar below mode toggle** (in template, after line 40, before the card):
```svelte
<div class="border-ink bg-paper-bright mt-4 border-2 px-4 py-4 flex justify-between items-center">
	<p class="text-label font-mono uppercase">REVIEW POOL</p>
	<button
		class="song-filter-toggle"
		aria-pressed={songFilterOn}
		onclick={toggleSongFilter}
	>
		<span class="song-filter-toggle__box"></span>
		<span>From my songs</span>
	</button>
</div>
```

4. **Pass filter state to RecallSession** (line 44):
```svelte
{#if mode === 'review'}
	<RecallSession 
		onViewMap={() => (mode = 'map')} 
		songFilterOn={songFilterOn}
		provenanceIndex={provenanceIndex}
	/>
{:else}
	<RecallMap />
{/if}
```

---

### `src/lib/components/RecallSession.svelte` (component, request-response)

**Analog:** Existing file

**Integration points:**

1. **Accept new props** (interface Props, top of script):
```typescript
interface Props {
	onViewMap?: () => void;
	songFilterOn?: boolean;          // ADD
	provenanceIndex?: Map<string, string[]>; // ADD
}

let { onViewMap, songFilterOn = false, provenanceIndex }: Props = $props();
```

2. **Filter getDueCards** (where queue is built, in onMount or equivalent):
Replace call to `getDueCards()` with a filtered version. For `hear-name` mode, wrap the card check:
```typescript
// Where queue is built, filter by song symbols if songFilterOn
let dueCards = await getDueCards(now);
if (songFilterOn && provenanceIndex) {
	// Filter to only cards whose fact's symbol has provenance
	dueCards = dueCards.filter(card => {
		const fact = factById(card.factId);
		if (!fact || fact.factKind !== 'chord-formula') return true; // keep non-chords
		return provenanceIndex.has(fact.symbol);
	});
}
```

3. **Import SongMark** (top of script):
```typescript
import SongMark from './SongMark.svelte';
```

4. **Render SongMark in each mode** (in template, adjust placement per UI-SPEC):

   - **Mode `formula` (Symbol → Formula):** Beside the ChordGlyph (e.g., line with the chord):
   ```svelte
   <ChordGlyph root={chord.root} quality={chord.quality} />
   <SongMark songs={songsForSymbol(chord.symbol, provenanceIndex)} />
   ```

   - **Mode `see-play` (Symbol → Play):** Same, beside ChordGlyph.

   - **Mode `hear-name` (Sound → Name):** Only after answered. In the reveal block (RevealInsight or equivalent):
   ```svelte
   <ChordGlyph root={chord.root} quality={chord.quality} />
   <SongMark songs={songsForSymbol(chord.symbol, provenanceIndex)} />
   ```

   - **Mode `formula-build` (Formula → Build):** Beside ChordGlyph (embedded BuildSession).

---

### Filter button styling (shared, use in both Drills and Recall pages)

**Analog:** `src/lib/components/Button.svelte` + `src/lib/components/SongHook.svelte` toggle pattern

**CSS (add to `src/app.css` or scoped component style):**

```css
.song-filter-toggle {
	font: 700 var(--text-label) / 1.4 var(--font-mono);
	letter-spacing: 0.08em;
	text-transform: uppercase;
	border: 2px solid var(--color-ink);
	background: var(--color-paper);
	color: var(--color-ink);
	padding: var(--spacing-sm) var(--spacing-md);
	min-height: 44px;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-sm);
	transition: background-color 120ms ease-out, color 120ms ease-out;
}

.song-filter-toggle[aria-pressed="true"] {
	background: var(--color-vermilion);
	color: var(--color-paper);
	border-color: var(--color-ink);
}

.song-filter-toggle__box {
	width: 14px;
	height: 14px;
	border: 2px solid currentColor;
	display: inline-block;
}

.song-filter-toggle[aria-pressed="true"] .song-filter-toggle__box {
	background: var(--color-paper);
}

.song-filter-toggle:active {
	transform: translate(1px, 1px);
}
```

---

## Shared Patterns

### Chord symbol normalization

**Source:** `src/lib/theory/chord.ts` (lines 18-64)

**Apply to:** All chord matching in songProvenance.ts and all symbol comparisons

```typescript
import { spellChord } from '$lib/theory/chord';

/**
 * Normalizes a symbol for comparison.
 * Two symbols match if they normalize to the same value.
 * e.g., Cm7, C-7, Cmin7 all normalize equivalently.
 */
export function normalizeSymbolForMatch(symbol: string): string {
	const spelled = spellChord(symbol);
	if (!spelled.recognized) return symbol; // fallback for unrecognized symbols
	return spelled.symbol; // tonal's canonical form
}
```

### localStorage degradation

**Source:** `src/lib/practice/songs.ts` (lines 117-124)

**Apply to:** All localStorage reads/writes in filter state

```typescript
function readFilter(key: string, defaultValue: boolean): boolean {
	try {
		const raw = localStorage.getItem(key);
		return raw === 'true'; // matches songs.ts pattern: swallow parse errors
	} catch {
		return defaultValue;
	}
}

function writeFilter(key: string, value: boolean): void {
	try {
		localStorage.setItem(key, String(value));
	} catch {
		// Keep the page working without persistence rather than throwing.
	}
}
```

### Conditional render (no empty state)

**Source:** `src/lib/components/SongHook.svelte` (lines 27-43)

**Apply to:** SongMark always follows this rule

```svelte
{#if tune !== null}
	<!-- render only when there's content -->
{/if}
```

---

## No Analog Found

None. All six files have clear analogs in the existing codebase.

---

## Integration Seams Summary

| Seam | File | Location | Pattern |
|------|------|----------|---------|
| Song list source | `src/lib/practice/songs.ts` | `listSongs()` / `activeSongChordSymbols()` | Read-only derivation |
| Chord normalization | `src/lib/theory/chord.ts` | `spellChord()` / `normalizeSymbol()` | Enharmonic-aware matching |
| Drills pool context | `src/routes/drills/+page.svelte` | `poolContext()` line 142 | Add song filter restriction |
| Recall card filter | `src/lib/srs/deck.ts` | `getDueCards()` wrapping | Filter by fact symbol provenance |
| Component display | All surfaces | Prompt/reveal blocks | Render SongMark alongside chord glyph |
| Filter state | Both routes | Page-level state | localStorage-backed boolean per surface |

---

## Metadata

**Analog search scope:** `src/lib/components/`, `src/lib/practice/`, `src/lib/theory/`, `src/routes/`, `src/lib/srs/`

**Files scanned:** ~50 (components, services, routes)

**Pattern extraction date:** 2026-07-18
