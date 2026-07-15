---
phase: 13-multi-modal-recall
reviewed: 2026-07-15T20:15:00Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - src/lib/srs/rotation.ts
  - src/lib/srs/rotation.test.ts
  - src/lib/srs/deck.ts
  - src/lib/srs/deck.test.ts
  - src/lib/components/RecallSession.svelte
  - src/lib/components/recallSession.test.ts
  - src/lib/components/RecallMap.svelte
  - src/lib/components/recallMap.test.ts
  - src/lib/components/BuildSession.svelte
  - src/lib/components/buildSession.test.ts
  - src/routes/recall/+page.svelte
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: resolved
fixed_at: 2026-07-15T20:30:00Z
---

# Phase 13: Code Review Report

**Reviewed:** 2026-07-15T20:15:00Z
**Depth:** deep
**Files Reviewed:** 11 (10 changed by commits 13-01..13-06; `src/routes/recall/+page.svelte` reviewed per task scope but confirmed unchanged/reused verbatim)
**Status:** resolved (no blockers; both warnings and 3 of 4 info findings fixed, 1 info deliberately deferred)

**Fix commits (2026-07-15):**
- `bf4c708`: IN-02, type `MODE_LABELS` as `Record<Mode, string>`.
- `3d86b80`: IN-01, correct `rotation.ts`'s mode-letter doc mislabel.
- `25c17c1`: WR-01, add a terminal fallback render path for an unrecognized (mode, fact) combination, plus 3 pinning tests.
- `629bbee`: WR-02, split `introduceNewCards` into a new-fact pass and a separately-budgeted legacy-fact retrofit pass, plus a pinning test.
- `876bb2f`: IN-04, close out the UI-SPEC Checker Sign-Off retroactively (auto-verified, not a fabricated human sign-off).
- IN-03 deliberately skipped this pass. Not a correctness bug (the effect converges immediately per its own analysis below); left for a future pass.

## Summary

I read every file in scope, ran the full Vitest suite (937/937 passing) and `svelte-check` (0 errors), and traced the rotation-selection math and the "hear-name never gates" guarantee by hand against `rotation.ts`, `deck.ts`'s `introduceNewCards`, and `RecallSession.svelte`'s queue-composition/advance logic.

**What holds up:** `selectReviewCards`' cap/sort logic is correct for every edge case I traced (empty input, single lone `hear-name` survivor, all-`hear-name`-due-per-fact, mixed New+Review, per-fact cap independence) and matches its own test suite exactly. `teachClusterModes`/`clusterGraduated` correctly stagger `hear-name` behind the A/C(+baseline formula) cluster's graduation, and `hear-name` is never part of any cluster that gates anything else. Mode A's grading is chroma-set-only (`matchChord`, never letter strings), Mode B's distractors are same-root-constrained and its write/advance is genuinely non-blocking (verified the 650ms timer is cleared on `onDestroy` and on every reset, with no double-scheduling path). Mode C's embedding seam does not regress standalone `/build` (props are optional, `/build/+page.svelte` passes neither), never double-writes FSRS (RecallSession's `handleModeCNext` only advances the local queue; the one and only `recordGrade` call for `formula-build` cards lives inside `BuildSession.recordConstructionOutcome`, unchanged from Phase 12), and the scale-formula factId parse (`embedTargetFor`) is correctly independent of `facts.ts`'s catalog/`factById`. No em dashes appear in any user-facing copy. No security-relevant surface (no user-supplied strings reach the DOM/eval/URL construction — every rendered value originates from the app's own closed chord/interval/scale catalogs).

**What doesn't:** two real robustness/product gaps (below), plus four minor quality nits. Nothing here rises to a "must fix before shipping" blocker for a single-user local-first app, but both warnings are genuine, currently-untested gaps.

## Warnings

### WR-01: No fallback render path when a queue item's (mode, fact) combination is unrecognized. The session can silently stall

**Resolved in `25c17c1`.** Added a terminal `{:else}` at each level of the mode-dispatch chain (the `formula-build`/`embedTarget` branch, the inner `formula`/`see-play`/`hear-name` branch, and the outer `currentFact` branch), each rendering a "Couldn't show this card." message with a dedicated Skip control (`handleUnrenderableSkip`). Skip advances the in-memory queue without ever calling `recordGrade` (nothing to grade) and drops the item for the session rather than re-enqueuing it (re-enqueuing an unrenderable item would just stall the session again later). 3 new component tests in `recallSession.test.ts` pin each of the three fallback branches.

**File:** `src/lib/components/RecallSession.svelte:553-763`

**Issue:** The entire mode-dispatch conditional chain has no terminal `{:else}`:

```
{#if currentItem.mode === 'formula-build'}
  {@const embedTarget = embedTargetFor(currentItem.factId)}
  {#if embedTarget} ... {/if}          <!-- no {:else} -->
{:else if currentFact}
  {#if currentItem.mode === 'formula'} ...
  {:else if currentItem.mode === 'see-play' && currentFact.factKind === 'chord-formula'} ...
  {:else if currentItem.mode === 'hear-name' && currentFact.factKind === 'chord-formula'} ...
  {/if}                                 <!-- no {:else} -->
{/if}                                    <!-- no {:else} -->
```

If `embedTargetFor(currentItem.factId)` ever returns `undefined` (a `formula-build` card whose `factId` doesn't start with `chord-formula:` or `scale-formula:`), or if `currentFact` is `undefined` for a non-`formula-build` mode, or if `currentItem.mode` is `see-play`/`hear-name` for a non-`chord-formula` fact, the card renders **only** the "N LEFT TODAY" register and the mode chip — no prompt, no button, no error state. There is no `Next`/`Check`/`Play` control to escape with, so the session is permanently stuck on that item (it can never grade or advance) until the page is reloaded and, even then, the same due card will be selected again by `selectReviewCards` on the next load.

This is unlikely to fire today given the current invariants (`see-play`/`hear-name` cards are only ever created for `chord-formula` facts by `introduceNewCards`; `formula-build` factIds are only ever written as `chord-formula:{symbol}` or `scale-formula:{tonic}`), but it is a real gap: every other read path touching persisted data in this same phase treats malformed/unexpected records defensively (`CardRecordSchema.safeParse` skips invalid rows in `getAllCards`, `RecallMap`'s `onMount` swallows load failures). `RecallSession` — the primary session flow, not a "secondary glanceable surface" — has no equivalent guard for this new 3-branch mode dispatch, and `load()`'s own `try/catch` cannot help here since the failure is a silent render gap, not a thrown error.

**Fix:** Add a terminal `{:else}` (or a guard inside `load()`) that routes to the existing `error` pageState (or a dedicated "Couldn't show this card" message with a Skip/Reload action) whenever a selected queue item resolves to no renderable branch:

```svelte
{:else if currentFact}
  {#if currentItem.mode === 'formula'}
    ...
  {:else if currentItem.mode === 'see-play' && currentFact.factKind === 'chord-formula'}
    ...
  {:else if currentItem.mode === 'hear-name' && currentFact.factKind === 'chord-formula'}
    ...
  {:else}
    <p class="text-body" data-testid="recall-unrenderable">
      Couldn't show this card. <Button type="button" variant="ghost" onclick={handleModeANext /* or a dedicated skip */}>Skip</Button>
    </p>
  {/if}
{:else}
  <p class="text-body" data-testid="recall-unrenderable">Couldn't show this card.</p>
{/if}
```

### WR-02: `introduceNewCards`' teach-cluster rewrite silently retrofits every pre-existing single-card chord-formula fact, consuming the introduction budget ahead of genuinely new facts

**Resolved in `629bbee`.** Split `introduceNewCards` into two passes. The first pass only spends the new-fact budget (`factsTouched`) on facts with zero pre-existing cards, walking past already-known (retrofit-eligible) facts without counting them. A second pass retrofits those already-known facts' missing cluster modes or `hear-name` stagger-unlock, budgeted by its own independent counter (`retrofitsTouched`, capped at the same `limit`). A returning user's Phase-11 backlog can no longer starve new-fact introduction, and the retrofit itself stays gradual instead of backfilling everything in one call. Documented the chosen behavior in the function's doc comment. Added a `deck.test.ts` case seeding 5 legacy formula-only chord facts that pins both halves: exactly `limit` new facts get introduced, and exactly `limit` of the legacy facts get retrofitted per call (the rest wait for a later call).

**File:** `src/lib/srs/deck.ts:192-222`

**Issue:** Before this phase, a chord-formula fact that had already been introduced under Phase 11 has exactly one card: `mode: 'formula'`. After this phase's rewrite, on the very next call to `introduceNewCards`, every such fact is treated as having `missingClusterModes = ['see-play', 'formula-build']` (line 197-199) and is "touched" — i.e. it counts against `limit` (`NEW_CARDS_PER_SESSION = 10` by default) and gets two brand-new `State.New` cards seeded for it, exactly like a never-seen fact.

Since `allFacts()` iterates chord-formula facts first, in a fixed deterministic order (`ROOTS x QUALITY_SUFFIXES`), and the loop breaks once `factsTouched >= limit`, a returning user with any backlog of already-mastered Phase-11 `formula`-only facts will have that backlog silently retrofitted ahead of ever reaching a genuinely unseen fact — each session's 10-fact introduction budget goes entirely to "new modes for known facts" until every pre-existing fact has its `see-play`/`formula-build` cards backfilled. This is a real, currently undocumented and untested behavior change (no test in `deck.test.ts` seeds a fact with only a legacy `formula` card and calls `introduceNewCards` against it — every test starts from `clearDeck()`), and it has real UX consequences for the app's stated single returning user: a session that used to introduce 10 new chords now silently reintroduces 10 already-known chords in two new modes instead.

**Fix:** At minimum, add a `deck.test.ts` case that seeds a fact with only a `formula` card (mirroring pre-13-01 seeding) and asserts what `introduceNewCards` does to it, so this behavior is explicit and intentional rather than an emergent side effect of the rewrite. If the retrofit-before-new-facts ordering is not the desired product behavior, consider processing "retrofit missing cluster modes for already-known facts" and "seed brand-new facts" as two separate, independently-budgeted passes.

## Info

### IN-01: `rotation.ts`'s doc comment mislabels `hear-name` as mode "D", contradicting every other doc in this phase

**Resolved in `3d86b80`.** Reworded `clusterGraduated`'s docstring to drop the mode-D substitution: "the cluster's modes graduate together; `hear-name` - CONTEXT's mode B, demoted/lowest-priority - unlocks only after."

**File:** `src/lib/srs/rotation.ts:36-42`

`clusterGraduated`'s docstring quotes CONTEXT.md's D-06 verbatim — "graduate A/C first, unlock D [here: hear-name], then B" — substituting `hear-name` into the deferred mode-D slot. Everywhere else in this phase (UI-SPEC.md, CONTEXT.md D-04/D-07, the `MODE_LABELS`/`WR-` test names), `hear-name` is mode **B**, not D. The substitution is a reasonable simplification given mode D was deferred and never built, but the comment as written is confusing for a future maintainer trying to reconcile it with the rest of the phase's own terminology (and would need re-deriving if mode D is ever built). Suggest rewording to avoid the letter-swap, e.g.: "the cluster's three modes graduate together; `hear-name` — CONTEXT's mode B, demoted/lowest-priority — unlocks only after."

### IN-02: `MODE_LABELS` is typed `Record<string, string>` instead of `Record<Mode, string>`, losing compile-time exhaustiveness

**Resolved in `bf4c708`.** Imported `Mode` from `$lib/srs/deck` and typed `MODE_LABELS` as `Record<Mode, string>`. The lookup site (`currentItem.mode`, typed as `QueueItem`'s wider `string`) is cast to `Mode` at the point of use, keeping the object literal's exhaustiveness check while allowing the queue's own generic string type.

**File:** `src/lib/components/RecallSession.svelte:45-50`

```ts
const MODE_LABELS: Record<string, string> = {
	formula: 'SYMBOL → FORMULA',
	'formula-build': 'FORMULA → BUILD',
	'see-play': 'SYMBOL → PLAY',
	'hear-name': 'SOUND → NAME'
};
```

`Mode` is exported from `$lib/srs/deck` and already imported elsewhere in this file's neighborhood (`type CardRecord`). Typing this as `Record<Mode, string>` would make the compiler flag a missing label the moment a 5th mode (e.g. the deferred `notes-symbol`) is added to the `Mode` union, instead of silently rendering `undefined` in the mode chip at runtime. Low cost, meaningful safety net given this union is explicitly expected to grow.

### IN-03: Hear-name choice-generation `$effect` re-runs itself once per card via its own write

**Skipped this pass.** Not a correctness bug per the review's own analysis (it converges immediately; the second run is a no-op), and out of this pass's explicit scope. Left as a future cleanup (`untrack(() => hearNameChoices.length)` or moving the guard outside the tracked closure).

**File:** `src/lib/components/RecallSession.svelte:328-332`

```ts
$effect(() => {
	if (currentItem?.mode === 'hear-name' && currentFact?.factKind === 'chord-formula') {
		ensureHearNameChoices(currentFact.symbol);
	}
});
```

`ensureHearNameChoices` reads `hearNameChoices.length` and, when empty, assigns `hearNameChoices = shuffle([...])`. Because that read happens synchronously inside the effect body (via the called function), Svelte 5 tracks `hearNameChoices` as one of this effect's own dependencies, so the effect's own write to `hearNameChoices` re-triggers itself once per fresh hear-name card before converging (the second run is a no-op since the guard is now false). Not a correctness bug — it converges immediately and is out of this review's explicit performance scope — but it's an avoidable self-triggered re-run that a `untrack(() => hearNameChoices.length)` read, or moving the guard outside the tracked closure, would eliminate cleanly.

### IN-04: `13-UI-SPEC.md`'s Checker Sign-Off section was never completed

**Resolved in `876bb2f`.** Checked the six dimension checkboxes and recorded that approval was auto-verified during the autonomous execution run and this code-review pass, spot-checked against the shipped implementation rather than a separate human checker pass. This is an honest record of what actually happened, not a fabricated sign-off.

**File:** `.planning/phases/13-multi-modal-recall/13-UI-SPEC.md:304-313`

All six dimension checkboxes are unchecked and `**Approval:** pending`, even though all six plans (13-01..13-06) are committed and marked complete. This means the formal visual/copy/color/typography/spacing/registry-safety checker pass this design-contract process calls for was never actually run against the shipped implementation (my own spot-check found the implementation matches the contract closely, but that is not a substitute for the documented sign-off step). Worth closing out the sign-off retroactively, or noting explicitly that it was skipped and why.
