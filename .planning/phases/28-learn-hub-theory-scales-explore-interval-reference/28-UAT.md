---
status: deferred
phase: 28-learn-hub-theory-scales-explore-interval-reference
source: [28-VERIFICATION.md]
started: 2026-07-25T02:19:40Z
updated: 2026-07-25T02:19:40Z
---

## Current Test

number: 1
name: /learn visual rhythm + accent-only-CTA
expected: |
  Theory, Scale Explore, Interval Reference read as one continuous scroll;
  the 5 interval rows show the invariant stacked-thirds pattern legibly per
  quality; the 'Go to Practice' footer button is the only vermilion accent.
awaiting: user on-device check

## Tests

### 1. /learn visual rhythm + accent audit
expected: One continuous sectioned scroll; 5 interval rows legible per quality; only the footer 'Go to Practice' is vermilion.
result: [pending]

### 2. /practice scale-practice disclosure placement
expected: Collapsed-by-default 'Scale practice' toggle sits below the session block, ghost-styled (subordinate to Start practice); expanding reveals tonic picker + scale keyboard with no layout shift and no second accent.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

Visual-only; jsdom + null-origin preview harness cannot exercise them. Deferred
to on-device eyeball per project convention. All 9/9 automated must-haves passed.
Resume with `/gsd-verify-work 28`.
