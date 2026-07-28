---
phase: 33-voicing-lean-flow
plan: 01
subsystem: ui
tags: [svelte, i18n, voicings, drill, chord-formula]

# Dependency graph
requires:
  - phase: 25-contextual-learning
    provides: ShellVoicingDrill's staged-by-card-state pedagogy (meet/subtract/drill) and the shell/rootless/full note-set derivations it grades against
  - phase: 27-practice-hub
    provides: the embedSymbol/onComplete embed seam that lets /practice drive an embedded voicing round
provides:
  - Lean drill-stage chrome for ShellVoicingDrill: shell is the default grading target, "Add the root" reaches the full voicing, "Remove the bass" reaches the rootless voicing
  - Current-voicing by-product label (Shell/Full/Rootless) replacing the always-on 3-way selector
  - Updated voicings i18n domain (nudge/current-voicing/voicing-name keys; dead selector keys removed)
affects: [34-progression-scaffold-beginner-keyboard, 37-no-regression-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nudge-as-toggle: a single setVoicing(style) handler toggles between shell and a target style (tapping the active nudge returns to shell), replacing a 3-way exclusive selector with two independent binary nudges"

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/voicings.ts
    - src/lib/components/ShellVoicingDrill.svelte
    - src/lib/components/shellVoicingDrill.test.ts
    - src/lib/components/ShellVoicingDrill.embed.test.ts
    - tests/practice-hub-mix.e2e.test.ts

key-decisions:
  - "setVoicing(style) is a single parameterized toggle (voicingStyle = voicingStyle === style ? 'shell' : style) shared by both nudges, rather than two separate handlers, since both need identical guard/preserve-selected semantics"
  - "Nudge labels render in a wrapping flex row (not a fixed-width mono strip), so the full French labels (Poser la fondamentale / Retirer la basse) fit without the 013 fit-rule abbreviation the old selector chips needed"
  - "The + / − operator glyphs are decorative aria-hidden spans, not part of the nudge's accessible name, so screen readers read exactly 'Add the root' / 'Remove the bass'"

patterns-established:
  - "Contextual add/drop nudges as a by-product-state UI pattern: style/mode is shown as a derived label, not picked via an exclusive control group"

requirements-completed: [VOICE-01]

coverage:
  - id: D1
    description: "The always-on 3-way voicing-style selector (FOND./SHELL/SANS FOND. chip strip) is removed from the drill stage"
    requirement: "VOICE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#the old 3-way selector is gone from the drill stage"
        status: pass
    human_judgment: false
  - id: D2
    description: "The drill starts on the shell by default; 'Add the root' reaches the full voicing, 'Remove the bass' reaches the rootless voicing, each toggling back to shell"
    requirement: "VOICE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#starts on the shell: neither nudge pressed, current voicing reads Shell, and the shell grades correct with no nudge tapped"
        status: pass
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#\"Add the root\" reaches the full voicing"
        status: pass
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#\"Remove the bass\" reaches the rootless voicing"
        status: pass
    human_judgment: false
  - id: D3
    description: "The current voicing (Shell/Full/Rootless) displays as a by-product label of what was added/removed, in both locales"
    requirement: "VOICE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#starts on the shell, then switches wording per nudge tap (VOICE-01)"
        status: pass
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts#reads the nudge labels and current-voicing line in French"
        status: pass
    human_judgment: false
  - id: D4
    description: "From-memory chroma grading (matchChord) and the staged-by-card-state (Meet/Subtract/Drill) behavior are unchanged (REG-01); the embed seam still drives /practice"
    requirement: "REG-01"
    verification:
      - kind: unit
        ref: "src/lib/components/shellVoicingDrill.test.ts (all 38 tests, unchanged specs)"
        status: pass
      - kind: unit
        ref: "src/lib/components/ShellVoicingDrill.embed.test.ts (both embed-seam specs)"
        status: pass
      - kind: e2e
        ref: "tests/practice-hub-mix.e2e.test.ts (full suite, including the fixed completeVoicing helper)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual/interaction UAT: nudge labels read cleanly and wrap without clipping on a narrow phone width; layout matches sketch 022 variant A intent"
    verification: []
    human_judgment: true
    rationale: "Requires a Chromium browser render on a narrow viewport to confirm the 013 fit-rule wrapping behavior visually; this project's preview harness cannot hydrate SvelteKit client-side interactivity (documented gap), so this is deferred to the phase's end-of-phase human-check per workflow.human_verify_mode"

# Metrics
duration: 20min
completed: 2026-07-26
status: complete
---

# Phase 33 Plan 01: Voicing Lean Flow Summary

**Replaced ShellVoicingDrill's always-on 3-way Fond./Shell/Sans fond. selector with two contextual add/drop nudges (sketch 022 variant A), so the drill starts on the shell and voicing style becomes a by-product of what you add or remove rather than a mode you pick up front.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-26T21:31:00Z
- **Completed:** 2026-07-26T21:51:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Removed the drill-stage `voicing-row`/`vchip` 3-way selector (`data-testid="voicing-selector"`) and its `VOICING_STYLES`/`styleLabel()`/`selectStyle()` support code
- Added a `voicing-nudges` control group with "Add the root" (toggles shell <-> full) and "Remove the bass" (toggles shell <-> rootless) buttons, plus a `current-voicing` by-product line reading "Current voicing: Shell/Full/Rootless" (French: "Voicing actuel : Shell/Complet/Sans fondamentale")
- Rewrote `shellVoicingDrill.test.ts`'s selector-dependent specs as nudge-flow specs and added 5 new VOICE-01 specs (starts-on-shell, add-root->full, remove-bass->rootless, old-selector-gone, French labels)
- Fixed `ShellVoicingDrill.embed.test.ts` and `tests/practice-hub-mix.e2e.test.ts`'s embedded-round helper to stop clicking the now-removed SHELL button (shell is already the default)
- Full milestone gate green: `npm test` 1528/1528 passed (108 files); `npm run check` 0 errors, 0 warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Add nudge + current-voicing i18n keys to the voicings domain (additive)** - `fb46720` (feat)
2. **Task 2: Replace the drill-stage 3-way selector with add/drop nudges + current-voicing by-product** - `8841e27` (test, RED) + `3cdb2de` (feat, GREEN)
3. **Task 3: Remove the dead selector i18n keys, fix the practice-hub e2e, and run the full green gate** - `bb5d50a` (chore)

**Plan metadata:** (this commit) - `docs: complete plan`

_Note: Task 2 was tdd="true" and produced two commits (test -> feat), per the RED/GREEN discipline._

## Files Created/Modified
- `src/lib/i18n/messages/voicings.ts` - Added `voicings.nudge.addRoot/removeBass`, `voicings.aria.nudgeGroup`, `voicings.current.label`, `voicings.voicing.shell/full/rootless` (en+fr); removed `voicings.selector.root/shell/rootless` and `voicings.aria.selectorGroup`
- `src/lib/components/ShellVoicingDrill.svelte` - Drill-stage markup swapped from the 3-way `vchip` selector to the two-nudge `voicing-nudges` group + `current-voicing` line; `setVoicing(style)` toggle handler replaces `selectStyle()`; `VOICING_STYLES`/`styleLabel()` removed; new `.voicing-nudges`/`.nudge`/`.nudge--on`/`.op`/`.layers` CSS replacing `.voicing-row`/`.vchip*`
- `src/lib/components/shellVoicingDrill.test.ts` - Selector specs rewritten to nudge specs; 5 new VOICE-01 specs added
- `src/lib/components/ShellVoicingDrill.embed.test.ts` - Dropped the SHELL click (shell is the default) in the embed-seam spec
- `tests/practice-hub-mix.e2e.test.ts` - `completeVoicing` helper no longer clicks SHELL; doc comment updated

## Decisions Made
- `setVoicing(style)` is one shared toggle handler for both nudges (toggles the tapped style on/off against shell) rather than two bespoke handlers, since both nudges need identical guard (`effectiveStage === 'drill' && !answered`) and preserve-selected semantics (UAT V3)
- The `+`/`−` operator glyphs are decorative `aria-hidden` spans, kept out of each nudge's accessible name so screen readers announce exactly "Add the root" / "Remove the bass"
- Nudges render in a wrapping flex row rather than the old fixed-width mono strip, so the full French labels ("Poser la fondamentale" / "Retirer la basse") fit without the 013 fit-rule abbreviation the old ROOT/ROOTLESS chips needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ShellVoicingDrill's lean nudge flow is in place and fully covered by unit/e2e tests; the embed seam driving /practice is unchanged and verified
- One end-of-phase human-check item remains open (deferred to workflow.human_verify_mode = end-of-phase, per this plan's own `<human-check>` block): visually confirm the two nudge labels wrap cleanly on a narrow phone width and that the tap-flip of the current-voicing label/prompt reads well, matching sketch 022 variant A
- No blockers for Phase 34 (Progression Scaffold & Beginner Keyboard), which reuses the shared counting-chip grammar and PianoKeyboard, not this drill

---
*Phase: 33-voicing-lean-flow*
*Completed: 2026-07-26*

## Self-Check: PASSED

All key files and task commit hashes verified present on disk / in git history.
