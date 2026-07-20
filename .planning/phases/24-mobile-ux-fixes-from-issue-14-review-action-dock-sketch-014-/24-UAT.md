---
status: diagnosed
phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-
source: [24-VERIFICATION.md]
started: 2026-07-20T15:45:00Z
updated: 2026-07-20T15:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Review action dock no-scroll guarantee (HV-24-01-01)
expected: On a real 390px phone viewport, open /recall and drive a formula-mode card to reveal — the Révéler button, then the 4 grade buttons, are visible in the pinned dock ABOVE the tab bar without any scrolling. Card content scrolls up/down with nothing clipped behind the dock. Same for see-play (Check/Next) and hear-name (Continue after opening a hint). At >=640px the review page looks byte-identical to before this phase (no dock, in-flow actions).
result: pass

### 2. Icon + micro-label tab bar height and FR/EN stability (HV-24-02-01)
expected: On a 390px phone viewport the bottom tab bar is visibly 56px (shorter than before) with an icon + 9px uppercase micro-label per slot. Toggling to French does NOT change the bar height — long FR labels (RECHERCHER, EXERCICES, RÉVISION, MORCEAUX) fit or cleanly ellipsis-truncate without wrapping. Active tab shows ink-fill treatment with the icon recoloring. Scrolling a long page (/recall or /progress) to the bottom hides no content behind the bar. Optionally, VoiceOver/TalkBack announces the full label.
result: pass

### 3. Lookup disambiguation chips + why-panel comprehension (HV-24-03-01)
expected: Typing AM7/am7 shows the vermilion disambiguation prompt with two chips and NO result until a chip is tapped — minor chip renders Am7 (A-C-E-G), major chip renders Amaj7 (A-C♯-E-G♯). "Pourquoi ces notes ?" expands with a beginner-comprehensible minor-third teaching sentence and key-signature clarification (especially in French), and the folded Am7/Amaj7 duo shows the differing third/seventh. "Voir Amaj7" re-runs the lookup. Unambiguous chords (Cm7, Fmaj7, G7) render directly with no prompt. Legible at 390px.
result: issue
reported: "it works well but the 'see Cmaj7' should probably have more space between the footer"
severity: cosmetic

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Why-panel content (including 'See Cmaj7' button) is fully legible and clears the bottom tab bar at 390px"
  status: failed
  reason: "User reported: it works well but the 'see Cmaj7' should probably have more space between the footer"
  severity: cosmetic
  test: 3
  root_cause: "--tab-bar-clearance token in src/app.css:112 equals exactly the tab bar height (56px + safe-area) with zero breathing room, so the last element on every page sits flush against the fixed tab bar; most visible on lookup where the why-panel's 'See Cmaj7' escape-hatch button is the terminal element"
  artifacts:
    - path: "src/app.css"
      issue: "--tab-bar-clearance (line 112) has no extra spacing above bar height; global main padding-bottom (lines 130-134) inherits the flush value"
    - path: "src/lib/components/WhyTheseNotes.svelte"
      issue: ".why-escape-hatch button (lines 120-127, styles 243-257) is terminal element with no bottom margin"
  missing:
    - "Add breathing room to shared token: --tab-bar-clearance: calc(56px + env(safe-area-inset-bottom) + var(--spacing-md))"
  debug_session: ""
