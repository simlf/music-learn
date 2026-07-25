---
status: deferred
phase: 27-practice-hub
source: [27-VERIFICATION.md]
started: 2026-07-25T00:53:13Z
updated: 2026-07-25T00:53:13Z
---

## Current Test

number: 1
name: Visual accent placement on /practice
expected: |
  Family-cue chip renders muted/ink, never vermilion. Exactly one vermilion
  button on the pre-start card (Start practice); in-session vermilion only on
  the existing primary controls. No second new accent surface.
awaiting: user on-device check

## Tests

### 1. Visual accent placement check
expected: Load /practice (Chrome, phone + desktop width) with a mixed due deck. Family-cue chip ('NAME IT'/'BUILD IT'/'VOICING'/'INTERVAL'/'PROGRESSION') is muted/ink, never vermilion. Vermilion appears only on 'Start practice' and in-session primary buttons per existing drills convention.
result: [pending]

### 2. Responsive / animation check
expected: Play one full mixed session at phone width. Pre-start card, in-session score register + family cue, and the session-end-card stamp-in animation all render cleanly. No overflow/clip on narrow widths; missed-item chips wrap; due-count register legible.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

Both items are visual-only and cannot be exercised by the jsdom e2e suite or the
null-origin SvelteKit preview harness. Deferred to on-device eyeball per project
convention (same as phases 09/21/23/25). All 9/9 automated must-haves passed.
Resume with `/gsd-verify-work 27` after checking on a device.
