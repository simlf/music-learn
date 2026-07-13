---
phase: 09-deploy-to-the-piano
plan: 02
subsystem: ui
tags: [svelte, tailwind, piano-keyboard, drills, tonal]

# Dependency graph
requires:
  - phase: 09-01
    provides: Responsive width-derived octave count and one-octave wrap-around note assignment
provides:
  - Merged wrong-answer feedback keyboard (Sketch 001 Variant A): one in-place keyboard, interval colors + gray ✕ extras + legend
  - Pitch-class (chroma) fallback in keyboardLayout.ts so exotic note spellings (F♭, C♭, E♯, B♯, double-flats) always highlight
  - Real >=44px white-key touch pitch at one octave on a 390px phone (removed a px min-width clamp fighting percentage layout; reduced phone-width page/card padding)
affects: [09-03, 09-04, 09-05, 09-06, phone-QA-passes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feedback-mode keyboard signal: a component prop being defined (even as an empty Set) toggles behavior, not a separate boolean flag (wrongLetters mirrors selected's pattern)"
    - "Shared reveal animation keyframe lives in app.css (not component-scoped) so multiple consumers (page + component) reference one definition with one prefers-reduced-motion guard"
    - "Note-to-key assignment: letter-string match first, chroma/pitch-class match as a fallback only when letter-match finds zero candidates - keeps the ascending-cursor/wrap-around algorithm unchanged while covering every enharmonic tonal can produce"
    - "Phone-width layout budget: compute total horizontal chrome (page padding + card border + card padding) against the container width one octave needs (352px = 8 * 44px), and split Tailwind padding responsively (tight below `sm`, unchanged at/above it) rather than redesigning the card"

key-files:
  created: []
  modified:
    - src/app.css
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/components.test.ts
    - src/lib/components/keyboardLayout.ts
    - src/lib/components/keyboardLayout.test.ts
    - src/routes/drills/+page.svelte
    - src/routes/+page.svelte
    - tests/drills.e2e.test.ts

key-decisions:
  - "Wrong-answer construction feedback collapses to ONE transforming keyboard (interval colors + gray ✕ extras + one-line legend), replacing the two-keyboard + text-diff layout, per the user's locked Sketch 001 Variant A directive"
  - "candidatesForNote's exotic-spelling fallback resolves by chroma (0-11) only when the primary letter-match walk finds zero candidates - every chroma maps to exactly one key kind in this layout (7 natural chromas to white keys, 5 accidental chromas to black keys), so it is unambiguous and composes with the existing wrap-around logic unchanged"
  - "Removed PianoKeyboard's fixed `min-width: 44px` per-key CSS clamp; the real >=44px touch pitch at one octave now comes from the container being wide enough (responsive Tailwind padding), not from clamping key width independently of its percentage position"
  - "No CSS min-width added to .piano-keyboard itself as a universal floor - that would risk horizontal overflow/scroll on viewports narrower than the 390px checkpoint target, which the padding fix does not claim to cover"

patterns-established:
  - "Pattern 1: Component props that are 'defined vs undefined' (not just truthy/falsy) as an explicit mode signal, keeping the undefined case byte-identical to pre-feature behavior"
  - "Pattern 2: Chroma-based fallback matching for enharmonic-spelling-tolerant UI, layered under (never replacing) an existing letter/name-based primary match"

requirements-completed: [PLAT-01]

coverage:
  - id: D1
    description: "Wrong construction answer renders ONE keyboard that transforms in place: interval colors for the correct chord, gray + ✕ for the user's extra notes, and a legend explaining both colors"
    requirement: "PLAT-01"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page wrong construction answer teaches"
        status: pass
      - kind: unit
        ref: "src/lib/components/components.test.ts#feedback mode (wrongLetters defined)"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint at 390px width"
        status: pass
    human_judgment: true
    rationale: "Color reading, the ✕ overlay, legend clarity, and reduced-motion behavior are visual; the user directly approved this live in a browser before the defects below were found."
  - id: D2
    description: "Exotic note spellings (F♭, C♭, E♯, B♯, double-flats like A♭♭) now resolve to a key via a chroma/pitch-class fallback instead of being silently dropped from the highlight map"
    verification:
      - kind: unit
        ref: "src/lib/components/keyboardLayout.test.ts#assignNotesToKeys - exotic spellings (chroma/pitch-class fallback, 09-02 defect fix)"
        status: pass
      - kind: unit
        ref: "src/lib/components/components.test.ts#exotic-spelling reveal (Dbm, 09-02 defect fix)"
        status: pass
    human_judgment: false
  - id: D3
    description: "One-octave keys keep a real >=44px touch pitch at 390px viewport width (no per-key overlap, no fused black-key blocks, no container overflow)"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#one-octave key geometry (09-02 defect fix)"
        status: pass
    human_judgment: true
    rationale: "The original defect (overlap/fused black keys/overflow) is a real-browser layout phenomenon that jsdom cannot reproduce (no layout engine, percentages don't resolve to px). The fix was verified by exact arithmetic (390px - 36px padding/border chrome = 354px container, 44.25px/white key) and a jsdom test locking the percentage-only geometry math, but a final look on an actual phone-width browser viewport is the authoritative confirmation and was not re-run by this agent (no browser-automation tool available in this session)."

duration: ~35min (continuation session)
completed: 2026-07-13
status: complete
---

# Phase 9 Plan 2: Merged Feedback Keyboard + Checkpoint Defect Fixes Summary

**Sketch 001 Variant A merged wrong-answer feedback keyboard, plus two checkpoint-discovered fixes: a chroma/pitch-class fallback so exotic note spellings (F♭, C♭, E♯, double-flats) always highlight, and removal of a fixed-px key-width clamp that was overlapping keys at phone width.**

## Performance

- **Duration:** ~35 min (continuation session, resuming after the human-verify checkpoint)
- **Completed:** 2026-07-13
- **Tasks:** 2 planned tasks (Task 1 RED, Task 2 GREEN) + 1 human-verify checkpoint (approved) + 2 checkpoint-discovered defect fixes
- **Files modified:** 8

## Accomplishments

- Wrong construction feedback is now a single in-place keyboard: interval colors for the correct chord, warm gray + ✕ for the user's extra notes, and a one-line legend - the old two-keyboard layout and "You played / Correct" text diff are gone (Sketch 001 Variant A, user-approved live in a browser).
- The stamp-in reveal animation is shared (moved into `app.css`) and disabled under `prefers-reduced-motion`.
- **Checkpoint defect fix (exotic spellings):** `keyboardLayout.ts`'s note-to-key assignment now falls back to a pitch-class (chroma) match whenever a note's letter-string has no candidate key - fixing every chord whose tonal spelling uses F♭, C♭, E♯, B♯, or a double-flat (e.g. Dbm's F♭ third, previously invisible on the reveal keyboard). This bug predates this plan (since Phase 1) but was only surfaced by this checkpoint's live Dbm test.
- **Checkpoint defect fix (phone-width overlap):** Removed `PianoKeyboard`'s `min-width: 44px` per-key CSS clamp, which was fighting the percentage-based `left`/`width` layout and causing ~10px key overlap, fused black-key blocks, and container overflow at one octave on a 390px phone. Reduced horizontal page/card padding at phone widths (both the drills card and the Lookup page, which share `PianoKeyboard`) so the container is genuinely >=352px wide at 390px - the width one octave needs for a real >=44px white-key touch pitch.

## Task Commits

Each task/fix was committed atomically:

1. **Task 1: Rewrite wrong-answer tests to expect merged keyboard + legend (RED)** - `143bb17` (test)
2. **Task 2: Implement wrong tokens, feedback-mode keyboard, merged construction reveal (GREEN)** - `9d26fb9` (feat)
3. **Checkpoint defect fix: exotic-spelling chroma fallback** - `075af92` (fix)
4. **Checkpoint defect fix: percentage-only key geometry + responsive phone-width padding** - `b69ec09` (fix)

**Plan metadata:** _pending final commit below_

## Files Created/Modified

- `src/app.css` - Wrong-answer tokens (`--color-wrong`, `--color-wrong-deep`) and the shared `stamp-in` keyframe with a `prefers-reduced-motion` guard
- `src/lib/components/PianoKeyboard.svelte` - `wrongLetters` feedback-mode prop, wrong-key fill/✕ rendering, per-key stamp class; removed the `min-width: 44px` clamp fighting percentage layout
- `src/lib/components/components.test.ts` - Feedback-mode assertions; new exotic-spelling (Dbm) reveal test; new one-/two-octave key-geometry percentage regression tests
- `src/lib/components/keyboardLayout.ts` - Chroma/pitch-class fallback in `candidatesForNote` for exotic spellings that have zero letter candidates
- `src/lib/components/keyboardLayout.test.ts` - Unit tests: F♭→E, double-flat A♭♭→G, E♯→F via wrap
- `src/routes/drills/+page.svelte` - Construction wrong-answer branch rewritten to the single transforming keyboard + legend; `wrongLetters` derived set; reduced horizontal padding below the `sm` breakpoint
- `src/routes/+page.svelte` - Reduced horizontal padding below the `sm` breakpoint (shares `PianoKeyboard` with drills)
- `tests/drills.e2e.test.ts` - Rewritten wrong-construction-answer scenario expecting the merged keyboard + legend

## Decisions Made

- Merged feedback keyboard implemented exactly per the locked Sketch 001 Variant A (user directive) - no played-vs-missed distinction, the answer itself is the message.
- Exotic-spelling fallback resolves by chroma only when letter-match yields zero candidates, preserving the existing ascending-cursor/wrap-around algorithm byte-for-byte for every already-working case.
- No universal CSS `min-width` floor added to `.piano-keyboard` - the 44px touch-pitch guarantee comes from the responsive page/card padding fix targeting the specified 390px viewport, not from a floor that could force horizontal overflow on narrower viewports.

## Deviations from Plan

Two defects were discovered by the user during the Task 3 human-verify checkpoint (not present in the original plan) and fixed under Rule 1 (auto-fix bugs) with the user's explicit direction to fix and re-verify:

### Auto-fixed Issues

**1. [Rule 1 - Bug] Exotic note spellings (F♭, C♭, E♯, B♯, double-flats) were silently dropped from the keyboard highlight map**
- **Found during:** Task 3 checkpoint (live Dbm wrong-answer test - the F♭ third never appeared)
- **Issue:** `candidatesForNote` matched keys by exact letter string only; spellings tonal legitimately produces (e.g. "F♭") share no letter string with any white key ("F") or black key's sharp/flat spelling, so they had zero candidates and were dropped. Pre-existing since Phase 1, inherited (and newly visible) via 09-01's "shows every note" wrap-around promise.
- **Fix:** Added a pitch-class (chroma) fallback in `candidatesForNote`, used only when the primary letter-match walk finds zero candidates. Every chroma maps to exactly one key kind in this layout (7 natural chromas to white keys, 5 accidental chromas to black keys), so the fallback is unambiguous.
- **Files modified:** `src/lib/components/keyboardLayout.ts`, `src/lib/components/keyboardLayout.test.ts`, `src/lib/components/components.test.ts`
- **Verification:** New unit tests (F♭→E, A♭♭→G, E♯→F via wrap) and a component-level Dbm reveal test all pass; full suite green.
- **Committed in:** `075af92`

**2. [Rule 1 - Bug] Phone-width (390px) one-octave keys overlapped, black keys fused into blocks, last key overflowed the container**
- **Found during:** Task 3 checkpoint (live 390px measurement: 274px container, keys clamped to 44px each at ~34px pitch)
- **Issue:** `.piano-keyboard__key` had `min-width: 44px` while `left`/`width` were percentage-based; on a narrow container this clamp overrode the percentage geometry, overlapping every white key by ~10px, fusing all 5 black keys into solid 44px blocks (losing the 2-group/3-group visual gaps), and overflowing the last key past the container edge.
- **Fix:** Removed the `min-width` clamp so geometry always derives from percentages. Reduced horizontal page/card padding at phone widths (`px-2` below Tailwind's `sm` breakpoint, unchanged `p-8`/`p-6` at/above it) on both the drills card and the Lookup page, so the container is genuinely >=352px at 390px (390 - 36px chrome = 354px, 44.25px/white key).
- **Files modified:** `src/lib/components/PianoKeyboard.svelte`, `src/lib/components/components.test.ts`, `src/routes/drills/+page.svelte`, `src/routes/+page.svelte`
- **Verification:** New jsdom geometry test locks the percentage-only key math (no fixed-px assertion is possible in jsdom, since it has no real layout engine); container-width arithmetic verified by hand; full suite + `npm run check` + `npm run build` all green.
- **Committed in:** `b69ec09`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bug, both discovered live during the Task 3 checkpoint and explicitly directed to be fixed before closing the plan)
**Impact on plan:** Both fixes are corrections to defects the checkpoint surfaced, not scope creep - they complete the "reads correctly on phone" success criterion the checkpoint exists to verify.

## Issues Encountered

None beyond the two documented defects above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Merged feedback keyboard, chroma-fallback highlighting, and phone-width key geometry are all in place and automated-test-covered.
- **Recommended before considering this fully closed on a real device:** a quick look at `/drills` and `/` (Lookup) at ~390px width to visually confirm the key-overlap fix in a real browser - jsdom cannot render real percentage-vs-px layout, so the fix was verified by arithmetic and a percentage-math regression test rather than a second live checkpoint (no browser-automation tool was available to this continuation agent). If anything still reads off, it is a fast follow-up, not a re-plan.
- No blockers for Phase 9's remaining plans (09-03 through 09-06).

---
*Phase: 09-deploy-to-the-piano*
*Completed: 2026-07-13*

## Self-Check: PASSED

All 8 modified files and the SUMMARY.md exist on disk; all 4 commit hashes (`143bb17`, `9d26fb9`, `075af92`, `b69ec09`) are present in git history.
