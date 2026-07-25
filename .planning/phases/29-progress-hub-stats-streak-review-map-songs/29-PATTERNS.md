# Phase 29: Progress Hub — Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 10 new/modified files
**Analogs found:** 10 / 10 (100% coverage)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/routes/progress/+page.svelte` (modified) | route | request-response, reactive state | `src/routes/recall/+page.svelte` | exact |
| `src/lib/components/ProgressStats.svelte` (new) | component | reactive state | `src/routes/progress/+page.svelte` (lines 185-413) | extraction target |
| `src/lib/components/RecallPanel.svelte` (new) | component | reactive state | `src/routes/recall/+page.svelte` (lines 1-71) | extraction target |
| `src/lib/components/SongManager.svelte` (new) | component | CRUD, reactive state | `src/routes/songs/+page.svelte` (lines 1-565) | extraction target |
| `src/routes/songs/+page.svelte` (modified) | route | CRUD, reactive state | `src/routes/scales/+page.svelte` | thin wrapper pattern |
| `src/routes/recall/+page.svelte` (modified) | route | reactive state | `src/routes/scales/+page.svelte` | thin wrapper pattern |
| `src/lib/i18n/messages/progress-hub.ts` (new) | i18n domain | string constants | `src/lib/i18n/messages/recall.ts` | domain registration pattern |
| `src/lib/i18n/messages/index.ts` (modified) | i18n registration | module imports | `src/lib/i18n/messages/index.ts` (lines 1-14) | add single import + merge |
| `src/lib/i18n/messages.test.ts` (modified) | test | domain collision gate | `src/lib/i18n/messages.test.ts` (lines 56-71) | add domain tuple to array |
| `tests/progress-hub.e2e.test.ts` (new) | e2e test | smoke test | `tests/progress.e2e.test.ts` + `tests/songs.e2e.test.ts` | composition pattern |

---

## Pattern Assignments

### `src/routes/progress/+page.svelte` (modified — hub host with 3-tab switch)

**Analog:** `src/routes/recall/+page.svelte` (Review|Map toggle pattern)

The hub reuses the exact toggle pattern from `/recall` (lines 38–71) but adapts it to a 3-tab switch (Stats | Recall | Songs) instead of binary Review|Map. The key insight: only one section is mounted at a time, driven by `let activeTab = $state<Tab>('stats')`, with each tab button controlling the state.

**Imports pattern** (`src/routes/recall/+page.svelte` lines 1–7):
```typescript
import RecallSession from '$lib/components/RecallSession.svelte';
import RecallMap from '$lib/components/RecallMap.svelte';
import Button from '$lib/components/Button.svelte';
import { buildProvenanceIndex } from '$lib/practice/songProvenance';
import { readSongFilter } from '$lib/practice/songFilterPref';
import { t } from '$lib/i18n/locale.svelte';
```

**Hub state pattern** (new type definition, modeled on `/recall` line 16):
```typescript
type Tab = 'stats' | 'recall' | 'songs';
let activeTab = $state<Tab>('stats');
```

**Three-tab toggle markup** (`src/routes/recall/+page.svelte` lines 38–60, adapted for 3 tabs):
```svelte
<div
  class="mt-8 flex gap-2"
  data-testid="hub-tabs"
  role="group"
  aria-label={t('progress-hub.aria.tabs')}
>
  <Button
    type="button"
    variant={activeTab === 'stats' ? 'primary' : 'ghost'}
    aria-pressed={activeTab === 'stats'}
    onclick={() => (activeTab = 'stats')}
  >
    {t('progress-hub.tab.stats')}
  </Button>
  <Button
    type="button"
    variant={activeTab === 'recall' ? 'primary' : 'ghost'}
    aria-pressed={activeTab === 'recall'}
    onclick={() => (activeTab = 'recall')}
  >
    {t('progress-hub.tab.recall')}
  </Button>
  <Button
    type="button"
    variant={activeTab === 'songs' ? 'primary' : 'ghost'}
    aria-pressed={activeTab === 'songs'}
    onclick={() => (activeTab = 'songs')}
  >
    {t('progress-hub.tab.songs')}
  </Button>
</div>
```

**Section panels** (`src/routes/recall/+page.svelte` lines 62–70, adapted for each section):
```svelte
<div class="border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6">
  {#if activeTab === 'stats'}
    <ProgressStats />
  {:else if activeTab === 'recall'}
    <RecallPanel />
  {:else}
    <SongManager />
  {/if}
</div>
```

**data-review-dock coupling** (`src/routes/recall/+page.svelte` lines 29–31):
The hub's `<main>` element gates the dock attribute on both the active tab AND the nested Recall mode:
```svelte
<main
  class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8"
  data-review-dock={activeTab === 'recall' && recallMode === 'review' ? '' : undefined}
>
```

**Page title** (reuse existing `progress.page.title` from current `/progress`, or define new `progress-hub.page.title` in i18n):
```svelte
<h1 class="text-heading mt-2 font-bold">{t('progress.page.title')}</h1>
```

---

### `src/lib/components/ProgressStats.svelte` (new — extracted stats body)

**Analog:** `src/routes/progress/+page.svelte` (current stats section, lines 185–413)

Extract the entire stats rendering logic (token entry, streak hero, weakest spots, accuracy table, calibration, danger cards, practice settings) into a reusable component. The component receives no props (owns all its state) to match the "extract and reuse as-is" DRY directive.

**Script block pattern** (`src/routes/progress/+page.svelte` lines 1–183):
Copy the entire `<script>` block wholesale:
- `import` statements (lines 1–28)
- `type PageState` and state variables (lines 43–51)
- Confidence calibration state (lines 57–66)
- Helper functions: `dangerCardLabel()` (lines 74–80), `chordDangerSymbols` (lines 83–90), `drillDangerCards()` (lines 93–96), `streakLine` (lines 98–101), `load()` (lines 103–128), `saveToken()` (lines 130–133), `onMount()` (lines 135–138), `selectTier()` (lines 148–150), `toggleSound()` (lines 152–155), `toggleStudyMode()` (lines 157–160), `drillThese()` (lines 163–166), `formatStreakDate()` (lines 178–182)

**Markup extraction** (`src/routes/progress/+page.svelte` lines 185–413):
Copy the entire `<main>` block with all conditional branches (token-missing, loading, empty, error, populated) and the calibration + practice settings sections. Keep the styles section intact (lines 415–488).

**No props interface**: ProgressStats is a self-contained component — it owns fetchStats, fetchStreak, token management, confidence calibration, and practice settings. Render it directly in the hub with no prop passing:
```svelte
<ProgressStats />
```

---

### `src/lib/components/RecallPanel.svelte` (new — extracted recall composition)

**Analog:** `src/routes/recall/+page.svelte` (lines 1–71)

Extract the Review|Map mode toggle and the conditional rendering of RecallSession vs RecallMap into a small, reusable panel component. This is a thin wrapper over the two existing components, preserving the exact same data-review-dock and songFilterOn coupling.

**Script block pattern** (`src/routes/recall/+page.svelte` lines 1–27):
```typescript
import RecallSession from '$lib/components/RecallSession.svelte';
import RecallMap from '$lib/components/RecallMap.svelte';
import Button from '$lib/components/Button.svelte';
import { buildProvenanceIndex } from '$lib/practice/songProvenance';
import { readSongFilter } from '$lib/practice/songFilterPref';
import { t } from '$lib/i18n/locale.svelte';

type Mode = 'review' | 'map';
let mode = $state<Mode>('review');

const provenanceIndex = buildProvenanceIndex();
let songFilterOn = $state(readSongFilter());
```

**Markup** (`src/routes/recall/+page.svelte` lines 38–70):
```svelte
<div
  class="flex gap-2"
  data-testid="mode-toggle"
  role="group"
  aria-label={t('recall.page.aria.mode-toggle')}
>
  <Button
    type="button"
    variant={mode === 'review' ? 'primary' : 'ghost'}
    aria-pressed={mode === 'review'}
    onclick={() => (mode = 'review')}
  >
    {t('recall.page.mode.review')}
  </Button>
  <Button
    type="button"
    variant={mode === 'map' ? 'primary' : 'ghost'}
    aria-pressed={mode === 'map'}
    onclick={() => (mode = 'map')}
  >
    {t('recall.page.mode.map')}
  </Button>
</div>

<div class="border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6">
  {#if mode === 'review'}
    {#key songFilterOn}
      <RecallSession onViewMap={() => (mode = 'map')} {songFilterOn} {provenanceIndex} />
    {/key}
  {:else}
    <RecallMap />
  {/if}
</div>
```

**Hub binding for data-review-dock**: The hub's `<main>` element reads both `activeTab === 'recall' && recallMode === 'review'` from the hub level, but RecallPanel itself must expose the nested `mode` state so the hub can read it. Use a bind or prop export:
```typescript
// Inside RecallPanel, export the mode state for the hub to read
export let mode = $state<Mode>('review');
```
Then in the hub:
```typescript
let recallMode = $state<'review' | 'map'>('review');
```
And bind when rendering:
```svelte
<RecallPanel bind:mode={recallMode} />
```

---

### `src/lib/components/SongManager.svelte` (new — extracted songs body)

**Analog:** `src/routes/songs/+page.svelte` (lines 1–565)

Extract the entire songs management UI (song list, song CRUD form, filter toggle, preset shelf) into a reusable component. Copy the file wholesale with no modifications to the logic or markup — it is the source of truth for both `/songs` and the hub's Songs tab.

**Script block** (`src/routes/songs/+page.svelte` lines 1–257):
Copy the entire script block wholesale, including:
- All imports (lines 1–17)
- `songs` state (line 24)
- `Draft` interface and `draft` state (lines 27–36)
- `songFilterOn` state and helpers (lines 44–56)
- Entry validation state (lines 59–62)
- Helper functions: `registerLine()` (lines 74–81), `resetEntry()` (lines 83–88), `startCreate()` (lines 90–100), `startEdit()` (lines 102–113), `closeEdit()` (lines 115–118), `commitToken()` (lines 126–142), `handleEntryKeydown()` (lines 144–149), `handlePaste()` (lines 157–184), `acceptSuggestion()` (lines 186–192), `removeChip()` (lines 194–196), `saveDraft()` (lines 198–217), `toggleActive()` (lines 219–222), `addPreset()` (lines 229–240), `scrollToSongRow()` (lines 242–249), `confirmDelete()` (lines 251–256)

**Markup** (`src/routes/songs/+page.svelte` lines 259–565):
Copy the entire `<main>` block with:
- List view (lines 260–364): song title, subtitle, filter toggle, empty state, song rows, "Add song" button, presets section
- Edit form (lines 365–565): new/edit title, name input, chords input, save/cancel/delete buttons

**No props or bindings**: SongManager owns all its state and behaviors. The `/songs` thin wrapper and the hub's Songs tab both render it identically with no prop passing:
```svelte
<SongManager />
```

---

### `src/routes/songs/+page.svelte` (modified — thin wrapper)

**Analog:** `src/routes/scales/+page.svelte` (thin wrapper pattern, lines 1–13)

Replace the entire current `/songs` page with a thin wrapper that imports and renders `SongManager`. The page's only responsibility is the layout frame (bg, padding, title) and the single imported component.

**Template** (`src/routes/scales/+page.svelte` lines 1–13, adapted for songs):
```svelte
<script lang="ts">
  import SongManager from '$lib/components/SongManager.svelte';
  import { t } from '$lib/i18n/locale.svelte';
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
  <h1 class="text-heading mt-2 font-bold">{t('songs.page.title')}</h1>
  <p class="text-muted mt-2">
    {t('songs.page.subtitle')}
  </p>

  <div class="mt-8">
    <SongManager />
  </div>
</main>
```

---

### `src/routes/recall/+page.svelte` (modified — thin wrapper)

**Analog:** `src/routes/scales/+page.svelte` (thin wrapper pattern, lines 1–13)

Replace the entire current `/recall` page with a thin wrapper that imports and renders `RecallPanel`. The page owns only the layout frame and page title.

**Template** (`src/routes/scales/+page.svelte` lines 1–13, adapted for recall):
```svelte
<script lang="ts">
  import RecallPanel from '$lib/components/RecallPanel.svelte';
  import { t } from '$lib/i18n/locale.svelte';
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
  <h1 class="text-heading mt-2 font-bold">{t('recall.page.title')}</h1>
  <p class="text-muted mt-2">
    {t('recall.page.subtitle')}
  </p>

  <RecallPanel />
</main>
```

**Note on data-review-dock**: The `/recall` page's own `<main>` no longer needs the `data-review-dock` attribute since that coupling is now in the hub. However, the RecallPanel component (which is shared with the hub) cannot apply it internally. The /recall wrapper can gate it locally:
```svelte
<script lang="ts">
  import RecallPanel from '$lib/components/RecallPanel.svelte';
  import { t } from '$lib/i18n/locale.svelte';

  let recallMode = $state<'review' | 'map'>('review');
</script>

<main
  class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8"
  data-review-dock={recallMode === 'review' ? '' : undefined}
>
  ...
  <RecallPanel bind:mode={recallMode} />
</main>
```

---

### `src/lib/i18n/messages/progress-hub.ts` (new i18n domain)

**Analog:** `src/lib/i18n/messages/recall.ts` (domain structure, lines 1–249)

Create a new message domain file for hub chrome copy (tab labels and aria labels). The domain is minimal — only the 4 new strings for the three-tab switch.

**File structure** (`src/lib/i18n/messages/recall.ts` lines 1–17, adapted):
```typescript
import type { LocaleDict } from './index';

/**
 * Progress Hub domain dictionary (Phase 29 PROG-01): the three top-level
 * tab labels (Stats | Recall | Songs) and their aria-label group label.
 * The sections' own content copy (stats, recall, songs) stays in their
 * existing domains (progress.*, recall.*, songs.*) — this domain covers
 * only the new hub-level chrome.
 */
export const progressHub = {
  en: {
    'progress-hub.tab.stats': 'Stats',
    'progress-hub.tab.recall': 'Recall',
    'progress-hub.tab.songs': 'Songs',
    'progress-hub.aria.tabs': 'Progress hub sections'
  },
  fr: {
    'progress-hub.tab.stats': 'Statistiques',
    'progress-hub.tab.recall': 'Révision',
    'progress-hub.tab.songs': 'Morceaux',
    'progress-hub.aria.tabs': 'Sections de la boîte de progression'
  }
} satisfies LocaleDict;
```

---

### `src/lib/i18n/messages/index.ts` (modified — register progress-hub domain)

**Analog:** `src/lib/i18n/messages/index.ts` (lines 1–14)

Add a single import of `progressHub` and add it to both `en` and `fr` spreads in the merged messages object.

**Imports section addition** (after line 14):
```typescript
import { progressHub } from './progress-hub';
```

**Merge spreads** (lines 34–65):
Add `...progressHub.en` and `...progressHub.fr` to the respective merge objects:
```typescript
export const messages = {
  en: {
    ...chrome.en,
    ...recall.en,
    ...build.en,
    ...drills.en,
    ...songs.en,
    ...theory.en,
    ...scales.en,
    ...progress.en,
    ...progressHub.en,  // <-- NEW
    ...home.en,
    ...progressions.en,
    ...voicings.en,
    ...intervalView.en,
    ...practice.en,
    ...learn.en
  },
  fr: {
    ...chrome.fr,
    ...recall.fr,
    ...build.fr,
    ...drills.fr,
    ...songs.fr,
    ...theory.fr,
    ...scales.fr,
    ...progress.fr,
    ...progressHub.fr,  // <-- NEW
    ...home.fr,
    ...progressions.fr,
    ...voicings.fr,
    ...intervalView.fr,
    ...practice.fr,
    ...learn.fr
  }
} satisfies LocaleDict;
```

---

### `src/lib/i18n/messages.test.ts` (modified — add progress-hub to collision-guard list)

**Analog:** `src/lib/i18n/messages.test.ts` (lines 56–71, domain collision list)

Add `progressHub` to the imports at the top (line 16) and to the domains array in the collision test (between line 71 and home).

**Import addition** (after line 16):
```typescript
import { progressHub } from './messages/progress-hub';
```

**Domains array addition** (in the array starting at line 56, add new tuple):
```typescript
const domains: Array<[string, Record<string, string>]> = [
  ['chrome', chrome.en],
  ['recall', recall.en],
  ['build', build.en],
  ['drills', drills.en],
  ['songs', songs.en],
  ['theory', theory.en],
  ['scales', scales.en],
  ['progress', progress.en],
  ['progress-hub', progressHub.en],  // <-- NEW (alphabetically between progress and home)
  ['home', home.en],
  ['progressions', progressions.en],
  ['voicings', voicings.en],
  ['interval-view', intervalView.en],
  ['practice', practice.en],
  ['learn', learn.en]
];
```

---

### `tests/progress-hub.e2e.test.ts` (new — hub smoke/integration test)

**Analog:** `tests/progress.e2e.test.ts` (smoke test structure) + `tests/songs.e2e.test.ts` (song management test pattern)

Create a new test file that verifies:
1. The hub renders with three tab buttons (Stats | Recall | Songs)
2. Clicking each tab switches the active section
3. Stats section shows streak hero and token entry when needed
4. Recall section shows Review mode and can switch to Map
5. Songs section shows the filter toggle and can add/edit songs
6. Song filter toggle writes the shared preference (readable by Recall and Practice)

**Test structure** (modeled on `tests/progress.e2e.test.ts` lines 1–20 and `tests/songs.e2e.test.ts` lines 28–53):
```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import ProgressPage from '../src/routes/progress/+page.svelte';

// Mock the API calls as in tests/progress.e2e.test.ts, mock songs localStorage as in tests/songs.e2e.test.ts
beforeEach(() => {
  localStorage.clear();
  // Mock fetchStats, fetchStreak, etc.
});

describe('Progress hub (PROG-01)', () => {
  it('renders three tab buttons: Stats, Recall, Songs', () => {
    render(ProgressPage);

    const tabs = screen.getByRole('group', { name: /progress hub sections/i });
    expect(tabs).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /stats/i, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recall/i, pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /songs/i, pressed: false })).toBeInTheDocument();
  });

  it('shows Stats section by default', () => {
    render(ProgressPage);

    expect(screen.getByTestId('streak-hero')).toBeInTheDocument();
  });

  it('switches to Recall section when clicked, showing Review mode and Map toggle', async () => {
    render(ProgressPage);

    const recallTab = screen.getByRole('button', { name: /recall/i });
    await fireEvent.click(recallTab);

    expect(screen.getByRole('button', { name: /review/i, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
  });

  it('switches to Songs section, showing the filter toggle and preset shelf', async () => {
    render(ProgressPage);

    const songsTab = screen.getByRole('button', { name: /songs/i });
    await fireEvent.click(songsTab);

    expect(screen.getByTestId('song-filter-toggle')).toBeInTheDocument();
    expect(screen.getAllByTestId('preset-card')).toHaveLength(7);
  });

  it('writes and reads the song filter preference across sections', async () => {
    render(ProgressPage);

    // Navigate to Songs, toggle the filter on
    const songsTab = screen.getByRole('button', { name: /songs/i });
    await fireEvent.click(songsTab);

    const filterToggle = screen.getByTestId('song-filter-toggle');
    await fireEvent.click(filterToggle);

    // Filter is now on; return to Recall and verify it reads the same state
    const recallTab = screen.getByRole('button', { name: /recall/i });
    await fireEvent.click(recallTab);

    // The preference is persisted in localStorage and read by RecallSession
    // (verify via a visual cue, e.g., the RecallSession's "from my songs" label)
    expect(screen.getByTestId('recall-filtered-indicator')).toBeInTheDocument();
  });
});
```

---

## Shared Patterns

### Toggle Pattern (Button variant primary|ghost + aria-pressed)

**Source:** `src/routes/recall/+page.svelte` (lines 38–60)
**Apply to:** All three-tab switch in hub, nested Review|Map toggle in RecallPanel

```svelte
<div role="group" aria-label={t('...')}>
  <Button
    type="button"
    variant={state === 'option1' ? 'primary' : 'ghost'}
    aria-pressed={state === 'option1'}
    onclick={() => (state = 'option1')}
  >
    {t('...')}
  </Button>
  <Button
    type="button"
    variant={state === 'option2' ? 'primary' : 'ghost'}
    aria-pressed={state === 'option2'}
    onclick={() => (state = 'option2')}
  >
    {t('...')}
  </Button>
</div>
```

### Panel Box Styling (border-ink + bg-paper-bright + border-2)

**Source:** `src/routes/recall/+page.svelte` (lines 62–70)
**Apply to:** Each section inside the hub tab switch

```svelte
<div class="border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6">
  <!-- section content -->
</div>
```

### Thin Wrapper Route Pattern

**Source:** `src/routes/scales/+page.svelte` (lines 1–13)
**Apply to:** Modified `/songs`, modified `/recall`

```svelte
<script lang="ts">
  import ComponentName from '$lib/components/ComponentName.svelte';
  import { t } from '$lib/i18n/locale.svelte';
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
  <h1 class="text-heading mt-2 font-bold">{t('domain.page.title')}</h1>
  <p class="text-muted mt-2">{t('domain.page.subtitle')}</p>

  <ComponentName />
</main>
```

### i18n Domain Structure

**Source:** `src/lib/i18n/messages/recall.ts` (lines 1–17)
**Apply to:** New `progress-hub.ts`

```typescript
import type { LocaleDict } from './index';

/**
 * Domain name (phase, spec reference): copy ownership, domain scope.
 */
export const domainName = {
  en: {
    'domain.key1': 'English string',
    'domain.key2': 'Another string'
  },
  fr: {
    'domain.key1': 'Chaîne française',
    'domain.key2': 'Une autre chaîne'
  }
} satisfies LocaleDict;
```

### data-review-dock Coupling

**Source:** `src/routes/recall/+page.svelte` (lines 29–31)
**Apply to:** Hub's `<main>` element

The review-dock fixed bar (coupled to RecallSession) must be hidden when the user scrolls into Stats or Songs. Gate the attribute on both the active tab AND the nested Recall mode:

```svelte
<main
  class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8"
  data-review-dock={activeTab === 'recall' && recallMode === 'review' ? '' : undefined}
>
```

This ensures the dock never appears while the user is viewing Stats or Songs, and disappears if they switch Recall from Review to Map mode.

---

## Regression Safety

### REG-01: No behavior changes

- Stats fetch, token entry, streak, weakest spots, accuracy table, calibration, danger cards, practice settings → **verbatim extraction from `/progress`**, no logic change
- Recall Review session + Map + song filter read → **verbatim extraction from `/recall`**, no logic change
- Song CRUD, filter write, preset management → **verbatim extraction from `/songs`**, no logic change
- The global song-filter contract (`music-learn:song-filter`, written by `SongFilterToggle`, read by `RecallSession`) → **unchanged**

### REG-02: Tests must pass

- Existing `/progress`, `/recall`, `/songs` e2e test files remain unchanged and must pass (they test the now-thin wrappers rendering the extracted components)
- New `tests/progress-hub.e2e.test.ts` smoke test verifies hub navigation and section switching
- Full suite (`npm run test`) must stay green
- `svelte-check` must pass

---

## Metadata

**Analog search scope:** `src/routes/*/+page.svelte`, `src/lib/components/*.svelte`, `src/lib/i18n/messages/*.ts`, `tests/*.e2e.test.ts`

**Files scanned:** 12 analog files (progress, recall, songs, scales, learn, TheoryLessons, ScaleExplorer, messages/index, messages.test, progress.e2e.test, songs.e2e.test)

**Pattern extraction date:** 2026-07-25

**Key insights:**
1. The `/recall` Review|Map toggle is the exact pattern for the hub's three-tab switch — reuse its Button/aria-pressed/role="group" structure unchanged
2. The `/learn` sectioned composition shows how multiple heavy components sit alongside each other, but `/learn` is a single-scroll page; the hub differs by mounting only one section at a time (conditional rendering, not scroll)
3. Extract SongManager and ProgressStats wholesale — they own all their state and behaviors, rendering them directly in the hub with zero prop passing ensures they cannot drift
4. RecallPanel is the thinnest extraction — just the toggle + conditional rendering of two existing components — but it is required to keep `/recall` and the hub in sync and to preserve the data-review-dock coupling
5. The i18n domain-collision test is strict: every new domain must be added to the imports and the domains array in `messages.test.ts`, or the test suite fails — this is deliberate gatekeeping to catch accidental key shadowing
