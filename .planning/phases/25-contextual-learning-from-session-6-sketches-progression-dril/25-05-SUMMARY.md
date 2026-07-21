---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
plan: 05
subsystem: ui
tags: [svelte, i18n, drill, progression-engine, tdd, chord-theory]

# Dependency graph
requires:
  - phase: 25-01
    provides: buildProgression/nameChoices/randomProgression pure progression engine, ProgressionBar/RomanFunction types
provides:
  - ProgressionDrill.svelte - the sketch-017 "earn-the-symbol" lead-sheet grid component (SK-017)
  - /progressions route, reachable from the desktop masthead and phone More sheet
  - progressions i18n domain (EN/FR) + nav.progressions label
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lead-sheet measure grid container wrapping a per-bar two-step drill (name via MC chips, play via inline PianoKeyboard + Check), rather than a bespoke drill chrome - thin presentation over a pure engine module"
    - "Name-choice chips render as flat single-text-node spans (mirrors RecallSession's hear-name-choice-grid), never a split root/superscript ChordGlyph, so the chip's accessible text matches the raw chord symbol exactly for both grading and testing"
    - "A component's very first $state initializer that needs another $state's initial-only value reads it off a plain (non-rune) local captured before the $state() call, avoiding Svelte 5's state_referenced_locally warning while keeping snapshot (not reactive) semantics"

key-files:
  created:
    - src/lib/components/ProgressionDrill.svelte
    - src/lib/components/progressionDrill.test.ts
    - src/routes/progressions/+page.svelte
    - src/routes/progressionsPage.test.ts
    - src/lib/i18n/messages/progressions.ts
  modified:
    - src/lib/i18n/messages/chrome.ts
    - src/lib/i18n/messages/index.ts
    - src/routes/+layout.svelte

key-decisions:
  - "Name-step chips never use ChordGlyph for the choice label - flat text keeps the chip's accessible name identical to the raw chord symbol string, which both the chroma-based grading logic and the component test's getByText(symbol) lookup depend on"
  - "The play step's PianoKeyboard renders notes={[]} while unanswered (no highlighting), mirroring drills/+page.svelte's identification/construction interactive pattern - the learner must derive which notes to play from the chord symbol they just named, not from a hint on the keyboard"
  - "functionReveal persists across the cursor advance (it shows the LAST earned bar's harmonic function, not a per-bar-visit transient), so the function payoff and the next bar's STEP 1 register can coexist in the same render, matching the plan's derive-then-play behavior spec"

patterns-established:
  - "ProgressionDrill's earned/cursor/step state model: earned is a boolean[] parallel to progression.bars, cursor is the active index, step is 'name' | 'play' - any future progression-style drill (e.g. a longer template) can reuse this exact shape"

requirements-completed: [SK-017]

coverage:
  - id: D1
    description: "ProgressionDrill renders a lead-sheet measure grid: roman numerals always visible, chord symbols hidden as ? until earned, and a KEY: <letter> <MAJOR|MINOR> banner above the prompt"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: lead-sheet grid, roman-always/symbol-hidden"
        status: pass
    human_judgment: false
  - id: D2
    description: "Per-bar derive-then-play two-step: naming the chord via same-key MC chips (nameChoices) advances to the play step; a correct chroma-matched play (matchChord against spellChord) earns the symbol (verdigris ChordGlyph stamp-in), reveals its harmonic function, and advances the cursor; wrong name/play never gates, showing a gentle retry"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: derive-then-play two-step earning"
        status: pass
    human_judgment: false
  - id: D3
    description: "An earned bar's symbol that appears in an active song shows the SongMark (◈-style) provenance mark"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: derive-then-play two-step earning > shows a SongMark provenance mark"
        status: pass
    human_judgment: false
  - id: D4
    description: "Completing every bar shows a done state with a fresh-progression Again control that resets the grid"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/components/progressionDrill.test.ts#ProgressionDrill: completion"
        status: pass
    human_judgment: false
  - id: D5
    description: "/progressions route renders the drill and is reachable from both the desktop masthead nav and the phone More sheet (not the 4-slot bottom tab bar)"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/routes/progressionsPage.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Bilingual EN/FR copy for the whole surface (KEY banner mode word, step register, retries, CTAs, function words, completion card), with chord symbols/roman numerals/key letters staying immune from t()"
    requirement: "SK-017"
    verification:
      - kind: unit
        ref: "src/lib/i18n/coverage.test.ts, src/lib/i18n/messages.test.ts"
        status: pass
    human_judgment: false
  - id: D7
    description: "Learner-facing visual polish (vermilion cursor edge/wash, verdigris earned-symbol fill, stamp-in reveal timing, chip/keyboard/Check layout on phone) reads correctly on-device"
    verification: []
    human_judgment: true
    rationale: "CSS visual treatment and phone-width layout require human eyeballing; jsdom component tests can only assert class names/testids, not rendered appearance (project's documented preview-harness null-origin gap)."

# Metrics
duration: ~65min across two sessions (interrupted mid-plan by an API connection drop after Task 2's TDD RED commit; resumed as a fresh continuation agent)
completed: 2026-07-21
status: complete
---

# Phase 25 Plan 05: Progression Drill (sketch-017 earn-the-symbol) Summary

**ProgressionDrill.svelte: a lead-sheet measure grid where roman numerals are always visible and chord symbols stay hidden as "?" until named (same-key MC chips) then played (chroma-graded inline keyboard), shipped as the /progressions route with full EN/FR i18n and masthead/More-sheet nav wiring.**

## Performance

- **Duration:** ~65 min total, across two sessions (a prior executor's API connection dropped mid-Task 2; this continuation agent resumed from the committed RED test)
- **Started:** 2026-07-21T00:03:36+02:00 (prior session, Task 1)
- **Completed:** 2026-07-21T18:05:16+02:00 (this session, Task 3's commit)
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments
- `ProgressionDrill.svelte` implements the sketch-017 "earn-the-symbol" lead-sheet grid over 25-01's pure `buildProgression`/`nameChoices`/`randomProgression` engine: a `.measures` grid with roman numerals always visible, symbols hidden as `?`, a vermilion cursor bar, and a mono `KEY: <letter> <MAJOR|MINOR>` banner
- The derive-then-play two-step: step 1 same-key multiple-choice chips (from `nameChoices`) name the chord; step 2 an inline interactive `PianoKeyboard` + `Check` grades the play by chroma (`matchChord` against `spellChord(bar.symbol)`); a correct play earns the symbol (verdigris `ChordGlyph` with `stamped`/`pulseToken` reveal), shows the harmonic-function payoff panel, and advances the cursor
- Wrong name or wrong play never gates progress - each shows a gentle, dedicated retry message (`name-retry` / `play-retry`) and stays on the same step
- An earned bar's symbol shows a `SongMark` provenance tag when it appears in an active song, reusing `songProvenance.ts`'s existing index
- Completing every bar shows a `progression-complete` card with an "Again" control that draws a fresh `randomProgression()` and fully resets grid state
- Full EN/FR `progressions` i18n domain (`src/lib/i18n/messages/progressions.ts`) plus `nav.progressions`, merged into the message catalog; chord symbols/roman numerals/key letters stay immune from `t()` per the project's Chord Glyph & Symbol Immunity rule
- `/progressions` route added, reachable from both the desktop masthead nav and the phone More sheet (deliberately NOT added to the 4-slot bottom tab bar, which is full)

## Task Commits

Each task was committed atomically:

1. **Task 1: Progressions i18n domain + nav label + register** - `04a7ad5` (feat) - *from prior session*
2. **Task 2: ProgressionDrill.svelte - lead-sheet grid + derive-then-play two-step** - RED `11908af` (test, *prior session*), GREEN `b864b83` (feat, *this session*)
3. **Task 3: /progressions route + nav wiring + page test** - `40b3d3a` (feat)

**Plan metadata:** (this commit)

_Note: TDD RED (`11908af`) failed on `Failed to resolve import "./ProgressionDrill.svelte"` as expected (component didn't exist yet); GREEN implementation passed all 7 tests on the first attempt after one lint-level fix (see Deviations), no REFACTOR commit needed._

## Files Created/Modified
- `src/lib/components/ProgressionDrill.svelte` - The earn-the-symbol lead-sheet grid component
- `src/lib/components/progressionDrill.test.ts` - TDD suite: 7 tests covering grid render, KEY banner, name/play two-step earning, wrong-name/wrong-play retries, SongMark provenance, and completion/Again
- `src/routes/progressions/+page.svelte` - The `/progressions` route page shell (standard paper chrome, mirrors `/recall`)
- `src/routes/progressionsPage.test.ts` - Route render test + masthead/More-sheet nav-reachability test
- `src/lib/i18n/messages/progressions.ts` - EN/FR domain for all progression-drill copy (KEY banner mode word, step register, retries, CTAs, function words, completion card)
- `src/lib/i18n/messages/chrome.ts` - Added `nav.progressions` (EN "Progressions", FR "Progressions")
- `src/lib/i18n/messages/index.ts` - Registered the `progressions` domain in the merged catalog
- `src/routes/+layout.svelte` - Added `/progressions` to `navLinks` (desktop masthead) and `moreHrefs` (phone More sheet)

## Decisions Made
- See `key-decisions` in frontmatter: name-choice chips stay flat text (never `ChordGlyph`) so the accessible chip text is byte-identical to the raw symbol for both grading logic parity and test `getByText` lookups; the play-step keyboard shows no note highlighting while unanswered (mirrors drills' construction/identification interactive pattern - the learner must derive the notes themselves); `functionReveal` persists across the cursor advance rather than being cleared, so the harmonic-function payoff and the next bar's `STEP 1` register coexist in one render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Lint] Fixed Svelte 5 `state_referenced_locally` warning on component init**
- **Found during:** Task 2 (GREEN implementation), immediately after the first passing test run
- **Issue:** `let earned = $state<boolean[]>(progression.bars.map(() => false));` read another `$state`-declared binding (`progression`) directly inside a sibling `$state()` initializer, which Svelte 5's compiler flags with `state_referenced_locally` (a warning, not a hard error) since it only captures the initial value and the compiler can't tell that's intentional here
- **Fix:** Captured the first `randomProgression()` draw in a plain (non-rune) `const initialProgression` before declaring `progression = $state(initialProgression)`, then initialized `earned` from `initialProgression.bars` instead of `progression.bars` - preserves the exact same snapshot-only semantics without tripping the analyzer
- **Files modified:** `src/lib/components/ProgressionDrill.svelte`
- **Verification:** `npm run check` went from 0 errors/1 warning to 0 errors/0 warnings; all 7 component tests still pass
- **Committed in:** `b864b83` (Task 2 GREEN commit - the warning was fixed before that commit was made, so the committed file was already clean)

---

**Total deviations:** 1 auto-fixed (1 lint/bug)
**Impact on plan:** Cosmetic compiler-warning fix only; no behavior change, no scope creep.

## Issues Encountered
- The prior executor's session was interrupted by an API connection drop mid-Task 2, after the TDD RED commit (`11908af`) landed but before GREEN. This continuation agent verified the RED test still failed as expected (`Failed to resolve import "./ProgressionDrill.svelte"`), then proceeded straight to GREEN implementation with no rework needed - the prior commits (`04a7ad5`, `11908af`) were intact and required no changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `npm run check`: 0 errors, 0 warnings.
- Full suite: 1413/1413 tests green (up from the pre-plan baseline), including the new `progressionDrill.test.ts` (7 tests) and `progressionsPage.test.ts` (2 tests).
- `/progressions` is live, bilingual, and reachable from both nav surfaces. No blockers for subsequent Phase 25 plans.
- Known human-judgment item (D7 in `coverage`): the sheet's visual polish (vermilion cursor treatment, verdigris fill, stamp-in timing, phone-width chip/keyboard layout) has not been eyeballed on-device - this project's preview harness cannot hydrate this SvelteKit app (see [[preview-harness-null-origin-sveltekit]]), so a manual on-device check of `/progressions` is recommended before considering the sketch-017 synthesis fully verified end-to-end.

---
*Phase: 25-contextual-learning-from-session-6-sketches-progression-dril*
*Completed: 2026-07-21*

## Self-Check: PASSED
- FOUND: src/lib/components/ProgressionDrill.svelte
- FOUND: src/lib/components/progressionDrill.test.ts
- FOUND: src/routes/progressions/+page.svelte
- FOUND: src/routes/progressionsPage.test.ts
- FOUND: src/lib/i18n/messages/progressions.ts
- FOUND: 04a7ad5 (Task 1 feat commit)
- FOUND: 11908af (Task 2 RED commit)
- FOUND: b864b83 (Task 2 GREEN commit)
- FOUND: 40b3d3a (Task 3 feat commit)
