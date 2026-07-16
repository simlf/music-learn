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

## Already reconciled this session (do not redo)

- MILESTONE TRACKING fixed by hand (ROADMAP was already correct). `STATE.md` now: milestone v2.1 / milestone_name "Playability & Comprehension" / status cleaned off the stale "verifying"+"15-05" / progress rescoped to v2.1 (1/6 phases, 7/7 plans). `PROJECT.md` "Current Milestone" section rewritten to v2.1 with v2.0 marked shipped; footer dated 2026-07-16. Note: this was a surgical edit, NOT a `/gsd-complete-milestone` + `/gsd-new-milestone` ceremony (v2.1 phases were already planned/executing, so the ceremony didn't fit). If a formal v2.0 archive is wanted later, run `/gsd-complete-milestone` — but check it won't disturb the in-progress v2.1 phase dirs first.

## Also closed out this session

- INFO FINDINGS IN-01/02/03 all fixed (commits 8eb4025, 77a4681, 9b7244f; report bf814d2). 1008/1008 tests, `npm run check` clean. All 6 review findings now resolved in code except WR-03 (which is test-verified as non-reproducing).
- WR-01 VERIFIED IN A REAL BROWSER (mobile 375x812): on /drills construction the docked keyboard shows all 13 keys with NO collapse handle even when `music-learn:docked-keyboard-collapsed=true`; on /theory (inspectable) the handle IS present and collapse/expand/persist works. Confirmed the `inputRequired` flag differentiates correctly — the sole answer keyboard cannot be hidden. No console errors anywhere.
- SECURITY GATE closed: `15-SECURITY.md` written, 8 threats all closed (7 mitigated + 1 accepted: T-15-05 sound reuse), `threats_open: 0`, status verified. Pure client-side UI, no new deps/network/auth. ASVS L1 short-circuit (register authored at plan time), no auditor spawn needed.
- WR-03 status: NOT reproduced. The fixer's exact repro unit test + the verifier's Mode C ordering regression both pass. In-browser Mode C (embedded BuildSession) was not chased because a fresh deck has no due formula-build card and seeding wasn't worth it against two green tests. If you want the belt-and-suspenders browser check, seed a due `chord-formula` card in `formula-build` mode and confirm the root key scrolls into view on first render.

## Outstanding — what the next agent could pick up

Nothing blocks.

1. NEXT PHASE = 16 (Hear the Chord — auto-play + synced pulse on BUILD reveal, HEAR-01/02). No `16-CONTEXT.md` yet.
   Recommended start: `/gsd-discuss-phase 16` then `/gsd-plan-phase 16`. Phase 16 also touches BuildSession reveal — near the WR-03 code, worth a glance while there.

## Key artifacts

- `.planning/phases/15-playable-keyboard-everywhere/15-VERIFICATION.md` — goal proof
- `.planning/phases/15-playable-keyboard-everywhere/15-REVIEW.md` — findings
- `.planning/phases/15-playable-keyboard-everywhere/15-REVIEW-FIX.md` — fixes applied (status: partial, WR-03 open)
- `.planning/ROADMAP.md` — Phase 16 spec at "### Phase 16: Hear the Chord"
- Dock core: `src/lib/keyboard/dockContext.svelte.ts`, `dockCollapse.ts`, `src/lib/components/KeyboardDock.svelte`
