---
phase: 28-learn-hub-theory-scales-explore-interval-reference
verified: 2026-07-25T02:19:40Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 1
override_reason: "9/9 automated must-haves passed. The 2 remaining human_verification items are visual-only (/learn scroll rhythm + accent audit, /practice disclosure placement) and cannot be exercised by jsdom or the null-origin SvelteKit preview harness. Deferred to on-device eyeball per established project convention and the user's auto-run-all directive. Tracked in 28-UAT.md; resume with /gsd-verify-work 28."
human_verification:
  - test: "Load /learn in a Chromium browser and visually inspect the sectioned scroll"
    expected: "The Theory, Scale Explore, and Interval Reference parts read as one continuous scroll with consistent spacing; the five interval rows sit stacked and the invariant stacked-thirds pattern is visible/legible per quality; the 'Go to Practice' footer button is the only vermilion accent on the page"
    why_human: "Preview harness cannot hydrate this SvelteKit app (null-origin); visual rhythm/legibility and 'only accent' color-audit are not verifiable via source grep or DOM assertions alone (per project note and PLAN 28-04's own human-check)"
  - test: "Load /practice in a Chromium browser, confirm the 'Scale practice' toggle sits below the main session block, is collapsed by default, and expanding it shows a tonic picker + scale keyboard without displacing or restyling the 'Start practice' flow"
    expected: "Disclosure renders in a visually subordinate position, collapsed by default, ghost-styled (not competing with the primary CTA); expanding reveals tonic row + ScaleKeyboardDrill cleanly below the existing session UI with no layout shift/overlap"
    why_human: "Visual layout/accent-hierarchy check (does the ghost toggle read as subordinate, does the primary CTA visually remain the only action-accent) cannot be verified from source/DOM assertions; per PLAN 28-05's own human-check and the project's preview-harness limitation"
---

# Phase 28: Learn Hub - Theory + Scales Explore + Interval Reference Verification Report

**Phase Goal:** One /learn surface presents the six theory lessons + Scales Explore + a shared IntervalView reference block (5 seventh qualities); the Scales Practice drill is relocated to be reachable via the Practice hub; /theory and /scales keep working; no regression.
**Verified:** 2026-07-25T02:19:40Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `TheoryLessons.svelte` is the single source of the theory lesson body; `/theory` renders it as a thin wrapper, byte-identical behavior | ✓ VERIFIED | `src/lib/components/TheoryLessons.svelte` exists with all 7 `data-testid="section-*"` cards (`interactive-lesson`, `symbol`, `sevenths`, `anchor`, `dominant`, `diminished`, `solfege`), `SEVENTH_SHAPES`/`ANCHOR_CHORDS`/`SOLFEGE_MAP` constants, `hearResolution()`, `onDestroy` cleanup, all as read from source. `src/routes/theory/+page.svelte` is a 32-line thin wrapper: header + `<TheoryLessons />` + unchanged `/drills` footer. `tests/theory.e2e.test.ts` runs unedited and passes (confirmed via `git diff 42a2f58..HEAD -- tests/theory.e2e.test.ts` = no diff, and `npx vitest run tests/theory.e2e.test.ts` green). |
| 2 | `ScaleExplorer.svelte` is the single source of the scales body (prop-gated `exploreOnly`); `/scales` renders it as a thin wrapper, byte-identical behavior when `exploreOnly` is false | ✓ VERIFIED | `src/lib/components/ScaleExplorer.svelte` owns `tonic`/`mode`/`inspectPayload` state, renders `tonic-row`, `scale-title`, and gates `mode-toggle` + Practice/`ScaleKeyboardDrill` branch behind `!exploreOnly` (read from source, lines 69-111). `/scales/+page.svelte` reduced to a 13-line wrapper rendering `<ScaleExplorer />` with default props. `tests/scales.e2e.test.ts` runs unedited and passes (no diff vs. pre-phase commit; vitest run green). |
| 3 | `/learn` presents theory lessons + Scale Explore (exploreOnly) + a 5-quality Interval Reference block on one surface | ✓ VERIFIED | `src/routes/learn/+page.svelte` composes `<TheoryLessons />` inside `learn-theory`, `<ScaleExplorer exploreOnly />` inside `learn-explore`, and a `{#each}` over 5 hard-coded chord entries (Cmaj7/C7/Cm7/Cm7b5/Cdim7) inside `learn-interval-reference`, each feeding `spellChord(entry.symbol)` into `<IntervalView>` with `onInspectTone` omitted. `src/routes/learn.test.ts` asserts all three sections present, `queryByTestId('mode-toggle')` absent inside `learn-explore`, and `getAllByTestId('interval-view')` has length 5 — test passes (`npx vitest run src/routes/learn.test.ts` green, 6/6). |
| 4 | The Interval Reference block reuses the single shared `IntervalView` component (IVW-03), not a second copy | ✓ VERIFIED | `find src -iname "*IntervalView*"` shows exactly one component file (`src/lib/components/IntervalView.svelte`); `grep -rln "IntervalView" src/` shows it consumed by both `src/routes/+page.svelte` (Lookup, Phase 26) and `src/routes/learn/+page.svelte` (this phase) — no duplicate component created. |
| 5 | The Scales "Practice" drill is reachable via the Practice hub through an additive, collapsed-by-default disclosure that does not alter the pageState machine | ✓ VERIFIED | `git diff 42a2f58..HEAD -- src/routes/practice/+page.svelte` shows a purely additive diff (49 insertions, 0 deletions) — no existing line touched. The disclosure block sits after the `{#if pageState === 'loading'}...{/if}` chain's closing `{/if}` and before `</main>` (confirmed by reading lines 489-555). `src/routes/practiceScalePractice.test.ts` behaviorally proves: collapsed by default (`scale-practice-card` absent on initial render), toggle has `aria-expanded="false"`, and clicking flips `aria-expanded` to `"true"` and reveals `scale-practice-tonic-row` + `scale-keyboard-drill` — a genuine state-transition test, not just presence (`npx vitest run` green, 3/3). |
| 6 | Learn shows only "Explore" (no Practice/mode-toggle) | ✓ VERIFIED | `learn.test.ts`'s "renders the Scale Explore section... no mode toggle (exploreOnly)" test explicitly asserts `within(exploreSection).queryByTestId('mode-toggle')).not.toBeInTheDocument()` — passes. |
| 7 | DRY: no copy-pasted lesson/explorer markup — `/theory`, `/scales`, and `/learn` all render the SAME `TheoryLessons`/`ScaleExplorer` component instances | ✓ VERIFIED | Confirmed by source inspection: all three routes `import TheoryLessons from '$lib/components/TheoryLessons.svelte'` / `import ScaleExplorer from '$lib/components/ScaleExplorer.svelte'` and render them as `<TheoryLessons />` / `<ScaleExplorer />` / `<ScaleExplorer exploreOnly />` — no second copy of lesson or scale-explorer markup exists anywhere in `src/`. |
| 8 | `learn.*` i18n domain resolves in en+fr, registered in the merge point and collision gate, no regressions to the i18n suite | ✓ VERIFIED | `src/lib/i18n/messages/learn.ts` exports 14 en/fr key pairs (`satisfies LocaleDict`); `messages/index.ts` imports and spreads `learn.en`/`learn.fr`; `messages.test.ts` imports `learn` and appends `['learn', learn.en]` to the domains array (all confirmed via grep). `npx vitest run src/lib/i18n/messages.test.ts src/lib/i18n/coverage.test.ts` green. |
| 9 | No regression: full suite and svelte-check stay green | ✓ VERIFIED | `npm run check` = 0 errors / 0 warnings across 1387 files. `npx vitest run` (full suite) = 118 test files passed, 1605 tests passed, 0 failures. Matches SUMMARY-claimed counts. |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/TheoryLessons.svelte` | Extracted lesson body, 7 sections | ✓ VERIFIED | Exists, 217 lines, all 7 `section-*` testids present, imports match plan exactly |
| `src/routes/theory/+page.svelte` | Thin wrapper around TheoryLessons | ✓ VERIFIED | 32 lines, renders `<TheoryLessons />` between header and unchanged footer |
| `src/lib/components/ScaleExplorer.svelte` | Extracted scales body, `exploreOnly` prop | ✓ VERIFIED | 112 lines, prop-gated mode-toggle/Practice branch confirmed |
| `src/routes/scales/+page.svelte` | Thin wrapper around ScaleExplorer | ✓ VERIFIED | 13 lines, renders `<ScaleExplorer />` with default props |
| `src/lib/i18n/messages/learn.ts` | 14-key en/fr learn domain | ✓ VERIFIED | 69 lines, all 14 keys present in both en/fr, no em/en dashes found |
| `src/routes/learn/+page.svelte` | The Learn hub | ✓ VERIFIED | 83 lines, 3 sections + footer CTA, matches plan structure exactly |
| `src/routes/learn.test.ts` | LEARN-01 render/smoke test | ✓ VERIFIED | 82 lines, 6 tests, all pass |
| `src/routes/practice/+page.svelte` | Additive scale-practice disclosure | ✓ VERIFIED | Additive-only diff confirmed (0 deletions); disclosure outside pageState machine |
| `src/routes/practiceScalePractice.test.ts` | LEARN-02 reachability test | ✓ VERIFIED | 68 lines, 3 tests, all pass, genuine state-transition assertions |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `/theory` | `TheoryLessons.svelte` | `<TheoryLessons />` import + render | WIRED | Confirmed in source |
| `/scales` | `ScaleExplorer.svelte` | `<ScaleExplorer />` import + render | WIRED | Confirmed in source |
| `/learn` | `TheoryLessons.svelte` | `<TheoryLessons />` import + render (no props) | WIRED | Same component instance as `/theory` |
| `/learn` | `ScaleExplorer.svelte` | `<ScaleExplorer exploreOnly />` import + render | WIRED | Same component instance as `/scales`, prop-gated |
| `/learn` | `IntervalView.svelte` | 5x `<IntervalView chord={spellChord(...)} />`, `onInspectTone` omitted | WIRED | Confirmed 5 instances via test + source; same component as Lookup (Phase 26) |
| `/practice` | `ScaleKeyboardDrill.svelte` | Additive disclosure `<ScaleKeyboardDrill notes={scaleNotes} tonic={scaleTonic} />` | WIRED | Confirmed outside pageState machine, additive-only diff |
| `messages/index.ts` | `learn.ts` | `import { learn } from './learn'` + `...learn.en`/`...learn.fr` spread | WIRED | Confirmed via grep |
| `messages.test.ts` | `learn.ts` | `['learn', learn.en]` domain-collision array entry | WIRED | Confirmed via grep |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| /theory unedited e2e suite passes | `npx vitest run tests/theory.e2e.test.ts` | pass | ✓ PASS |
| /scales unedited e2e suite passes | `npx vitest run tests/scales.e2e.test.ts` | pass | ✓ PASS |
| /learn hub structure + exploreOnly + 5 interval views + French + no dashes | `npx vitest run src/routes/learn.test.ts` | 6/6 pass | ✓ PASS |
| /practice scale-practice disclosure collapse/expand state transition | `npx vitest run src/routes/practiceScalePractice.test.ts` | 3/3 pass | ✓ PASS |
| i18n learn domain parity/collision/coverage | `npx vitest run src/lib/i18n/messages.test.ts src/lib/i18n/coverage.test.ts` | pass | ✓ PASS |
| No test files edited by this phase (REG-01) | `git diff --stat 42a2f58..HEAD -- tests/theory.e2e.test.ts tests/scales.e2e.test.ts` | empty diff | ✓ PASS |
| Full workspace type-check | `npm run check` | 0 errors / 0 warnings, 1387 files | ✓ PASS |
| Full workspace test suite (run once) | `npx vitest run` | 118 files / 1605 tests, all pass | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LEARN-01 | 28-01, 28-02, 28-03, 28-04 | Learn hub presents theory lessons + Scales Explore + shared interval reference on one surface | ✓ SATISFIED | `/learn` composes all three parts, verified above; REQUIREMENTS.md marks LEARN-01 `[x]` |
| LEARN-02 | 28-03, 28-05 | Scales Practice reachable via Practice hub; Learn shows only Explore | ✓ SATISFIED | Additive disclosure on `/practice` verified; `learn.test.ts` confirms no `mode-toggle` in `learn-explore`; REQUIREMENTS.md marks LEARN-02 `[x]` |

No orphaned requirements: `.planning/REQUIREMENTS.md`'s traceability table maps only LEARN-01 and LEARN-02 to Phase 28, and both appear in plan frontmatter `requirements:` fields.

Note: REG-01/REG-02 are formally traced to Phase 31 in REQUIREMENTS.md's traceability table, but the phase-28 goal statement itself asserts "no regression" for `/theory` and `/scales`. This was verified as an in-scope phase-goal claim (see truths 1, 2, 5, 9 above) even though the formal requirement IDs REG-01/REG-02 are not this phase's to close.

### Anti-Patterns Found

None. Scanned all 9 phase-modified/created files for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|placeholder|coming soon|not yet implemented|not available` — zero matches.

### Human Verification Required

### 1. /learn visual rhythm and accent-only-on-CTA check

**Test:** Load `/learn` in a Chromium browser (the preview harness cannot hydrate this SvelteKit app — null-origin, per project note).
**Expected:** The three parts (Theory, Scale Explore, Interval Reference) read as one continuous scroll with consistent spacing; the five interval rows sit stacked with the invariant stacked-thirds pattern legible per quality; the "Go to Practice" footer button is the only vermilion accent on the page.
**Why human:** Visual spacing/rhythm and "is this the only accent color on the page" cannot be confirmed via DOM assertions or source grep — this is a design-fidelity judgment call, harvested directly from PLAN 28-04's own `<human-check>` block.

### 2. /practice disclosure visual placement and non-displacement check

**Test:** Load `/practice` in a Chromium browser; confirm the "Scale practice" toggle sits below the main session block, is collapsed by default, and expanding it shows a tonic picker + scale keyboard without displacing or restyling the "Start practice" flow.
**Expected:** Ghost-styled toggle reads as visually subordinate; expanding reveals the tonic picker + `ScaleKeyboardDrill` cleanly below existing session UI with no layout shift or visual competition with the primary CTA.
**Why human:** Visual accent-hierarchy and layout-non-displacement cannot be verified from source or DOM assertions alone — harvested directly from PLAN 28-05's own `<human-check>` block.

### Gaps Summary

No gaps found. All 9 derived observable truths (roadmap success criteria + plan must-haves, merged and deduplicated) are verified against actual source code: artifacts exist, are substantive (no stubs/placeholders), are wired (imports + renders confirmed), and their supporting automated tests pass. The DRY constraint (single source of truth for TheoryLessons, ScaleExplorer, and IntervalView across `/theory`, `/scales`, `/learn`, and Lookup) was confirmed by direct source inspection, not just SUMMARY claims. REG-01 was independently confirmed via `git diff` showing zero edits to the pre-existing `tests/theory.e2e.test.ts`, `tests/scales.e2e.test.ts` files and a purely additive (0-deletion) diff on `src/routes/practice/+page.svelte`. The full test suite (118 files / 1605 tests) and `svelte-check` (1387 files, 0 errors/warnings) both pass.

The phase does not reach `passed` status only because two `<human-check>` items from the PLAN files (visual rhythm/accent-only-CTA verification on `/learn`, and layout-non-displacement verification on `/practice`) remain outstanding — these require a real Chromium render, which the project's known preview-harness limitation (cannot hydrate this SvelteKit app) prevents from being verified in this session. Per the workflow, these route to `human_needed` for the developer to confirm on-device.

---

_Verified: 2026-07-25T02:19:40Z_
_Verifier: Claude (gsd-verifier)_
