---
phase: 20-french-translation
plan: 07
subsystem: i18n
tags: [i18n, svelte5-runes, scales, keyboard-drill]

requires:
  - phase: 20-french-translation
    plan: 01
    provides: "Reactive locale store (currentLocale/setLocale/initLocale/t) and the merged messages/index.ts dictionary architecture"
provides:
  - "messages/scales.ts filled with the scales-domain dictionary: page title/subtitle, shared tonic quality suffix (major/majeur), Explore/Practice mode toggle, degree-strip group label + degree suffix, keyboard-drill prompt/register/completion/run-again/key-label copy, InspectRegister idleText"
  - "scales/+page.svelte, ScaleKeyboardDrill.svelte, ScaleDegreeStrip.svelte rewired to read t('scales.*') reactively"
affects: []

tech-stack:
  added: []
  patterns:
    - "A single shared dictionary key (scales.tonic.qualitySuffix) is read from two call sites (visible scale title and every tonic button's aria-label) so the translated word appears once in the dictionary while the root letter itself never routes through t() - keeps the immunity boundary explicit at each usage site rather than only at the data layer."
    - "Placeholder substitution via {TOKEN}.replace(...) (matching the {N} pattern already established in SongMark/hints) used for both the drill's sentence-level copy (Play {TONIC} major...) and its uppercase register line (DEGREE {N} OF 8 · {DIR}), the latter composing two t() reads (a template plus a direction word) into one final string."
    - "Locale-agnostic DOM key lookup in tests (keyButtonByPlacement) added alongside the existing English-only tapButtonFor helper, since ScaleKeyboardDrill's per-key aria-label now carries locale-translated words (key/scale degree) - French-locale tests select keys by deterministic render order (white keys then black keys) instead of by accessible name."

key-files:
  created: []
  modified:
    - src/lib/i18n/messages/scales.ts
    - src/routes/scales/+page.svelte
    - src/lib/components/ScaleKeyboardDrill.svelte
    - src/lib/components/ScaleDegreeStrip.svelte
    - src/lib/components/scaleKeyboardDrill.test.ts
    - tests/scales.e2e.test.ts

key-decisions:
  - "The scale-title's old always-bilingual literal ('{tonic} major · gamme majeure', shown identically regardless of locale) was replaced with a single locale-driven '{tonic} {qualitySuffix}' read, since the real EN|FR toggle now makes the permanent French appendage redundant. The e2e assertions on this element already used toHaveTextContent substring matching, so this simplification kept all existing tests green with no test changes required for that specific assertion."
  - "ScaleKeyboardDrill's per-key aria-label ('{letter}{octave} key, scale degree {N}') has its 'key'/'scale degree' words routed through t() (scales.drill.keyLabel / scales.drill.scaleDegreeLabel) even though the plan's must_haves didn't explicitly call this string out - it's user-facing (screen-reader) prose on the exact drill surface this plan owns, so leaving it English-only under fr would violate the plan's own truth ('the scale keyboard drill... renders French'). The board-identity letter and the degree number stay untouched (immune)."
  - "The keyboard drill's outer role=group aria-label ('Scale keyboard, {TONIC} major, two octaves') got its own dictionary key (scales.drill.groupLabel) rather than reusing scales.tonic.qualitySuffix inline, since it needed the {TONIC} placeholder pattern already established for prompt/complete strings, not the simple two-token concatenation used by the page-level title/button labels."

patterns-established: []

requirements-completed: [I18N-02]

coverage:
  - id: D1
    description: "Scales page (title, subtitle, tonic picker, mode toggle) renders in French"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "tests/scales.e2e.test.ts#scales page French locale (I18N-02) > renders the page title, tonic quality suffix, mode toggle, and idle inspect line in French"
        status: pass
    human_judgment: false
  - id: D2
    description: "ScaleKeyboardDrill (Practice mode) prompt, register, wrong-tap flash, and completion/run-again copy render in French; pitch-class grading and note/degree notation stay unaffected"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#ScaleKeyboardDrill French locale (I18N-02) > renders the prompt and register in French"
        status: pass
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#ScaleKeyboardDrill French locale (I18N-02) > renders the completion card and Recommencer button in French"
        status: pass
      - kind: unit
        ref: "src/lib/components/scaleKeyboardDrill.test.ts#ScaleKeyboardDrill French locale (I18N-02) > a tapped key's note letter and scale degree number render identically across locales"
        status: pass
    human_judgment: false
  - id: D3
    description: "ScaleDegreeStrip (Explore mode) group label and per-cell aria-label caption render in French; note letters, solfege, and interval shorthand stay immune"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "tests/scales.e2e.test.ts#scales page French locale (I18N-02) > renders a degree-strip caption (aria-label) in French while the note letter and degree number stay identical to English"
        status: pass
    human_judgment: false
  - id: D4
    description: "The InspectRegister idle placeholder this page passes as a prop renders in French, without editing InspectRegister.svelte (owned by 20-09)"
    requirement: "I18N-02"
    verification:
      - kind: unit
        ref: "tests/scales.e2e.test.ts#scales page French locale (I18N-02) > renders the page title, tonic quality suffix, mode toggle, and idle inspect line in French"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-18
status: complete
---

# Phase 20 Plan 07: Scales Surface Translation Summary

**Filled the scales-domain i18n dictionary and rewired the scales page, the tonic-anchored keyboard drill, and the Explore degree strip to render fully in French, while keeping note letters, solfege, interval shorthand, and scale degree numbers - and the pitch-class grading logic itself - completely untouched.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-18T20:49:04+02:00
- **Completed:** 2026-07-18T20:59:01+02:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Filled `messages/scales.ts`: page title/subtitle, a single shared `scales.tonic.qualitySuffix` key (`major`/`majeur`) read by both the visible scale title and every tonic button's aria-label, the Explore/Practice mode toggle (`scales.mode.*`), the degree strip's group label and per-cell degree suffix (`scales.degreeStrip.*`), the keyboard drill's group label/key label/scale-degree label/prompt/register/direction words/completion/run-again copy (`scales.drill.*`), and the `InspectRegister` idleText prop (`scales.inspect.idle`).
- Rewired `scales/+page.svelte`: h1, subtitle, tonic-button aria-labels, the scale-title line (simplified from a permanently bilingual literal to a single locale-driven read), the mode-toggle group label and both button labels, and the `InspectRegister` `idleText` prop - all via `t()`. `InspectRegister.svelte` itself was not touched, per the plan's explicit prohibition (owned by 20-09).
- Rewired `ScaleKeyboardDrill.svelte`: the prompt, the uppercase register (composed from a template key plus a translated ascending/descending direction word), the completion message and Run it again button, the outer keyboard `role=group` aria-label, and each key's aria-label (`{letter}{octave} key[, scale degree {N}]`) now read `t()`. The note letter, octave number, degree number, and the `gradeScaleTap`/pitch-class grading logic are completely unchanged.
- Rewired `ScaleDegreeStrip.svelte`: the strip's `role=group` aria-label and each cell's `degree` aria-label suffix now read `t()`; the visible degree number, note letter, solfege syllable, and interval shorthand chip inside each cell remain untouched (immune).
- Extended `scaleKeyboardDrill.test.ts` with a French-locale describe block: prompt/register in French, completion card + Recommencer button in French, and a locale-agnostic key-lookup helper (`keyButtonByPlacement`) proving a tapped key's note letter and degree number render identically in `en` and `fr` even though the surrounding aria-label wording differs.
- Extended `tests/scales.e2e.test.ts` with a French-locale describe block: page title/tonic-title/mode-toggle/idle-inspect-line assertions under `fr`, plus a degree-strip aria-label assertion (`'C degré 1'` vs `'C degree 1'`) confirming the note letter stays identical across locales while only the surrounding word translates.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fill messages/scales.ts with the scales-domain dictionary** - `150ffc7` (feat)
2. **Task 2: Rewire scales/+page.svelte + ScaleKeyboardDrill.svelte + ScaleDegreeStrip.svelte** - `8cf959d` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/lib/i18n/messages/scales.ts` - scales-domain dictionary (page copy, tonic quality suffix, mode toggle, degree-strip labels, keyboard-drill copy, InspectRegister idleText)
- `src/routes/scales/+page.svelte` - h1/subtitle/tonic aria-labels/scale-title/mode-toggle/InspectRegister idleText rewired to `t()`
- `src/lib/components/ScaleKeyboardDrill.svelte` - prompt/register/completion/run-again/aria-labels rewired to `t()`; grading and note/degree notation unchanged
- `src/lib/components/ScaleDegreeStrip.svelte` - group label + per-cell aria-label suffix rewired to `t()`; visible cell content unchanged
- `src/lib/components/scaleKeyboardDrill.test.ts` - added French-locale assertions + locale-agnostic key lookup helper
- `tests/scales.e2e.test.ts` - added French-locale page/degree-strip assertions

## Decisions Made

- The scale-title's previous always-bilingual literal (`{tonic} major · gamme majeure`, identical in every locale) was replaced with a single `{tonic} {qualitySuffix}` read, since the real toggle now makes a permanent French appendage redundant; the existing e2e assertions used `toHaveTextContent` substring matching so this simplification required no test changes for that specific line.
- `ScaleKeyboardDrill`'s per-key aria-label words (`key`, `scale degree`) were translated even though not explicitly named in the plan's must_haves, since they're user-facing (screen-reader) prose on the exact surface this plan owns; the board-identity letter and degree number stay untouched.
- The keyboard drill's outer group aria-label got its own dictionary key (`scales.drill.groupLabel`) with the `{TONIC}` placeholder pattern, distinct from the simpler two-token `qualitySuffix` reuse used at the page level, since it needed the same placeholder-substitution shape as the prompt/complete strings.

## Deviations from Plan

None - plan executed exactly as written. One addition beyond the plan's explicit must_haves (documented above, not a deviation from a prohibition): the keyboard drill's per-key aria-label wording (`key`/`scale degree`) and the drill's outer group aria-label were also translated, since they're in-scope screen-reader prose on the surfaces this plan owns and leaving them English-only would have left the drill only partially French.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm run check` is 0 errors; full suite (`npx vitest run`) is green: 1125 tests / 82 files, up from 1120/82 after Plan 20-06, including the new French-locale assertions in both `scaleKeyboardDrill.test.ts` and `tests/scales.e2e.test.ts`.
- `messages/scales.ts` is now filled (no longer a stub); en/fr key-parity test continues to pass.
- `InspectRegister.svelte` was not modified (owned by Plan 20-09); this plan only supplies a translated `idleText` prop value.
- No blockers for subsequent Phase 20 plans (20-08 through 20-10).

---
*Phase: 20-french-translation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All 6 created/modified deliverable files (scales.ts, +page.svelte, ScaleKeyboardDrill.svelte, ScaleDegreeStrip.svelte, scaleKeyboardDrill.test.ts, tests/scales.e2e.test.ts) plus this SUMMARY.md confirmed present on disk; both task commit hashes (150ffc7, 8cf959d) confirmed in git log.
