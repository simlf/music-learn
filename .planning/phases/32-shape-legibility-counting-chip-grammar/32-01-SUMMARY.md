---
phase: 32-shape-legibility-counting-chip-grammar
plan: 01
subsystem: ui
tags: [svelte, i18n, design-system, drills]

requires: []
provides:
  - CountingChipRow.svelte — reusable counting-chip primitive (role-tinted tone chips + fill/outline gap chips + semitone legend)
  - PracticeChordDrill name-it feedback now renders CountingChipRow instead of the old grey mono shape line
affects: [phase-34-progression-scaffold, phase-35-inversions]

tech-stack:
  added: []
  patterns:
    - "Counting-chip grammar: tone chip (role-tinted) + gap chip (fill=minor third / outline=major third / neutral fallback) as a shared teaching primitive, derived only from stackedThirdsFor"

key-files:
  created:
    - src/lib/components/CountingChipRow.svelte
    - src/lib/components/CountingChipRow.test.ts
  modified:
    - src/lib/components/PracticeChordDrill.svelte
    - src/lib/components/PracticeChordDrill.test.ts
    - src/lib/i18n/messages/drills.ts

key-decisions:
  - "CountingChipRow is a new standalone component, not an IntervalView extension — IntervalView's DESIGN-02 invariant reserves colored chips for role labels and forbids colored gap markers; the counting-chip grammar inverts that (note name lives inside the role-tinted chip, gaps are first-class fill/outline chips), so grafting a third IntervalView mode would fork its render and violate that invariant."
  - "The neutral non-third gap fallback is exercised via a synthetic ChordResult in the test, not Cdim7 — every chord in this app's v1 quality matrix is genuinely tertian (Cdim7's own Gb→Bbb gap resolves to m3, not d3, once correctly spelled with a double-flat), so the neutral branch is a defensive safety net with no real production trigger today."

patterns-established:
  - "Counting-chip grammar (.chiprow/.tone-chip/.gap-chip) as the shared visual primitive for Phases 34 (progression hint ladder) and 35 (inversion hint ladder), mirroring how IntervalView shipped ahead of its own consumers in Phase 26."

requirements-completed: [SHAPE-01]

coverage:
  - id: D1
    description: "CountingChipRow renders 4 role-tinted tone chips (root/third/fifth/seventh) with correct note names, derived solely from stackedThirdsFor(chord)"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: tone chips (Cm7) > renders 4 tone chips with role classes in order and the correct note names"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gap chips render minor third as solid ink fill (.gap-chip.m3) and major third as outline-only (.gap-chip.M3), so Cm7 reads m3/M3/m3 (small-big-small)"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: gap chips (Cm7 = m3 - M3 - m3) > renders 3 gap chips with m3/M3/m3 modifier classes in order and +m3/+M3/+m3 text"
        status: pass
    human_judgment: false
  - id: D3
    description: "Legend maps +m3=3 semitones / +M3=4 semitones, French-aware (demi-tons), immune shorthand/numbers unchanged across locales; showLegend=false renders no legend"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: legend > shows both gap-to-semitone mappings by default (en)"
        status: pass
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: legend > translates the semitones word to demi-tons under fr, immune tokens unchanged"
        status: pass
      - kind: unit
        ref: "src/lib/components/CountingChipRow.test.ts#CountingChipRow: legend > renders no legend when showLegend is false"
        status: pass
    human_judgment: false
  - id: D4
    description: "The old grey uppercase mono shape line (data-testid chord-drill-shape) is removed from PracticeChordDrill's name-it feedback surface"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts#PracticeChordDrill: counting-chip row (E2, SHAPE-01) > removes the old grey mono shape line (Success Criterion 4)"
        status: pass
    human_judgment: false
  - id: D5
    description: "PracticeChordDrill mounts CountingChipRow on the name-it feedback surface after answering (both correct and wrong), absent before answering; grading/FSRS/telemetry paths stay byte-identical (REG-01)"
    requirement: "SHAPE-01"
    verification:
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts#PracticeChordDrill: counting-chip row (E2, SHAPE-01) > shows the m7 counting-chip row (m3/M3/m3 gap-class order) after a correct answer"
        status: pass
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts#PracticeChordDrill: counting-chip row (E2, SHAPE-01) > shows the m7 counting-chip row after a wrong answer too"
        status: pass
      - kind: unit
        ref: "src/lib/components/PracticeChordDrill.test.ts#PracticeChordDrill: counting-chip row (E2, SHAPE-01) > does not leak the counting-chip row before the user answers"
        status: pass
      - kind: unit
        ref: "npm test (full vitest suite) — 108 files, 1518 tests, all passing (REG-01 regression gate)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manual/visual confirmation that the chip grammar reads correctly on-device (fill/outline shape, legend readability, color contrast)"
    verification: []
    human_judgment: true
    rationale: "Preview harness cannot hydrate this SvelteKit app (see [[preview-harness-null-origin-sveltekit]]); visual legibility is a human-judgment call flagged for on-device UAT per the plan's own verification section."

duration: 7min
completed: 2026-07-26
status: complete
---

# Phase 32 Plan 01: Shape Legibility — Counting-Chip Grammar Summary

**New CountingChipRow.svelte primitive (role-tinted tone chips + fill/outline gap chips + semitone legend) replaces the illegible grey mono shape line on the name-it drill feedback surface, deriving all data from stackedThirdsFor with zero hand-rolled interval math.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-26T22:14:56+02:00
- **Completed:** 2026-07-26T22:21:40+02:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Shipped `CountingChipRow.svelte` as a standalone reusable primitive: 4 role-tinted tone chips (root vermilion, third verdigris, fifth tan, seventh mustard) plus gap chips between adjacent tones — minor third rendered as a solid ink fill, major third as outline-only, giving a beginner the shape (small-big-small = m7) without reading letters
- Added a semitone-count legend ("+m3 = 3 semitones" / "+M3 = 4 semitones"), French-aware via two new `drills.chip.*` i18n keys, with the `+m3`/`+M3`/`3`/`4` shorthand kept immune across locales
- Wired CountingChipRow into `PracticeChordDrill`'s name-it feedback, removing the old `data-testid="chord-drill-shape"` grey uppercase mono line entirely (Success Criterion 4), test-verified absent after answering
- Grading, FSRS, telemetry, and queue behavior in `PracticeChordDrill` stayed byte-identical (REG-01) — only the teaching-feedback markup changed

## Task Commits

Each task was committed atomically (TDD: RED test then GREEN implementation):

1. **Task 1: Create the reusable CountingChipRow primitive** — `098a370` (test, RED) / `7eac487` (feat, GREEN)
2. **Task 2: Wire CountingChipRow into PracticeChordDrill** — `34eeea4` (test, RED) / `769afa7` (feat, GREEN)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified
- `src/lib/components/CountingChipRow.svelte` - the new counting-chip grammar primitive (tone chips + gap chips + legend)
- `src/lib/components/CountingChipRow.test.ts` - component test covering tone/gap chip rendering, legend (en/fr/hidden), unrecognized-chord safety, neutral non-third gap safety
- `src/lib/components/PracticeChordDrill.svelte` - mounts CountingChipRow on the name-it feedback surface; removed `stackedThirdsPattern` const, `stackedThirdsFor` import, and the old `chord-drill-shape` `<p>`
- `src/lib/components/PracticeChordDrill.test.ts` - E2 describe block rewritten to assert counting-chip-row presence/absence, gap-class order, and old-line removal
- `src/lib/i18n/messages/drills.ts` - added `drills.chip.semitones` ("semitones" / "demi-tons") and `drills.chip.legendAria` ("Gap legend" / "Légende des écarts")

## Decisions Made
- CountingChipRow is a new standalone component, not an IntervalView extension, per the plan's explicit component-decision requirement — recorded in the component's header comment. IntervalView's gap markers are deliberately neutral/muted (DESIGN-02 invariant reserving colored chips for role labels only); grafting a colored-gap mode onto it would fork that invariant. A dedicated primitive is the correct single source of truth for Phases 34/35.
- The plan's suggested test case for the neutral non-third gap fallback ("a diminished-seventh chord's diminished-third top gap") does not occur in this app's actual chord data: `stackedThirdsFor(spellChord('Cdim7'))` yields gaps `m3, m3, m3` (Gb→Bbb spans 3 semitones over a third-degree distance, which is a minor third, not a diminished third) — every chord in the app's v1 8-quality matrix is genuinely tertian, so no real chord ever reaches the neutral branch. Kept the defensive code (never throws) but proved it via a synthetic `ChordResult` (C → E♭♭, a genuine diminished third) rather than a real symbol, and documented this in the test's own comment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the neutral-gap test fixture from Cdim7 to a synthetic ChordResult**
- **Found during:** Task 1 (writing the CountingChipRow test's neutral non-third gap case)
- **Issue:** The plan's read_first/behavior text assumed Cdim7's top gap (Gb→Bbb) is a diminished third ("+d3"). Verified via `stackedThirdsFor` that it actually resolves to m3 (3 semitones, third-degree distance = minor third), since tonal spells the diminished seventh with a double-flat (Bbb) rather than a diminished-third-producing enharmonic. Using Cdim7 as-is would have made the "neutral fallback" test assert something the component's real data never triggers, silently testing the wrong branch.
- **Fix:** Replaced the Cdim7 fixture with a synthetic `ChordResult` (notes C → E♭♭, a genuinely diminished third: 2 semitones over a third-degree gap) to exercise the neutral-fallback code path directly, and documented in the test's own comment why no recognized chord in the app's matrix ever produces a non-m3/M3 gap.
- **Files modified:** src/lib/components/CountingChipRow.test.ts
- **Verification:** `npx vitest run src/lib/components/CountingChipRow.test.ts` — all 7 tests pass, including the corrected neutral-gap case
- **Committed in:** 7eac487 (Task 1 GREEN commit; the test edit itself landed before the RED commit was verified, see task 1's single RED commit `098a370` which already included the corrected fixture)

---

**Total deviations:** 1 auto-fixed (test-fixture correction, Rule 1)
**Impact on plan:** No scope creep — the component's defensive neutral-gap code and CSS fallback ship exactly as specified; only the test's chosen example chord changed to one that actually reaches that branch.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CountingChipRow ships as a standalone primitive under `src/lib/components/`, ready for Phase 34 (progression hint ladder) and Phase 35 (inversion hint ladder) to embed directly with zero re-authoring of the chip grammar
- Full regression gate green: `npm test` (108 files, 1518 tests) and `npm run check` (0 errors/warnings) both pass
- Flagged for on-device visual UAT per the plan's own verification note (preview harness cannot hydrate this app) — no blocker for downstream phases, purely a human-judgment legibility confirmation

---
*Phase: 32-shape-legibility-counting-chip-grammar*
*Completed: 2026-07-26*

## Self-Check: PASSED

All 5 created/modified files confirmed present on disk; all 5 commit hashes (098a370, 7eac487, 34eeea4, 769afa7, 60283c4) confirmed in `git log`.
