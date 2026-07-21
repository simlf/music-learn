# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.1 — Playability & Comprehension

**Shipped:** 2026-07-21
**Phases:** 12 (14-25) | **Plans:** 45 | **Timeline:** 2026-07-15 to 2026-07-21 (6 days, ~370 commits)

### What Was Built
- Playable inline keyboard on every page + audio memory (auto-play, pulse, study-mode arpeggio roll)
- Self-explaining drills: hint ladder, song provenance + filter, guided theory lessons with drill handoff
- Full French i18n (11 domains, parity-tested) behind a header EN|FR toggle
- Installable PWA + phone-first UX (bottom tab bar, question-first drills, action dock, icon tab bar)
- Contextual learning trio: /progressions earn-the-symbol drill, /voicings staged shell voicings, confidence dots + /progress calibration

### What Worked
- Sketch-first pipeline (sessions 4-6, sketches 008-020): every phase started with a locked design winner packaged into a project skill; zero design rework during implementation
- Pure-engine-first waves: TDD logic modules (progressions, shellVoicing, confidenceLog) in wave 1, thin UI layers after; kept 8-plan phase 25 clean under parallel-shaped planning even when execution serialized
- Post-execution review-fix loop: standard-depth review caught 6 real warnings (flat-key ghost bug, calibration bias) that tests missed; all fixed same-session with regression tests
- Recovery discipline: mid-run executor death (API drop) resumed cleanly from committed RED test via continuation agent

### What Was Inefficient
- Worktree parallelism degraded to sequential all milestone (unpushed local main diverging from origin/HEAD, #683); waves ran serial. Fix: push more often, or set worktree.baseRef:"head"
- On-device human verification accumulated instead of batching per phase: 6 deferred items at close spanning phases 09-25
- REQUIREMENTS.md never refreshed for v2.1 — phases 21-25 ran without REQ-IDs (sketch tags instead), weakening traceability gates
- STATE.md metrics tables drifted (stale test counts, missing phase rows) — low-value manual bookkeeping

### Patterns Established
- Staged-by-card-state pedagogy: rich teaching only while FSRS card is NEW/LEARNING, cold drill at REVIEW (extends fading-scaffold rule)
- Earn-the-symbol: answers hidden until derived + played, then stamped permanent (verdigris fill)
- Read-only drill surfaces against the SRS deck: new drills read card maturity, never write grades
- localStorage capped ring buffer for small append-only logs, keeping the Dexie cards DB migration-free
- Docked actions house rule: advance/answer controls pinned above the tab bar, never in scrolling content

### Key Lessons
1. Chroma-over-letters is not just a grading rule: letter-string matching caused the milestone's worst review finding (WR-01, flat-spelled ghosts invisible on 4/12 roots). Enforce at every new note-comparison site.
2. Test-first pays at review time: the 2 plans whose implementation landed before its RED test (25-06, 25-08) were exactly where review flagged coverage inconsistencies.
3. Confidence semantics need one owner: FSRS Hard = passing had to be decided once (WR-06) or the calibration view silently lies.
4. Ship via PR even solo: the PR-20 review+CI gate caught nothing new this time, but the merge-commit flow kept local/origin reconcilable after a 47-commit run.

### Cost Observations
- Model mix: opus for planning/fixing/security-audit, sonnet for execution/verification, haiku for plan-check/integration-check
- Phase 25 execution: ~1.9M subagent tokens across 8 executors + reviewer + fixer + verifier + auditor
- Notable: haiku plan-checker + integration-checker delivered full value at fraction of cost; sequential execution cost wall-clock, not tokens

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 active | 21 | Vertical slices, TDD theory engine, walking skeleton |
| v2.0 | 4 | 20 | Spike-first (006-009) grounding before any phase planning |
| v2.1 | 12 | 45 | Sketch-first design pipeline + post-execution review-fix loop + PR shipping |

### Cumulative Quality

| Milestone | Tests | svelte-check | Notes |
|-----------|-------|--------------|-------|
| v1.0 | ~600 | 0 errors | reference chord matrix as correctness proof |
| v2.0 | ~900 | 0 errors | FSRS numbers pinned to spike blueprint |
| v2.1 | 1450 | 0 errors | EN/FR parity + collision guards in suite |

### Top Lessons (Verified Across Milestones)

1. Validate-before-build (spikes in v2.0, sketches in v2.1) eliminates rework better than any review gate.
2. Pure logic modules first, UI as a thin layer: held from spellChord (v1.0) through confidenceLog (v2.1).
3. Locked constraint lists (chroma grading, no em dashes, MC-only ear naming, inline keyboards) survive milestones better than per-phase specs — keep them in skills, not docs.
