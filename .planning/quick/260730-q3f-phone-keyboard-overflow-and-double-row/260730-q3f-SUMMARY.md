---
phase: quick-260730-q3f
plan: 01
status: complete
subsystem: ui
tags: [piano-keyboard, mobile, css, responsive, live-browser-verification, playwright]

requires: []
provides:
  - "One-octave PianoKeyboard boards fit their container in a single row (never stacked), down to a WCAG-derived 40px/white-key floor"
  - "ShellVoicingDrill compare cards can no longer be inflated past the viewport by the board's min-width"
  - "build-it reveal keyboard self-measures its span (one row on a phone)"
  - "e2e coverage of the voicing meet stage's page/card fit at 320/375/390px"
affects: [practice-page-voicing-drill, practice-page-build-it-reveal, lookup-page-keyboard, every-pianokeyboard-call-site]

tech-stack:
  added: []
---

## What shipped

| Commit | Change |
|--------|--------|
| e51ea65 | `keyboardLayout.ts` / `PianoKeyboard.svelte`: one-octave spans never stack; their board floor drops to `MIN_ONE_OCTAVE_WHITE_KEY_PX` (40px); `pendingKeys` matched octave-agnostically at one octave |
| 5d30ced | `ShellVoicingDrill.svelte`: `minmax(0, 1fr)` grid + `min-width: 0` card |
| 36ebd64 | `BuildSession.svelte`: reveal keyboard drops `octaves={2}` |
| df6ea3d | `tests/e2e/tap-targets.spec.ts`: voicing-meet fit test, per-viewport white-key floor |

## Root causes (both measured live, not inferred)

1. **Voicing meet overflow.** `.vcards` used a bare `1fr` track. A grid item's
   `1fr` track still takes the item's MIN-CONTENT width as a floor, and a
   `.vcard`'s min-content width includes the piano board's `min-width` px floor.
   PianoKeyboard's pre-measurement default span is TWO octaves, so that floor was
   660px. Measured at a 390px viewport: cards 680px, boards 660px, page
   `scrollWidth` 688. It was self-fulfilling - the ResizeObserver then reported
   660px, so `octavesForWidth` agreed two octaves fit, and every
   keyboard-internal assertion looked healthy while the card hung off screen.
2. **Two stacked keyboards.** Fixing (1) alone would have traded the overflow for
   the two-row wrap: the collapsed card interior is ~338px, inside the 308-352px
   band where `shouldStackRows(1, w)` was true. A one-octave split can only happen
   at white index 7, so row 2 holds a single lone C - which is what the user
   rejected on sight. Plus the build-it reveal pinned `octaves={2}`, which stacked
   7+8 on a phone.

## Decisions

- **A one-octave board never stacks; it fits its container instead.** Its floor is
  40px/white key, derived rather than picked: black keys render at 60% of a white
  key, and WCAG 2.1 SC 2.5.5's absolute minimum target is 24px, so 24 / 0.6 = 40.
  Measured after the fix: 40.5px keys at a 360px viewport, 42.4px at 375px,
  44.25px at 390px - all with 24px+ black keys and no scroll. The 320px class
  still hits the floor and still scrolls inside the keyboard (documented).
  This narrows the 260729-ert LOCKED "always wrap, never scroll" decision to the
  two-octave case only.
- **The two-octave span keeps stacking.** 15 keys cannot fit a phone at any usable
  size, and its 7+8 split gives two genuine mini-keyboards.
- **The build-it TAPPING keyboard keeps `octaves={2}`.** `gradeConstructionTap`
  grades by exact MIDI (it has a distinct `wrong-octave` outcome), so the octave a
  note is stacked into must be physically reachable. Only the reveal changed.

## Verification

- `npm test`: 2524 passed / 148 files.
- `npm run check`: 0 errors, 0 warnings (1473 files).
- `npx playwright test`: 66 passed, including the new voicing-meet fit tests at
  320/375/390px.
- Live browser at 390px (dev server): build-it reveal renders ONE board, 8 white
  keys, `document.scrollWidth` 390 - screenshot confirms the wrapped D keeps its
  m3 colour at the low end.

## Out of scope / open

- **Microphone (third reported item): not reproduced, no code change.** The whole
  path (`micInput.ts` -> `BuildSession`'s Keyboard/Microphone toggle ->
  `startMicSession`) verifies working in a real browser: at 390px the build-it
  chord step shows the toggle, and the panel reaches "Start listening" with
  `isSecureContext: true`. The device symptom (Chrome's site-permission sheet
  listing only Notifications and Sound, i.e. the mic never having been REQUESTED)
  needs one detail from the user - which screen they tapped, and what the panel
  said - before guessing at a fix. Deployment lag is also a live possibility: the
  mic feature shipped in PR #62 and prod deploys are manual.
