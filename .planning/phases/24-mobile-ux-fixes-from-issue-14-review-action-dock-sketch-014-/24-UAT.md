---
status: testing
phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-
source: [24-VERIFICATION.md]
started: 2026-07-20T15:45:00Z
updated: 2026-07-20T15:45:00Z
---

## Current Test

number: 1
name: Review action dock no-scroll guarantee (HV-24-01-01)
expected: |
  Every review mode's primary advance action is reachable without scrolling on a 390px phone;
  content scrolls independently and clears the dock; desktop (>=640px) is unchanged.
awaiting: user response

## Tests

### 1. Review action dock no-scroll guarantee (HV-24-01-01)
expected: On a real 390px phone viewport, open /recall and drive a formula-mode card to reveal — the Révéler button, then the 4 grade buttons, are visible in the pinned dock ABOVE the tab bar without any scrolling. Card content scrolls up/down with nothing clipped behind the dock. Same for see-play (Check/Next) and hear-name (Continue after opening a hint). At >=640px the review page looks byte-identical to before this phase (no dock, in-flow actions).
result: [pending]

### 2. Icon + micro-label tab bar height and FR/EN stability (HV-24-02-01)
expected: On a 390px phone viewport the bottom tab bar is visibly 56px (shorter than before) with an icon + 9px uppercase micro-label per slot. Toggling to French does NOT change the bar height — long FR labels (RECHERCHER, EXERCICES, RÉVISION, MORCEAUX) fit or cleanly ellipsis-truncate without wrapping. Active tab shows ink-fill treatment with the icon recoloring. Scrolling a long page (/recall or /progress) to the bottom hides no content behind the bar. Optionally, VoiceOver/TalkBack announces the full label.
result: [pending]

### 3. Lookup disambiguation chips + why-panel comprehension (HV-24-03-01)
expected: Typing AM7/am7 shows the vermilion disambiguation prompt with two chips and NO result until a chip is tapped — minor chip renders Am7 (A-C-E-G), major chip renders Amaj7 (A-C♯-E-G♯). "Pourquoi ces notes ?" expands with a beginner-comprehensible minor-third teaching sentence and key-signature clarification (especially in French), and the folded Am7/Amaj7 duo shows the differing third/seventh. "Voir Amaj7" re-runs the lookup. Unambiguous chords (Cm7, Fmaj7, G7) render directly with no prompt. Legible at 390px.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
