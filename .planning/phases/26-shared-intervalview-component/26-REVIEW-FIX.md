---
phase: 26-shared-intervalview-component
fixed_at: 2026-07-24T21:01:00Z
review_path: .planning/phases/26-shared-intervalview-component/26-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 26: Code Review Fix Report

**Fixed at:** 2026-07-24T21:01:00Z
**Source review:** .planning/phases/26-shared-intervalview-component/26-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (critical: 0, warning: 1; info skipped per fix_scope)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: Stacked view's root-tone label ("root") never localizes to French

**Files modified:** `src/lib/components/IntervalView.svelte`, `src/lib/components/intervalView.test.ts`, `src/lib/i18n/messages/interval-view.ts`
**Commit:** fa42745
**Applied fix:** Added a new localized key `interval-view.tone.root` to the `interval-view` i18n domain (EN: `"root"`, FR: `"fondamentale"`, matching the French unison term already used in `src/lib/theory/interval.ts`'s `FRENCH_DEGREE_NOUNS[1]` and reused by `formulaSentence` in `chordPresentation.ts`). Updated `displayLabel()` in `IntervalView.svelte` to call `t('interval-view.tone.root')` instead of returning the hardcoded literal `'root'` for the stacked-view root chip. Left the formula view's root label untouched (still resolves to the literal `"R"` via `entry.label`) since the `t()` call is gated behind `view === 'stacked'`, preserving REG-01 byte-identical behavior. Added a new test in `intervalView.test.ts` (`IntervalView stacked root-label i18n (WR-01)`) asserting the stacked chip reads `"root"` under `en`, flips live to `"fondamentale"` under `fr`, and flips back to `"root"` under `en`. The existing `messages.test.ts` en/fr key-parity and domain-collision gates and `coverage.test.ts`'s no-raw-key-leak sweep automatically cover the new key with no edits needed (they iterate the full merged catalog generically).

**Verification:** Ran the full affected test surface (`intervalView.test.ts`, `chordPresentation.test.ts`, `messages.test.ts`, `coverage.test.ts`, and all `lookup*.test.ts` route tests) — 87/87 passed. Then ran the full project test suite — 109 files / 1542 tests passed, no regressions. Ran `svelte-check` — 0 errors, 0 warnings.

## Skipped Issues

None — the only other finding (IN-01, four near-identical tone-rendering blocks) is Info-severity and out of scope per `fix_scope: critical,warning`.

---

_Fixed: 2026-07-24T21:01:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
