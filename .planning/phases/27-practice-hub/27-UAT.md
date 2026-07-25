---
status: in_progress
phase: 27-practice-hub
source: [27-VERIFICATION.md]
started: 2026-07-25T00:53:13Z
updated: 2026-07-25T12:00:00Z
---

## Current Test

number: 2
name: Responsive / animation at phone width
expected: |
  Play one full mixed session at phone width (~375px). Pre-start card,
  in-session register + family cue, and the session-end stamp-in animation
  render cleanly. No overflow/clip; missed chips wrap; register legible.
awaiting: user on-device check (user tested desktop width so far)

## Tests

### 1. Visual accent placement check
expected: Family-cue chip muted/ink never vermilion; vermilion only on Start + in-session primary buttons.
result: PASS (2026-07-25) — desktop screenshot confirmed: "VOICING" cue muted gray, vermilion only on "Vérifier"; "Pratique de gamme" is ghost/outline.

### 2. Responsive / animation check
expected: Phone-width session end-to-end renders cleanly incl. the stamp-in end-card.
result: [pending] — user tested at desktop width; phone-width + end-card animation not yet confirmed.

## Findings (voicing family in /practice) — fixed, pending on-device re-check

### F1. Voicing keys made no sound on tap
cause: ShellVoicingDrill never wired onPress; PianoKeyboard only plays on onPress.
fix: commit e8c9f43 — added pressKey (ensureAudioReady + playNote), mirrors PracticeIntervalDrill.
result: [needs on-device re-check] — jsdom cannot verify audio.

### F2. Ghost key rendered dropped below the keyboard row (Retirer stage)
cause: .piano-keyboard__key--ghost set position:relative, pulling the key out of the absolute row.
fix: commit 8a49675 — removed the override; ghost key stays in the absolute layer.
result: [needs on-device re-check] — jsdom cannot verify layout.

### F3. Could not return to "1 Voir" from "2 Retirer"; landed mid-drill with no lead-in
cause: step indicator was display-only spans; stage auto-derived from FSRS maturity (due cards skip Voir).
fix: commit 5e0b7f6 — step tabs are now clickable buttons; can review the meet/Voir reference then return; grading stays on the real stage.
result: [needs on-device re-check].

### F4. name-it (nomme cet accord) per-note tactile right/wrong feedback
status: DEFERRED (enhancement, not a bug) — PracticeChordDrill is multiple-choice; the keyboard is inspect-only with no note-tap grading. Adding per-note right/wrong is new wiring. Awaiting user go-ahead.

## Summary

total: 2 tests + 4 findings
tests_passed: 1 (accent)
tests_pending: 1 (phone responsive/animation)
findings_fixed: 3 (F1/F2/F3, pending on-device re-check)
findings_deferred: 1 (F4 name-it feedback)

## Gaps

F1/F2/F3 fixes are on the PR branch (commits e8c9f43 / 8a49675 / 5e0b7f6), suite green (1474). On-device re-check needed for audio (F1), key alignment (F2), stage nav (F3), plus the still-pending phone-width Test 2. F4 awaits a go/no-go.
