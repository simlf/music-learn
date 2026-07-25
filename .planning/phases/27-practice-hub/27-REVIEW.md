---
phase: 27-practice-hub
reviewed: 2026-07-25T01:04:06Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/practice/practiceQueue.ts
  - src/routes/practice/+page.svelte
  - src/lib/components/PracticeChordDrill.svelte
  - src/lib/components/PracticeIntervalDrill.svelte
  - src/lib/components/ShellVoicingDrill.svelte
  - src/lib/components/ProgressionDrill.svelte
findings:
  critical: 2
  warning: 2
  info: 1
  total: 5
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-07-25T01:04:06Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The HYBRID queue composer itself (`practiceQueue.ts`) is solid: the greedy
no-3-in-a-row weave, the single-type-due gate, the song-filter helpers, and
the carded/synthetic discriminated union are all correct and well covered by
`practiceQueue.test.ts`. The `ShellVoicingDrill`/`ProgressionDrill` embed
seams (REG-01) are verified byte-identical-when-unembedded by diffing against
`885361e` — both additions are strictly additive (new optional props, one new
early-return branch each), so pre-existing standalone behavior is untouched.
Chroma grading (`matchChord`/`Note.chroma`) is used correctly in both
synthetic drills; no letter-string chord grading, no em dashes in copy, and
no ad-hoc hex colors were found.

However, the thin `/practice` host (`+page.svelte`) has two related,
high-severity defects in its carded grade-commit path (`completeCarded`):
it discards the `CardRecord` returned by `recordGrade` and re-enqueues the
*original, pre-grade* card snapshot on an Again retry, and it has no
in-flight guard against a double-tap re-invoking the same async handler —
both of which corrupt the persisted FSRS state for a retried item. This is
exactly the defect class RecallSession.svelte was previously patched for
(see its own `grading` flag, commented "adversarial-review fix", and its
`cardsByKey` refresh-after-grade pattern), but the Practice Hub reimplements
the flow without either safeguard.

## Critical Issues

### CR-01: Stale `CardRecord` snapshot corrupts FSRS state on Again-then-retry

**File:** `src/routes/practice/+page.svelte:280-300`
**Issue:**

```ts
async function completeCarded(correct: boolean): Promise<void> {
	const item = currentItem;
	if (item === undefined || item.family === 'voicing' || item.family === 'progression') {
		return;
	}
	const rating = correct ? Rating.Good : Rating.Again;
	const durationMs = Date.now() - questionShownAt;
	await recordGrade(item.card, rating);           // <-- return value discarded
	...
	queue = advanceHybridQueue(queue, rating);       // <-- re-enqueues the SAME `item` (same stale `.card`)
	...
}
```

`recordGrade` (`src/lib/srs/deck.ts:330-347`) computes the next FSRS state
purely from the `card` object it is passed — it does not re-fetch the
current row from Dexie. `CardedQueueItem.card` (`practiceQueue.ts:56`) is set
once in `cardsToQueueItems` at session load and is never refreshed.

When a name-it/interval item is graded `Again`, `advanceHybridQueue` re-enqueues
the *exact same* `CardedQueueItem` object to the back of the queue
(`practiceQueue.ts:306-313`). When that item resurfaces and is graded again
(e.g. `Good`), `completeCarded` calls `recordGrade(item.card, rating)` with
the **original pre-first-grade** `CardRecord` — not the record `recordGrade`
returned after the first (`Again`) call. The second `recordGrade` therefore
computes the FSRS transition from the wrong starting point and its
`cards.put(updated)` **overwrites** the DB row, silently discarding the
`Again` grade's persisted effect (lapses/difficulty/due-date update) as if
it never happened.

This is proven, not speculative: `tests/practice-hub.e2e.test.ts:227-257`
exercises exactly this Again-then-Good sequence and asserts, at line 252:

```ts
expect(recordGradeMock).toHaveBeenNthCalledWith(2, card, Rating.Good);
```

`card` here is the single object created once at the top of the test — the
test locks in that the *same* pre-grade object is passed to `recordGrade` on
both calls, which is the bug.

Contrast with the established, working pattern this phase was supposed to
mirror: `RecallSession.svelte` explicitly re-stores the record returned by
`recordGrade` into its `cardsByKey` map after every grade
(`RecallSession.svelte:482,614,777`: `cardsByKey = new Map(cardsByKey).set(key, updated);`)
so a re-enqueued same-key item always grades from the latest state.
`BuildSession.svelte` avoids the problem a different way — it calls
`getCard(factId, mode)` fresh from Dexie immediately before grading
(`BuildSession.svelte:465`), so build-it items are NOT affected. Only the
host's own `completeCarded` path (name-it/interval) has this gap.

**Fix:** capture the updated record and update the item before re-enqueuing, e.g.:

```ts
async function completeCarded(correct: boolean): Promise<void> {
	const item = currentItem;
	if (item === undefined || item.family === 'voicing' || item.family === 'progression') {
		return;
	}
	const rating = correct ? Rating.Good : Rating.Again;
	const durationMs = Date.now() - questionShownAt;
	const updatedCard = await recordGrade(item.card, rating);
	recordPracticeAnswer({ ... });
	finishItem(item, correct);
	const updatedItem = { ...item, card: updatedCard };
	queue = advanceHybridQueue([updatedItem, ...queue.slice(1)], rating);
	...
}
```

---

### CR-02: No in-flight guard on `completeCarded` — double-tap double-commits the FSRS grade

**File:** `src/routes/practice/+page.svelte:281-300`, `src/lib/components/PracticeChordDrill.svelte:100-104`, `src/lib/components/PracticeIntervalDrill.svelte:160-164`
**Issue:** `completeCarded` is `async` and awaits `recordGrade` before doing
anything else. The "Next" button in both `PracticeChordDrill` and
`PracticeIntervalDrill` that triggers it (via `onComplete`) is never
disabled while that await is pending:

```svelte
<!-- PracticeChordDrill.svelte -->
<Button type="button" variant="primary" onclick={handleNext}>
	{t('drills.button.next')}
</Button>
```

A second click before the first `recordGrade` promise resolves re-invokes
`completeCarded` for the *same* `currentItem` (nothing has changed yet), so:
- `recordGrade(item.card, rating)` is called twice for one review (compounding
  CR-01: both calls race on the same stale snapshot, and whichever `put()`
  lands last wins, silently dropping the other).
- `finishItem` runs twice, double-incrementing `asked`/`score`/`missed`.
- `advanceHybridQueue` runs twice, corrupting the queue (e.g., double
  re-enqueuing an Again item, or advancing past two items instead of one).

This is the exact defect class `RecallSession.svelte` was already patched
for — its `grading` flag (`RecallSession.svelte:184-191`) is explicitly
commented `/** In-flight guard for handleGrade (adversarial-review fix) */`
and is checked/set/cleared around its own `recordGrade` call for precisely
this double-tap scenario. The Practice Hub host reimplements the same
grade-commit flow without carrying that guard forward.

**Fix:** add a host-level in-flight flag, mirroring RecallSession's pattern:

```ts
let grading = $state(false);

async function completeCarded(correct: boolean): Promise<void> {
	if (grading) return;
	grading = true;
	try {
		const item = currentItem;
		if (item === undefined || item.family === 'voicing' || item.family === 'progression') {
			return;
		}
		// ... existing body ...
	} finally {
		grading = false;
	}
}
```

(The same guard should be considered for `completeBuild`/`completeSynthetic`
for defense in depth, though those handlers are synchronous today and so are
far less exposed to this race.)

## Warnings

### WR-01: `completeCarded`'s family guard is a denylist, not an allowlist

**File:** `src/routes/practice/+page.svelte:283`
**Issue:**

```ts
if (item === undefined || item.family === 'voicing' || item.family === 'progression') {
	return;
}
```

`item.family` is typed `CardedFamily | 'voicing' | 'progression'`, and
`CardedFamily` includes `'build-it'`. This guard only excludes the two
synthetic families — it does **not** exclude `'build-it'`, so if the
template's routing were ever changed (or a future refactor accidentally
wired `build-it` to `completeCarded`), this function would call
`recordGrade(item.card, rating)` a **second** time for a card BuildSession
already committed internally via its own `getCard`/`recordGrade` call — a
double FSRS commit for one review (the exact "Rule 1 bug" the file's own
comment at line 310 warns against). `completeBuild` and `completeSynthetic`
both correctly use allowlists (`item.family !== 'build-it'` /
`item.family !== 'voicing' && item.family !== 'progression'`); only
`completeCarded` uses the weaker denylist form. Currently unreachable given
the template's routing, but it removes the type system's ability to catch a
future misrouting mistake in the one place a mistake would silently corrupt
FSRS data.

**Fix:**

```ts
if (item === undefined || (item.family !== 'name-it' && item.family !== 'interval')) {
	return;
}
```

### WR-02: `filterCardedBySong` is dead code; the module's header doc-comment describes a pipeline that isn't actually used

**File:** `src/lib/practice/practiceQueue.ts:33-36,322-332`
**Issue:** The module header states:

> "Song filter (PRAC-04) restricts BOTH halves via `filterCardedBySong` /
> `filterVoicingsBySong` before `composePracticeQueue` is called."

But `src/routes/practice/+page.svelte` never imports or calls
`filterCardedBySong` — it filters the *raw* `CardRecord[]` due-set directly
via its own local `applySongFilter` (byte-faithful copy of
`RecallSession.svelte`'s own filter) before `selectReviewCards`/
`cardsToQueueItems` even run. Only `filterVoicingsBySong` is actually used
by the host (`+page.svelte:186-189`). `filterCardedBySong` is exported,
unit-tested (`practiceQueue.test.ts:327-338`), but has zero production
callers — confirmed via `grep -rn "filterCardedBySong" src/ tests/`, which
only finds the definition and its own test. This is both dead exported code
and a doc/implementation mismatch that will mislead future maintainers about
how the actual song-filter pipeline works.

**Fix:** either wire the host to genuinely use `filterCardedBySong` on the
mapped `CardedQueueItem[]` (matching the doc-comment's stated pipeline), or
remove the unused export and correct the header comment to describe the
`applySongFilter`-on-raw-`CardRecord[]` approach that is actually in use.

## Info

### IN-01: Missed-item chip for a progression shows the raw internal template id, not a friendly label

**File:** `src/routes/practice/+page.svelte:265`
**Issue:**

```ts
function missedLabelFor(item: HybridQueueItem): string {
	if (item.family === 'interval') return item.short ?? '';
	if (item.family === 'progression') return `${item.templateId} ${item.key}`;
	return item.symbol ?? '';
}
```

For a missed progression item this renders something like
`major-turnaround-I-vi-ii-V C` in the end-card's "worth another look" chip
row — an internal kebab-case id concatenated with the key, rather than a
human-readable label (there is no display-name field on
`ProgressionTemplate` in `progressions.ts` to draw from). Every other
family's missed-chip is a clean chord/interval symbol; this one is visibly
different in register and leaks an implementation identifier to the UI.

**Fix:** add a short display label to `ProgressionTemplate` (e.g. `"ii-V-I"`)
and use `${label} in ${key}` (or similar), rather than the raw `templateId`.

---

_Reviewed: 2026-07-25T01:04:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
