---
phase: 03-on-screen-drill-loop
plan: 03
subsystem: ui
tags: [svelte5, drills, tdd, e2e, construction-drill]

# Dependency graph
requires:
  - phase: 03-on-screen-drill-loop (plan 01)
    provides: matchChord (pure chroma-set matcher), generateQuestion (drill-question generator)
  - phase: 03-on-screen-drill-loop (plan 02)
    provides: PianoKeyboard interactive mode (interactive/selected/onToggle props, sharp-spelling black-key letters)
provides:
  - "/drills route: zero-friction construction-drill loop (DRILL-01, DRILL-03, INPUT-02)"
  - "Drills masthead nav link (D-13)"
affects: [03-04 (identification + ScoreRegister + interleaving, extends this page)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.spyOn(Math, 'random').mockImplementation with a call-indexed draws array to deterministically pin generateQuestion's multi-draw sequence (root index, quality index, question-type index) in e2e tests"
    - "vi.mock('$app/stores') with a minimal readable stub to render +layout.svelte standalone in a unit test, working around the absence of a real SvelteKit router context in @testing-library/svelte"
    - "No-immediate-repeat variant picker (pickVariant) mirroring $lib/copy/hints's pickHint, inlined in the page rather than extracted to a shared module (two small variant sets, one page)"

key-files:
  created:
    - tests/drills.e2e.test.ts
    - src/routes/drills/+page.svelte
  modified:
    - src/routes/+layout.svelte

key-decisions:
  - "generateQuestion() is redrawn in a loop until it returns a construction question, since this plan only implements the construction branch (identification lands in Plan 04); keeps the loop zero-friction with no setup screen regardless of which direction the shared generator happens to draw first"
  - "Black-key letters are queried/toggled by their sharp spelling (e.g. D♯, A♯) throughout the page and its tests, matching PianoKeyboard's Plan 02 contract that onToggle always emits the sharp-spelling letter regardless of how the target chord's SpelledNote is flat-spelled for display"
  - "The masthead Drills nav-link e2e assertion renders +layout.svelte directly (not the page in isolation) with a mocked $app/stores $page readable and a raw-snippet children stub, rather than following lookup.e2e.test.ts's precedent of leaving masthead checks to manual verification - the plan explicitly required a getByRole('link', { name: 'Drills' }) assertion in this suite"

patterns-established:
  - "Deterministic Math.random pinning for multi-draw pure generators: an ordered draws[] array consumed by call index, rather than a single fixed return value, needed whenever a generator makes more than one Math.random() call per invocation"

requirements-completed: [DRILL-01, DRILL-03, INPUT-02]

coverage:
  - id: D1
    description: "Landing on /drills shows a construction question immediately (chord glyph, 'Click the notes for {symbol}.' instruction, interactive keyboard), no setup screen"
    requirement: "DRILL-01"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page zero-friction construction load"
        status: pass
    human_judgment: false
  - id: D2
    description: "Check is disabled until at least one key is selected; Clear deselects all without grading"
    requirement: "DRILL-01"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page Check button gating, drills page Clear"
        status: pass
    human_judgment: false
  - id: D3
    description: "Any correct voicing (any octave/inversion) is accepted via matchChord's chroma-set equality"
    requirement: "DRILL-01"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page correct construction answer > accepts the correct pitch classes played in a different octave"
        status: pass
    human_judgment: false
  - id: D4
    description: "A wrong construction answer reveals the correct notes in interval colors, the interval-formula chip row, and a You played / Correct diff"
    requirement: "DRILL-03"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page wrong construction answer teaches"
        status: pass
    human_judgment: false
  - id: D5
    description: "A right answer shows the stamp beat and a rotating warm confirmation line"
    requirement: "DRILL-03"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills page correct construction answer > grades a correct Cm7 voicing"
        status: pass
    human_judgment: false
  - id: D6
    description: "A Drills nav link appears in the masthead, routing to /drills"
    requirement: "INPUT-02"
    verification:
      - kind: e2e
        ref: "tests/drills.e2e.test.ts#drills masthead nav link"
        status: pass
    human_judgment: false
  - id: D7
    description: "No em dashes in drill-page copy; no localStorage write in the drill page"
    requirement: "DRILL-03"
    verification:
      - kind: other
        ref: "grep -n \"—\" and grep -n \"localStorage\" against src/routes/drills/+page.svelte, both empty"
        status: pass
    human_judgment: false

# Metrics
duration: 22min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 3: Construction Drill Loop Summary

**Shipped the `/drills` route: a zero-friction construction-drill loop where a user clicks notes on the interactive keyboard to build a chord from its symbol, presses Check to grade against matchChord's chroma-set matcher, and gets instant stamp-reward or elaborative teaching feedback, reachable via a new Drills masthead link.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-13T03:19:57Z (approx, from first RED run)
- **Completed:** 2026-07-13T03:23:14Z
- **Tasks:** 2
- **Files modified:** 3 (2 new, 1 modified)

## Accomplishments
- `tests/drills.e2e.test.ts`: 7 e2e scenarios covering zero-friction load, Check-disabled-until-selection, correct grading (including any-octave voicing acceptance), wrong-answer teaching reveal, Clear, and the masthead Drills nav link.
- `src/routes/drills/+page.svelte`: construction-drill page composing `generateQuestion`, `matchChord`, `spellChord`, `formulaFor`, `PianoKeyboard`, `ChordGlyph`, `IntervalChip`, and `Button` exactly as the lookup page's patterns dictate, with rotating right/wrong copy variants and a `You played` / `Correct` diff that flags extra notes with a plain ink-bordered tag.
- `src/routes/+layout.svelte`: `navLinks` gains `{ href: '/drills', label: 'Drills' }` between Lookup and Showcase.
- Full suite: 206/206 passing (was 199 before this plan); `npm run check`: 0 errors, 0 warnings.

## Task Commits

Each task followed the RED/GREEN TDD cycle:

1. **Task 1 (RED):** `c419db0` test(03-03): add failing e2e test for /drills construction loop
2. **Task 2 (GREEN):** `e1ae6e7` feat(03-03): build the /drills construction loop + Drills nav link

## Files Created/Modified
- `tests/drills.e2e.test.ts` - 7 e2e scenarios; deterministic `Math.random` pinning forces a construction `Cm7` question every run.
- `src/routes/drills/+page.svelte` - The `/drills` construction-drill page (state, handlers, layout, feedback, `.stamp` keyframe reuse).
- `src/routes/+layout.svelte` - One-line `navLinks` addition for the Drills nav link.

## Decisions Made
- `generateConstructionQuestion()` redraws `generateQuestion()` in a loop until it returns a `kind: 'construction'` question, since this plan only implements that branch (identification arrives in Plan 04) and the loop must always be zero-friction on load regardless of the shared generator's 50/50 draw.
- Black-key letters are consistently queried and toggled by their sharp spelling (`D♯`, `A♯`) rather than the target chord's flat spelling (`E♭`, `B♭`), matching Plan 02's established contract that `PianoKeyboard`'s `onToggle` always emits the sharp-spelling letter for black keys regardless of how a given chord's `SpelledNote` displays.
- The masthead nav-link e2e assertion renders `+layout.svelte` directly with a mocked `$app/stores` `page` readable and a `createRawSnippet` children stub, rather than deferring to manual verification as `lookup.e2e.test.ts`'s documented precedent suggests, because the plan explicitly specified a `getByRole('link', { name: 'Drills' })` assertion in this suite.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Black-key aria-label letter mismatch in initial test draft**
- **Found during:** Task 2 verification (`npx vitest run tests/drills.e2e.test.ts`)
- **Issue:** The first test draft queried black keys by their flat spelling (`E♭ key`, `B♭ key`), but `PianoKeyboard`'s `keyAriaLabel` (Plan 02) always emits the sharp spelling (`D♯ key`, `A♯ key`) regardless of the target chord's own flat spelling, so those queries found no matching element.
- **Fix:** Replaced all black-key button-role queries with the sharp-spelling letter, leaving flat-spelling assertions intact wherever they target the app's own rendered display text (formula/diff rows, which correctly show `E♭`/`B♭` per `spellChord`'s output).
- **Files modified:** `tests/drills.e2e.test.ts`
- **Verification:** All 7 scenarios pass.
- **Committed in:** `e1ae6e7` (GREEN commit)

**2. [Rule 3 - Blocking issue] `$page` store undefined when rendering `+layout.svelte` standalone**
- **Found during:** Task 2 verification
- **Issue:** `+layout.svelte` reads `$page.url.pathname` from `$app/stores` to mark the active nav link; that store is populated by SvelteKit's real client router, which isn't present when `@testing-library/svelte` mounts the layout component directly in a unit test, producing `TypeError: Cannot read properties of undefined (reading 'pathname')`.
- **Fix:** Added `vi.mock('$app/stores', ...)` with a minimal `readable({ url: new URL(...) })` stub scoped to this test file only; no production code changed.
- **Files modified:** `tests/drills.e2e.test.ts`
- **Verification:** The masthead nav-link test passes; `npm run check` reports 0 errors.
- **Committed in:** `e1ae6e7` (GREEN commit)

**3. [Rule 1 - Bug] `svelte-check` type error on layout render props**
- **Found during:** Task 2 verification (`npm run check`)
- **Issue:** `render(RootLayout, { children: emptyChildren })` failed type-checking because SvelteKit's generated `LayoutProps` type requires `params` and `data` alongside `children`.
- **Fix:** Passed `{ params: {}, data: {}, children: emptyChildren }` to satisfy the generated type; no runtime behavior depends on these being non-empty since the masthead only reads `navLinks` and the mocked `$page` store.
- **Files modified:** `tests/drills.e2e.test.ts`
- **Verification:** `npm run check` reports 0 errors, 0 warnings.
- **Committed in:** `e1ae6e7` (GREEN commit)

---

**Total deviations:** 3 (all Rule 1/3 auto-fixes, all confined to the test file, no production-code scope creep)
**Impact on plan:** None. All fixes were required to get the plan's own specified test assertions (aria-label queries, masthead link check) working correctly against the real component contracts already established in Plan 02 and SvelteKit's generated types; no acceptance criteria were skipped or altered.

## Issues Encountered

None beyond the three deviations above, all caught and resolved during Task 2's own verification loop before committing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 04 can extend `src/routes/drills/+page.svelte` in place to add the identification branch (`ChoiceGrid`, pre-highlighted keyboard, `Name this chord.` instruction), the `ScoreRegister`, the `Next` button, and full interleaving between construction and identification questions - none of this plan's state shape (`question`, `selected`, `answered`, `feedback`) should need to change, only extend.
- `tests/drills.e2e.test.ts` is ready to be extended with identification-flow scenarios in Plan 04; its `Math.random` pinning pattern (a call-indexed `draws[]` array) is reusable for forcing identification questions deterministically.
- No blockers. Full suite (206/206) and `npm run check` (0 errors, 0 warnings) both green.

---
*Phase: 03-on-screen-drill-loop*
*Completed: 2026-07-13*

## Self-Check: PASSED

- FOUND: tests/drills.e2e.test.ts
- FOUND: src/routes/drills/+page.svelte
- FOUND: .planning/phases/03-on-screen-drill-loop/03-03-SUMMARY.md
- FOUND commit: c419db0 (test)
- FOUND commit: e1ae6e7 (feat)
- FOUND commit: b21e913 (docs: summary)
