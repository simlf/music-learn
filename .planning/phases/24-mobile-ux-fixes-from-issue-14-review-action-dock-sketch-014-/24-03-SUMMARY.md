---
phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-
plan: 03
subsystem: ui
tags: [svelte, i18n, chord-theory, lookup, teaching, tonal]

# Dependency graph
requires:
  - phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014- (Plans 01-02)
    provides: review action dock (RecallSession.svelte) and the icon+micro-label bottom tab bar (+layout.svelte) — unrelated surfaces, no direct code dependency
provides:
  - src/lib/lookup/casingAmbiguity.ts — pure detector for the m/maj casing trap (am7/AM7), returning both candidate readings or null
  - src/lib/components/WhyTheseNotes.svelte — expandable "Pourquoi ces notes ?" teaching panel with a prop-driven folded minor-vs-major duo
  - Lookup page (src/routes/+page.svelte) wiring: input-time disambiguation chips (sketch 016-B) + always-available why-panel on every result (sketch 016-A)
  - home.why.* / home.disambig.* bilingual i18n keys
affects: [any future phase touching src/routes/+page.svelte (Lookup) or extending chord-symbol input parsing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "casingAmbiguity.ts follows didYouMean.ts's sibling contract: total, deterministic, null-on-no-match, candidate space always guarded through spellChord"
    - "WhyTheseNotes derives its per-note teaching sentence via the SAME intervalBetween helper chordPresentation.formulaFor already uses, so panel colors/spellings/semitone-counts always match the result card above it"
    - "Counterpart-chord derivation (m/maj sibling for the duo) lives in the page as a small pure function keyed off the resolved chord's ASCII quality suffix, never hardcoded — gracefully returns null/undefined for qualities with no meaningful counterpart (dominant 7, dim, ø, sus, altered)"

key-files:
  created:
    - src/lib/lookup/casingAmbiguity.ts
    - src/lib/lookup/casingAmbiguity.test.ts
    - src/lib/components/WhyTheseNotes.svelte
    - src/lib/components/whyTheseNotes.test.ts
    - src/routes/lookupWhyPanel.test.ts
  modified:
    - src/routes/+page.svelte
    - src/lib/i18n/messages/home.ts

key-decisions:
  - "The casing-ambiguity trap is keyed on the EXACT as-typed string, not just the quality marker's case: only the canonical proper-case-root + lowercase-m spelling (e.g. 'Am7', 'Cm7') is unambiguous; a lowercase root ('am7') or an uppercase marker ('AM7') both trigger the prompt, since tonal itself lowercases the root internally and only the quality marker's case carries chord-theory meaning — but issue #14's actual mistake was typing a lowercase root at all"
  - "The why-panel's per-note teaching sentence reuses intervalBetween (the same helper chordPresentation.formulaFor calls) rather than a private 'is this quality minor' string check, so the panel's third-quality claim can never drift from the keyboard/formula readout"
  - "Counterpart-chord derivation for the duo is a small page-local pure function (not exported from casingAmbiguity), since the ambiguity detector's contract is specifically about USER-TYPED casing, not about deriving a sibling from an already-resolved, correctly-cased chord — reusing it here would have required stringifying then re-parsing the resolved chord to force a casing collision"

requirements-completed: []

coverage:
  - id: D1
    description: "detectCasingAmbiguity flags the genuinely ambiguous casing trap (am7/AM7 -> both readings) and returns null for every unambiguous case (Cm7, Cmaj7, Am7, G7, F♯ø7, empty)"
    verification:
      - kind: unit
        ref: "src/lib/lookup/casingAmbiguity.test.ts (11 tests, all pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "WhyTheseNotes renders a collapsed-by-default, toggleable teaching panel explaining the third's quality (minor = 3 semitones -> natural note) and the key-signature clarification, with the folded m-vs-maj duo as prop-driven deepest content and a graceful no-duo path"
    verification:
      - kind: unit
        ref: "src/lib/components/whyTheseNotes.test.ts (8 tests, all pass, including FR locale)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Lookup page shows the disambiguation prompt (vermilion, two chips) for am7/AM7 with no result until a chip is picked, resolving correctly to Am7 (A-C-E-G) or Amaj7 (A-C♯-E-G♯); unambiguous input (Cm7) shows the result directly; every recognized result mounts WhyTheseNotes with a working escape hatch"
    verification:
      - kind: unit
        ref: "src/routes/lookupWhyPanel.test.ts (8 tests, all pass)"
        status: pass
      - kind: unit
        ref: "existing Lookup + i18n suites (lookupSongMark.test.ts, i18n coverage tests, tests/lookup.e2e.test.ts) all still pass — 1358/1358 full suite green"
        status: pass
    human_judgment: false
  - id: D4
    description: "The beginner explanation actually lands: does 'the key signature does not impose accidentals here' read clearly to a French-speaking beginner on a real 390px phone, in both EN and FR?"
    verification: []
    human_judgment: true
    rationale: "Copy comprehension and visual/layout legibility on a real device are judgment calls jsdom's non-rendering DOM cannot verify. This is exactly Task 4's checkpoint:human-verify, which is PENDING — no human response was available to this parallel wave executor. See 'Checkpoint: Task 4 Pending' below."

# Metrics
duration: 62min
completed: 2026-07-20
status: complete
human_verification:
  - id: HV-24-03-01
    description: "On-device (or dev-server) walkthrough: type AM7/am7 and confirm the disambiguation prompt + correct chip resolutions; open the why-panel on Am7 and confirm the minor-third teaching sentence, key-signature clarification, and folded Am7/Amaj7 duo read clearly (ideally checked in French, the issue reporter's locale); confirm unambiguous chords (Cm7, Fmaj7, G7) show no prompt; confirm legibility at 390px viewport"
    status: pending
    reason: "Task 4 (checkpoint:human-verify, gate=blocking) requires a live human response. This parallel wave executor has no interactive user available; workflow.human_verify_mode/auto_advance were not active for this run, so the checkpoint was not auto-approved. The plan pauses here per standard protocol — see 'Checkpoint: Task 4 Pending' below."
---

# Phase 24 Plan 03: Lookup Casing-Trap Disambiguation + Why-Panel Summary

**Sketch 016 composed on the Lookup page: input-time chips disambiguating the Am7/Amaj7 casing trap (issue #14 point 4), plus an expandable "Pourquoi ces notes ?" teaching panel with a folded minor-vs-major duo on every recognized result.**

## Performance

- **Duration:** 62 min
- **Started:** 2026-07-20T11:53:00Z
- **Completed:** 2026-07-20T12:55:00Z (Tasks 1-3 code-complete; Task 4 checkpoint pending)
- **Tasks:** 3 of 4 (Tasks 1-3 auto/TDD, completed and committed; Task 4 is a `checkpoint:human-verify` awaiting a live human response)
- **Files modified:** 7

## Accomplishments
- `detectCasingAmbiguity()` (pure, total, never throws) precisely identifies the m/maj casing trap issue #14 reported: a lowercase root ("am7") or an uppercase quality marker ("AM7") both offer both readings, while the canonical `Am7`/`Cm7` spelling never nags — verified against tonal's actual internal casing behavior (confirmed via a scratch test: tonal lowercases the root itself, so only the marker's case is theoretically meaningful, but the app also flags a user-typed lowercase root as the mistake it is)
- `WhyTheseNotes.svelte` teaches the beginner gap directly: the third's quality (minor = 3 semitones -> natural note, not the sharp) derives from the SAME `intervalBetween` helper the result card's formula row already uses, so the panel can never contradict the keyboard; the folded minor-vs-major duo (Am7 vs Amaj7 showing the differing third/seventh, each with a `ChordGlyph`) is entirely prop-driven — no hardcoded note lists anywhere
- Lookup page wiring: `showChord()` intercepts ambiguous casing BEFORE committing a result, rendering a vermilion-bordered disambiguation prompt with minor/major chips; every recognized result now mounts the why-panel with a working "Voir {counterpart}" escape hatch that re-runs the lookup
- Full test suite green: 1358/1358 tests passing (11 new casingAmbiguity tests, 8 new whyTheseNotes tests, 8 new lookupWhyPanel tests), `svelte-check` 0 errors/0 warnings across 1336 files
- Existing Lookup behavior (did-you-mean, recent chips, starter chords, SongMark, hear-it, inspect register) verified unchanged via the pre-existing `lookupSongMark.test.ts` and `tests/lookup.e2e.test.ts` suites, both still green

## Task Commits

Each task was committed atomically (TDD RED-then-GREEN per task):

1. **Task 1: Pure casing-ambiguity detector (TDD)** - `4dfd04c` (test, RED+GREEN combined — see Deviations) implementing `src/lib/lookup/casingAmbiguity.ts`
2. **Task 2: WhyTheseNotes teaching panel component with the folded minor-vs-major duo (TDD)** - `14adc29` (test, RED) then `7b60636` (feat, GREEN)
3. **Task 3: Wire the disambiguation chips and why-panel into the Lookup page** - `e319d58` (test, RED) then `d64d6f9` (feat, GREEN)
4. **Task 4: Human verify the disambiguation chips and why-panel on the Lookup page** - PENDING (checkpoint:human-verify, gate="blocking"; see Checkpoint section below)

**Plan metadata:** the final `docs({phase}-{plan}): complete` commit and STATE.md/ROADMAP.md updates are owned by the orchestrator after all wave agents complete (or after Task 4 resolves, per this project's Plan 24-02 precedent).

## Files Created/Modified
- `src/lib/lookup/casingAmbiguity.ts` - Pure `detectCasingAmbiguity(input)` detector: extracts a root + quality marker, flags the m/maj casing trap, guards both candidates through `spellChord`
- `src/lib/lookup/casingAmbiguity.test.ts` - 11 tests covering the ambiguous/unambiguous matrix plus a spellChord-recognition/third-difference guarantee
- `src/lib/components/WhyTheseNotes.svelte` - Expandable teaching panel: per-note minor/major third explanation (via `intervalBetween`), key-signature clarification, folded m-vs-maj duo (two `ChordGlyph` mini-cards), and a "Voir {counterpart}" escape hatch; gracefully omits the duo when no counterpart is passed
- `src/lib/components/whyTheseNotes.test.ts` - 8 tests: collapsed-by-default toggle, teaching sentence content, duo rendering (prop-driven, re-tested with a second chord), escape-hatch callback, graceful no-duo path, FR locale
- `src/routes/+page.svelte` - New `ambiguity` state intercepting `showChord()` before a result commits; disambiguation-prompt markup (vermilion card, two chips) wired to the existing `showChordFromSymbol`; `counterpartSymbolFor()` pure helper deriving the m/maj sibling from the resolved chord's quality suffix; `WhyTheseNotes` mounted below the interval-formula row on every recognized result
- `src/routes/lookupWhyPanel.test.ts` - 8 tests: disambig prompt for am7/AM7, correct minor/major chip resolution, no-prompt path for Cm7, ambiguity-state clearing on a later unambiguous lookup, why-toggle mounted on every result, escape-hatch re-lookup
- `src/lib/i18n/messages/home.ts` - Added `home.why.*` (toggle, third-step EN/FR incl. major variant, key-signature clarification, duo heading/labels/closing, escape-hatch prefix) and `home.disambig.*` (heading prefix/suffix, body, chip suffixes) bilingual keys

## Decisions Made
- The casing trap is keyed on the exact as-typed string (root case + marker case together), not just the marker: only `{ProperCaseRoot}m`/`{ProperCaseRoot}m7` (e.g. `Am7`, `Cm7`) is the app's canonical unambiguous minor spelling; any deviation — lowercase root, uppercase marker, or both — triggers the prompt. Verified tonal's actual behavior with a scratch script before writing the detector, per the plan's explicit instruction: tonal lowercases the root internally regardless of input case, so `am7`/`AM7`/`Am7` all resolve to tonic `A`, meaning only the marker's case is theoretically load-bearing to the engine — but the app still treats a lowercase-typed root as part of the trap since that's literally what issue #14's user typed.
- WhyTheseNotes derives its minor/major third claim via `intervalBetween(chord.root, third.letter)` (the exact helper `chordPresentation.formulaFor` already uses for the result card), not a private string check on `chord.quality`, so the panel's claim can never drift from what the keyboard/formula row shows for the same chord.
- The duo's per-card chord symbol ("Am7"/"Amaj7") is rendered as a screen-reader-only `<span>` alongside the visual `ChordGlyph` (which splits root/quality into separate DOM nodes), giving both an accessible full-symbol name and clean testability without duplicating visible text.
- Counterpart-chord derivation for the why-panel's duo lives in the Lookup page itself (`counterpartSymbolFor`), not inside `casingAmbiguity.ts` — the detector's contract is specifically about ambiguous user-typed casing, and reusing it for an already-resolved chord would require artificially re-lowercasing a canonical symbol to trigger a match. A small dedicated function keyed on the resolved chord's ASCII quality suffix (m7↔maj7, m↔maj) is simpler and has no such contract violation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Process note, not a deviation rule] Task 1's test-then-implementation commit sequence was combined into a single commit**
- **Found during:** Task 1 (casing-ambiguity detector)
- **Issue:** The RED test file and the GREEN implementation were both already staged together at the first commit point (the detector was written and iterated to green before the intermediate RED-only commit was made), unlike Tasks 2 and 3 where RED and GREEN landed as two separate commits.
- **Fix:** No code change needed — this is a commit-granularity note, not a functional deviation. The TDD RED-then-GREEN discipline was still followed in the working tree (tests were written first and confirmed failing via `npx vitest run casingAmbiguity` against the not-yet-created module before implementation began); only the git history collapses that into one commit for Task 1 specifically.
- **Files modified:** `src/lib/lookup/casingAmbiguity.ts`, `src/lib/lookup/casingAmbiguity.test.ts`
- **Commit:** `4dfd04c`

---

**Total deviations:** 0 functional deviations (1 process note on commit granularity, documented above for TDD-gate transparency)
**Impact on plan:** No scope creep. All three code tasks match the plan's `<action>`/`<behavior>` specs exactly; the only "fix" needed during execution was environment setup (`npm install`, no `node_modules` present in the fresh worktree) — routine, not a deviation.

## Issues Encountered
- `node_modules` was not present in this worktree at execution start (`npx vitest`/`npx svelte-check` unresolvable); resolved by running `npm install`, which is standard first-run setup, not a code change.
- Two rounds of test-assertion refinement were needed while implementing `WhyTheseNotes.svelte`: (1) the per-note "why" sentence originally duplicated the note letter as visible text, causing a "multiple elements with text C" test failure — fixed by using the interval short name (`m3`) as the bold marker and the note letter only once, with an arrow callout; (2) `ChordGlyph` renders root and quality as separate DOM text nodes (root text + `<sup>` quality), so `getByText('Am7')` never matches a single node — fixed by adding a `data-testid` per duo card plus a screen-reader-only full-symbol span for both accessibility and testability.

## User Setup Required

None - no external service configuration required.

## Checkpoint: Task 4 Pending

Task 4 (`checkpoint:human-verify`, `gate="blocking"`) requires a human to walk through the disambiguation flow and the why-panel's teaching content on the actual running app (ideally in French, the issue reporter's locale), per the plan's `how-to-verify` steps:

1. Type `AM7`/`am7`, confirm the vermilion disambiguation prompt with both chips, no result until a chip is picked
2. Confirm the minor chip resolves to Am7 (A-C-E-G) and the major chip to Amaj7 (A-C♯-E-G♯)
3. Open "Pourquoi ces notes ?" on the Am7 result, confirm the minor-third teaching sentence and key-signature clarification read clearly, and the folded Am7/Amaj7 duo shows the differing third/seventh
4. Confirm the "Voir Amaj7" escape hatch re-runs the lookup
5. Confirm unambiguous chords (Cm7, Fmaj7, G7) show no disambiguation prompt
6. Confirm legibility at a 390px phone viewport

**Status: NOT resolved.** This parallel wave executor (`worktree-agent-a701842a6301f9207`) has no interactive user session available to respond to a live checkpoint, and `workflow._auto_chain_active`/`workflow.auto_advance` were both `false` for this run — so auto-approval does not apply per the standard checkpoint protocol (auto-approval is explicitly reserved for genuine auto-mode runs, and a package-legitimacy-style forced stop is not this case, but neither is silent self-approval appropriate for a comprehension/clarity check that the plan itself flags as needing a human, especially in French). All code (Tasks 1-3) is committed and the automated suite is fully green; Task 4 is tracked as `HV-24-03-01` in the frontmatter for follow-up in a `/gsd-verify-work` session or a live checkpoint response, mirroring this phase's own Plan 24-02 precedent for a pending human-verification item.

## Next Phase Readiness
- Tasks 1-3 are code-complete, tested (27 new tests across 3 new test files, full 1358-test suite green), and committed on this worktree branch
- Task 4's human-verify checkpoint is PENDING — no live human response was available; the beginner-comprehension check (does the French copy land?) remains outstanding
- No blockers for other Phase 24 plans; this plan only touches the Lookup page (`src/routes/+page.svelte`) and new `casingAmbiguity`/`WhyTheseNotes` modules, no shared surfaces with Plans 01-02

---
*Phase: 24-mobile-ux-fixes-from-issue-14-review-action-dock-sketch-014-*
*Completed: 2026-07-20 (3/4 tasks code-complete and committed; Task 4 checkpoint:human-verify PENDING)*

## Self-Check: PASSED

All created files verified present on disk (`casingAmbiguity.ts`/`.test.ts`, `WhyTheseNotes.svelte`/`whyTheseNotes.test.ts`, `lookupWhyPanel.test.ts`, this SUMMARY.md). All task commits verified present in `git log` (`4dfd04c`, `14adc29`, `7b60636`, `e319d58`, `d64d6f9`, `0b4a470`).
