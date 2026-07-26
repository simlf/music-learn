---
phase: 28-learn-hub-theory-scales-explore-interval-reference
plan: 03
subsystem: i18n
tags: [i18n, svelte, sveltekit, learn-hub]

# Dependency graph
requires:
  - phase: 20-french-translation
    provides: LocaleDict pattern, messages/index.ts merge point, messages.test.ts domain-collision gate
provides:
  - "learn.* i18n domain with 14 keys (en+fr) covering the /learn hub page and the /practice Scale-practice disclosure"
  - "Registration of the learn domain into messages/index.ts's merged catalog and messages.test.ts's domain-collision list"
affects: [28-04 (learn hub page), 28-05 (practice scale-practice affordance)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "learn.ts follows the theory.ts/scales.ts LocaleDict domain-file shape verbatim (import type LocaleDict, satisfies LocaleDict, immunity doc comment)"

key-files:
  created:
    - src/lib/i18n/messages/learn.ts
  modified:
    - src/lib/i18n/messages/index.ts
    - src/lib/i18n/messages.test.ts

key-decisions:
  - "Used the exact en/fr copy already specified in 28-PATTERNS.md's learn.ts structure pattern verbatim, rather than re-deriving from the UI-SPEC prose, since PATTERNS.md already reconciled both sources key-for-key"

patterns-established:
  - "Fourteenth domain file registered in both the merge point and the collision gate in the same commit, matching the established two-file registration contract"

requirements-completed: [LEARN-01, LEARN-02]

coverage:
  - id: D1
    description: "learn.ts exports a learn LocaleDict with 14 keys covering /learn hub copy (title, subtitle, 3 section labels, interval quality labels, footer CTA) and the /practice Scale-practice disclosure (toggle, close, heading, body), identical key sets in en and fr, no em/en dashes"
    requirement: "LEARN-01"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#en/fr message parity (I18N-02) > has an identical key set in en and fr"
        status: pass
    human_judgment: false
  - id: D2
    description: "learn domain registered in messages/index.ts's merged en/fr catalogs and messages.test.ts's domain-collision array (14 entries), so no learn.* key collides with any existing domain key and the merged-catalog-size assertion still holds"
    requirement: "LEARN-02"
    verification:
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#domain dictionary key collisions (I18N-02) > has no key defined by more than one domain dictionary"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/messages.test.ts#domain dictionary key collisions (I18N-02) > every domain key survives the merge unshadowed (merged catalog size equals the sum of domain sizes)"
        status: pass
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts (full suite, no raw-key-leak sweep)"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-25
status: complete
---

# Phase 28 Plan 03: Learn i18n domain registration Summary

**New `learn.ts` i18n domain (14 keys, en+fr) for the /learn hub and /practice Scale-practice disclosure, registered into the merged catalog and the domain-collision gate**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-25T03:54:00+02:00
- **Completed:** 2026-07-25T03:55:14+02:00
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created `src/lib/i18n/messages/learn.ts` with 14 en/fr key pairs: hub title/subtitle, 3 section eyebrow labels (theory/explore/interval, with explore/interval also carrying a heading), the interval intro line, 5 interval-reference quality labels (MAJ7/DOM7/M7/M7♭5/DIM7), the footer CTA, and the 4-key Scale-practice disclosure (toggle/close/heading/body)
- Registered the domain in `messages/index.ts`'s merge point (import + spread into both `messages.en` and `messages.fr`)
- Registered the domain in `messages.test.ts`'s domain-collision array (now 14 entries), so the parity, collision, and merged-catalog-size tests all cover `learn.*`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the learn i18n domain (en + fr, identical key sets)** - `977e475` (feat)
2. **Task 2: Register the learn domain in the merge point and the collision gate** - `9715a55` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/i18n/messages/learn.ts` - New learn domain dictionary (en+fr, 14 keys each)
- `src/lib/i18n/messages/index.ts` - Imports `learn` and spreads `learn.en`/`learn.fr` into the merged catalogs
- `src/lib/i18n/messages.test.ts` - Imports `learn` and appends `['learn', learn.en]` to the domain-collision array

## Decisions Made
- Copied the en/fr copy verbatim from 28-PATTERNS.md's `learn.ts` structure pattern (which already reconciled the UI-SPEC Copywriting Contract's English strings with vetted French translations), rather than re-deriving values independently, to guarantee byte-for-byte alignment with what the Wave-2 plans (28-04, 28-05) expect to consume.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `learn.*` keys are live in the merged en/fr catalog and covered by the parity/collision/coverage test gates; the full suite (116 files, 1595 tests) and `npm run check` (0 errors/warnings) are green.
- 28-04 (`/learn` hub page) and 28-05 (`/practice` Scale-practice affordance) can now consume `t('learn.*')` keys directly with no further i18n plumbing needed.

---
*Phase: 28-learn-hub-theory-scales-explore-interval-reference*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/lib/i18n/messages/learn.ts
- FOUND: src/lib/i18n/messages/index.ts
- FOUND: src/lib/i18n/messages.test.ts
- FOUND: .planning/phases/28-learn-hub-theory-scales-explore-interval-reference/28-03-SUMMARY.md
- FOUND commit: 977e475
- FOUND commit: 9715a55
