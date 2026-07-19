---
phase: 18-your-songs-chords
reviewed: 2026-07-18T12:41:43Z
depth: deep
files_reviewed: 12
files_reviewed_list:
  - src/lib/practice/songProvenance.ts
  - src/lib/components/SongMark.svelte
  - src/lib/components/SongFilterToggle.svelte
  - src/lib/practice/pool.ts
  - src/routes/drills/+page.svelte
  - src/routes/recall/+page.svelte
  - src/lib/components/RecallSession.svelte
  - src/routes/+page.svelte
  - src/lib/practice/songProvenance.test.ts
  - src/lib/components/songMark.test.ts
  - src/lib/components/songFilterToggle.test.ts
  - src/routes/lookupSongMark.test.ts
findings:
  critical: 0
  high: 1
  medium: 2
  low: 1
  total: 4
status: issues_found
fixed_at: 2026-07-18T14:52:00Z
fix_status: all_fixed
---

# Phase 18: Code Review Report — Your Songs' Chords

**Reviewed:** 2026-07-18T12:41:43Z
**Depth:** deep
**Files Reviewed:** 12
**Status:** issues_found (all 4 findings fixed — see RESOLVED notes below and the fix summary at the end)

## Summary

Reviewed the SONG-01/SONG-02/SONG-03 provenance mark, filter toggle, restricted-draw, and their wiring into Drills, Recall, and Lookup, cross-referenced against the phase's own PLAN/CONTEXT/UI-SPEC documents and the pool/session/scaffold modules they touch.

The core primitives are solid: `songProvenance.ts`'s enharmonic/alias matching (Cm7 = C-7 = Cmin7, F♯ø7 = G♭ø7) is correct and well-tested; `SongMark.svelte` uses plain text interpolation only (no `{@html}`, confirmed by its own "markup-bearing name renders as literal text" test) so there's no XSS surface; `drawFromSymbols` in `pool.ts` is a faithful, additive restriction that never touches the existing `drawFromPool`/`songSymbols` weighting seam; the hear-name spoiler-safety rule in `RecallSession.svelte` is correctly implemented (the mark only renders inside the post-answer `{#if hearNameAnswered}` block, never before).

One real functional bug was found in Drills' filter-toggle handler (state corruption on toggle-while-unanswered), and two design-level gaps were found where Phase 18's additions interact with pre-existing pacing/messaging guarantees in ways the phase's own plans didn't fully account for. No security issues, no data-loss risk, no crashes.

## Critical Issues

None found.

## High

### HI-01: Toggling the song filter mid-question corrupts session/telemetry state (missing `questionSource`/`hintTaken`/`questionShownAt` reset) — RESOLVED

**Resolved:** `toggleSongFilter()` now mirrors `setMode`'s exact guard (`questionSource !== 'pool'`) and resets (`hintTaken`, `questionShownAt`) before drawing a fresh question. Regression test added to `src/routes/drillsSongFilter.test.ts`. Commit `a59efbb`.

**File:** `src/routes/drills/+page.svelte:153-170`

**Issue:** `toggleSongFilter()` unconditionally replaces the current question with a fresh pool draw whenever `!answered`, regardless of the current question's `questionSource`:

```js
function toggleSongFilter() {
	songFilterOn = !songFilterOn;
	try {
		localStorage.setItem('music-learn:drills-song-filter', String(songFilterOn));
	} catch {
		// Swallow quota/disabled-storage errors (matches songs.ts pattern).
	}
	if (!answered) {
		question = freshPoolQuestion();
		selected = new Set();
		feedback = null;
		playedLetters = [];
		givenSymbol = undefined;
		tappedLetter = null;
		drillInspect = null;
	}
}
```

Compare this to the pre-existing, structurally identical `setMode()` (same file, lines 319-332), which this handler should mirror:

```js
function setMode(next: DrillMode) {
	if (next === mode) return;
	mode = next;
	if (answered || questionSource !== 'pool') return;
	hintTaken = false;
	questionShownAt = Date.now();
	question = freshPoolQuestion();
	...
```

`toggleSongFilter` is missing both things `setMode` does correctly:

1. **No `questionSource !== 'pool'` guard.** If the currently-displayed unanswered question came from the session's warmup/seed/retry queue (very plausible — a fresh Drills load with recent misses starts with 1-5 `warmup`-sourced questions, and `consumeDrillSeeds()`/redrill flows produce `seeded` questions), that queued item was already popped out of `session.warmupQueue`/`retryQueue`/`seedQueue` by the earlier `drawNextQuestion()` call. Calling `freshPoolQuestion()` here silently discards it and replaces it with an unrelated pool draw, but the `question` state is swapped without ever touching `session`, so `session.asked`, `retryQueue`, etc. are left as if that item is still "in flight" for a slot that will never resolve. The visible `SOURCE_TAGS[questionSource]` badge (e.g. "BACK FOR ANOTHER GO") also goes stale, now describing content that isn't actually shown.

2. **No `hintTaken = false` / `questionShownAt = Date.now()` reset.** If the previous (now-discarded) question had `hintTaken === true` (user tapped "Show formula" on a `scaffoldStage === 'hinted'` chord) and the freshly-drawn replacement symbol also resolves to `scaffoldStage === 'hinted'`, the template's `{#if hintTaken}` branch (lines 874-889) immediately reveals the formula for the *new* chord without the user tapping anything for it. Because `recordGrade()` computes `assisted = question.kind === 'chord' && (scaffoldStage === 'formula-first' || hintTaken)`, this incorrectly marks the answer "assisted" — which R3 explicitly documents as **excluded from tier-unlock accuracy** (`scaffold.ts` header comment: "Assisted answers are marked by the session and excluded from unlock stats in levelState"). `questionShownAt` staying stale also corrupts the `duration_ms` telemetry sent via `recordPracticeAnswer`.

Neither `drillsSongFilter.test.ts` nor any other test exercises toggling the filter while a non-pool-sourced (`warmup`/`retry`/`seeded`) question is unanswered, so this regression has no test coverage.

**Fix:** Mirror `setMode`'s guard and resets exactly:

```js
function toggleSongFilter() {
	songFilterOn = !songFilterOn;
	try {
		localStorage.setItem('music-learn:drills-song-filter', String(songFilterOn));
	} catch {
		// Swallow quota/disabled-storage errors (matches songs.ts pattern).
	}
	if (answered || questionSource !== 'pool') return;
	hintTaken = false;
	questionShownAt = Date.now();
	question = freshPoolQuestion();
	selected = new Set();
	feedback = null;
	playedLetters = [];
	givenSymbol = undefined;
	tappedLetter = null;
	drillInspect = null;
}
```

## Medium

### MD-01: Restricted draw bypasses the scaffolding "max 2 unfamiliar qualities in flight" pacing gate — RESOLVED

**Resolved:** extracted the pacing gate into a shared `limitScaffoldingQualities()` export from `pool.ts`, used by both `songCandidates()` and the Drills page's restricted "From my songs" draw (applied to `drillableSongSymbols()` before `drawFromSymbols`). Test cases added to `src/lib/practice/pool.test.ts`. Commit `827ef0d`.

**File:** `src/lib/practice/pool.ts:186-198`, `313-326`; consumed at `src/routes/drills/+page.svelte:212-220`

**Issue:** `pool.ts`'s own module doc states the R3 design invariant: "Above-tier song chords bypass the tier gate through the scaffolding ladder (scaffold.ts), with at most 2 unfamiliar qualities in scaffolding at once." That gate is implemented in `songCandidates()`:

```js
function songCandidates(ctx: PoolContext, config: PoolConfig): string[] {
	...
	return ctx.songSymbols.filter((symbol) => {
		if (scaffoldStageForSymbol(ctx, symbol) === null) return true; // normal item
		const quality = splitSymbol(symbol)?.quality;
		if (quality === undefined) return true;
		if (unlockedQualities.has(quality)) return true;
		if (inFlight.includes(quality)) return true; // already one of the in-flight qualities
		return inFlight.length < config.maxScaffoldingQualities; // <-- the 2-quality cap
	});
}
```

`drawFromSymbols` (the SONG-02 restricted-draw primitive) does not run its candidates through this filter at all — it takes the caller's raw `symbols` array directly:

```js
export function drawFromSymbols(symbols, ctx, config = DEFAULT_POOL_CONFIG, rng = Math.random) {
	if (symbols.length === 0) return null;
	const qualityOf = (symbol) => splitSymbol(symbol)?.quality ?? null;
	const needs = symbols.map((candidate) => needFor(candidate, ctx.stats));
	const shares = cappedShares(needs, config.maxItemShare);
	const filtered = applyInterleaving(symbols, shares, qualityOf, ctx, config);
	return weightedDraw(filtered.candidates, filtered.weights, rng);
}
```

And the Drills page feeds it `drillableSongSymbols()` — *every* recognized active-song symbol, unfiltered by in-flight scaffolding count:

```js
const restricted = songFilterOn ? drillableSongSymbols() : null;
...
symbol = drawFromSymbols(restricted, poolContext()) ?? drawFromPool(poolContext()).symbol;
```

So with "From my songs" ON, a user whose song list contains several never-seen chord qualities can be drawn into formula-first worked examples for more than 2 unfamiliar qualities simultaneously — the exact pacing safeguard `maxScaffoldingQualities: 2` exists to prevent. This is a behavioral regression introduced specifically by the filter-ON path (the filter-OFF path is unaffected, since it still goes through `drawFromPool` → `songCandidates()`).

**Fix:** Either have the Drills page pre-filter `drillableSongSymbols()` through the same in-flight-quality gate before calling `drawFromSymbols` (reusing `activeScaffoldQualities`/`scaffoldStageForSymbol` the way `songCandidates` does), or export a small shared helper from `pool.ts` (e.g. `limitScaffoldingQualities(symbols, ctx, config)`) that both `songCandidates` and the Drills page's restricted-draw call site can apply before drawing.

### MD-02: "Nothing due today" is misleading when the song filter hides due cards — RESOLVED

**Resolved:** `load()` now checks the raw (pre-filter) `getDueCards()` length before falling back to the generic empty states; when the filter hid a non-empty raw result, a new `empty-filtered-none-due` page state renders a distinct message naming the hidden count and pointing at the filter. Regression tests added to `src/lib/components/recallSession.test.ts`. Commit `e803a21`.

**File:** `src/lib/components/RecallSession.svelte:185-206`

**Issue:** `load()` filters `getDueCards()` through `applySongFilter()` before the empty-state check:

```js
const due = applySongFilter(await getDueCards());
if (due.length === 0) {
	const all = await getAllCards();
	pageState = all.length === 0 ? 'empty-no-deck' : 'empty-none-due';
	return;
}
```

When "From my songs" is ON, the user has active songs with derivable chords (so `applySongFilter` does filter rather than pass through), but none of *today's* due cards happen to be song chords, `due.length` becomes `0` even though `getDueCards()` originally returned non-empty. The page then renders the generic `empty-none-due` copy: *"Nothing due today... Come back tomorrow, or warm up with free practice."* This is factually wrong in this state — there genuinely are cards due today, they're just hidden by the filter — and nothing in that screen hints that the filter is the reason, or that switching it off would reveal due work. Because the toggle's persisted state carries across visits (`music-learn:recall-song-filter`), a user who doesn't think to check `/recall` with the filter off could let real due cards go stale indefinitely, undermining the FSRS scheduling this feature sits on top of.

Note: this exact fold-together-with-none-due behavior is spelled out in `18-03-PLAN.md` ("A genuinely empty filtered set... flows into the existing empty-none-due path unchanged"), so it was a deliberate implementation shortcut, not an oversight in this code specifically. It's flagged here because the resulting user-facing message is incorrect in this state regardless of intent, and there is no test asserting this scenario's copy is acceptable (only the "filter ON + empty provenance index leaves it unfiltered" fallback case is tested, at `recallSession.test.ts:1070-1091`).

**Fix:** Distinguish "filter hid everything" from "truly nothing due": e.g. compute `getDueCards()` once, check its raw length for `empty-none-due`/`empty-no-deck`, and — only if the *filtered* result is additionally empty while the raw result wasn't — surface a distinct message such as "No song chords due today. N other cards are waiting — turn the filter off to see them." (periods/colons only, per the project's no-em-dash rule).

## Low

### LO-01: `normalizeSymbolForMatch` would key on `"undefined:<quality>"` for a recognized chord with no resolvable root — RESOLVED

**Resolved:** guarded with `Number.isNaN(rootChroma)` (not `=== undefined` as originally suggested - verified during the fix that `Note.get('').chroma` actually returns `NaN`, and that this is a genuinely reachable case: a rootless quality-only symbol like `"m7"` alone resolves via tonal's `Chord.get` to `recognized: true, root: ''`). Degrades to raw-input self-identity, matching the unrecognized branch. Regression test added to `src/lib/practice/songProvenance.test.ts` proving the real reachable case (not just a hypothetical). Commit `c7e0fd9`.

**File:** `src/lib/practice/songProvenance.ts:28-35`

**Issue:**

```js
export function normalizeSymbolForMatch(symbol: string): string {
	const spelled = spellChord(symbol);
	if (!spelled.recognized) return symbol;

	const asciiRoot = spelled.root.replace(/♯/g, '#').replace(/♭/g, 'b');
	const rootChroma = Note.get(asciiRoot).chroma;
	return `${rootChroma}:${spelled.quality}`;
}
```

If `spellChord` ever returns `recognized: true` with an empty/unparseable `root` (in `chord.ts`, `root: toAccidentalGlyphs(chord.tonic ?? '')` — the `?? ''` fallback implies this is considered at least type-theoretically possible), `Note.get('').chroma` is `undefined`, and the key silently becomes the string `"undefined:<quality>"`. Every such chord (if any ever occurs) would collide into one bucket rather than failing loudly or falling back to raw-string identity like the "unrecognized" branch does. This is a defensive-programming gap rather than a demonstrated live bug (no `tonal` input that reaches this state was found), so it's filed as informational/low.

**Fix:** Guard the case explicitly, e.g. `if (rootChroma === undefined) return symbol;` before building the key, so a hypothetical no-root recognized chord degrades the same way an unrecognized one does (matches self-identity, never collides with unrelated chords).

---

## Fix Summary

All 4 findings fixed and committed atomically. `npm test` (1039 tests, 75 files) and `npm run check` (svelte-check, 1296 files, 0 errors/0 warnings) both pass after all fixes.

| Finding | Status | Commit |
|---|---|---|
| HI-01 | fixed | `a59efbb` |
| MD-01 | fixed | `827ef0d` |
| MD-02 | fixed | `e803a21` |
| LO-01 | fixed | `c7e0fd9` |

---

_Reviewed: 2026-07-18T12:41:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Fixed: 2026-07-18T14:52:00Z_
_Fixer: Claude (gsd-code-fixer)_
