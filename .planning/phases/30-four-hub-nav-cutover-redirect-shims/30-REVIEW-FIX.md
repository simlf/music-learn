---
phase: 30-four-hub-nav-cutover-redirect-shims
fixed_at: 2026-07-25T11:05:10Z
review_path: .planning/phases/30-four-hub-nav-cutover-redirect-shims/30-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-07-25T11:05:10Z
**Source review:** .planning/phases/30-four-hub-nav-cutover-redirect-shims/30-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03 — no critical findings existed)
- Fixed: 3 (WR-02 applied as a partial/scoped fix per explicit instruction)
- Skipped: 0 top-level findings (two sub-items of WR-02 intentionally deferred, see below)

## Fixed Issues

### WR-01: `bottomTabHrefs` is exactly the "second literal list" the code's own comment says was eliminated

**Files modified:** `src/routes/+layout.svelte`
**Commit:** `c328c56`
**Applied fix:** Deleted the `bottomTabHrefs` literal href array. `bottomTabLinks` is now `const bottomTabLinks = navLinks;` — since the 4 nav hubs are now exactly the 4 phone tabs, there is no longer a superset to filter from, so the indirection was pure drift risk with no remaining purpose. `TAB_ICONS` is left keyed by href, unchanged in shape. Updated the two adjacent comments (on `navLinks` and on the bottom-tab-bar block) that referenced "filtered view" / "derived by filtering" so they accurately describe the new direct-assignment relationship instead of a filter that no longer exists.

### WR-02 (partial): Dead nav artifacts left over from the removed 10-link nav / "More" sheet

**Files modified:** `src/routes/+layout.svelte`
**Commit:** `88a1ed6`
**Applied fix:** Removed the two unreachable `TAB_ICONS` entries, `'/recall'` and `'/songs'` — neither route is a phone tab under the current 4-hub `navLinks`/`bottomTabLinks`, so these entries could never be looked up. Confirmed every remaining `navLinks` href (`/`, `/practice`, `/learn`, `/progress`) still has a corresponding `TAB_ICONS` entry (verified by re-read and by the new WR-03 dev-only guard passing at runtime — see below).

**Scoped out of this fix (per explicit task instruction, intentionally deferred, NOT applied):**
- The 8 unused `nav.*` i18n keys (`nav.build`, `nav.recall`, `nav.scales`, `nav.songs`, `nav.theory`, `nav.progressions`, `nav.voicings`, `nav.more`) plus `chrome.sheet.close` in `src/lib/i18n/messages/chrome.ts` — left in place to avoid i18n coverage/test churn now; deferred to a dedicated cleanup phase per the phase's own deferred-items tracking.
- Deletion of `src/lib/components/BottomSheet.svelte` and its test — left in place; the component is dead in production (no longer imported by `+layout.svelte` or anywhere else in `src/`) but removing a shared component now was judged unnecessary churn ahead of a dedicated More-sheet-removal cleanup follow-up.

These two sub-items are dead-code/cleanup items, not functional regressions (confirmed by REVIEW.md itself: "None of this breaks anything"), so deferring them carries no behavioral risk.

### WR-03: `+layout.svelte`'s bottom-tab-bar iteration silently depends on three declarations staying in lockstep

**Files modified:** `src/routes/+layout.svelte`
**Commit:** `33b2100`
**Applied fix:** Added a lightweight dev-only guard inside the existing `onMount` callback: on mount, iterates `navLinks` and throws if any `href` is missing a `TAB_ICONS` entry, gated behind `import.meta.env.DEV` (statically stripped from production builds by Vite, so zero prod bundle/runtime cost). This turns a future silent-blank-icon regression into an immediate loud dev-time error, without introducing new build tooling, a new type-level constraint, or any change to production behavior — matching the review's own "low priority... worth a small dev-only assertion" guidance and the instruction not to over-engineer.

## Verification

- `npm run check` (svelte-check): 0 errors, 0 warnings, 1378 files — run after each of the 3 commits above.
- `npm test -- tests/masthead.e2e.test.ts src/routes/redirectShims.test.ts`: 2 files, 20 tests passed.
- Full suite `npm test`: 106 test files, 1459 tests passed (0 failures).
- Manual re-read of `src/routes/+layout.svelte` confirms: desktop masthead still renders exactly 4 `navLinks`; phone tab bar (`bottomTabLinks`) still renders the same exact 4 hubs in the same order; no "More" sheet reintroduced; `TAB_ICONS` covers all 4 remaining hrefs with no dangling or missing entries.

---

_Fixed: 2026-07-25T11:05:10Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
