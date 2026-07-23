---
phase: 260723-dkp-docker-prune-on-deploy-failure
plan: 01
subsystem: infra
tags: [github-actions, ci, deploy, docker, disk-space]

requires: []
provides:
  - "deploy.yml recovers disk space on infrabox667 automatically when the deploy step fails"
affects: [deploy.yml]

tech-stack:
  added: []
  patterns:
    - "Failure-triggered SSH cleanup step guarded by if: ${{ failure() }}, reusing the same connection secrets as the step it follows"

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml

key-decisions:
  - "Used docker system prune -af (no --volumes) to avoid any risk of removing named volumes backing DB data; images/build cache are the actual space hogs."
  - "No auto-retry of the deploy step added — user confirmed short downtime is acceptable; next push/workflow_dispatch will succeed once space is freed."
  - "Removed script_stop: true from the ssh-action step since it's not a valid input for pinned appleboy/ssh-action v1.2.5 and was the source of the Unexpected input(s) warning in the failing run."

requirements-completed: [DEPLOY-CI-03]

coverage:
  - id: D1
    description: "If the deploy SSH step fails, a follow-up step SSHes into infrabox667 and runs docker system prune -af (then df -h / to log resulting space)."
    requirement: DEPLOY-CI-03
    verification:
      - kind: unit
        ref: "python3 yaml assertion in 260723-dkp-PLAN.md Task 1 <verify> block (OK)"
        status: pass
    human_judgment: true
    rationale: "Static YAML assertions confirm the failure()-guarded step is wired correctly with the same connection secrets, but actual space recovery on a real failing deploy can only be observed on the next real disk-full failure on infrabox667."

duration: 6min
completed: 2026-07-23
status: complete
---

# Quick Task 260723-dkp: Docker Prune on Deploy Failure Summary

**Added a failure-triggered cleanup step to `.github/workflows/deploy.yml`'s `deploy` job that SSHes into infrabox667 and runs `docker system prune -af` when the deploy step fails, to recover from disk-full deploy failures. Also removed the invalid `script_stop` input that was producing a warning in the logs.**

## Accomplishments

- New step "Free disk space on the server if deploy failed", guarded by `if: ${{ failure() }}`, runs after the existing deploy step and only fires when it failed.
- Reuses the same SSH connection secrets (`SSH_HOST`, `SSH_USER`, `SSH_PORT`, `SSH_KEY`) as the deploy step — no new credential surface.
- Runs `sudo docker system prune -af` (unused images, stopped containers, build cache — no `--volumes`, so DB data volumes are never touched) then `df -h /` to log resulting free space.
- Removed `script_stop: true` from the deploy step, which isn't a supported input on the pinned `appleboy/ssh-action` version and was the cause of the `Unexpected input(s)` warning seen in the failing run.

## Task Commits

1. **Task 1: Remove invalid script_stop input and add failure-triggered docker prune step** - committed as part of this quick task.

## Files Created/Modified

- `.github/workflows/deploy.yml` - removed `script_stop: true`; added a `failure()`-guarded cleanup step running `docker system prune -af` + `df -h /` on infrabox667.

## Decisions Made

- No auto-retry of the deploy: user confirmed short downtime is acceptable, so the next push or manual `workflow_dispatch` will succeed once space is freed.
- Kept the prune scoped to images/containers/build cache only (no `--volumes`) to avoid any risk to persistent data.

## Deviations from Plan

None.

## Issues Encountered

None.

## User Setup Required

None — reuses existing SSH secrets already configured for the deploy job.

## Next Phase Readiness

- deploy.yml is valid YAML; gate and build-push jobs unmodified.
- This recovery path is dormant until the next real deploy failure; can also be exercised manually by SSHing in and running the same prune command if disk fills up before the next CI run.

---
*Phase: 260723-dkp-docker-prune-on-deploy-failure*
*Completed: 2026-07-23*

## Self-Check: PASSED

- FOUND: .github/workflows/deploy.yml
- FOUND: .planning/quick/260723-dkp-docker-prune-on-deploy-failure/260723-dkp-SUMMARY.md
