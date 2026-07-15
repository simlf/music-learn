# Phase 15 Handoff — Playable Keyboard Everywhere

status: phase complete + verified + reviewed + warnings fixed
updated: 2026-07-16
last commit: 2009ab2 (on main, pushed to origin/main — verified via ls-remote)

## First thing on the new computer

```bash
git checkout main && git pull   # remote has everything through 2009ab2
```

All Phase 15 work is committed AND pushed (an auto-push hook pushes each commit). Nothing local-only. Working tree was clean at handoff.

## What is DONE (do not redo)

Phase 15 executed end-to-end via `/gsd-execute-phase 15`:

- 7/7 plans complete across 4 waves (ran sequentially on main — worktree isolation auto-degraded per #683 because local HEAD was ahead of origin/HEAD at start; harmless).
- Shipped: a shared docked keyboard. One fixed viewport-bottom keyboard that every page registers into via a reactive single-slot context (`src/lib/keyboard/dockContext.svelte.ts` + `dockCollapse.ts` + `src/lib/components/KeyboardDock.svelte`, hosted in `src/routes/+layout.svelte`). Replaces the old per-page inline keyboards on Lookup, Theory, Scales, Drills, Recall (incl. embedded BuildSession Mode C).
- Requirements KBD-01 / KBD-02 / KBD-03 all marked `[x]` in REQUIREMENTS.md, traced to Phase 15.
- Verification PASSED 3/3 must-haves (`15-VERIFICATION.md`). ROADMAP phase 15 checkbox `[x]` with completion date.
- Full test suite green: 1008/1008 Vitest. `npm run check` 0 errors. `npm run build` succeeds.
- Code review done (`15-REVIEW.md`): 0 blockers, 3 warnings, 3 info.
- Warnings fixed via `/gsd-code-review 15 --fix` (`15-REVIEW-FIX.md`, status: partial):
  - WR-02 fixed (3f42a3d) — cleared leaked `hearResolution` setTimeout in `theory/+page.svelte`.
  - WR-01 fixed (84bfaa6) — new `inputRequired` flag on dock config; `KeyboardDock` ignores persisted-collapsed and hides the collapse handle when the surface needs the keyboard to answer (ScaleKeyboardDrill, BuildSession Mode C, Drills construction, Recall Mode A). Regression test added. Touched 7 files. This is a collapse-UX change across 5 surfaces.
  - WR-03 NOT changed (502bef1) — possible scroll-before-mount race in embedded BuildSession; repro test written, defect did not reproduce statically. Left source untouched.

## Outstanding — what the next agent could pick up

Nothing blocks. Ordered by value:

1. RECONCILE MILESTONE TRACKING (do before deeper v2.1 work).
   Mismatch: `PROJECT.md` header + `STATE.md` say milestone v2.0 / current_phase 13, but Phases 15-20 were added to ROADMAP as v2.1 without a `/gsd-new-milestone` cutover. Also `STATE.md` still reads `status: verifying` / `stopped_at: Completed 15-05-PLAN.md` — stale; `phase.complete` left it because it reported `is_last_phase: true` (next_phase null) even though Phases 16-20 sit unstarted in ROADMAP. Fix path: run `/gsd-new-milestone` (or hand-correct STATE.md milestone/current_phase/status) so v2.1 tracking is coherent.

2. NEXT PHASE = 16 (Hear the Chord — auto-play + synced pulse on BUILD reveal, HEAR-01/02). No `16-CONTEXT.md` yet.
   Recommended start: `/gsd-discuss-phase 16` then `/gsd-plan-phase 16`. Note Phase 16 also touches BuildSession reveal — WR-03 (below) lives near that code, worth folding in.

3. VERIFY THE TWO UI ITEMS IN A REAL BROWSER (Web MIDI / phone; iOS has no MIDI, on-screen path is primary):
   - WR-01: manual phone pass on the collapse-UX change across the 5 answer-required surfaces — confirm the keyboard truly can't be hidden mid-drill and the handle absence reads right.
   - WR-03: open embedded Recall Mode C first render, confirm the root key scrolls into view. Closes the `partial` status in 15-REVIEW-FIX.md.

4. OPTIONAL: info findings IN-01/02/03 from 15-REVIEW.md not fixed (default scope was critical+warning). Run `/gsd-code-review 15 --fix --all` to include them. IN-01 = empty keyboard on formula-mode interval/scale-degree recall cards; IN-02 = needless per-tap re-registration in ScaleKeyboardDrill; IN-03 = `getDockRegistry()` return type hides the undefined case.

5. OPTIONAL: `/gsd-secure-phase 15` — security capability is enabled and no `15-SECURITY.md` exists. Low value: phase is pure client-side UI (no auth/network/data boundary).

## Key artifacts

- `.planning/phases/15-playable-keyboard-everywhere/15-VERIFICATION.md` — goal proof
- `.planning/phases/15-playable-keyboard-everywhere/15-REVIEW.md` — findings
- `.planning/phases/15-playable-keyboard-everywhere/15-REVIEW-FIX.md` — fixes applied (status: partial, WR-03 open)
- `.planning/ROADMAP.md` — Phase 16 spec at "### Phase 16: Hear the Chord"
- Dock core: `src/lib/keyboard/dockContext.svelte.ts`, `dockCollapse.ts`, `src/lib/components/KeyboardDock.svelte`
