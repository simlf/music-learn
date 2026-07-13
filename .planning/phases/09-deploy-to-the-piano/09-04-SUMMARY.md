---
phase: 09-deploy-to-the-piano
plan: 04
subsystem: ui
tags: [svelte, vibration-api, touch-action, css-media-queries, pwa]

# Dependency graph
requires:
  - phase: 09-02
    provides: Merged feedback keyboard and phone-width key geometry fixes on PianoKeyboard.svelte
provides:
  - Immediate press-down visual cue on interactive keys, additive to the existing selected-hatch state (D-11)
  - Guarded, feature-detected navigator.vibrate haptic on key press, no-op where unsupported (D-11)
  - Press-cue motion suppressed under prefers-reduced-motion (D-11)
  - Keyboard-scoped gesture hygiene: touch-action, -webkit-touch-callout, user-select hardening against double-tap zoom and long-press callout (D-12)
affects: [09-05, 09-06, post-https-device-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native Vibration API called through a small feature-detected helper (typeof navigator.vibrate === 'function') rather than a library, kept entirely inside PianoKeyboard's interactive path so display mode never triggers it"
    - "Press-cue class layers additively alongside interval-role/selected/wrong classes rather than replacing them, matching the app's existing additive-token convention"

key-files:
  created: []
  modified:
    - src/lib/components/PianoKeyboard.svelte
    - src/app.css
    - src/lib/components/components.test.ts

key-decisions:
  - "Press-cue and haptic handlers are wired only on interactive-mode keys (pointerdown), leaving display-mode keys untouched so the existing non-interactive rendering path has zero behavior change"
  - "navigator.vibrate call duration kept to a single short (~10ms) pulse, no repeating pattern, per the plan's own DoS mitigation for T-09-04"

patterns-established:
  - "Pattern: guard any native browser capability (Vibration API here) with an explicit typeof feature-detect helper co-located with the call site, so unsupported browsers/environments (iOS, jsdom) no-op instead of throwing"

requirements-completed: [PLAT-01]

coverage:
  - id: D1
    description: "Touching a key gives an immediate press-down visual cue (scale/shade), additive to the existing selected-hatch state"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#interactive touch press-cue class assertions"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint (live desktop browser: pointerdown adds --pressed class with scale(0.94), cleared on pointerup)"
        status: pass
    human_judgment: true
    rationale: "Visual/tactile feel of the press cue is a judgment call best confirmed by hand; the user (orchestrator, standing in for the developer) verified it live in a browser at the checkpoint."
  - id: D2
    description: "An optional light haptic fires via navigator.vibrate where supported (Android), feature-detected to no-op elsewhere"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#navigator.vibrate mocked call + absent-API no-throw case"
        status: pass
    human_judgment: true
    rationale: "The felt haptic buzz is an Android-device-only physical sensation that cannot be observed in a browser or jsdom. Automated coverage proves the feature-detected call contract (mocked call + no-throw when absent); the actual felt vibration was NOT device-tested this session because the app is HTTP-only until the HTTPS deploy (PLAT-02, user-handled, out of this plan's scope) and the user could not install/test on the phone. A follow-up todo (.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md) already tracks the device re-check post-deploy; do not re-create it."
  - id: D3
    description: "The press-cue motion is disabled under prefers-reduced-motion"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "grep-verified prefers-reduced-motion guard present in src/lib/components/PianoKeyboard.svelte / src/app.css (acceptance criterion), npm run check/build green"
        status: pass
    human_judgment: false
  - id: D4
    description: "The keyboard surface disables double-tap zoom and the long-press callout/selection so taps register cleanly"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "src/lib/components/components.test.ts#touch-action / gesture-hygiene style assertions"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human-verify checkpoint (computed-style check confirmed touch-action: manipulation and user-select: none on the keyboard surface)"
        status: pass
    human_judgment: false

duration: ~15min (continuation session, resuming after the human-verify checkpoint)
completed: 2026-07-14
status: complete
---

# Phase 9 Plan 4: Press-Cue, Guarded Haptic, and Gesture Hygiene Summary

**Interactive PianoKeyboard keys now show an immediate scale-down press cue on pointerdown (additive to the existing selected-hatch state), fire a single ~10ms navigator.vibrate pulse feature-detected for Android support, suppress that motion under prefers-reduced-motion, and the keyboard surface hardens touch-action/callout/user-select so taps register without double-tap zoom or long-press text selection (D-11, D-12).**

## Performance

- **Duration:** ~15 min (continuation session, resuming after the Task 3 human-verify checkpoint)
- **Completed:** 2026-07-14
- **Tasks:** 2 planned tasks (Task 1 RED, Task 2 GREEN) + 1 human-verify checkpoint (approved with one item device-deferred)
- **Files modified:** 3

## Accomplishments

- `components.test.ts` gained an interactive-touch describe block: pointerdown calls a mocked `navigator.vibrate` with a short numeric duration when the API exists; deleting `navigator.vibrate` confirms pointerdown does not throw (feature-detected no-op); the keyboard surface carries a `touch-action` style that kills double-tap zoom; the pressed-cue class layers alongside (not over) the interval-role/selected classes.
- `PianoKeyboard.svelte` interactive keys now handle `pointerdown` to (a) set a transient `piano-keyboard__key--pressed` class and (b) call a small feature-detected helper (`typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'`) that fires a single short vibration; display-mode keys are untouched, preserving the non-interactive rendering path exactly.
- `.piano-keyboard__key--pressed` CSS gives a brief `scale(0.94)` press-down cue, wrapped in `@media (prefers-reduced-motion: reduce)` to suppress the motion (taps still register, just without the animated scale).
- The keyboard surface and keys carry `touch-action: manipulation`, `-webkit-touch-callout: none`, and `user-select: none`, scoped to the keyboard element only (no pull-to-refresh blocking or leave-confirmation, per D-12's explicit non-selection).
- Full suite (298 tests), `npm run check`, and `npm run build` all green.
- **Task 3 checkpoint outcome:** press cue and gesture hygiene were verified live in a desktop browser (pointerdown added the `--pressed` class with the `scale(0.94)` transform, cleared cleanly on pointerup; computed styles confirmed `touch-action: manipulation` and `user-select: none` on the keyboard). The haptic buzz itself was **not** device-tested this session: the app is currently HTTP-only until the HTTPS deploy (PLAT-02, separately user-handled and out of this plan's scope), so the user could not install/test the PWA on an Android phone to feel the vibration. Automated coverage (mocked-call + no-throw-when-absent) stands in for the device check; the user instructed proceeding rather than blocking on the deploy. A follow-up todo (`.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md`, committed at `3af7eae`) already tracks re-verifying PWA install and the felt haptic once HTTPS is live.

## Task Commits

Each task was committed atomically:

1. **Task 1: Encode press-cue + haptic + gesture-hygiene expectations (RED first)** - `ab0b618` (test)
2. **Task 2: Implement press-cue, guarded haptic, and keyboard gesture hygiene (GREEN)** - `2456d78` (feat)
3. **Task 3: Human verify — checkpoint approved, haptic deferred to post-HTTPS-deploy todo** - no code commit (verification only); deferred-check todo already committed at `3af7eae`

**Plan metadata:** _pending final commit below_

## Files Created/Modified

- `src/lib/components/PianoKeyboard.svelte` - pointerdown press-cue handler + feature-detected `navigator.vibrate` helper on interactive keys; `touch-action`, `-webkit-touch-callout`, `user-select` gesture hygiene on the keyboard surface; `.piano-keyboard__key--pressed` scale-cue rule guarded by `prefers-reduced-motion`
- `src/app.css` - shared reduced-motion guard support for the press-cue rule
- `src/lib/components/components.test.ts` - interactive-touch describe block: mocked-vibrate call assertion, absent-API no-throw assertion, touch-action/gesture-hygiene style assertion, additive-class assertion

## Decisions Made

- Press-cue and haptic handlers wired only into the interactive-mode key template (not display mode), so the existing non-interactive rendering path has zero behavior change.
- A single short (~10ms) `navigator.vibrate` pulse only, no repeating pattern, matching the plan's own T-09-04 DoS mitigation.
- Haptic device-verification deferred to a dedicated post-HTTPS-deploy todo rather than blocking this plan's closure, per explicit user instruction to keep going; no second todo was created (the orchestrator's todo already covers this).

## Deviations from Plan

None - plan executed exactly as written. Task 3's outcome (haptic unverifiable on this device due to the HTTP-only deploy state) was explicitly anticipated by the plan's own `how-to-verify` step 5 ("If no Android device is available... note the haptic as unverifiable on that device"), so this is expected checkpoint behavior, not a deviation.

## Issues Encountered

None beyond the anticipated HTTP-only device-testing limitation described above, which the plan itself accounted for.

## User Setup Required

None - no external service configuration required. The HTTPS deploy referenced above (PLAT-02) is tracked separately and is user-handled outside this plan's scope.

## Next Phase Readiness

- Press cue, guarded haptic, reduced-motion respect, and keyboard-scoped gesture hygiene are all in place and automated-test-covered; visual/gesture behavior additionally live-verified in a real browser.
- One item remains device-unverified pending the HTTPS deploy: the felt Android haptic. Tracked at `.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md` - no action needed here, do not duplicate.
- No blockers for Phase 9's remaining plans (09-05, 09-06 are already complete per STATE.md; this closes out 09-04).

---
*Phase: 09-deploy-to-the-piano*
*Completed: 2026-07-14*

## Self-Check: PASSED

All modified files exist on disk (`src/lib/components/PianoKeyboard.svelte`, `src/app.css`, `src/lib/components/components.test.ts`); the deferred-todo file exists (`.planning/todos/pending/verify-pwa-install-and-haptics-after-https-deploy.md`); all 3 referenced commit hashes (`ab0b618`, `2456d78`, `3af7eae`) are present in git history.
