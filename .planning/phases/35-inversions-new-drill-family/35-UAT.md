---
status: testing
phase: 35-inversions-new-drill-family
source: [35-VERIFICATION.md]
started: 2026-07-27T04:15:00Z
updated: 2026-07-27T04:15:00Z
note: "Deferred on-device visual UAT. Code-level verification passed 12/12 (all logic proven in unit tests; 1597 tests green, svelte-check clean; CR-01 blocker + WR-01 fixed and re-reviewed clean). These 2 items are eyes-on-only because the preview harness cannot hydrate this SvelteKit app (preview-harness-null-origin-sveltekit). Autonomous run continued to Phase 36 per the user's standing away-mode instruction; run this batch on-device when back."
---

## Current Test

number: 1
name: Bass ink-ring + "B" badge legibility over a role-colored key
expected: |
  In the inversion drill, once the ghost-keys hint rung is revealed (or the answer shown), the bass key's neutral-ink ring and mono "B" badge are clearly visible and legible layered on top of a role fill / ghost hatch, on real hardware.
awaiting: user response

## Tests

### 1. Bass ink-ring + "B" badge legibility
expected: Once the ghost-keys hint rung is revealed, the bass key shows a neutral-ink ring + mono "B" badge, clearly legible over a role fill or ghost hatch, on a real device. (Gating + chroma+octave match proven in tests; contrast/legibility is the eyes-on part.)
result: [pending]

### 2. Two-octave keyboard tap targets on phone width
expected: All 15 white keys (2 octaves) stay comfortably tappable at phone width, with the bass note visibly reachable below the stack. (2-octave span forced so the bass can sit below the stack; physical tap-target sizing is the eyes-on part.)
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
