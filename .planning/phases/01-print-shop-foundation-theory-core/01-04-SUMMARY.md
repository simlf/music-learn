---
phase: 01-print-shop-foundation-theory-core
plan: 04
subsystem: ui
tags: [svelte5, tonal, tone.js, print-shop, showcase, tdd]

# Dependency graph
requires:
  - phase: 01-print-shop-foundation-theory-core (Plan 02)
    provides: "spellChord(symbol): ChordResult - typed, interval-tagged, dual-named, enharmonically-correct chord spelling"
  - phase: 01-print-shop-foundation-theory-core (Plan 03)
    provides: "PianoKeyboard, ChordGlyph, IntervalChip, Button, NoteLabel - Print Shop primitives"
provides:
  - "Full /showcase route: chord input -> spellChord -> ChordGlyph stamp + interval-colored PianoKeyboard + IntervalChip formula readout + alias-equivalence line"
  - "Empty state with 2-3 clickable starter chords (D-09)"
  - "Non-blocking rotating error hints on unrecognized input (D-08)"
  - "randomChord() surprise-me button doubling as a manual engine spot-check (D-10)"
  - "playChord() plain Tone.js synth hear-it playback gated behind a user gesture (D-11)"
affects: ["Phase 2 (lookup)", "Phase 3 (drills)", "Phase 7 (lessons)"]

# Tech tracking
tech-stack:
  added: ["tone@15.1.22"]
  patterns:
    - "Interval-formula labels are derived in the page (not the engine) via tonal's Interval.distance between root and each spelled note, after converting display glyphs (♯/♭) back to ASCII - tonal's Interval API only understands ASCII accidentals, unlike Chord.get which the engine already normalizes for"
    - "Alias-equivalence line is built by prefixing ChordResult.aliases (bare quality suffixes like 'm7', '-7') with the chord's root, since tonal's aliases array never includes the root itself"
    - "Audio stays isolated in src/lib/audio/ and is never imported by src/lib/theory/*, preserving engine purity for later phases (drills, MIDI matching, scales)"
    - "Non-blocking error handling: showChord() only overwrites `result` on a recognized parse; an unrecognized parse only sets a rotating `hint`, leaving the previous chord render untouched"

key-files:
  created:
    - src/lib/audio/playChord.ts
    - src/lib/theory/randomChord.ts
    - src/lib/copy/hints.ts
  modified:
    - src/routes/showcase/+page.svelte
    - tests/showcase.e2e.test.ts
    - vitest-setup.ts
    - package.json
    - package-lock.json

key-decisions:
  - "randomChord() draws only from the exact 12-root x 8-quality space proven correct by Plan 02's reference chord matrix, guaranteeing surprise-me never produces an unrenderable symbol"
  - "tone pinned to the exact version 15.1.22 (not a caret range) matching the project's convention for direct theory/audio dependencies (tonal is also pinned exact) and CLAUDE.md's vetted-version rationale"
  - "Interval-formula label derivation lives in the showcase page, not the theory engine, since it is a presentation concern (chip label formatting) rather than part of ChordResult's contract"

patterns-established:
  - "Non-blocking error/success split: a page holds two independent state slots (result, hint) so an error never clobbers the last good render (D-08)"

requirements-completed: [THEORY-01, THEORY-02, THEORY-03, THEORY-04, DESIGN-01, DESIGN-02]

coverage:
  - id: D1
    description: "Typing any supported chord symbol renders a ChordGlyph stamp and highlights its notes on the interval-colored keyboard with dual naming"
    requirement: "THEORY-01"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#typing Dm7 and clicking Show chord renders a ChordGlyph and highlights D, F, A, C on the keyboard in role colors"
        status: pass
    human_judgment: false
  - id: D2
    description: "Entering a jazz alias (C-7) shows the alias-equivalence line containing both canonical and alias forms, proving THEORY-02 visually"
    requirement: "THEORY-02"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#entering the alias C-7 shows the alias-equivalence line containing Cm7 and C-7"
        status: pass
    human_judgment: false
  - id: D3
    description: "The interval-formula readout renders IntervalChips (R, m3, P5, m7) with dual-named notes beneath each chip (D-12)"
    requirement: "DESIGN-02"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#renders the interval-formula readout as IntervalChips with dual-named notes beneath"
        status: pass
    human_judgment: false
  - id: D4
    description: "The stamp animation is the sole success beat - no extra congratulation text or badge (D-07)"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#applies the stamp animation class on chord render with no extra congratulation text"
        status: pass
    human_judgment: false
  - id: D5
    description: "Empty state invites with 2-3 clickable starter chords that populate and render on click (D-09)"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#shows the empty state with 2-3 clickable starter chords before any input"
        status: pass
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#clicking a starter chord populates and renders it"
        status: pass
    human_judgment: false
  - id: D6
    description: "Unrecognized input shows a playful rotating hint in a non-blocking error bar, leaving the previous result visible (D-08)"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#shows a playful non-blocking hint on unrecognized input and keeps the previous result visible"
        status: pass
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#rotates through different hint variants on repeated errors"
        status: pass
    human_judgment: false
  - id: D7
    description: "A surprise-me ghost button stamps a random supported chord via the same render path (D-10)"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#a surprise-me ghost button stamps a random supported chord"
        status: pass
    human_judgment: false
  - id: D8
    description: "A hear-it action plays the displayed chord on a plain Tone.js synth, gated behind a user gesture, with engine purity preserved (D-11)"
    verification:
      - kind: e2e
        ref: "tests/showcase.e2e.test.ts#renders a hear-it button on the rendered result"
        status: pass
      - kind: other
        ref: "grep -nE for svelte/tone/audio imports across src/lib/theory/*.ts returns no matches; package.json pins tone@15.1.22 and excludes @tonejs/piano"
        status: pass
    human_judgment: true
    rationale: "Actual audio output correctness (does it sound right, does autoplay policy behave correctly in a real browser tab) cannot be verified in jsdom - only button presence and wiring are automated. A human should click Hear It in a real browser once to confirm sound plays without console errors."

duration: 22min
completed: 2026-07-12
status: complete
---

# Phase 1 Plan 4: Full Showcase Vertical Slice Summary

**The complete `/showcase` route now composes Plan 02's theory engine and Plan 03's Print Shop components into one working vertical slice: any supported chord symbol stamps as a `ChordGlyph`, highlights its notes on the interval-colored `PianoKeyboard` with dual naming, shows the alias-equivalence line and interval-formula chips, and adds an inviting empty state, playful non-blocking error hints, a surprise-me random-chord button, and Tone.js synth "hear it" playback.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-12T22:57:00Z
- **Completed:** 2026-07-12T23:19:00Z
- **Tasks:** 3 (Task 1 TDD RED+GREEN, Tasks 2-3 standard auto)
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments

- Rewrote `src/routes/showcase/+page.svelte` from Plan 01's skeleton into the full Print Shop showcase: chord input wired through `spellChord` to `ChordGlyph`, `PianoKeyboard`, `IntervalChip` formula readout, and the alias-equivalence line, satisfying all five Phase-1 success criteria end to end.
- Added the empty state (`No chord yet` + 2-3 clickable starter chords), a non-blocking rotating error bar (`src/lib/copy/hints.ts`), and a ghost "Surprise me" button (`src/lib/theory/randomChord.ts`) drawing from the exact proven-correct 12-root x 8-quality space.
- Added `src/lib/audio/playChord.ts`: a lazily-initialized Tone.js `PolySynth` gated behind a user gesture, wired to a ghost "Hear it" button, with `tone@15.1.22` pinned exactly and `@tonejs/piano` deliberately excluded per CLAUDE.md/D-11.
- Expanded `tests/showcase.e2e.test.ts` from 1 to 10 tests covering the full behavior surface, following strict RED-then-GREEN TDD for Task 1 (confirmed all 10 failing before implementation, all passing after).

## Task Commits

Each task was committed atomically (Task 1 followed TDD RED/GREEN):

1. **Task 1 RED: expand e2e tests for full showcase slice** - `946fedb` (test) - confirmed 10/10 failing before implementation
2. **Task 1 GREEN: implement full showcase render (glyph, keyboard, formula, alias)** - `33853b9` (feat) - 4/10 targeted tests passing
3. **Task 2: empty state, non-blocking error hints, surprise-me** - `9140acb` (feat) - 9/10 passing
4. **Task 3: Tone.js synth hear-it playback** - `cf82cd0` (feat) - all 10/10 passing

## Files Created/Modified

- `src/routes/showcase/+page.svelte` - Full showcase: input -> spellChord -> ChordGlyph/PianoKeyboard/IntervalChip render, alias line, empty state, error bar, surprise-me, hear-it
- `src/lib/audio/playChord.ts` - Lazily-initialized Tone.js PolySynth, plays spelled notes via `triggerAttackRelease`, gated behind a user gesture
- `src/lib/theory/randomChord.ts` - `randomChord()`: random symbol from the proven 12-root x 8-quality v1 space
- `src/lib/copy/hints.ts` - `errorHints` + `pickHint()`: rotating playful hint variants, no immediate repeats
- `tests/showcase.e2e.test.ts` - Expanded from 1 to 10 e2e tests covering the full behavior surface
- `vitest-setup.ts` - Added `@testing-library/svelte` `afterEach(cleanup)` (see Deviations)
- `package.json` / `package-lock.json` - Added `tone@15.1.22` (exact pin)

## Decisions Made

- Interval-formula chip labels (`R`, `m3`, `P5`, `m7`) are derived in the page via `tonal`'s `Interval.distance`, not added to `ChordResult` - this is presentation formatting, not part of the theory engine's typed contract, and required converting display glyphs (♯/♭) back to ASCII since `Interval.distance` (unlike `Chord.get`) does not understand the glyph forms.
- The alias-equivalence line prefixes each of `ChordResult.aliases` (bare quality suffixes) with `chord.root`, since tonal's `aliases` array never includes the root - deduplicated against the resolved `symbol` so it always reads `Cm7 = C-7 = Cmin7` style regardless of which alias form was typed.
- `randomChord()` restricts its draw to the exact matrix proven correct in Plan 02 (12 roots x 8 v1 qualities) rather than any theoretically-parseable tonal input, guaranteeing "surprise me" can never produce a symbol the engine fails to recognize.
- `tone` pinned to the exact version `15.1.22` (overriding npm's default caret range on install) to match the project's convention of exact-pinning direct theory/audio dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing `@testing-library/svelte` cleanup between tests**
- **Found during:** Task 1, after the first implementation pass, when the full `tests/showcase.e2e.test.ts` file was run together
- **Issue:** `@testing-library/svelte` does not auto-cleanup mounted components between tests the way some other testing-library bindings do. Running more than one test that calls `render(ShowcasePage)` in the same file left prior renders mounted, causing `getByRole('textbox')` and similar single-element queries to throw "Found multiple elements" once a second test ran.
- **Fix:** Added `import { cleanup } from '@testing-library/svelte'` and `afterEach(() => cleanup())` to `vitest-setup.ts`, which project-wide applies to every test file via Vitest's `setupFiles` config.
- **Files modified:** `vitest-setup.ts`
- **Verification:** Full suite (`npx vitest run`) went from 9 spurious cross-test failures to 0; all 133 tests across all 5 test files pass.
- **Committed in:** `33853b9` (Task 1 commit)

**2. [Rule 3 - Blocking] Overrode npm's default caret range on `tone` install**
- **Found during:** Task 3, immediately after `npm install tone@15.1.22`
- **Issue:** npm wrote `"tone": "^15.1.22"` to `package.json` by default, a caret range rather than an exact pin, inconsistent with the project's convention of exact-pinning direct dependencies whose version was specifically vetted (e.g. `tonal: "6.4.3"`, `svelte: "5.56.4"`).
- **Fix:** Manually edited `package.json` to `"tone": "15.1.22"` (exact).
- **Files modified:** `package.json`
- **Verification:** `node -e "..."` pin-check script confirms `tone` resolves to exactly `15.1.22`; `npm install` re-run confirms lockfile consistency; build and test suite unaffected.
- **Committed in:** `cf82cd0` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking fixes)
**Impact on plan:** Both fixes were necessary for correctness/consistency (the test suite could not run reliably as a whole without the cleanup fix; the version pin fix keeps the dependency convention consistent with the rest of the project). No scope creep - no new features, no architectural changes beyond what the plan specified.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `/showcase` route is now the complete, working proof of Phase 1's core value proposition: type any supported jazz chord symbol and instantly see it stamped on the interval-colored keyboard with dual naming, the alias-equivalence line, and the interval-formula readout.
- All five Phase-1 success criteria are satisfied end to end: correct notes/colors/dual-naming (SC 1, 4, 5), alias equivalence (SC 2), and the full Print Shop visual identity (SC 3, 5).
- `randomChord()`, `playChord()`, and `pickHint()` are small, focused, reusable exports that later phases (Phase 2 lookup, Phase 3 drills) may reuse or reference as patterns, though they are not designed as shared infrastructure beyond this showcase.
- No blockers for Phase 2. One recommended manual follow-up (not blocking): a human should click "Hear it" once in a real browser tab to confirm audio actually plays without console errors, since jsdom cannot exercise real Web Audio output (documented as `human_judgment: true` in the coverage block above).

## Self-Check: PASSED

All 6 created/modified files verified present on disk (`+page.svelte`, `playChord.ts`, `randomChord.ts`, `hints.ts`, `showcase.e2e.test.ts`, `vitest-setup.ts`). All 4 commits (`946fedb`, `33853b9`, `9140acb`, `cf82cd0`) verified in `git log`. TDD gate sequence confirmed: RED commit (`test(01-04)`) precedes GREEN commits (`feat(01-04)` x3) in git log. Plan-level verification re-run and passing: `npx vitest run` 133/133 green (full suite, no regressions), `npx svelte-check --tsconfig ./tsconfig.json` 0 errors/1075 files, tone pin check confirms `15.1.22` exact with no `@tonejs/piano`, theory-engine purity grep confirms zero forbidden imports, no em dash (U+2014) in any plan-authored file, `npm run build` succeeds and emits a static `/showcase` route.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `946fedb` `test(01-04): add failing e2e tests for full showcase slice` | Present, confirmed failing (10/10 failed) before implementation |
| GREEN | `33853b9` `feat(01-04): implement full showcase render (glyph, keyboard, formula, alias)` | Present, confirmed 4/10 targeted behaviors passing after Task 1 implementation |
| REFACTOR | - | Not needed - subsequent tasks (2-3) extended behavior incrementally to reach 10/10, no cleanup-only commit required |

No gate violations.

---
*Phase: 01-print-shop-foundation-theory-core*
*Completed: 2026-07-12*
