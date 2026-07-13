# Phase 9: Deploy to the Piano - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 9 (modified) + 2 (new)
**Analogs found:** 11 / 11 (all are self-modifications; this phase mostly evolves existing files in place rather than introducing new architectural roles)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/components/PianoKeyboard.svelte` (responsive octave rewrite) | component | transform (props → DOM layout) | itself (pre-phase version) | exact — refactor in place |
| `src/lib/components/PianoKeyboard.svelte` (feedback display mode, sketch 001) | component | transform (props → DOM layout) | itself (interactive/selected prop pattern already in file) | exact |
| `src/routes/drills/+page.svelte` (portrait/landscape restructure + merged feedback) | route (page) | request-response / event-driven (click, Check) | itself (pre-phase version) | exact — refactor in place |
| `src/routes/+layout.svelte` (compact mobile masthead) | component (layout) | request-response | itself (pre-phase version) | exact |
| `src/lib/components/AccuracyTable.svelte` (mobile column drop) | component | CRUD (read-only render) | itself + `PracticeItemRow.svelte` | exact |
| `src/lib/components/PracticeItemRow.svelte` (mobile treatment, if stacked cards chosen) | component | CRUD (read-only render) | itself | exact |
| `src/lib/drills/rotateHint.ts` (new — localStorage dismissed-once flag) | utility | file-I/O (localStorage) | `src/lib/lookup/recentLookups.ts` | exact — same localStorage read/write/try-catch shape |
| `src/app.css` (new `--color-wrong` / `--color-wrong-deep` tokens, PWA theme-color reuse) | config | transform (design tokens) | itself (`@theme` block) | exact — additive token pattern already established |
| `static/manifest.webmanifest` (new) | config | file-I/O (static asset) | none in repo (new surface) | no analog — first PWA artifact |
| `src/app.html` (add `<link rel="manifest">` + icons) | config | request-response (HTML head) | none (single file, not yet inspected but trivial edit) | no analog — first PWA surface |
| `static/icons/*` (new PWA icons) | config | file-I/O (static asset) | none in repo | no analog |

## Pattern Assignments

### `src/lib/components/PianoKeyboard.svelte` (component, transform)

**Analog:** itself, pre-phase (`src/lib/components/PianoKeyboard.svelte:1-311`)

This is a refactor-in-place, not a net-new file. The existing file already has the exact shape the phase needs to extend — read it fully before touching it.

**Current hardcoded two-octave assumption** (lines 46-72):
```typescript
/** White key letters across a two-octave C-to-C span (15 keys). */
const WHITE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
...
const WHITE_KEY_COUNT = WHITE_LETTERS.length;
const WHITE_KEY_WIDTH_PCT = 100 / WHITE_KEY_COUNT;
const BLACK_KEY_WIDTH_PCT = WHITE_KEY_WIDTH_PCT * 0.6;
```
D-01 (responsive octaves) requires parameterizing `WHITE_LETTERS`/`BLACK_KEYS` generation by octave count (1 for phone portrait, 2 for landscape/desktop) rather than a fixed 15-key literal. The percentage-based layout math (`leftPct`, `WHITE_KEY_WIDTH_PCT`) already generalizes cleanly to N octaves — only the array-building needs a loop instead of a literal.

**Fixed min-width to remove** (lines 236-241):
```css
.piano-keyboard {
    position: relative;
    width: 100%;
    min-width: 660px;
    height: 160px;
}
```
D-01/D-04: replace `min-width: 660px` with container/media-query-driven octave-count derivation; keep `min-width: 44px` per-key floor (already present on `.piano-keyboard__key`, line 251) as the hard floor D-04 requires.

**Note assignment / matching is octave-agnostic already** (lines 97-136, `assignNotesToKeys`): walks ascending from root, matches by letter not MIDI number. D-02 (highlight wrapping) needs this logic extended so that when the ascending walk would exceed the visible span's top C, it wraps the excess note back to the lowest available same-letter key within the visible span, still tagged with its correct interval role. This is the core new logic — no existing analog for wrapping, but the `candidates`/`cursor` structure (lines 112-133) is the right place to add a wrap-around branch.

**Interactive/selected prop pattern to reuse for feedback display mode** (lines 18-27, Props interface):
```typescript
interface Props {
    notes: SpelledNote[];
    interactive?: boolean;
    selected?: Set<string>;
    onToggle?: (letter: string) => void;
}
```
Sketch 001's merged feedback keyboard needs a new prop shape layered onto this same interface — e.g. a `wrongLetters?: Set<string>` (or equivalent) passed alongside `notes` (which already carries the correct-chord interval-colored notes). The existing `roleClass`/`selectedClass` helper-function pattern (lines 177-189) is the template: add a `wrongClass(letter, role)` helper following the same "mutually exclusive with role" guard used by `selectedClass` (line 188: `interactive && !role && selected?.has(letter)`), since a wrong-extra key is never simultaneously an interval-color-filled correct key.

**CSS class layering pattern to copy** (lines 261-310, `.piano-keyboard__key--root/third/fifth/seventh` + `.piano-keyboard__key--selected`): the wrong-extra fill classes (`.piano-keyboard__key--wrong` / black-key variant) belong right after the four interval-role classes, following the exact same block shape:
```css
.piano-keyboard__key--root { background-color: var(--color-root); }
.piano-keyboard__key--third { background-color: var(--color-third); }
```
becomes (new, additive):
```css
.piano-keyboard__key--wrong { background-color: var(--color-wrong); }
.piano-keyboard__key--black.piano-keyboard__key--wrong { background-color: var(--color-wrong-deep); }
```
(mirrors the existing black-key override pattern at lines 301-309 for `--selected`).

---

### `src/routes/drills/+page.svelte` (route, event-driven)

**Analog:** itself, pre-phase (`src/routes/drills/+page.svelte:1-263`)

**Feedback state already tracked** (lines 52-57):
```typescript
let feedback = $state<MatchResult | null>(null);
let confirmationText = $state('');
let headlineText = $state('');
let playedLetters = $state<string[]>([]);
```
`MatchResult` (`src/lib/drills/matchChord.ts:5-10`) already carries `{ correct, missing, extra }` as chroma arrays (0-11), which is exactly the data sketch 001's merged keyboard needs (chroma-based, octave-agnostic — matches D-02 wrapping's pitch-class approach). No new matching logic needed; only the render replaces the two-keyboard block.

**Current TWO-KEYBOARD block to replace** (lines 188-235): the wrong-answer branch currently renders one `<PianoKeyboard notes={target.notes} />` (line 203, the correct-answer keyboard, separate from the input keyboard at line 152) plus a text diff block (lines 214-231, `data-testid="played-diff"`/`"correct-diff"`). Sketch 001 replaces this whole reveal section with ONE keyboard: the same interactive keyboard instance transforms in place. Concretely: instead of swapping to a second `<PianoKeyboard notes={target.notes} />`, pass the SAME keyboard instance `notes={target.notes}` plus a new wrong-letters set derived from `feedback.extra` (chroma) mapped back to played letters — `playedLetters` (line 57, already captured) filtered by `isExtraLetter()` (lines 130-134) is the exact existing helper to reuse for this derivation, just fed into the keyboard as a prop instead of into the removed text-diff JSX.

**`isExtraLetter` helper to reuse directly** (lines 130-134):
```typescript
function isExtraLetter(letter: string): boolean {
    const chroma = Note.chroma(toAsciiAccidentals(letter));
    return feedback?.extra.includes(chroma) ?? false;
}
```
Build `const wrongLetters = $derived(new Set(playedLetters.filter(isExtraLetter)))` and pass to the merged keyboard's new `wrongLetters` prop.

**Legend line (sketch 001) placement**: goes where the removed text-diff block was (lines 214-231), following the existing `data-testid` convention (`data-testid="played-diff"` → could become `data-testid="feedback-legend"`).

**Stamp animation, already present and reusable as-is** (lines 189, 246-262):
```css
.stamp { animation: stamp-in 240ms ease-out; }
@keyframes stamp-in {
    0% { transform: scale(0.96); opacity: 0; }
    60% { transform: scale(1.02); opacity: 1; }
    100% { transform: scale(1); }
}
```
Sketch 001's `.stamped` class on individual keys should follow this exact keyframe (already defined once at page level; either reuse via a shared class or move to `app.css` since `PianoKeyboard.svelte` will now also need it for per-key stamping). Add `@media (prefers-reduced-motion: reduce) { .stamped/.stamp { animation: none; } }` per D-11 and the sketch's finding — this guard does NOT currently exist in the codebase and must be added net-new here (check both this file and wherever the per-key stamp moves to).

**Landscape/portrait restructure (D-06)**: the current single-column `<main class="... p-8 ...">` (line 137) with sequential blocks (prompt → keyboard → controls → feedback) needs a landscape media-query variant that goes side-by-side (prompt+controls left, keyboard right). No existing analog for a responsive two-pane layout in this codebase; follow Tailwind's `lg:flex`/orientation media query conventions already used elsewhere for `md:` breakpoints in `+layout.svelte` (`class="... flex-col gap-2 ... md:flex-row md:items-center ..."`, layout line 47) as the project's established responsive-class idiom.

**2x2 choice grid, already present** (lines 173-185):
```svelte
<div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="choice-grid">
```
D-13 requires this to STAY 2x2 on phone (currently `grid-cols-2` is already the phone default, expanding to 4 columns at `sm:`) — likely just needs the `sm:grid-cols-4` breakpoint reviewed against the new landscape left-panel width constraint (D-06), not a new pattern.

---

### `src/routes/+layout.svelte` (layout component, request-response)

**Analog:** itself, pre-phase (`src/routes/+layout.svelte:1-89`)

**Current masthead structure** (lines 46-64):
```svelte
<nav class="bg-paper border-ink flex flex-col gap-2 border-b-2 p-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-4" data-testid="masthead">
    <span class="text-heading font-bold uppercase tracking-tight">MUSIC LEARN</span>
    <StreakBadge variant="compact" count={streakCount} loading={streakLoading} />
    <div class="flex gap-4">
        {#each navLinks as link (link.href)}
```
D-09 (compact single letterpress row on mobile) works within this exact structure — tighten `p-4`/`gap-2` at the mobile breakpoint and conditionally drop the Showcase `navLinks` entry (line 16: `{ href: '/showcase', label: 'Showcase' }`) on small viewports. The `navLinks` array (lines 12-17) is a plain array map — filtering it by a `hideOnMobile` flag or a viewport check follows the same declarative-array idiom already in place, no new pattern needed.

---

### `src/lib/drills/rotateHint.ts` (new utility, file-I/O)

**Analog:** `src/lib/lookup/recentLookups.ts:1-58`

D-05's "shown once ever" flag needs the exact same localStorage read/write/try-catch shape as `recentLookups.ts`. Full pattern to copy:

**Storage key + guarded read** (lines 12, 21-37):
```typescript
const STORAGE_KEY = 'music-learn:recent-lookups';
...
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
```
For the rotate-hint flag, this collapses to a boolean equivalent:
```typescript
const STORAGE_KEY = 'music-learn:rotate-hint-dismissed';

export function isRotateHintDismissed(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function dismissRotateHint(): void {
    try {
        localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
        // Quota exceeded or storage disabled: no-op, matches recentLookups.ts's
        // availability-over-durability comment (line 53-54).
    }
}
```
Also mirror the doc-comment convention at the top of `recentLookups.ts` (lines 1-10) explaining scope/rationale (device-local, degrades gracefully).

---

### `src/app.css` (config, additive tokens)

**Analog:** itself (`src/app.css:1-79`)

**Existing additive token pattern to follow** (lines 15-19, interval colors):
```css
/* Interval color language (DESIGN-02 — app-wide, fixed forever) */
--color-root: #c8502e;
--color-third: #3e7d6b;
--color-fifth: #a89a7f;
--color-seventh: #f0c948;
```
New tokens for sketch 001 (per `drill-feedback.md`) go in the same `@theme` block, additively, with a comment following the existing convention:
```css
/* Wrong-answer feedback grays (Sketch 001, DESIGN additive) */
--color-wrong: #b8b0a0;
--color-wrong-deep: #8f877a;
```
PWA `theme-color` meta tag (D-07) should reuse `--color-ink` (`#221e17`, line 7) or `--color-paper` (`#f2ecdd`, line 5) — whichever the manifest/`app.html` `<meta name="theme-color">` picks, keep it one of the existing Print Shop palette values rather than introducing a new color.

---

### `src/lib/components/AccuracyTable.svelte` + `PracticeItemRow.svelte` (component, CRUD read-only)

**Analog:** each other (self-referential; `AccuracyTable.svelte:1-48` iterates `PracticeItemRow.svelte:1-58`)

Claude's discretion item: drop the KIND column on mobile. Current header row (`AccuracyTable.svelte` lines 24-31) and matching `<td>` (`PracticeItemRow.svelte` line 33, `.practice-row__kind`) are both plain static markup — hiding on mobile is a Tailwind responsive class addition (`hidden sm:table-cell` or similar) on both the `<th>` and `<td>` for KIND, no structural change. The `isWeak`/vermilion-accent pattern (`PracticeItemRow.svelte` lines 25-30, 44-53) is untouched by this — only column visibility changes.

## Shared Patterns

### localStorage persistence (file-I/O utilities)
**Source:** `src/lib/lookup/recentLookups.ts:1-58`
**Apply to:** `src/lib/drills/rotateHint.ts` (new)
Pattern: module-level `STORAGE_KEY` constant with `music-learn:` prefix, every read/write wrapped in try/catch, failures degrade silently (no throw), doc comment at top explaining device-local scope and degrade-gracefully rationale.

### Additive design tokens
**Source:** `src/app.css:3-68` (`@theme` block)
**Apply to:** any new CSS custom properties this phase (wrong-answer grays, PWA theme-color reuse)
Pattern: never edit/rename existing tokens; add new ones with a one-line comment citing the originating decision (e.g. `/* Sketch 001 */`), grouped near thematically related existing tokens (wrong-grays near the interval-color block).

### Responsive breakpoint idiom
**Source:** `src/routes/+layout.svelte:47` (masthead `flex-col ... md:flex-row ...`)
**Apply to:** `drills/+page.svelte` landscape restructure, `AccuracyTable.svelte` column drop, masthead compacting
Pattern: mobile-first Tailwind utility classes as the base, `md:`/`sm:` (or new container-query equivalents per D-01's discretion note) prefixed overrides for larger viewports — no separate mobile/desktop component variants, one template with responsive classes.

### Stamp-in reveal animation
**Source:** `src/routes/drills/+page.svelte:246-262`
**Apply to:** per-key stamping in `PianoKeyboard.svelte`'s merged feedback mode (sketch 001)
Pattern: `240ms ease-out` scale/opacity keyframe, gated by `prefers-reduced-motion` (this guard must be ADDED — it does not exist in the current `.stamp` CSS block and is a net-new requirement, not a copy-paste).

### Pitch-class / chroma matching (octave-agnostic)
**Source:** `src/lib/drills/matchChord.ts:31-46` (`matchChord`) and `src/routes/drills/+page.svelte:130-134` (`isExtraLetter`)
**Apply to:** `PianoKeyboard.svelte`'s D-02 highlight-wrapping logic and the merged feedback keyboard's wrong-letter derivation
Pattern: all comparison happens on `Note.chroma()` (0-11), never on octave or absolute pitch, using the shared `toAsciiAccidentals()` glyph-to-ASCII conversion helper (duplicated today in both `matchChord.ts` line 14-16 and `+page.svelte` line 40-42 — planner should note this exists in two places already and may be a candidate to extract to a shared util, though that's not required by this phase's decisions).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `static/manifest.webmanifest` | config | file-I/O | First PWA artifact in the repo; no existing manifest to pattern-match. Use standard Web App Manifest shape (`name`, `short_name`, `icons`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`) populated from Print Shop palette per D-07/discretion. |
| `src/app.html` (manifest link + icons) | config | request-response | Single-file edit adding `<link rel="manifest" href="/manifest.webmanifest">` and icon `<link>` tags to the `<head>`; no comparable existing head-tag pattern in the repo beyond the default SvelteKit scaffold. |
| `static/icons/*` | config | file-I/O | New binary/SVG assets; no analog, discretion on art direction per CONTEXT.md. |

## Metadata

**Analog search scope:** `src/lib/components/`, `src/routes/`, `src/lib/lookup/`, `src/lib/drills/`, `src/app.css`, `src/routes/+layout.svelte`
**Files scanned:** `PianoKeyboard.svelte`, `drills/+page.svelte`, `+layout.svelte`, `AccuracyTable.svelte`, `PracticeItemRow.svelte`, `recentLookups.ts`, `matchChord.ts`, `app.css`
**Pattern extraction date:** 2026-07-13
