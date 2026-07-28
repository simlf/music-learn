---
phase: 36-cold-session-queue-ordering
reviewed: 2026-07-27T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/lib/practice/practiceQueue.ts
  - src/routes/practice/+page.svelte
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-07-27
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found (INFO only — no blockers, no warnings)

## Summary

Phase 36 (QUEUE-01) adds a `lowMastery` first-pick guard to `composePracticeQueue`, a pure `isLowMasterySession` helper, and the host wiring that computes and passes the signal. I reviewed the current source of both files, the isolated Phase 36 diffs (`2686b89`, `2c072fa`, `bf6595c`), every caller (`git grep` confirms only `+page.svelte` and the test suite call the new API), and cross-referenced the maturity notion against `shellVoicing.ts`.

The implementation is correct and the five focus areas all hold up under adversarial tracing:

1. **Purity** — `composePracticeQueue` and `isLowMasterySession` never touch Dexie or the FSRS engine. `State` is imported as an enum value only (used for the `card.state === State.Review` comparison), the signal is injected via the 4th `ComposeOptions` argument, and the Dexie read stays entirely in the host's `load()`. Confirmed.
2. **REG-01 (warm/default byte-identical)** — The only change inside the weave loop is the `pickFrom` guard block, gated on `options.lowMastery === true && output.length === 0`. In the warm/default path `pickFrom` is the same reference as `candidateFamilies` and the scoring loop is unchanged. Critically, the guard performs **no `rng()` calls**, so the RNG consumption sequence is identical between warm and cold paths — output stays deterministic and byte-identical to the pre-phase behavior. The `byFamily.size <= 1` single-type-due short-circuit (line 348) still runs *before* the weave, so a scaffold-heavy-only session still leads with that family. Anti-adjacency (G2), no-3-in-a-row, scarcest-last scoring, and song-filter logic are untouched. Tests `practiceQueue.test.ts:531-532` (3-arg === explicit-warm) and the frozen baseline at `:461-463` lock this in.
3. **First-pick guard scoping** — Correctly scoped to `output.length === 0`. Since every loop iteration pushes exactly one item, `output.length === 0` is true only on the first iteration, so the guard fires once. It sets `pickFrom = simpler` **only when `simpler.length > 0`**, so the candidate set is never emptied — no dead-end, no throw. When every candidate is scaffold-heavy it falls through to the full `candidateFamilies`. I traced the pathological `{progression:5, name-it:1}` cold case: the scarce simpler item leads, later progressions cluster, and the existing relax branch (lines 407-422) safely terminates with all items emitted.
4. **`isLowMasterySession` edge cases** — Empty array → `false` (warm default); all-New → `matureCount=0`, `0 < length` → `true` (cold); boundary `matureCount * 2 < cards.length` is exact integer math: 1-of-3 → `2 < 3` cold, 2-of-3 → `4 < 3` warm. Matches the doc and tests (`:554-597`).
5. **No em dashes** — Confirmed zero `—` characters in either in-scope file (both use ` - ` hyphens in comments; all UI copy is `t()` i18n keys).

Host wiring is sound: `isLowMasterySession(cardedItems.map((item) => item.card))` reads the post-`cardsToQueueItems` carded half (scale cards already dropped), matching the comment. Synthetics only exist when `dueChordSymbols.size > 0`, which guarantees carded items exist, so the signal always reflects real cards.

No BLOCKER or WARNING findings. Two low-severity INFO observations follow — both are defensible, documented design choices, not defects.

## Info

### IN-01: `isLowMasterySession` treats `State.Relearning` cards as immature

**File:** `src/lib/practice/practiceQueue.ts:89`
**Issue:** Maturity is counted strictly as `card.state === State.Review`. A card in `State.Relearning` (previously mature, since lapsed) counts toward the immature majority, so a session composed largely of lapsed-but-experienced cards can be classified "cold" and trigger the first-pick guard for a user who is not actually a beginner. This is consistent with `shellVoicing.ts`'s `voicingStageForChord` convention (line 91 also keys "drill" on `State.Review`), and the consequence is benign — the guard only keeps a scaffold-heavy item out of the opening slot, which is a safe ordering for a lapsed set too. Flagged for traceability, not correction.
**Fix:** If lapsed cards should count as mature, broaden the predicate: `card.state === State.Review || card.state === State.Relearning`. Otherwise document that Relearning is intentionally excluded so the divergence from an intuitive "mature" reading is explicit. Leaving as-is is acceptable given the established convention.

### IN-02: Cold guard can increase same-family clustering later in the queue

**File:** `src/lib/practice/practiceQueue.ts:387-393`
**Issue:** Forcing a simpler family into slot 0 overrides the scarcest-last scoring for that one pick. When the only simpler family is scarce (e.g. one `name-it` among five `progression` items), the guard spends the scarce item first, which can force the abundant scaffold-heavy family to cluster later and lean on the relax branch's 3-in-a-row fallback. This is the intended cold-start tradeoff (open simple even at the cost of later clustering) and the weave still terminates with every item emitted exactly once, so it is not a defect — noted so the behavioral tradeoff is on record.
**Fix:** None required. If later clustering ever becomes a UX concern, a follow-up could bias the scarce-simpler case, but that is out of scope for QUEUE-01.

---

_Reviewed: 2026-07-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
