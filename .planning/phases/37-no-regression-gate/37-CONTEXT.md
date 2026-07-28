# Phase 37: No-Regression Gate - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning
**Mode:** Autonomous smart-discuss (verification/gate phase; grey areas auto-accepted from the v2.2 Phase 31 precedent + the v2.3 REG-01 success criteria; user away, decisions recorded for review)

<domain>
## Phase Boundary

The milestone-wide no-regression gate for v2.3. Confirm the whole milestone ships green:
existing behavior intact, every new v2.3 surface covered by tests, and the full suite +
`svelte-check` pass with zero errors. This is the dedicated final gate, mirroring v2.2's
Phase 31 (a dedicated no-regression gate + coverage audit). Delivers REG-01.

Non-visual: a test-coverage audit + gap-fill + a milestone-wide green-gate run + requirements
traceability. No net-new UI surface, so no UI-SPEC and no UI hint. REG-01 was a binding
constraint throughout Phases 32-36 (each feature phase preserved behavior and covered its own
new surface as it went, with its own REG tests); this phase consolidates that coverage and
confirms no behavior regression across the whole milestone.
</domain>

<decisions>
## Implementation Decisions

### What to audit (REG-01 success criteria)
- **Existing behavior preserved (must still hold, byte-for-byte where claimed):** drill grading is chroma/MIDI never letter strings; FSRS scheduling; practice tiers; telemetry; song-filter behavior; and the multiple-choice-never-gates ear-naming rule. Audit that these are still covered by (and pass) their existing tests, unchanged by v2.3.
- **Every new v2.3 surface has test coverage:** counting-chip grammar (Phase 32 CountingChipRow), voicing add/drop lean flow (Phase 33 ShellVoicingDrill), progression hint ladder + beginner keyboard (Phase 34 ProgressionDrill), the inversion drill family (Phase 35 InversionDrill + matchInversion + inversions engine + synthetic queue family), and cold-session queue ordering (Phase 36 composePracticeQueue lowMastery guard + isLowMasterySession). Fill ONLY genuine coverage gaps — do not duplicate coverage the feature phases already shipped (34/35/36 each landed their own REG + surface tests, and 32/33 shipped their own).

### Structure (model on v2.2 Phase 31 — two plans)
- **Plan A — coverage audit + capstone:** produce a REG-01 coverage matrix (each success-criterion behavior + each new surface -> the test file(s) that prove it); fill only genuine gaps with targeted tests; add one cross-surface capstone integration test that proves the six practice families (name-it, build-it, interval, voicing, progression, inversion) coexist in one composed queue with interleaving + single-type-due gate + song-filter + cold-session ordering all intact together.
- **Plan B — milestone green gate:** run the full gate (`npm run build`, `npm test`, `npm run check`) and confirm all three pass with zero errors; confirm REQUIREMENTS.md traceability for every v2.3 REQ-ID (SHAPE-01, VOICE-01, INV-01/02/03, SCAF-01/02, QUEUE-01, REG-01) is delivered; mark REG-01 delivered.

### Scope discipline
- This is a gate, not a feature phase. Prefer verifying + filling genuine gaps over rewriting. If the audit finds the milestone already fully covered (likely — 34/35/36 shipped comprehensive REG tests and the full suite is green at ~1611 tests), the capstone integration test + the green-gate run + traceability confirmation are the deliverables; do not manufacture busywork tests.
- No production behavior change. If the audit surfaces a genuine REG-01 defect (a behavior that actually regressed), stop and flag it rather than papering over it with a test.
- No em dashes in any new copy/comments (project rule).

### Claude's Discretion (planner finalizes)
- Exact shape/location of the coverage matrix (a REG-01 traceability doc/section vs inline in the capstone test).
- Which genuine gaps (if any) warrant new targeted tests vs are already covered.
- Whether build+test+check run as one plan or split; whether the capstone lives in a new test file or extends an existing cross-hub integration test (v2.2 shipped a cross-hub capstone — reuse/extend if apt).
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Full green suite today: ~1611 tests across ~115 files, `npm run check` = 0 errors/0 warnings (confirmed during Phases 34-36).
- Per-phase REG guards already shipped: Phase 34 REG-01 sweep (progressionDrill.test.ts); Phase 35 frozen-order REG-parity + host REG gate (practiceQueue.test.ts, practiceInversionsReg.test.ts); Phase 36 cold-ordering host test (practiceColdOrdering.test.ts) + preserved 35-04 frozen-order guard.
- `src/lib/practice/practiceQueue.ts` — the six-family composer (the capstone's integration target). `src/lib/drills/*` grading (chroma/MIDI). `src/lib/srs/*` FSRS deck/scheduler. Existing cross-hub/e2e tests under `tests/` and `src/routes/`.
- Green gate commands: `npm run build`, `npm test` (vitest run), `npm run check` (svelte-check).

### Established Patterns
- v2.2 Phase 31 is the precedent: audit REG coverage matrix (fill only genuine gaps) + cross-surface capstone integration test, then a full milestone green-gate run + REQUIREMENTS traceability confirmation.
- Grade by chroma/MIDI never letter strings; ear-naming multiple-choice never gates (locked v2 invariants this gate must confirm).

### Integration Points
- The capstone exercises composePracticeQueue with all six families present (the v2.3 end state) — the single best cross-surface no-regression proof.
</code_context>

<specifics>
## Specific Ideas

- Match the established milestone pattern: v2.2's Phase 31 was a dedicated final No-Regression gate (audit + capstone, then green gate + traceability). v2.3's Phase 37 is its analog.
</specifics>

<deferred>
## Deferred Ideas

- On-device visual UAT items deferred by Phases 34 and 35 (recorded in STATE.md "Deferred Verification" + 34-UAT.md / 35-UAT.md) are NOT part of this code-level green gate — they remain the user's on-device batch. This gate confirms code/test green, not on-device visuals.
</deferred>
