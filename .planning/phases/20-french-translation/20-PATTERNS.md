# Phase 20: French Translation - Pattern Map

**Mapped:** 2026-07-18
**Files analyzed:** 12 (new/modified)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/i18n/locale.ts` | utility/store | reactive state + localStorage | `src/lib/audio/audio.ts` | exact |
| `src/lib/i18n/messages.ts` | config/data | static keyed dictionaries | `src/lib/copy/hints.ts`, `mnemonics.ts` | role-match |
| `src/lib/components/LocaleToggle.svelte` | component/control | request-response (toggle click) | `src/lib/components/BuildSession.svelte` (kind-toggle) | exact |
| `src/routes/+layout.svelte` | route/layout | template rendering + state | `src/routes/+layout.svelte` (masthead) | self-analog |
| `src/lib/components/RecallSession.svelte` (mod) | component | template rendering | `src/lib/components/RecallSession.svelte` (existing) | self-analog |
| `src/lib/copy/hints.ts` (mod) | config | static copy pool + keying | `src/lib/copy/hints.ts` (existing) | self-analog |
| `src/lib/copy/mnemonics.ts` (mod) | config | static copy pool | `src/lib/copy/mnemonics.ts` (existing) | self-analog |
| `src/lib/copy/streak.ts` (mod) | config | static copy pool | `src/lib/copy/streak.ts` (existing) | self-analog |
| Various `src/routes/*/+page.svelte` | route | template rendering (bulk) | per-route analysis | role-match |
| `src/lib/components/*.svelte` (bulk) | component | template rendering (bulk) | per-component analysis | role-match |
| `src/lib/theory/interval.ts` (seed check, no mod) | utility | pure data (existing longFr) | `src/lib/theory/interval.ts` (line 22) | self-analog |
| `src/lib/lessons/thirdsLesson.ts` (Phase 19) | config | static lesson data | `src/lib/lessons/thirdsLesson.ts` (lines 59-80) | self-analog |

---

## Pattern Assignments

### `src/lib/i18n/locale.ts` (utility/store, reactive state + localStorage)

**Analog:** `src/lib/audio/audio.ts` (Lines 34–89: localStorage-backed module pattern with lazy initialization)

**Module Structure** (lines 34–56, 62–73, 81–89):
```typescript
// Storage key + lazy-loaded state
const STORAGE_KEY = 'music-learn:locale';
let locale: 'en' | 'fr' | null = null;

// Lazy read from localStorage on first call
function readStoredLocale(): 'en' | 'fr' {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return (stored === 'fr') ? 'fr' : 'en';
	} catch {
		return 'en'; // Default fallback
	}
}

// Public getter (first call initializes)
export function currentLocale(): 'en' | 'fr' {
	if (locale === null) locale = readStoredLocale();
	return locale;
}

// Public setter (persists + returns new value)
export function setLocale(value: 'en' | 'fr'): void {
	locale = value;
	try {
		localStorage.setItem(STORAGE_KEY, value);
	} catch {
		// Storage disabled/full: keep in-memory toggle working
	}
}
```

**Reactive Accessor Pattern** (Svelte 5 runes, from `+layout.svelte` line 30):
```typescript
// In components, use currentLocale() to get value in $derived expressions:
export function t(key: string): string {
	const lang = currentLocale(); // Reactive read
	return messages[lang][key] ?? messages.en[key] ?? key;
}
```

**Storage Convention:** Follow `music-learn:*` prefix (audio.ts lines 34–35: `'music-learn:sound'` / `'music-learn:study-mode'`)

---

### `src/lib/i18n/messages.ts` (config, static keyed dictionaries)

**Analogs:** `src/lib/copy/hints.ts` (lines 7–13, 42–46) and `mnemonics.ts` (lines 14–49) — both use export const arrays + Record types

**Message Dictionary Structure** (pattern from mnemonics.ts lines 14–29):
```typescript
// Shape: a two-level object: lang → key → string
const messages = {
	en: {
		'nav.lookup': 'Lookup',
		'nav.drills': 'Drills',
		'nav.build': 'Build',
		'nav.recall': 'Recall',
		'nav.scales': 'Scales',
		'nav.songs': 'Songs',
		'nav.theory': 'Theory',
		'nav.progress': 'Progress',
		'brand': 'MUSIC LEARN',
		'locale.toggle.en': 'English',
		'locale.toggle.fr': 'Français',
		'grade.again': 'Again',
		'grade.hard': 'Hard',
		'grade.good': 'Good',
		'grade.easy': 'Easy',
		'mode.formula': 'SYMBOL → FORMULA',
		'mode.formula-build': 'FORMULA → BUILD',
		'mode.see-play': 'SYMBOL → PLAY',
		'mode.hear-name': 'SOUND → NAME',
		// ... more keys
	},
	fr: {
		'nav.lookup': 'Rechercher',
		'nav.drills': 'Exercices',
		'nav.build': 'Construire',
		'nav.recall': 'Révision',
		'nav.scales': 'Gammes',
		'nav.songs': 'Morceaux',
		'nav.theory': 'Théorie',
		'nav.progress': 'Progrès',
		'brand': 'MUSIC LEARN',
		'locale.toggle.en': 'English',
		'locale.toggle.fr': 'Français',
		'grade.again': 'À revoir',
		'grade.hard': 'Difficile',
		'grade.good': 'Correct',
		'grade.easy': 'Facile',
		'mode.formula': 'SYMBOLE → FORMULE',
		'mode.formula-build': 'FORMULE → CONSTRUIRE',
		'mode.see-play': 'SYMBOLE → JOUER',
		'mode.hear-name': 'SON → NOMMER',
		// ... more keys
	}
} as const;

export function t(key: keyof typeof messages.en): string {
	const lang = currentLocale();
	return messages[lang][key] ?? messages.en[key] ?? key;
}
```

**Copy Pool Pattern** (from hints.ts lines 7–13, 42–46):
```typescript
// For rotating/random-pick copy, embed in messages keyed by intent:
const messages = {
	en: {
		'hint.unrecognized.0': "HMM. THAT ONE'S NOT IN THE CATALOG. TRY Cm7 OR F♯ø7.",
		'hint.unrecognized.1': "THE SHOP IS STUMPED. GIVE US Cm7, C-7, OR B♭maj7 INSTEAD.",
		// ... rotation pool members
	},
	fr: {
		'hint.unrecognized.0': "HMM. CELUI-CI N'EST PAS DANS LE CATALOGUE. ESSAYEZ Cm7 OU F♯ø7.",
		// ... FR variants
	}
};

// Caller extracts and rotates:
const hints = [
	messages[lang]['hint.unrecognized.0'],
	messages[lang]['hint.unrecognized.1'],
	// ...
];
```

---

### `src/lib/components/LocaleToggle.svelte` (component, request-response)

**Analog:** `src/lib/components/BuildSession.svelte` (lines 626–643: segmented two-button toggle with `aria-pressed` and variant switching)

**Toggle Structure** (BuildSession kind-toggle pattern, lines 626–643):
```svelte
<div class="flex gap-2" role="group" aria-label="Language">
	<Button
		type="button"
		variant={currentLocale() === 'en' ? 'primary' : 'ghost'}
		aria-pressed={currentLocale() === 'en'}
		aria-label="Language: English"
		onclick={() => setLocale('en')}
	>
		EN
	</Button>
	<Button
		type="button"
		variant={currentLocale() === 'fr' ? 'primary' : 'ghost'}
		aria-pressed={currentLocale() === 'fr'}
		aria-label="Language: Français"
		onclick={() => setLocale('fr')}
	>
		FR
	</Button>
</div>
```

**Button Component Reuse** (from Button.svelte lines 62–99):
- Use existing `Button` component with `variant="primary"` (active) or `variant="ghost"` (inactive)
- Inherits min-height/width 44px (line 72), press-in transform (lines 91–98)
- CSS inheritance: `.ps-button` base styles apply (lines 62–77)

**Active Segment Color Override** (per UI-SPEC, NOT vermilion):
```css
/* LocaleToggle.svelte custom style: use ink fill instead of vermilion */
.locale-toggle-group :global(.ps-button[aria-pressed='true']) {
	background: var(--color-ink);
	color: var(--color-paper);
	border-color: var(--color-ink);
}
```

---

### `src/routes/+layout.svelte` (route/layout, template rendering + state)

**Self-Analog:** Existing masthead structure (lines 50–68)

**Masthead Restructure** (current lines 50–68, modify to split identity/nav):
```svelte
<!-- BEFORE: brand, streak badge, nav links all in one flex row -->
<nav class="bg-paper border-ink flex flex-row flex-wrap items-center justify-between gap-2 border-b-2 p-2 md:gap-4 md:px-6 md:py-4">
	<span class="text-heading font-bold uppercase tracking-tight whitespace-nowrap">MUSIC LEARN</span>
	<StreakBadge variant="compact" count={streakCount} loading={streakLoading} />
	<div class="flex flex-wrap gap-x-2 gap-y-1 md:gap-4">
		<!-- 8 nav links -->
	</div>
</nav>

<!-- AFTER: split into identity cluster (brand + streak + toggle) and nav cluster -->
<nav class="bg-paper border-ink flex flex-row flex-wrap items-center justify-between gap-2 border-b-2 p-2 md:gap-4 md:px-6 md:py-4">
	<!-- Identity row: brand + streak + toggle, right-aligned sub-cluster -->
	<div class="flex items-center gap-2">
		<span class="text-heading font-bold uppercase tracking-tight whitespace-nowrap">MUSIC LEARN</span>
		<StreakBadge variant="compact" count={streakCount} loading={streakLoading} />
	</div>
	<LocaleToggle />
	
	<!-- Nav row: 8 nav links, wraps independently -->
	<div class="flex flex-wrap gap-x-2 gap-y-1 md:gap-4">
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
</nav>
```

**navLinks Structure Update** (current lines 12–21, add key):
```typescript
// BEFORE: static string labels
const navLinks = [
	{ href: '/', label: 'Lookup' },
	{ href: '/drills', label: 'Drills' },
	// ... rest

// AFTER: keyed labels for translation
const navLinks = [
	{ href: '/', labelKey: 'nav.lookup' },
	{ href: '/drills', labelKey: 'nav.drills' },
	{ href: '/build', labelKey: 'nav.build' },
	{ href: '/recall', labelKey: 'nav.recall' },
	{ href: '/scales', labelKey: 'nav.scales' },
	{ href: '/songs', labelKey: 'nav.songs' },
	{ href: '/theory', labelKey: 'nav.theory' },
	{ href: '/progress', labelKey: 'nav.progress' }
];
```

**Imports Update** (add at top):
```typescript
import LocaleToggle from '$lib/components/LocaleToggle.svelte';
import { t } from '$lib/i18n/locale';
```

---

### `src/lib/components/RecallSession.svelte` (component, template rendering — modify in-place)

**Self-Analog:** Existing GRADES and MODE_LABELS (lines 48–53, 542–547)

**GRADES Rewrite** (lines 542–547, keyed for translation):
```typescript
// BEFORE: hardcoded English labels
const GRADES: { rating: Rating; label: string }[] = [
	{ rating: Rating.Again, label: 'Again' },
	{ rating: Rating.Hard, label: 'Hard' },
	{ rating: Rating.Good, label: 'Good' },
	{ rating: Rating.Easy, label: 'Easy' }
];

// AFTER: use t() accessor
import { t } from '$lib/i18n/locale';
const GRADES = $derived.by(() => [
	{ rating: Rating.Again, label: t('grade.again') },
	{ rating: Rating.Hard, label: t('grade.hard') },
	{ rating: Rating.Good, label: t('grade.good') },
	{ rating: Rating.Easy, label: t('grade.easy') }
]);
```

**MODE_LABELS Rewrite** (lines 48–53):
```typescript
// BEFORE: hardcoded English labels
const MODE_LABELS: Record<Mode, string> = {
	formula: 'SYMBOL → FORMULA',
	'formula-build': 'FORMULA → BUILD',
	'see-play': 'SYMBOL → PLAY',
	'hear-name': 'SOUND → NAME'
};

// AFTER: use t() accessor
const MODE_LABELS = $derived.by(() => ({
	formula: t('mode.formula'),
	'formula-build': t('mode.formula-build'),
	'see-play': t('mode.see-play'),
	'hear-name': t('mode.hear-name')
}));
```

---

## Shared Patterns

### Pattern 1: Copy Module i18n Seam

**Files affected:** `src/lib/copy/hints.ts`, `mnemonics.ts`, `streak.ts` (and any route page with hardcoded copy)

**Pattern:** Each copy module now exports both EN and FR string arrays, or the arrays are migrated to `messages.ts` and accessed via `t()`.

**Strategy (two options):**

**Option A (preferred): Keep copy modules, add FR arrays inline**
```typescript
// src/lib/copy/hints.ts (existing, lines 7–13)
export const errorHints: string[] = [
	"HMM. THAT ONE'S NOT IN THE CATALOG. TRY Cm7 OR F♯ø7.",
	// ... more EN hints
];

export const errorHintsFr: string[] = [
	"HMM. CELUI-CI N'EST PAS DANS LE CATALOGUE. ESSAYEZ Cm7 OU F♯ø7.",
	// ... more FR hints
];

// Picker function updated to read from current locale:
export function pickHint(): string {
	const hints = currentLocale() === 'fr' ? errorHintsFr : errorHints;
	// ... existing rotation logic
}
```

**Option B (migrated): Move all copy to messages.ts**
```typescript
// src/lib/i18n/messages.ts
const messages = {
	en: {
		'hint.unrecognized.0': "HMM. THAT ONE'S NOT IN THE CATALOG. TRY Cm7 OR F♯ø7.",
		'hint.unrecognized.1': "THE SHOP IS STUMPED. GIVE US Cm7, C-7, OR B♭maj7 INSTEAD.",
		// ... more hints
	},
	fr: {
		'hint.unrecognized.0': "HMM. CELUI-CI N'EST PAS DANS LE CATALOGUE. ESSAYEZ Cm7 OU F♯ø7.",
		// ... more FR hints
	}
};

// src/lib/copy/hints.ts re-exports as accessor arrays:
export function pickHint(): string {
	const hints = [
		t('hint.unrecognized.0'),
		t('hint.unrecognized.1'),
		// ... array of current-locale strings
	];
	// ... existing rotation logic
}
```

**Planner choice:** Option A requires the least refactoring (keep modules intact, add FR parallel arrays). Option B is cleaner long-term (single source of truth). Recommend Option A for Phase 20 to minimize touch-area; migrate to Option B later if copy complexity grows.

---

### Pattern 2: Reactive Copy in Templates (Svelte 5 runes)

**Files affected:** Every `+page.svelte` and component with hardcoded copy

**Pattern:** Use `$derived` to make copy reactive to locale changes

**Example from home page** (`src/routes/+page.svelte`, lines 20–21):
```svelte
<!-- BEFORE: hardcoded array -->
const STARTER_CHORDS = ['Cm7', 'Fmaj7', 'G7'];

<!-- AFTER: if copy needed, derive from t() -->
<!-- (But STARTER_CHORDS is a constant list of chord symbols, NOT translated copy — leave as-is) -->

<!-- Elsewhere in template, any hardcoded copy gets keyed: -->
<!-- BEFORE: <p>Placeholder text in input</p> -->
<!-- AFTER: <p>{t('lookup.placeholder')}</p> -->
```

**Import at top of every file that uses `t()`:**
```typescript
import { t } from '$lib/i18n/locale';
```

---

### Pattern 3: Interval Terminology Seed

**Source:** `src/lib/theory/interval.ts` (lines 67–92: FRENCH_DEGREE_NOUNS and FRENCH_QUALITIES)

**Already exists — DO NOT MODIFY:**
```typescript
const FRENCH_DEGREE_NOUNS: Record<number, string> = {
	1: 'fondamentale',
	2: 'seconde',
	3: 'tierce',
	4: 'quarte',
	5: 'quinte',
	6: 'sixte',
	7: 'septième',
	// ... through 13
};

const FRENCH_QUALITIES: Record<string, string> = {
	P: 'juste',
	M: 'majeure',
	m: 'mineure',
	A: 'augmentée',
	d: 'diminuée',
	// ...
};

// IntervalInfo.longFr field auto-populates via these lookups (line 169)
const noun = FRENCH_DEGREE_NOUNS[degree];
const frQuality = FRENCH_QUALITIES[quality];
return `${noun} ${frQuality}`;
```

**UI-SPEC short-form fallbacks** (register fit rule, only if future components introduce fixed-width slots):
| Role | EN | FR (full) | FR (short, fixed-width fallback) |
|------|----|-----------|---|
| Root | Root | Fondamentale | FOND. |
| Seventh | Seventh | Septième | SEPT. |

Store these short forms in `src/lib/i18n/messages.ts` under a separate namespace:
```typescript
const messages = {
	en: {
		'register.root.long': 'Root',
		'register.root.short': 'R', // Quality-first shorthand, never translates
		'register.seventh.long': 'Seventh',
		'register.seventh.short': '7',
	},
	fr: {
		'register.root.long': 'Fondamentale',
		'register.root.short': 'R',
		'register.seventh.long': 'Septième',
		'register.seventh.short': '7',
		// Short fallbacks (use only if fixed-width slot is < 110px):
		'register.root.short-fixed': 'FOND.',
		'register.seventh.short-fixed': 'SEPT.',
	}
};
```

---

### Pattern 4: Chord Symbol & Solfège Immunity

**Critical: NEVER use `t()` on chord symbols or interval shorthand**

**Files that are READ-ONLY for this phase:**
- `src/lib/theory/interval.ts` — shorthand (`short` field) and `tonalName` never translate
- `src/lib/lookup/chordPresentation.ts` — symbol and root fields never translate
- `src/lib/components/ChordGlyph.svelte` — chord symbols stay identical in both languages
- `src/lib/theory/solfege.ts` — solfège syllables (Do/Ré/Mi) language-neutral, already used in both
- Any interval shorthand display (R, m3, P5, m7, etc.) — quality-first notation, universal

**Verification test:**
```typescript
// Assert in a test that chord symbols render identically with locale = 'en' and locale = 'fr':
setLocale('fr');
render(<ChordGlyph symbol="F♯ø7" />);
// Should still render "F♯ø7" verbatim, never "F♯øbf" or any translated variant
```

---

## String Inventory (Grep-Driven Discovery Summary)

This phase requires a broad grep-driven sweep across nearly every `.svelte` and `.ts` file. The planner should use this classification to partition the work:

### Cluster 1: Navigation & Masthead (HIGH PRIORITY)

**Files:** `src/routes/+layout.svelte`
**Scope:** 8 navLink labels + "MUSIC LEARN" brand
**Approx. literal count:** 9 strings
**Complexity:** Low — simple array + label rekey

### Cluster 2: Grade & Mode Labels (HIGH PRIORITY)

**Files:** `src/lib/components/RecallSession.svelte`
**Scope:** 4 grade labels (Again/Hard/Good/Easy) + 4 mode labels (SYMBOL → FORMULA, etc.)
**Approx. literal count:** 8 strings (keyed, no placeholder substitution)
**Complexity:** Low — simple Record/array replacement

### Cluster 3: Copy Modules (MEDIUM PRIORITY)

**Files:** `src/lib/copy/hints.ts`, `mnemonics.ts`, `streak.ts`
**Scope:**
- `hints.ts`: 5 error-hint variants + 3 suggestion-hint variants = 8 strings
- `mnemonics.ts`: 6 chord-quality mnemonics (maj7, m7, 7, m7b5, dim7, ø) = 6 strings
- `streak.ts`: 3 active-practiced variants + 3 active-nudge variants + 3 zero-streak variants = 9 strings
**Approx. literal count:** ~23 strings across three files
**Complexity:** Medium — preserves rotation logic, adds FR arrays or keyed lookups

### Cluster 4: Route Pages (HIGH COMPLEXITY)

**Files:** `src/routes/*/+page.svelte` (lookup, drills, build, recall, scales, songs, theory, progress)
**Scope per page:**
- **`src/routes/+page.svelte` (Lookup):** Input placeholder, starter-chord labels, result-not-found prompt, title
- **`src/routes/drills/+page.svelte` (Drills):** Page title, drill prompt, correct/wrong feedback variants, CTA labels
- **`src/routes/build/+page.svelte` (Build):** Root/Quality/Tonic picker captions, "Play" / "Hear" button labels, step registers (STEP X OF Y), why-explanations
- **`src/routes/recall/+page.svelte` (Recall):** Page title, mode headers (Formula/Build/Play/Name), filter labels, map view toggling
- **`src/routes/scales/+page.svelte` (Scales):** Scale picker labels, note list headers, mode labels
- **`src/routes/songs/+page.svelte` (Songs):** Song list title, filter labels, play/remove controls
- **`src/routes/theory/+page.svelte` (Theory):** Lesson title, section headings, copy sentences
- **`src/routes/progress/+page.svelte` (Progress):** Settings title, toggle labels, streak encouragement

**Approx. literal count:** ~80–120 strings (wide variance per page)
**Complexity:** High — each page has different literal patterns, some with placeholders ({N}, {SYMBOL}, etc.)
**Strategy:** Planner should wave-partition by page; each wave translates one route's +page.svelte + any page-specific copy imports

### Cluster 5: Component Copy (BULK WORK)

**Files:** `src/lib/components/*.svelte` (many)
**Sample files with copy:**
- `InteractiveLesson.svelte` (Phase 19): Step titles, body copy, button labels ("Hear it", "Continue", "Try this in a drill")
- `SongMark.svelte` (Phase 18): "{N} SONGS" format, single-song mark
- `SongFilterToggle.svelte` (Phase 18): "From my songs" button label, filter-on/off explanation notes
- `InspectRegister.svelte`: Idle-state prompt ("Tap a key to inspect it.")
- `IntervalChip.svelte`: No copy (visual-only, reads longFr from interval data)
- `Button.svelte`: No copy (generic reusable control)
- `RecallMap.svelte`: Column headers (Formula/Build/Play/Name), legend labels
- `BuildSession.svelte`: Kind-toggle labels (Chords/Scales), reveal metadata

**Approx. literal count:** ~40–60 strings across 10+ components
**Complexity:** Medium — mostly labels and short prompts, no complex placeholder logic
**Strategy:** Planner should batch by component file; each batch modifies one component's copy

### Cluster 6: Lesson Data (Phase 19, MEDIUM PRIORITY)

**Files:** `src/lib/lessons/thirdsLesson.ts`
**Scope:** 4 step objects × (title + body + correctLine + wrongHint) ≈ 12–16 strings
**Approx. literal count:** 16 strings
**Complexity:** Medium — structured data, one-off placeholders ({N} in wrongHint)
**Pattern:** Inline keyed access or parallel FR array (Option A from Pattern 1 above)

---

## No Analog Found

None — all required patterns already exist in the codebase and are directly reusable:
- localStorage persistence pattern ✓ (audio.ts)
- Static data modules ✓ (hints.ts, mnemonics.ts, streak.ts)
- Segmented toggle component ✓ (BuildSession kind-toggle)
- Button component ✓ (Button.svelte)
- Layout structure ✓ (+layout.svelte)
- Existing French seed ✓ (interval.ts longFr field)
- Reactive $derived state ✓ (Svelte 5 runes in +layout.svelte)

---

## Metadata

**Analog search scope:** Core libs (`src/lib/`), routes (`src/routes/`), components, utilities, copy modules, theory engine
**Files scanned:** ~200+ (full src/ tree)
**Search methods:** grep for `longFr`, `localStorage`, `$state`/`$derived`, `aria-pressed`, `Button`, `const.*=.*\[.*\]`
**Pattern extraction date:** 2026-07-18

---

## Implementation Notes for Planner

### Critical Preservation Rules (from UI-SPEC I18N-01/03)

1. **Chord symbols never translate:** ChordGlyph, chord root/quality, symbols like Cm7 / F♯ø7 always render identically
2. **Interval shorthand never translates:** R, m3, P5, m7, etc. — quality-first notation is universal
3. **Solfège syllables never translate:** Do, Ré, Mi, Fa, Sol, La, Si already language-neutral in code
4. **Toggle active-segment color:** Use `--color-ink` fill (NOT vermilion) to keep the locale toggle in the neutral-chrome register (distinct from drill feedback colors)
5. **No French brand translation:** "MUSIC LEARN" stays English even when locale = 'fr' (brand name is proper noun, per UI-SPEC decision)
6. **Em dashes banned:** All copy uses periods/colons/commas, never em dashes (project convention from MEMORY.md)

### Fit Rules Applied (from UI-SPEC I18N-03)

1. **Register/interval labels:** Use full French words in flex-wrap captions (Fondamentale, Tierce, etc.); short forms (FOND., SEPT.) only if a future fixed-width slot < 110px is introduced
2. **Grade buttons:** Existing `grid-cols-2 sm:grid-cols-4` breakpoint already solves FR length — no override needed
3. **Nav links:** Existing `flex flex-wrap` already handles longer French labels (Exercices, Théorie) — no abbreviation needed
4. **Sentences/prompts:** Prose copy wraps fine at +15–25% length; no layout fix needed

### Planner Waves (Recommended Partitioning)

**Wave 1 (Critical infrastructure):** 
- Create `src/lib/i18n/locale.ts` + `messages.ts` 
- Create `LocaleToggle.svelte`
- Update `+layout.svelte` masthead

**Wave 2 (Core drill surfaces):**
- RecallSession GRADES + MODE_LABELS
- RecallMap column headers
- BuildSession picker captions

**Wave 3 (Copy modules):**
- hints.ts: add FR arrays / keyed access
- mnemonics.ts: add FR variants
- streak.ts: add FR variants

**Wave 4 (Pages, per-route):**
- Each route +page.svelte translated in parallel batches

**Wave 5 (Components):**
- InteractiveLesson (Phase 19 copy)
- SongMark, SongFilterToggle (Phase 18 copy)
- Other inline-copy components

---

End of pattern map. Ready for planner.
