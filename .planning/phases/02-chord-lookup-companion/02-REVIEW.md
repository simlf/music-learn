---
phase: 02-chord-lookup-companion
reviewed: 2026-07-12T22:30:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/lib/components/Button.svelte
  - src/lib/components/components.test.ts
  - src/lib/components/RecentChipRow.svelte
  - src/lib/copy/hints.test.ts
  - src/lib/copy/hints.ts
  - src/lib/lookup/chordPresentation.test.ts
  - src/lib/lookup/chordPresentation.ts
  - src/lib/lookup/recentLookups.test.ts
  - src/lib/lookup/recentLookups.ts
  - src/lib/theory/didYouMean.test.ts
  - src/lib/theory/didYouMean.ts
  - src/lib/theory/randomChord.ts
  - src/routes/+layout.svelte
  - src/routes/+page.svelte
  - tests/lookup.e2e.test.ts
findings:
  critical: 1
  warning: 6
  info: 7
  total: 14
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-12T22:30:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the 15 chord-lookup-companion files plus their cross-module dependencies (`spellChord`, `types.ts`, `playChord.ts`, `PianoKeyboard.svelte`, `ChordGlyph.svelte`, `showcase/+page.svelte`). Security posture is clean: no injection surfaces (all interpolation goes through Svelte's escaped text/attribute rendering), no secrets, no dangerous APIs, and localStorage reads are defensively parsed and SSR/prerender-safe (the `try/catch` in `getRecentLookups` also catches the server-side `ReferenceError`).

Correctness is not clean. The headline finding, **verified empirically by rendering the component and rerendering with new props**, is that `PianoKeyboard` computes its key/note assignment in non-reactive `const`s, so every lookup after the first renders the *previous* chord's keyboard highlights. This phase's entire purpose (repeated mid-song lookups via recent chips, did-you-mean taps, and type-over entry) funnels users into that broken path, and the test suite only ever asserts keyboard content on the first lookup, so it passes while the bug ships. Two further verified defects: chord input is not trimmed (tonal rejects `"Cm7 "`, a common mobile-keyboard artifact), and `aliasLine` mixes ASCII and glyph accidental spellings, printing visible duplicates like `Bbmaj7 = B♭maj7 = ...` for every flat/sharp-rooted chord.

## Critical Issues

### CR-01: PianoKeyboard never updates after the first lookup — stale highlights on every subsequent chord

**File:** `src/routes/+page.svelte:186` (trigger), root cause in `src/lib/components/PianoKeyboard.svelte:112, 128-141`
**Issue:** `PianoKeyboard` computes `noteAssignment`, `whiteKeys`, and `blackKeys` as plain top-level `const`s in a Svelte 5 runes component. They evaluate once at component creation and never react to the `notes` prop changing. On the lookup page, `<PianoKeyboard notes={result.notes} />` sits inside `{#if result?.recognized}`; when `result` changes from one recognized chord to another, the `#if` branch stays truthy, the component instance persists, and it receives new props it ignores. Result: after stamping Cm7 then Fmaj7, the glyph shows Fmaj7 while the keyboard still highlights C-E♭-G-B♭. Every repeat-lookup mechanism this phase adds (recent chips, did-you-mean tap, starter chords followed by typed lookups, type-over entry) hits this path.

**Verified:** a throwaway test rendering `PianoKeyboard` with Cm7 notes and rerendering with Fmaj7 notes still finds the `E♭` label in the DOM after rerender (test file created, run, and deleted; not committed). The existing suites in `tests/lookup.e2e.test.ts` only assert keyboard contents on the *first* stamped chord (lines 36-44), so they cannot catch this. The Phase 1 showcase page shares the same latent defect, but this phase's repeat-lookup UX is what makes it user-visible on the core flow.

**Fix (root cause, in PianoKeyboard.svelte):** make the derivation reactive:
```svelte
const noteAssignment = $derived(assignNotesToKeys());
const whiteKeys = $derived(WHITE_LETTERS.map((letter, index) => ({ ... note: noteAtWhiteIndex(index) })));
const blackKeys = $derived(BLACK_KEYS.map(({ ... }, blackIndex) => ({ ... note: noteAtBlackIndex(blackIndex) })));
```
(`noteAtWhiteIndex`/`noteAtBlackIndex` must read the derived `noteAssignment`.) Alternatively, a page-level workaround is `{#key result.symbol}<PianoKeyboard notes={result.notes} />{/key}` — which also fixes IN-07's stamp-animation staleness — but the component should be correct on its own since Phase 3 drills will reuse it.

## Warnings

### WR-01: Chord input is not trimmed before lookup — `"Cm7 "` fails

**File:** `src/routes/+page.svelte:43-45, 78-81`
**Issue:** `showChord(symbol)` passes the raw input to `spellChord`, and tonal's `Chord.get` rejects both `"Cm7 "` and `" Cm7"` (verified: `Chord.get("Cm7 ").empty === true`). Mobile keyboards routinely append a trailing space via autocomplete, which is exactly this phase's primary device. The user gets shunted to the error bar and a "DID YOU MEAN Cm7?" detour (didYouMean trims internally, masking the root cause) instead of a direct hit.
**Fix:** trim once at the entry point:
```ts
function showChord(input: string) {
	const cleaned = input.trim();
	const spelled = spellChord(cleaned);
	...
}
```

### WR-02: `aliasLine` mixes ASCII and glyph accidentals — visible duplicate alias for every flat/sharp-rooted chord

**File:** `src/lib/lookup/chordPresentation.ts:51-54`
**Issue:** `chord.symbol` comes straight from tonal in ASCII form (`"Bbmaj7"`, `"F#m7b5"` — verified), while `chord.root` is glyph-converted (`"B♭"`, `"F♯"`). `aliasLine` seeds the list with `chord.symbol` and then appends `chord.root + alias`, so the `Set` dedupe never collapses them. Verified output for `Bbmaj7`: the line contains both `Bbmaj7` and `B♭maj7` — the same spelling shown twice, plus an ASCII/glyph inconsistency that violates the app's own display convention (`types.ts` states letters are "Never ASCII #/b"). The unit test only covers the natural-root `C-7`, which is precisely the case where the bug cannot appear.
**Fix:** normalize the symbol to glyph form before joining:
```ts
const toGlyphs = (s: string) => s.replace(/#/g, '♯').replace(/b/g, '♭');
const forms = [toGlyphs(chord.symbol), ...chord.aliases.map((alias) => chord.root + alias)];
```
(Note: a naive `/b/g` replace is safe here only because roots never contain a lowercase `b` as a letter name — replace accidentals after the root character, or reuse a shared root-aware helper. Add a flat-root test case.) Because of WR-05, the same fix must also land in the showcase page's duplicate copy, or better, the duplicate must be deleted.

### WR-03: `getRecentLookups` neither caps at 5 nor dedupes — duplicate stored entries crash the keyed chip row

**File:** `src/lib/lookup/recentLookups.ts:21-34`; blast radius `src/lib/components/RecentChipRow.svelte:20`
**Issue:** The function's documented contract is "last 5 distinct chord symbols" and "malformed data never throws," but the read path returns *any* string array verbatim. Two consequences: (1) a legacy/hand-edited/foreign-written store with more than 5 entries renders more than 5 chips (each a 44px-minimum button, flooding the above-the-fold layout the component's own comment says it protects); (2) an array with duplicate strings (`["Cm7","Cm7"]`) flows into `{#each recent as symbol (symbol)}`, and Svelte 5 throws `each_key_duplicate` for duplicate keys — the page crashes on mount from data that passed this function's validation. The defensive-read function is the single place that guarantees the downstream invariants; today it guarantees neither.
**Fix:**
```ts
return [...new Set(parsed)].slice(0, MAX_RECENT);
```

### WR-04: Did-you-mean suggestion is a raw ~12px inline button — violates the project's 44px touch-target rule

**File:** `src/routes/+page.svelte:139-144`
**Issue:** The suggestion — the single most important tap target in the error-recovery flow, on a phone-first tool — is a bare `<button class="underline">` rendered at `text-label` (12px) inside the error bar. The project's own `Button.svelte` documents the 44px minimum touch target as load-bearing (Phase 1 exception), and every other interactive element in this phase honors it. This one bypasses it entirely.
**Fix:** give the inline button a padded 44px hit area without inflating the visual text, e.g. add a class with `min-height: 44px; min-width: 44px; padding: var(--spacing-sm); margin: calc(-1 * var(--spacing-sm));` (negative margin keeps the bar's visual height), or restyle the suggestion as a ghost `Button` beneath the hint text.

### WR-05: Extraction to `chordPresentation.ts` left the original duplicates in the showcase page

**File:** `src/lib/lookup/chordPresentation.ts:23-29` (claims "Extracted from the showcase page (Phase 1) so the lookup page and Phase 3 drills can share it") vs `src/routes/showcase/+page.svelte:20-90`
**Issue:** `formulaFor`, `toAsciiAccidentals`, and `aliasLine` exist character-for-character twice: once in the new shared module, once still inline in the showcase page. The stated purpose of the extraction (single shared implementation) was not completed. This is not hypothetical divergence risk: WR-02's fix applied only to the shared module would leave the showcase page's alias line still broken.
**Fix:** delete the inline copies in `src/routes/showcase/+page.svelte` and import `formulaFor`/`aliasLine` from `$lib/lookup/chordPresentation` (the local `FormulaEntry` interface also becomes the shared exported one).

### WR-06 (cross-module): "Hear it" pins all notes to octave 4, playing an inversion instead of the displayed chord

**File:** `src/lib/audio/playChord.ts:22-25`, invoked from `src/routes/+page.svelte:73-76`
**Issue:** `toTonePitch` appends `"4"` to every pitch class. For any chord whose spelling crosses the octave boundary — G7 (G-B-D-F), Am7 (A-C-E-G), Bm7b5, most roots from F upward — the upper chord tones sound *below* the root (G4, B4, D4, F4: the D and F land under the G). The keyboard (CR-01 aside) deliberately renders an ascending root-position voicing; the audio contradicts it, which is actively misleading for a theory-learning app whose core value is "know what notes to play." `playChord.ts` is Phase 1 code outside this change set, but the reviewed page is its caller and the defect is chord-dependent, so it surfaces on most lookups.
**Fix:** ascend octaves as the pitch class wraps:
```ts
import { Note } from 'tonal';
export async function playChord(notes: string[]): Promise<void> {
	await Tone.start();
	let octave = 4;
	let prev = -1;
	const pitches = notes.map((letter) => {
		const chroma = Note.chroma(letter.replace(/♯/g, '#').replace(/♭/g, 'b')) ?? 0;
		if (chroma <= prev) octave += 1;
		prev = chroma;
		return `${letter.replace(/♯/g, '#').replace(/♭/g, 'b')}${octave}`;
	});
	getSynth().triggerAttackRelease(pitches, '4n');
}
```

## Info

### IN-01: Recent chips display tonal's echoed ASCII/alias symbol, not the app's glyph convention

**File:** `src/routes/+page.svelte:50`, `src/lib/lookup/recentLookups.ts:43`
**Issue:** `addRecentLookup(spelled.symbol)` stores whatever alias tonal echoes back (verified: `Chord.get("C-7").symbol === "C-7"`, `"Bbmaj7"` stays ASCII). Chips therefore show `Bbmaj7`/`F#m7b5` instead of `B♭maj7`/`F♯m7b5`, and the same chord can occupy two chip slots under different aliases (`Cm7` and `C-7`), eroding the 5-slot budget.
**Fix:** store a glyph-normalized canonical form (share the normalization helper from WR-02) before persisting.

### IN-02: `tests/lookup.e2e.test.ts` is a jsdom component test, not e2e; masthead has no automated coverage

**File:** `tests/lookup.e2e.test.ts:1-9`
**Issue:** The file renders `+page.svelte` in jsdom via vitest — no browser, no layout, no navigation. The header comment concedes masthead behavior is "verified via manual/e2e navigation checks," but no such automated checks exist. The name overstates the coverage.
**Fix:** rename to `lookup.page.test.ts` (or add real Playwright e2e later); track masthead coverage as a known gap.

### IN-03: `pickHint`/`pickSuggestionHint` are duplicated logic with an unbounded retry loop

**File:** `src/lib/copy/hints.ts:21-33, 55-67`
**Issue:** Two identical anti-repeat rotators, each with a `while` re-roll loop that is technically unbounded (probabilistically fine at n>=2, but needless). Also, `errorHints` lacks the em-dash and non-empty guards that `suggestionHints` gets in tests.
**Fix:** one factory, loop-free:
```ts
function makeRotator(pool: string[]) {
	let last = -1;
	return () => {
		if (pool.length === 1) return pool[(last = 0)];
		const offset = 1 + Math.floor(Math.random() * (pool.length - 1));
		last = last === -1 ? Math.floor(Math.random() * pool.length) : (last + offset) % pool.length;
		return pool[last];
	};
}
```

### IN-04: localStorage read at component init causes a guaranteed hydration mismatch for returning users

**File:** `src/routes/+page.svelte:22`
**Issue:** With `prerender = true`, the server HTML never contains the chip row (`getRecentLookups` returns `[]` on the server), but `$state(getRecentLookups())` hydrates with populated data, so the `{#if recent.length > 0}` branch mismatches on every visit after the first lookup — Svelte recovers by re-rendering the block, with a dev warning and a small layout flash.
**Fix:** initialize `recent = $state<string[]>([])` and load in `$effect(() => { recent = getRecentLookups(); })` (or accept the flash knowingly).

### IN-05: `insertGlyph` caret restore relies on microtask ordering against Svelte's internal flush

**File:** `src/routes/+page.svelte:90-93`
**Issue:** `queueMicrotask` happens to run after Svelte 5's scheduled DOM flush today (the state write on line 88 enqueues the flush first), but that ordering is scheduler-internal, not contractual. If it ever inverts, the browser resets the caret to the end when the bound value updates.
**Fix:** `import { tick } from 'svelte'` and use `tick().then(() => { el?.focus(); el?.setSelectionRange(caret, caret); });`

### IN-06: `+layout.svelte` uses the deprecated `$app/stores` page store

**File:** `src/routes/+layout.svelte:3, 24`
**Issue:** SvelteKit 2.12+ deprecates `$app/stores` in favor of `$app/state` (`page.url.pathname`, no `$` prefix), which is the idiomatic runes-era API on this project's pinned version (2.69.2).
**Fix:** `import { page } from '$app/state';` and `class:masthead__link--active={page.url.pathname === link.href}`.

### IN-07: Result block persists across lookups: stamp animation plays only once; keyboard's 660px min-width overflows phones unmanaged

**File:** `src/routes/+page.svelte:173, 185-187`; `src/lib/components/PianoKeyboard.svelte:175`
**Issue:** (a) The `.stamp` element is created once and reused for every subsequent chord, so the stamp-in animation — the phase's core feedback metaphor — plays only for the first lookup. (b) `PianoKeyboard` declares `min-width: 660px` and the page provides no `overflow-x-auto` wrapper, so a ~390px mobile-portrait viewport gets whole-page horizontal overflow.
**Fix:** the `{#key result.symbol}` wrapper from CR-01 fixes (a) for free; wrap the keyboard in `<div class="mt-6 overflow-x-auto">` for (b).

---

_Reviewed: 2026-07-12T22:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
