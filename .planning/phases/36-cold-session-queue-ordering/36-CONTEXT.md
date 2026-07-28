# Phase 36: Cold-Session Queue Ordering - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (grey areas auto-accepted from the counting-hint-grammar.md non-visual follow-up + the practiceQueue architecture; user away, decisions recorded for review)

<domain>
## Phase Boundary

Reorder the hybrid-queue composer (`composePracticeQueue`) so that when mastery is low, a cold
practice session's FIRST item is never a scaffold-heavy progression or inversion item — the
first item is never a hard block for a beginner. Simpler families lead when mastery is low.
Everything else about the queue (interleaving, the single-type-due gate, song-filter steering,
telemetry, grading, scheduling) stays exactly as it is today.

Delivers QUEUE-01. Non-visual: a pure change to `src/lib/practice/practiceQueue.ts` plus tests
and the thin host wiring that supplies the mastery signal. No UI-SPEC, no UI hint.

**SHARED-FILE COUPLING (resolved by sequencing):** this phase reorders the SAME
`composePracticeQueue` that Phase 35's INV-03 extended. Phase 35 landed first and deliberately
left the weave/ordering body untouched (only widened the family union + added a synthetic item
builder); this phase now owns the ordering change. There is no parallel edit — 35 is complete.
</domain>

<decisions>
## Implementation Decisions

### What "cold, low-mastery" means
- The composer stays PURE — add an explicit optional signal (e.g. an options arg like `{ coldStart?: boolean }` or `lowMastery?: boolean`, planner picks the exact shape) that the `/practice` host computes from the session's card-state distribution and passes in. Do NOT read Dexie or FSRS state inside the pure composer.
- Host definition of low-mastery (planner finalizes, reuse existing signals): the session is "cold / low-mastery" when its carded items are overwhelmingly New/Learning (few or no mature Review cards) — i.e. the same maturity notion the drills already use (voicingStageForChord-style / FSRS State). Keep the threshold simple and documented.

### Which families are "scaffold-heavy"
- Scaffold-heavy = `progression` and `inversion` (the two families with escalating hint ladders that can hard-block a cold beginner — the exact failure sketch 024 documented).
- Simpler families = `name-it`, `build-it`, `interval`, `voicing`.

### The ordering rule
- When the low-mastery signal is set AND at least one simpler family is present in the queue, the FIRST emitted item MUST be from a simpler family (never progression/inversion). After the first item, the existing greedy interleave proceeds unchanged.
- Minimal-surface approach (planner confirms): constrain only the FIRST pick to exclude scaffold-heavy families when a simpler family is available; do not otherwise reweight the weave. This keeps the change tightly scoped and the no-3-in-a-row / scarcest-last / symbol-anti-adjacency logic intact.
- When the signal is NOT set (warm session), behavior is byte-identical to today.

### REG-01 binding (preserve exactly)
- Interleaving (no-3-in-a-row, scarcest-last, same-symbol anti-adjacency), the single-type-due gate (a queue with a single family passes through unchanged — including a session where ONLY a scaffold-heavy family is due: no artificial variety injected, the scaffold-heavy item leads because it is the only thing due), and song-filter steering all behave exactly as before.
- The Phase 35-04 frozen-order REG-parity test (`practiceQueue.test.ts` "REG-parity: existing-five ordering unchanged with no inversion items present" / "frozen baseline order for a fixed rng") is a guard on the WARM/normal path. Preserve its intent: with no low-mastery signal set, the composed order for a fixed rng must stay byte-identical. If the phase adds a new parameter, call the frozen-order test WITHOUT the cold signal (default) so it stays green unchanged; add SEPARATE tests for the cold-session first-item guarantee. Do NOT loosen or delete the frozen-order guard.

### Claude's Discretion (planner finalizes)
- Exact signal shape (options object vs boolean param) and its default (default = warm / today's behavior).
- Exact host low-mastery threshold, reusing existing maturity signals.
- Whether the first-item constraint is implemented as a pre-weave partition or an in-loop first-pick guard, provided REG-01 holds and the single-type-due gate is preserved.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/practice/practiceQueue.ts` — `composePracticeQueue(cardedItems, syntheticItems, rng)`: groups by `PracticeFamily`, single-family short-circuit (`byFamily.size <= 1` returns `all` — the single-type-due gate), then a greedy weave (scarcest-last, no-3-in-a-row, symbol anti-adjacency). The FIRST pick currently favors the family with the most remaining items. This is where the low-mastery first-item constraint slots in.
- `src/lib/practice/practiceQueue.test.ts` — extensive weave tests incl. the 35-04 frozen-order REG-parity guard to preserve.
- `src/routes/practice/+page.svelte` — the host that composes the queue and knows the session's card-state distribution (supplies the new low-mastery signal).

### Established Patterns
- The composer is a PURE function (rng injected); all due/gating/mastery policy is host-owned state, computed in load() and passed in. Keep that boundary (per the Phase 27 "host-thin, pure-queue" decision).
- `PracticeFamily = 'name-it' | 'build-it' | 'interval' | 'voicing' | 'progression' | 'inversion'` (inversion added in Phase 35).

### Integration Points
- Only `/practice` composes the real queue; it passes the new low-mastery signal. No other caller needs to change (default keeps warm behavior).
</code_context>

<specifics>
## Specific Ideas

- Design source: the "Non-visual follow-up" flag in `.claude/skills/sketch-findings-music-learn/references/counting-hint-grammar.md` — the real reason a scaffold-heavy item "popped first" and stalled a cold session (the same incident sketch 024 was born from).
</specifics>

<deferred>
## Deferred Ideas

- None — this is the final feature phase; Phase 37 is the milestone-wide no-regression gate.
</deferred>
