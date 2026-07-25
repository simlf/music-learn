---
phase: 28-learn-hub-theory-scales-explore-interval-reference
plan: 04
subsystem: ui
tags: [svelte, sveltekit, theory, scales, interval-view, dry-composition]

# Dependency graph
requires:
  - phase: 28-learn-hub-theory-scales-explore-interval-reference (plan 01)
    provides: TheoryLessons.svelte (extracted lesson body)
  - phase: 28-learn-hub-theory-scales-explore-interval-reference (plan 02)
    provides: ScaleExplorer.svelte with exploreOnly prop
  - phase: 28-learn-hub-theory-scales-explore-interval-reference (plan 03)
    provides: learn i18n domain dictionary (learn.* message keys)
provides:
  - "src/routes/learn/+page.svelte — the Learn hub: one sectioned scroll composing Theory, Scale Explore, and a new 5-quality Interval Reference block"
  - "src/routes/learn.test.ts — LEARN-01 render/smoke test coverage"
affects: [30-nav-cutover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-part composition seam: a hub route imports two DRY-extracted lesson/explorer components verbatim plus a small net-new reference block, reusing the shared IntervalView with onInspectTone omitted for an inert reference-only render"

key-files:
  created:
    - src/routes/learn/+page.svelte
    - src/routes/learn.test.ts
  modified: []

key-decisions:
  - "Interval Reference block lives directly in +page.svelte (not its own component) since it is five short IntervalView instances plus a data constant, matching the plan's inline guidance rather than adding a fourth extraction seam"
  - "Each of the 5 interval sub-rows renders label -> ChordGlyph -> IntervalView top to bottom (ChordGlyph is not wrapped in an extra flex div), matching the plan's per-quality structure while staying visually consistent with the rest of the page"

patterns-established:
  - "Hub composition pattern: a new route can compose N previously-DRY-extracted body components plus its own small net-new block without re-touching any of the extracted components' internals"

requirements-completed: [LEARN-01]

coverage:
  - id: D1
    description: "/learn renders one sectioned scroll: Theory (TheoryLessons), Scale Explore (ScaleExplorer exploreOnly, no mode toggle), and a 5-quality Interval Reference block (IntervalView x5, onInspectTone omitted), with a single /practice footer CTA"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/routes/learn.test.ts (7 tests: title, theory section presence, explore section presence + exploreOnly no-mode-toggle assertion, 5 interval-view instances, footer /practice link, French locale, no em/en dashes)"
        status: pass
      - kind: other
        ref: "npm run check (svelte-check, 1386 files, 0 errors / 0 warnings)"
        status: pass
      - kind: unit
        ref: "npm test full suite (117 files, 1602 tests, all pass, REG-02)"
        status: pass
    human_judgment: true
    rationale: "The plan's <human-check> verify step calls for visually confirming the stacked-thirds pattern reads correctly across all 5 qualities and that the footer button is the page's only vermilion accent in a real Chromium render — this is a design-fidelity judgment the preview harness cannot perform (per project note: preview_* cannot hydrate this app) and automated assertions cannot substitute for."

duration: 8min
completed: 2026-07-25
status: complete
---

# Phase 28 Plan 04: Learn Hub Page Summary

**Created `/learn` as a single sectioned scroll composing the extracted `TheoryLessons` and `ScaleExplorer` (exploreOnly) components alongside a new Interval Reference block rendering the shared `IntervalView` five times (Cmaj7, C7, Cm7, Cm7b5, Cdim7) with tones inert, closing with one `/practice` footer CTA.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T01:59:12Z
- **Completed:** 2026-07-25T02:03:37Z
- **Tasks:** 2
- **Files modified:** 2 (both new)

## Accomplishments
- Built `src/routes/learn/+page.svelte`: prerender-safe pure client page reusing `/theory`'s exact shell (`bg-paper`/`max-w-[42rem]`/`gap-8`), with three sibling sections — `learn-theory` (eyebrow + `<TheoryLessons />`), `learn-explore` (eyebrow + heading + `<ScaleExplorer exploreOnly />`), and `learn-interval-reference` (a fresh bordered card with eyebrow/heading/intro and an `{#each}` over 5 hard-coded `{symbol, quality, labelKey}` entries feeding `spellChord(entry.symbol)` into `IntervalView`, `onInspectTone` omitted).
- Footer is the single vermilion CTA on the page: `<Button href="/practice">{t('learn.footer.practiceButton')}</Button>`.
- Added `src/routes/learn.test.ts` (7 tests, LEARN-01): page title, theory section contains the three extracted lesson sections (`section-interactive-lesson`, `section-symbol`, `section-sevenths`), explore section contains `tonic-row`/`scale-title` and asserts `mode-toggle` is absent (exploreOnly), interval-reference section has exactly 5 `interval-view` nodes, footer link resolves to `/practice`, French locale renders "Apprendre", and no em/en dashes appear anywhere in the rendered page.
- Full regression sweep: `npm run check` (0 errors/warnings across 1386 files) and `npx vitest run` (117 files, 1602 tests) both green — REG-01 (reused components untouched) and REG-02 (full suite posture) both hold.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the /learn hub page composing the three parts** - `d54d3f6` (feat)
2. **Task 2: Add the /learn render/smoke test (LEARN-01)** - `10de29c` (test)

**Plan metadata:** (pending — this SUMMARY's own commit)

_Note: no TDD tasks in this plan; Task 1 is a composition build, Task 2 is its accompanying coverage test._

## Files Created/Modified
- `src/routes/learn/+page.svelte` - New Learn hub: page shell + header + three sections (Theory, Scale Explore, Interval Reference) + `/practice` footer CTA.
- `src/routes/learn.test.ts` - New LEARN-01 render/smoke test (7 assertions covering structure, exploreOnly gating, interval-view count, footer link, French locale, and dash-free copy).

## Decisions Made
- Kept the Interval Reference block inline in `+page.svelte` rather than extracting a fourth component: it is five short instances of an existing shared component (`IntervalView`) plus a small local data constant, so a dedicated component would add an extraction seam with no reuse target (nothing else in the codebase needs a 5-quality interval reference block).
- Used `within(section)` scoping in the test file (rather than global `screen` queries) for the theory/explore/interval-reference assertions, since `TheoryLessons` and `ScaleExplorer` render their own internal `data-testid`s that must be proven present *inside* the correct `/learn` section, not merely present anywhere on the page.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `/learn` is fully wired and tested; ready for Phase 30's nav cutover (adding `/learn` to the app's navigation and redirecting `/theory`/`/scales` there) with zero further changes to this page expected.
- The plan's `<human-check>` visual verification step (stacked-thirds pattern legibility across the 5 qualities, footer button as sole vermilion accent) is deferred to a human on-device check, per the project's documented preview-harness limitation (it cannot hydrate this SvelteKit app) — flagged in this SUMMARY's `coverage.human_judgment` rather than silently skipped.
- No blockers. `/theory` and `/scales` remain unaffected (Phase 30 scope); this phase only added the new `/learn` surface.

---
*Phase: 28-learn-hub-theory-scales-explore-interval-reference*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/routes/learn/+page.svelte
- FOUND: src/routes/learn.test.ts
- FOUND: d54d3f6 (Task 1 commit)
- FOUND: 10de29c (Task 2 commit)
