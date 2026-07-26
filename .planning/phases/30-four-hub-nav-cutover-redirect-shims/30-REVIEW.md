---
phase: 30-four-hub-nav-cutover-redirect-shims
reviewed: 2026-07-25T10:57:45Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/routes/+layout.svelte
  - src/routes/practice/+page.svelte
  - src/lib/components/ProgressStats.svelte
findings:
  critical: 0
  warning: 3
  info: 0
  total: 3
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-07-25T10:57:45Z
**Depth:** standard
**Files Reviewed:** 3 (primary scope) + cross-referenced: 8 redirect shims (`src/routes/{drills,build,voicings,progressions,scales,theory,recall,songs}/+page.ts`), `src/lib/i18n/messages/chrome.ts`, `src/lib/practice/drillSeeds.ts`, `src/lib/practice/practiceQueue.ts`, `src/lib/components/BottomSheet.svelte`, `src/routes/redirectShims.test.ts`, `src/routes/practiceSeedHandoff.test.ts`, `tests/masthead.e2e.test.ts`
**Status:** issues_found

## Summary

This is a well-executed cutover. All 8 redirect shims are correct (prerender-safe, correct target hub, no typos, no loops — verified against `redirectShims.test.ts`, which passes). The `/practice` drill-seed handoff correctly mirrors the old `/drills` semantics: both one-shot channels (`consumeLessonSeeds`/`consumeDrillSeeds`) are always drained, lesson seeds win over weak-list seeds, unresolvable symbols are dropped via `factById`, a seeded session forces `pre-start` even with zero due cards, and the id-based dedup (`fsrs:{factId}:{mode}`) correctly matches `practiceQueue.ts`'s `cardedItemId` convention. No residual `/drills`, `/recall`, `/scales`, `/theory`, `/songs`, `/build`, `/voicings`, or `/progressions` hrefs remain in live navigation code (`ProgressStats.svelte`, `RecallSession.svelte`, `BuildSession.svelte`, `+layout.svelte` all repoint correctly to the 4 hubs). No em dashes, no reserved-color (vermilion) misuse. Ran the full relevant test suite (`redirectShims.test.ts`, `practiceSeedHandoff.test.ts`, `masthead.e2e.test.ts`, `practice-hub*.e2e.test.ts`, `progress*.e2e.test.ts`, `coverage.test.ts`) — all 79 tests pass.

The issues found are all maintainability/dead-code defects from an incomplete cleanup, not functional regressions: a second literal href list in `+layout.svelte` that contradicts its own documented anti-drift invariant, and several artifacts (icon map entries, i18n keys, and an entire component) left over from the removed "More" bottom-sheet / 10-link nav that are no longer reachable from any live code path.

## Warnings

### WR-01: `bottomTabHrefs` is exactly the "second literal list" the code's own comment says was eliminated

**File:** `src/routes/+layout.svelte:65-66`
**Issue:** The comment above `bottomTabLinks` (lines 57-64) explicitly states the phone tab bar is "Derived by filtering `navLinks` (not a second literal array) so the two never drift apart," and the comment on `navLinks` itself (lines 16-21) repeats "never a second literal list." But `bottomTabHrefs` *is* a second, independently-maintained literal array of href strings:
```js
const bottomTabHrefs = ['/', '/practice', '/learn', '/progress'];
const bottomTabLinks = navLinks.filter((link) => bottomTabHrefs.includes(link.href));
```
Today `bottomTabHrefs` happens to equal `navLinks.map(l => l.href)` exactly, so the filter is a no-op and behavior is correct. But that's incidental, not structural: if a 5th hub is ever added to `navLinks` without also updating `bottomTabHrefs`, the bottom tab bar will silently fail to show it — precisely the drift scenario the surrounding comments claim is impossible. Since `navLinks` is now already exactly the 4 hubs (there is no longer a superset from which the bottom bar picks a subset — that was the pre-Phase-30 5-link + "More" design), this indirection has no remaining purpose.
**Fix:** Delete `bottomTabHrefs` and use `navLinks` directly (there is no longer a distinction to filter for):
```js
const bottomTabLinks = navLinks;
```
If a future phase reintroduces a hub that should appear on desktop but not on the phone tab bar, reintroduce the filter then, sourced from a single boolean/flag on each `navLinks` entry rather than a parallel href array.

### WR-02: Dead nav artifacts left over from the removed 10-link nav / "More" sheet

**File:** `src/routes/+layout.svelte:47-50`, `src/lib/i18n/messages/chrome.ts:12-17,29-31,34-39,52-54`, `src/lib/components/BottomSheet.svelte`
**Issue:** Phase 30's stated goal (per the `+layout.svelte` comments themselves) is that "the 'More' sheet (former 5th slot) is removed entirely" and the nav is cut to exactly 4 hubs. Several artifacts from the prior 10-link design were left in place instead of removed, and are now unreachable from any live code path:
- `TAB_ICONS['/recall']` and `TAB_ICONS['/songs']` (`+layout.svelte:47-50`) can never be looked up: `bottomTabLinks` only ever contains `/`, `/practice`, `/learn`, `/progress`.
- `chrome.ts` still defines `nav.build`, `nav.recall`, `nav.scales`, `nav.songs`, `nav.theory`, `nav.progressions`, `nav.voicings`, and `nav.more` (both `en`/`fr`) — none of these keys are read anywhere in the app outside `chrome.ts`'s own definition and stale test fixtures (`nav.drills` is exercised only by a translation smoke test, not by any rendered nav).
- `BottomSheet.svelte` is no longer imported by `+layout.svelte` (or anywhere else in `src/`) — its only remaining reference is its own test file (`bottomSheet.test.ts`). It, and its `chrome.sheet.close` i18n key, are entirely dead in production now that the "More" sheet is gone.

None of this breaks anything (dead code, not a live bug), but it directly contradicts the phase's own "removed entirely" / cutover-cleanliness intent and will accumulate confusion for the next person who has to figure out whether `BottomSheet`/`nav.recall`/etc. are still wired up somewhere non-obvious.
**Fix:** Remove the two dead `TAB_ICONS` entries, remove the 8 unused `nav.*` keys + `nav.more` + `chrome.sheet.close` from `chrome.ts` (both locales), and delete `BottomSheet.svelte` + `bottomSheet.test.ts` (or, if the sheet pattern is expected to return for a future overflow menu, leave a one-line comment on why it's intentionally kept despite being currently unreferenced).

### WR-03: `+layout.svelte`'s bottom-tab-bar iteration silently depends on `bottomTabHrefs`/`TAB_ICONS`/`navLinks` staying in lockstep across three separate declarations

**File:** `src/routes/+layout.svelte:43-66`
**Issue:** Related to WR-01/WR-02: correctness of the phone tab bar currently depends on three independently-declared structures (`navLinks`, `TAB_ICONS`, `bottomTabHrefs`) all agreeing on the same 4 href strings, with nothing enforcing that agreement except manual discipline. A future edit that adds a route to `navLinks` but forgets `TAB_ICONS` would hit `{@html TAB_ICONS[link.href]}` evaluating to `undefined` for that link (renders an empty icon slot silently, no error) rather than failing loudly — a real, if currently dormant, correctness gap for whoever extends this file next.
**Fix:** Low priority given the current 4-hub surface is stable, but worth a `satisfies Record<(typeof navLinks)[number]['href'], string>`-style type constraint (or a small dev-only assertion in `onMount`) so a future drift between the three structures fails fast instead of silently rendering a blank icon.

---

_Reviewed: 2026-07-25T10:57:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
