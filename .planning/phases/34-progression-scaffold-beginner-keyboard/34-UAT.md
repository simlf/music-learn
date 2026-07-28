---
status: partial
phase: 34-progression-scaffold-beginner-keyboard
source: [34-VERIFICATION.md]
started: 2026-07-27T02:05:00Z
updated: 2026-07-28T00:00:00Z
note: "Deferred on-device visual UAT. Code-level verification passed 4/4 (all criteria proven in unit tests; 1538 tests green, svelte-check clean). These 3 items are eyes-on-only because the preview harness cannot hydrate this SvelteKit app (preview-harness-null-origin-sveltekit). Autonomous run continued to later phases per the user's standing away-mode instruction; run this batch on-device when back."
---

## Current Test

[testing complete]

## Tests

### 1. Beginner one-octave keyboard + caption
expected: On a beginner-stage bar (fresh card), the play-step keyboard is a single one-octave span (8 white keys) with the beginner caption beneath it in the correct locale. (octaves prop + accessible name "Piano keyboard, one octave" + caption gating all proven in unit tests; visual width/placement is the eyes-on part.)
result: pass
note: "User: 'i reckon it is ok, hard to review' — accepted low-confidence. Code-level proof stands (octaves prop + accessible name + caption gating all unit-tested). Caveat discovered during tests 2/3: progression bars are not reachable on demand, so this pass may have been given without the user actually landing on a progression item."

### 2. Escalating hint ladder rungs + chip/ghost visuals (symbol stays hidden)
expected: Tapping "Show a hint" / "Afficher un indice" three times reveals, in order: (1) a sentence naming roman numeral + ordinal degree + key + mode + root note (no chord symbol); (2) a sentence plus the role-tinted CountingChipRow tone/gap chips, legible and correctly colored; (3) a ghost line plus dashed/hatched ghost markers (R/3/5/7) on the keyboard, visually distinct from playable keys. A final tap replaces the control with an italic closing line. Symbol never appears. (Reveal sequence, symbol-hidden invariant, and ghost-key DOM presence proven in tests; chip coloring + ghost hatch rendering are the eyes-on part.)
result: blocked
blocked_by: other
reason: "User: 'I still don't see the PROGRESSION after a few session'. No deterministic entry point exists for a progression bar. Investigated: generation and composition are correct (probe test — syntheticProgressionItems(2) returns 2 items, all 2 survive composePracticeQueue). Progression bars are only reachable as 2 synthetic items woven into an uncapped /practice queue (src/routes/practice/+page.svelte:296), never in the first slot on a cold session, and suppressed entirely when the song filter is on (line 295, PRAC-04 by design). Drill seeds only emit name-it items (buildSeededItems:159), so there is no way to open a progression bar on demand. User stopped sessions partway and could not confirm the song-filter state."

### 3. Mature-card widen + ladder suppression
expected: With the chord's FSRS card at State.Review, the keyboard widens to the full two-octave span, the beginner caption disappears, and no hint ladder renders. (Stage-driven octave count + ladder suppression proven in code/tests; the visual transition is the eyes-on part.)
result: blocked
blocked_by: other
reason: "Same prerequisite gate as test 2 — requires reaching a progression bar, and additionally requires that bar's chord card to be at State.Review. Not reachable on demand."

## Summary

total: 3
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 2

## Gaps

[none — no code defects found. Tests 2 and 3 are blocked on a testability prerequisite, not a broken deliverable.]

## Follow-up

- No deterministic entry point for a progression bar. Blocks visual UAT of every progression-scaffold deliverable (this phase and any future one). Candidate fix: a dev-only route or a seed channel that can emit a `family: 'progression'` item. Not in this phase's scope.
