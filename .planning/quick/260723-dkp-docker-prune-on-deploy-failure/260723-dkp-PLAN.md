---
phase: 260723-dkp-docker-prune-on-deploy-failure
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/deploy.yml
autonomous: true
requirements:
  - DEPLOY-CI-03  # recover disk space on the server when deploy fails from a full disk

must_haves:
  truths:
    - "If the deploy step fails for any reason, a follow-up step SSHes into infrabox667 and runs `docker system prune -af` to reclaim disk space, then prints `df -h /` to confirm free space in the logs."
    - "The invalid `script_stop` input (not supported by appleboy/ssh-action v1.2.5, was producing a Warning in the logs) is removed."
    - "deploy.yml remains valid YAML."
artifacts:
    - .github/workflows/deploy.yml
key_links:
    - "appleboy/ssh-action's failure() context is only true when a PRIOR step in the same job failed, so the cleanup step must be placed after the deploy step in the same `deploy` job."
---

<objective>
The Oracle server hosting music-learn (infrabox667) is low on disk. Deploy failed with `no space left on device` while writing `~/.docker/config.json` during `docker login`. Add a recovery step to `.github/workflows/deploy.yml`'s `deploy` job: if the SSH deploy step fails, run `docker system prune -af` on the server over SSH to free space from unused images/containers/build cache, so the next deploy run has room to succeed. Short downtime is acceptable; no auto-retry required this pass.

Also drop the `script_stop: true` input on the ssh-action step — it's not a valid input for appleboy/ssh-action v1.2.5 and was the source of the `Unexpected input(s)` warning in the failing run's logs.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.github/workflows/deploy.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove invalid script_stop input and add failure-triggered docker prune step</name>
  <files>.github/workflows/deploy.yml</files>
  <action>
In the `deploy` job's existing SSH step ("Deploy on infrabox667 over SSH"), remove the `script_stop: true` line (invalid input for appleboy/ssh-action@0ff4204d59e8e51228ff73bce53f80d53301dee2 / v1.2.5; the script already starts with `set -e` so this had no functional effect beyond a spurious warning).

Add a new step immediately after it, named "Free disk space on the server if deploy failed", guarded by `if: ${{ failure() }}` (fires only when the preceding deploy step in this job failed). Use the same `appleboy/ssh-action` pin and the same `host`/`username`/`port`/`key` secrets. Its script: `sudo docker system prune -af` followed by `df -h /` (to log resulting free space). No `envs:` needed since it doesn't reference GHCR credentials.
  </action>
  <verify>
    <automated>python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.github/workflows/deploy.yml'))
steps = d['jobs']['deploy']['steps']
deploy_step = next(s for s in steps if s.get('name','').startswith('Deploy on infrabox667'))
assert 'script_stop' not in deploy_step.get('with', {}), 'script_stop must be removed'
cleanup = next((s for s in steps if s.get('if') == '${{ failure() }}'), None)
assert cleanup is not None, 'missing failure()-guarded cleanup step'
assert 'docker system prune' in cleanup['with']['script'], cleanup['with']['script']
assert cleanup['with']['host'] == deploy_step['with']['host']
print('OK')
PY</automated>
  </verify>
  <done>deploy.yml's deploy job no longer sets script_stop; a new step guarded by if: ${{ failure() }} runs `docker system prune -af` (and `df -h /`) over SSH using the same connection secrets as the deploy step; file is valid YAML.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CI runner -> infrabox667 over SSH | Same trust boundary as the existing deploy step; reuses the same secrets, no new credential surface. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-dkp-01 | Denial of Service (data loss) | `docker system prune -af` | low | accept | Command only removes unused images, stopped containers, and build cache; it does not include `--volumes`, so named/anonymous volumes backing running or stopped containers (e.g. any DB data) are never removed. |
| T-dkp-02 | Elevation of Privilege | new SSH step | low | accept | Uses the exact same secrets/scope as the pre-existing deploy step; no new permissions introduced. |

No package-manager installs are introduced by this change.
</threat_model>

<verification>
Run the task's verify block; must print `OK`. Runtime behavior (that the step actually fires and frees space on a real failed deploy) can only be observed on the next real failing deploy run.
</verification>

<success_criteria>
- `script_stop: true` removed from the deploy step.
- New step in the `deploy` job, guarded by `if: ${{ failure() }}`, SSHes into the same host and runs `docker system prune -af` + `df -h /`.
- deploy.yml is valid YAML; gate/build-push jobs unmodified.
</success_criteria>

<output>
Create `.planning/quick/260723-dkp-docker-prune-on-deploy-failure/260723-dkp-SUMMARY.md` when done.
</output>
</tasks>
