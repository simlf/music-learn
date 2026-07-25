---
phase: 30-four-hub-nav-cutover-redirect-shims
plan: 04
subsystem: nav-handoffs
tags: [navigation, routing, handoff-repoint, hub-cutover]
dependency-graph:
  requires: [30-01, 30-02, 30-03]
  provides: [RecallSession-practice-handoff, InteractiveLesson-practice-handoff, BuildSession-progress-handoff]
  affects: [src/lib/components/RecallSession.svelte, src/lib/components/InteractiveLesson.svelte, src/lib/components/BuildSession.svelte]
tech-stack:
  added: []
  patterns: [hardcoded-static-navigation-target]
key-files:
  created: []
  modified:
    - src/lib/components/RecallSession.svelte
    - src/lib/components/InteractiveLesson.svelte
    - src/lib/components/BuildSession.svelte
    - src/lib/components/recallSession.test.ts
    - src/lib/components/interactiveLesson.test.ts
    - src/lib/components/buildSession.test.ts
decisions: []
metrics:
  duration: 12min
  completed: 2026-07-25
status: complete
---

# Phase 30 Plan 04: Repoint Recall/Lesson/Build Handoffs Summary

Repointed RecallSession's four "Practice Now" CTAs and InteractiveLesson's lesson handoff CTA from `/drills` to `/practice`, and BuildSession's "Recall It Now" CTA from `/recall` to `/progress`, updating each component's own test in lockstep so the suite stays green.

## What Was Built

- `RecallSession.svelte`: all four `Button href="/drills"` occurrences (empty-no-deck, empty-none-due, empty-filtered-none-due, complete states) changed to `href="/practice"`.
- `InteractiveLesson.svelte`: the lesson-handoff `Button href="/drills"` changed to `href="/practice"`.
- `BuildSession.svelte`: the standalone completion screen's "Recall It Now" `Button href="/recall"` changed to `href="/progress"`. The "Scales" build-mode kind toggle and all other controls in this file were left untouched.
- `recallSession.test.ts`: both "Practice Now" link-href assertions updated to expect `/practice`.
- `interactiveLesson.test.ts`: the handoff-card link-href assertion (and its descriptive test name) updated to expect `/practice`.
- `buildSession.test.ts`: the single "Recall It Now" link-href assertion updated to expect `/progress`; the many unrelated "Scales" build-mode-toggle assertions in this file were not touched.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run check`: 1394 files, 0 errors, 0 warnings.
- `npm test -- src/lib/components/recallSession.test.ts src/lib/components/interactiveLesson.test.ts src/lib/components/buildSession.test.ts`: 3 files, 159 tests, all passed.
- `grep` confirms zero remaining `href="/drills"` or `href="/recall"` references in the three modified components (only unrelated `$lib/drills/*` module-path imports remain in RecallSession.svelte, which are not routes).

## Threat Flags

None - navigation targets are hardcoded static literals per the plan's own threat model (T-30-04-01, accepted, no open-redirect surface).

## Self-Check: PASSED

- FOUND: src/lib/components/RecallSession.svelte
- FOUND: src/lib/components/InteractiveLesson.svelte
- FOUND: src/lib/components/BuildSession.svelte
- FOUND: src/lib/components/recallSession.test.ts
- FOUND: src/lib/components/interactiveLesson.test.ts
- FOUND: src/lib/components/buildSession.test.ts
- FOUND commit 88f1186 (feat(30-04): repoint recall, lesson, and build handoffs to new hubs)
- FOUND commit 73a8e47 (test(30-04): update component tests for repointed handoff targets)
