---
phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-
plan: 04
subsystem: ui
tags: [css-custom-properties, svelte-5, resize-observer, mobile-layout]

# Dependency graph
requires:
  - phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014- (plan 01)
    provides: "The phone-only review-action-dock and its --review-dock-clearance token stacking on top of --tab-bar-clearance"
provides:
  - "--tab-bar-clearance includes var(--spacing-md) breathing room above the tab bar height, inherited by every phone page's main padding-bottom and the review-action-dock offset"
  - "RecallSession.svelte self-measures the review-action-dock's actual rendered height (bind:this + guarded ResizeObserver) and overrides --review-dock-clearance live on the ancestor main[data-review-dock], so the scrollable area under the dock is always correct regardless of dock state (one-row Reveal vs. taller 2x2 grade grid)"
affects: [24-UAT, future mobile-ux phases touching src/app.css tokens or RecallSession.svelte]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ancestor-targeted CSS custom-property override via DOM API (element.style.setProperty on a closest() match) when the padding consumer is an ancestor of the measuring component and cannot receive the value through normal prop/markup nesting"

key-files:
  created: []
  modified:
    - src/app.css
    - src/lib/components/RecallSession.svelte

key-decisions:
  - "--tab-bar-clearance addend is var(--spacing-md), an existing token, never a hardcoded 16px"
  - "--review-dock-clearance stays as a static 60px fallback in app.css for no-JS/no-ResizeObserver environments; RecallSession.svelte overrides it live via an inline style on the ancestor main[data-review-dock] once ResizeObserver is available"
  - "Dock height measurement mirrors PianoKeyboard.svelte's established bind:this + guarded $effect + ResizeObserver pattern rather than inventing a new measurement approach"

requirements-completed: [HV-24-03-01]

coverage:
  - id: D1
    description: "Shared --tab-bar-clearance token includes var(--spacing-md) breathing room so the last element on every phone page clears the fixed bottom tab bar instead of sitting flush against it"
    requirement: "HV-24-03-01"
    verification:
      - kind: manual_procedural
        ref: "Human checkpoint verification at 390px viewport: lookup why-panel escape-hatch button confirmed clear of tab bar with breathing room"
        status: pass
    human_judgment: true
    rationale: "Visual spacing/breathing-room correctness at a specific viewport width is a judgment call best confirmed by human eyes in a real browser, not a DOM assertion."
  - id: D2
    description: "Review-action-dock's live-measured height fixes grade-grid state clipping the reveal content (formula chips) with no way to scroll to it"
    verification:
      - kind: unit
        ref: "src/lib/components/recallSession.test.ts (61 tests, full suite unaffected by the dock-measurement effect)"
        status: pass
      - kind: manual_procedural
        ref: "Human checkpoint re-verification at 390px viewport: grade grid no longer clips reveal content; confirmed after merge to main for testing"
        status: pass
    human_judgment: true
    rationale: "Visual overlap/clipping across dock states (one-row vs. 2x2 grade grid) at a specific viewport requires human visual confirmation; unit tests only confirm the component still renders/behaves correctly, not that no pixel-level clipping occurs."

duration: 35min
completed: 2026-07-20
status: complete
---

# Phase 24 Plan 04: Tab-Bar Clearance Breathing Room + Review Dock Height Fix Summary

**Added 16px of breathing room to the shared --tab-bar-clearance token, then fixed a review-dock height bug (surfaced during this plan's own checkpoint) where the grade-grid state clipped reveal content because --review-dock-clearance was a static 60px sized only for the one-row Reveal state.**

## Performance

- **Duration:** 35 min
- **Tasks:** 1 planned task + 1 checkpoint (with one deviation round-trip) + 1 approved re-verification
- **Files modified:** 2 (src/app.css, src/lib/components/RecallSession.svelte)

## Accomplishments

- Closed 24-UAT.md Test 3: `--tab-bar-clearance` now resolves to `calc(56px + env(safe-area-inset-bottom) + var(--spacing-md))`, giving every phone page's last element (notably the lookup why-panel's "Voir Cmaj7" escape-hatch button) visible breathing room above the fixed bottom tab bar instead of sitting flush against it.
- Discovered and fixed (during the plan's own human-verification checkpoint) a real bug: the review page's action dock switches to a much taller 2x2 grade grid (Again/Hard/Good/Easy) after reveal, but the shared `--review-dock-clearance` was a static 60px sized only for the one-row pre-reveal state. This clipped the reveal content (formula chips) with no way to scroll to it. Fixed by having `RecallSession.svelte` self-measure the dock's actual rendered height and push the live value onto the ancestor `main[data-review-dock]`.
- Both fixes verified by the user at a 390px viewport: lookup escape-hatch breathing room confirmed OK; recall grade-grid clipping confirmed resolved.

## Task Commits

Each change was committed atomically:

1. **Task 1: Add breathing room to the shared --tab-bar-clearance token** - `7b0b06f` (fix)
2. **Deviation (Rule 1 - bug, found during Task 2's checkpoint): Measure review dock height to fix grade-grid content clipping** - `723565c` (fix)

_Note: no plan-metadata commit in this SUMMARY per worktree-mode convention; the orchestrator commits shared STATE.md/ROADMAP.md updates centrally after the wave completes._

## Files Created/Modified

- `src/app.css` - `--tab-bar-clearance` gains `var(--spacing-md)` addend (breathing room); `--review-dock-clearance` comment updated to document it as a static fallback now overridden live by `RecallSession.svelte`
- `src/lib/components/RecallSession.svelte` - Added `dockEl` state + guarded `$effect`/`ResizeObserver` that measures `.review-action-dock`'s rendered height and writes it onto the ancestor `main[data-review-dock]` as an inline `--review-dock-clearance` override; `bind:this={dockEl}` wired onto the dock div

## Decisions Made

- `--tab-bar-clearance`'s new addend is `var(--spacing-md)` (16px), an existing token — never hardcoded, per the plan's explicit instruction.
- `--review-dock-clearance`'s static `60px` value in `app.css` is kept as a fallback (no-JS / no-`ResizeObserver` environments), not removed — the live JS override replaces it only when measurement is possible.
- The dock-height measurement reuses `PianoKeyboard.svelte`'s established `bind:this` + guarded `$effect`/`ResizeObserver` convention (Phase 9's T-09-01 pattern) rather than introducing a new measurement idiom, for consistency with the rest of the codebase.
- Because `RecallSession.svelte` renders no single wrapping root element (it's a sequence of top-level `{#if}` blocks/snippets) and CSS custom properties only cascade downward, the measured height had to be written via the DOM (`element.style.setProperty`) onto the ancestor `main[data-review-dock]`, located via `dockEl.closest('main[data-review-dock]')`, rather than passed through component props/markup nesting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Review-action-dock's static clearance did not account for the taller grade-grid state, clipping reveal content**
- **Found during:** Task 2 (checkpoint:human-verify) — the user's first verification pass at 390px reported the issue directly ("I can't scroll to see the formula...")
- **Issue:** `--review-dock-clearance` in `src/app.css` was a static `60px`, sized for the one-row "Reveal" dock state. After reveal, the dock switches to a 2x2 grade grid (Again/Hard/Good/Easy, large buttons) that is roughly 4x taller (~250-280px). The scrollable area under the dock was short by ~200px, so the reveal content (formula chips) was clipped behind the dock with no way to scroll further to see it.
- **Fix:** `RecallSession.svelte` now self-measures `.review-action-dock`'s actual rendered height via `bind:this` + a guarded `ResizeObserver` (mirroring `PianoKeyboard.svelte`'s established pattern, guarded for jsdom/older browsers lacking `ResizeObserver`), and writes the live pixel height onto the ancestor `main[data-review-dock]` as an inline `--review-dock-clearance` override. The static `60px` in `app.css` remains as a documented fallback. `--tab-bar-clearance` stacking (Task 1's fix) is untouched.
- **Files modified:** `src/lib/components/RecallSession.svelte`, `src/app.css` (comment only)
- **Verification:** `npx vitest run src/lib/components/recallSession.test.ts` (61/61 pass), full suite `npx vitest run` (1358/1358 pass), `npm run check` (0 errors/0 warnings, 1336 files). Human re-verification at 390px confirmed the grade grid no longer clips the reveal content.
- **Committed in:** `723565c`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Necessary correctness fix surfaced by the plan's own checkpoint verification step; directly in scope of "review dock clearance" territory this plan already touches. No scope creep — `--tab-bar-clearance` (Task 1's actual deliverable) was not touched by the fix.

## Issues Encountered

None beyond the deviation documented above, which was resolved within this plan's checkpoint loop.

## User Setup Required

None - no external service configuration required.

## Checkpoint History

- **Round 1:** User tested at 390px, reported an issue with the review page's grade-grid state clipping reveal content (not approved).
- **Deviation fix applied** (commit `723565c`) per Rule 1.
- **Round 2:** User approved after re-testing at 390px (fixes merged to main by the orchestrator for testing): "lookup escape-hatch breathing room OK, recall grade-grid no longer clips reveal content."

## Next Phase Readiness

- 24-UAT.md Test 3 gap is closed; both the original tab-bar-clearance breathing-room defect and the review-dock-clearance sizing defect (discovered during this plan's verification) are fixed and human-verified.
- No blockers for phase completion. `--review-dock-clearance`'s live-measurement pattern (bind:this + ResizeObserver + ancestor DOM write) is now established precedent if any future dock-adjacent clearance token needs the same treatment.

---
*Phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-*
*Completed: 2026-07-20*
