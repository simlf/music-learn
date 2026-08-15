---
phase: 38-midi-connection-progressive-enhancement
plan: 04
subsystem: testing
tags: [playwright, e2e, web-midi, chromium, uat, deferred-verification]

requires:
  - phase: 38-midi-connection-progressive-enhancement (plan 03)
    provides: "src/lib/components/MidiStatus.svelte: the masthead MIDI chip with data-testid=\"midi-status\" and data-midi-state"
provides:
  - "tests/e2e/midi.spec.ts: three deterministic Chromium tests proving the connect click always reaches a terminal state, a browser without Web MIDI shows zero MIDI chrome while the existing lookup flow still works, and navigating away mid-connect raises no page error"
  - "38-UAT.md: the recorded, explicit deferral of the four hardware-in-the-loop checks (device connect/disconnect/reconnect naming, on-screen-keyboard/iOS non-regression) that no automated test in this repo can substitute for"
affects: [39-midi-play-to-answer]

tech-stack:
  added: []
  patterns:
    - "Terminal-state assertion over exact-value assertion: Test 1 asserts the chip lands on ANY of the terminal data-midi-state values (no-device, connected, denied, error) rather than one hardcoded value, since headless Chromium's own MIDI-stack resolution is an environment detail while 'never stuck on connecting' is the actual product guarantee"
    - "Prototype-level feature-removal init script: Test 2 defeats Web MIDI feature-detection by deleting requestMIDIAccess from Navigator.prototype (not the navigator instance) via page.addInitScript, so Chromium stands in for Safari/iOS deterministically"
    - "Explicit defer path for hardware-only UAT: when the physical instrument is unavailable, the checkpoint's four checks are recorded as human_needed in 38-UAT.md and mirrored as a Deferred Verification row in STATE.md, rather than silently skipped or assumed passing"

key-files:
  created:
    - tests/e2e/midi.spec.ts
    - .planning/phases/38-midi-connection-progressive-enhancement/38-UAT.md
  modified:
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "MIDI-01 and MIDI-04 are left UNCHECKED in REQUIREMENTS.md even though prior plans (38-01/38-02) auto-checked them, because both requirements' hardware-observable behavior (device detected/disconnected with the real instrument, and the phase's hardware behavior proven end to end) is exactly what this plan's Task 2 defers. Requirement completion is corrected here, not silently left inconsistent."
  - "Task 2's checkpoint was resolved via the plan's documented 'defer' branch: the developer does not have the physical USB piano available right now and explicitly typed defer rather than approving unverified hardware claims."

requirements-completed: []

coverage:
  - id: D1
    description: "tests/e2e/midi.spec.ts: connect click always reaches a terminal connection state (never stuck on connecting), a browser without Web MIDI shows zero MIDI chrome while the existing on-screen-keyboard lookup flow still works, and navigating away mid-connect leaves no page error and a working destination page"
    requirement: MIDI-04
    verification:
      - kind: e2e
        ref: "tests/e2e/midi.spec.ts (3/3 tests, run: npm run test:e2e -- tests/e2e/midi.spec.ts)"
        status: pass
      - kind: e2e
        ref: "npm run test:e2e (whole Playwright suite, 69/69)"
        status: pass
      - kind: unit
        ref: "npm test (151 files / 2608 tests)"
        status: pass
      - kind: other
        ref: "npm run check (0 errors, 0 warnings)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hardware-in-the-loop UAT with the physical USB piano: connect with instrument attached (device name shown, chip fits masthead), unplug mid-session (disconnected wording appears within seconds, no reload), re-plug mid-session (device name returns, repeatable), and the on-screen keyboard plus iOS no-chip path stay unaffected"
    requirement: MIDI-01
    verification: []
    human_judgment: true
    rationale: "jsdom has no Web MIDI implementation at all, and Playwright's Chromium has a Web MIDI implementation but no physical instrument attached, so WebMidi.inputs is always empty there. Neither test runtime can produce a real device name or a real plug/unplug transition. The developer's physical USB piano was not available at plan close; the checkpoint was explicitly deferred (not approved, not failed) per the plan's own defer branch. Recorded in 38-UAT.md with a matching STATE.md Deferred Verification row."

duration: 20min
completed: 2026-08-04
status: complete
---

# Phase 38 Plan 04: E2E MIDI Spec and Hardware UAT Deferral Summary

**Real-Chromium Playwright spec proving the connect-terminates guarantee and the no-Web-MIDI-chrome path (3/3 tests, whole suite 69/69 green), plus an explicit `human_needed` deferral of the four hardware-in-the-loop checks that no automated test can substitute for**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-04T22:30:00+02:00
- **Completed:** 2026-08-04T23:10:00+02:00
- **Tasks:** 2 (1 executed automatically, 1 resolved via the plan's documented `defer` checkpoint branch)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `tests/e2e/midi.spec.ts` proves, in real Chromium: (1) tapping the chip always reaches a terminal `data-midi-state` (never stuck on `connecting`) — asserted against the SET of terminal values, not one hardcoded value, since headless Chromium's own resolution is an environment detail while the terminal-state guarantee is the real product invariant; (2) removing `requestMIDIAccess` from `Navigator.prototype` via an init script produces zero `midi-status` elements while the existing on-screen-keyboard lookup flow still reaches a visible `chord-result`; (3) navigating away mid-connect-attempt leaves the destination page rendering with no `pageerror` events collected.
- Whole regression proof stayed green: `npm run test:e2e` 69/69 (whole Playwright suite, not just the new spec), `npm test` 151 files / 2608 tests, `npm run check` 0 errors/0 warnings.
- Task 2's hardware checkpoint was presented and the developer chose `defer`: the physical USB piano is not available right now. Per the plan's own `defer` branch, this is recorded as an explicit `human_needed` gap, not silently converted into a pass.
- `.planning/phases/38-midi-connection-progressive-enhancement/38-UAT.md` records all four hardware checks as `pending`, with their exact expected behavior copied from the plan and the two independent reasons no automation can substitute (jsdom has no Web MIDI implementation at all; Playwright's Chromium has the implementation but no physical instrument, so `WebMidi.inputs` is always empty there).
- `.planning/STATE.md` gained a Phase 38 row in the Deferred Verification table, matching the existing Phase 34/35 row format, with resume instruction `/gsd-verify-work 38 (see 38-UAT.md)`.
- `.planning/REQUIREMENTS.md`: MIDI-01 and MIDI-04 corrected to unchecked. Both had been auto-checked by the requirement-completion tooling after plans 38-01/38-02 (which also declared these same requirement IDs in their frontmatter), but the hardware-observable half of both requirements — device detected/disconnected with the real instrument for MIDI-01, and the phase's hardware behavior proven end to end for MIDI-04 — is exactly what Task 2 defers. Leaving them checked would have been a false completion claim.

## Task Commits

Each task was committed atomically:

1. **Task 1: Playwright spec for the connect path and the no-Web-MIDI path** - `dac416a` (test)

Task 2 (`checkpoint:human-verify`) produced no code commit of its own; its outcome (deferral) is captured in this plan's closing docs commit alongside this SUMMARY, STATE.md, and REQUIREMENTS.md.

**Plan metadata:** committed together with this SUMMARY (see final commit below).

## Files Created/Modified
- `tests/e2e/midi.spec.ts` - three Chromium-only Playwright tests: terminal-state connect, no-Web-MIDI-chrome + existing lookup flow, navigate-away-is-clean
- `.planning/phases/38-midi-connection-progressive-enhancement/38-UAT.md` - the four hardware-in-the-loop checks recorded `pending`/`human_needed`, with their expected behavior and the no-automated-substitute rationale
- `.planning/STATE.md` - Phase 38 row added to the Deferred Verification table
- `.planning/REQUIREMENTS.md` - MIDI-01 and MIDI-04 corrected from `[x]` back to `[ ]`, each with an inline note pointing to 38-UAT.md

## Decisions Made
- MIDI-01 and MIDI-04 are left unchecked (see key-decisions above): the hardware-observable behavior these requirements describe has not been proven with the real instrument, and this plan's own acceptance criteria are explicit that a passing automated command is never sufficient evidence for the four hardware checks.
- Task 2's checkpoint was resolved via the plan's own `defer` branch (not `approved`, not a failure report): the developer stated the physical USB piano is not currently available.

## Deviations from Plan

None beyond what Task 1 already reported in the prior checkpoint context (which is Task 1's own commit, already completed before this continuation). This continuation followed the plan's documented `defer` branch for Task 2 exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. When the physical USB piano is available, resume with `/gsd-verify-work 38 (see 38-UAT.md)` to run the four deferred checks.

## Next Phase Readiness
`tests/e2e/midi.spec.ts` gives Phase 39 a real-Chromium regression net for the connection lifecycle it will build note-stream grading on top of. The four hardware checks remain open and must be run with the physical instrument before Phase 38's MIDI-01 can be marked complete; Phase 39 depends on `connectedDeviceId()`/`activeInput()` (already delivered in 38-01/38-02, unaffected by this deferral) rather than on the hardware UAT outcome, so Phase 39 planning/execution is not blocked by this open item, but the milestone-level MIDI-01 sign-off is.

---
*Phase: 38-midi-connection-progressive-enhancement*
*Completed: 2026-08-04*

## Self-Check: PASSED

All artifact files (`tests/e2e/midi.spec.ts`, `38-UAT.md`, this `38-04-SUMMARY.md`, `STATE.md`, `REQUIREMENTS.md`) verified present on disk, and commit `dac416a` (Task 1) verified present in git history.
