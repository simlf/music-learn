---
phase: 260720-vm6-deploy-ci-md-filter-and-test-skip
plan: 01
subsystem: infra
tags: [github-actions, ci, deploy, gha-paths-ignore, gate-skip]

requires: []
provides:
  - "deploy.yml push trigger skips doc-only pushes via paths-ignore"
  - "deploy.yml gate job skips redundant npm ci/test/check when the merge tree was already tested green on its PR"
affects: [deploy.yml, ci.yml]

tech-stack:
  added: []
  patterns:
    - "GitHub Actions gate-skip via a `decide` step that writes `skip` to $GITHUB_OUTPUT and guards subsequent steps with if: steps.decide.outputs.skip != 'true'"

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml

key-decisions:
  - "Split the two independent optimizations into two atomic commits (paths-ignore, then gate-skip) even though both touch the same file, per the plan's per-task commit requirement."
  - "Skip decision requires ALL of: HEAD^2 exists (merge commit), HEAD^{tree} == HEAD^2^{tree} (merged content identical to already-tested PR head), and the ci `test` check-run on that PR head concluded success. Any failure/mismatch leaves skip=false (tests run) — safe by default."

requirements-completed: [DEPLOY-CI-01, DEPLOY-CI-02]

coverage:
  - id: D1
    description: "Doc-only pushes to main (all changed files match **.md, .planning/**, or docs/**) do not trigger the deploy workflow; workflow_dispatch is unaffected."
    requirement: DEPLOY-CI-01
    verification:
      - kind: unit
        ref: "python3 yaml assertion in 260720-vm6-PLAN.md Task 1 <verify> block (part1 OK)"
        status: pass
    human_judgment: true
    rationale: "Static YAML assertions confirm the trigger config is structurally correct, but actual doc-only-push skip behavior can only be observed on a real GitHub Actions run against main; no GitHub Actions run was executed as part of this plan."
  - id: D2
    description: "gate job skips npm ci/test/check when a push to main is a merge commit whose tree matches its PR-head parent's tree and that PR head's ci 'test' check-run concluded success; squash merges and direct pushes always run tests; build-push still proceeds when gate steps are skipped."
    requirement: DEPLOY-CI-02
    verification:
      - kind: unit
        ref: "python3 yaml assertion in 260720-vm6-PLAN.md Task 2 <verify> block (part2 OK)"
        status: pass
    human_judgment: true
    rationale: "Static YAML/structure assertions confirm permissions, fetch-depth, the unguarded decide step, and the if-guards on all six work steps are wired correctly, but the runtime skip/no-skip decision (git tree comparison + gh api check-runs lookup) can only be observed on a real merge-commit push to main; no GitHub Actions run was executed as part of this plan."

duration: 8min
completed: 2026-07-20
status: complete
---

# Quick Task 260720-vm6: Deploy CI Doc Filter and Redundant Test Skip Summary

**Added a `paths-ignore` doc filter and a merge-tree-aware redundant-test skip to `.github/workflows/deploy.yml`'s gate job, both safe-by-default.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-20T15:52:00Z
- **Completed:** 2026-07-20T16:00:00Z
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments

- Doc-only pushes to `main` (all changed files matching `**.md`, `.planning/**`, or `docs/**`) no longer trigger the deploy workflow, while `workflow_dispatch` remains fully manual-deploy capable (DEPLOY-CI-01).
- The `gate` job now skips its redundant `npm ci` / `npm run test` / `npm run check` / server `npm ci` / server `npm run test` steps when a push to `main` is a merge commit whose merged tree is byte-identical to its PR-head parent's tree AND that PR head's `ci` workflow `test` check-run concluded `success` — the exact same content already tested green on the PR (DEPLOY-CI-02).
- Squash merges and direct pushes to `main` have no second parent, so they naturally fall through to `skip=false` and always run the full gate suite — safe default preserved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add paths-ignore doc filter to the deploy push trigger** - `5b171ee` (feat)
2. **Task 2: Skip redundant gate tests when the merge tree was already tested** - `9845fca` (feat)

**Plan metadata:** committed separately by the orchestrator.

## Files Created/Modified

- `.github/workflows/deploy.yml` - Added `paths-ignore` to the `push` trigger; added job-level `permissions.checks: read` to `gate`; gave the `gate` checkout step `fetch-depth: 2`; added an unguarded `decide` step that inspects `HEAD^2` tree equality and queries `gh api .../check-runs` for the PR head's `test` conclusion, writing `skip` to `$GITHUB_OUTPUT`; guarded `setup-node` and all five work steps with `if: steps.decide.outputs.skip != 'true'`.

## Decisions Made

- Split the two independent optimizations into two atomic commits even though both touch the same single file, per the per-task commit protocol — required temporarily rewriting the file to an intermediate (Task-1-only) state before layering Task 2's edits back on, so each commit's diff maps exactly to one task.
- Kept the skip condition conservative and conjunctive (merge commit AND tree equality AND ci `test` == success) exactly as specified; no relaxation considered.

## Deviations from Plan

None - plan executed exactly as written. Both task `<verify>` blocks passed on the first attempt (`part1 OK`, `part2 OK`).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. No package-manager installs were introduced.

## Next Phase Readiness

- `.github/workflows/deploy.yml` is valid YAML; `build-push` and `deploy` jobs are byte-unchanged.
- Both optimizations are dormant until observed on a real push to `main`: the doc-only-push skip and the merge-tree gate-skip will only visibly fire on the next qualifying push/merge. No action item beyond normal usage — GitHub Actions will exercise both paths on the next relevant push.
- No blockers for other in-flight work; this quick task is fully isolated to `deploy.yml`.

---
*Phase: 260720-vm6-deploy-ci-md-filter-and-test-skip*
*Completed: 2026-07-20*

## Self-Check: PASSED

- FOUND: .github/workflows/deploy.yml
- FOUND: .planning/quick/260720-vm6-deploy-ci-md-filter-and-test-skip/260720-vm6-SUMMARY.md
- FOUND: 5b171ee
- FOUND: 9845fca
