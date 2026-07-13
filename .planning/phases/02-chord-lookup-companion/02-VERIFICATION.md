---
phase: 02-chord-lookup-companion
verified: 2026-07-13
verifier: orchestrator (inline; gsd-verifier dropped 3x on transient API connection errors before writing)
goal: "The user can sit at the piano, type any chord symbol they meet in a lead sheet, and instantly see the notes on a keyboard diagram with dual naming and interval colors."
requirement_ids: [LOOK-01]
must_haves_total: 9
must_haves_verified: 9
success_criteria_total: 3
success_criteria_verified: 3
automated_checks:
  vitest: "179/179 passing (10 files)"
  svelte_check: "0 errors, 0 warnings (1084 files)"
status: passed
---

# Phase 2 Verification — Chord Lookup Companion

## Method

The gsd-verifier subagent was dispatched three times and each run was cut off by a
transient `Connection closed mid-response` API error before it could write this file
(11-30 tool calls each). Per the execute-phase fallback rule ("always verify via
filesystem and git state; never block indefinitely on a signal"), the orchestrator
completed the goal-backward verification inline: read all three PLAN `must_haves`,
checked each truth against the actual committed source, and confirmed the automated
checks directly (`npx vitest run` → 179/179; `npm run check` → clean).

## Requirement Coverage

- **LOOK-01** — "User can type a chord symbol and see its notes on a keyboard diagram
  with dual naming, fast enough to use mid-song." Listed in the `requirements` frontmatter
  of all three plans (02-01, 02-02, 02-03) and delivered end to end. **COVERED.**

## must_haves Scorecard (9/9 verified against code)

### Plan 02-01 — core lookup loop
1. ✓ Typing a supported symbol on `/` and submitting stamps its notes with dual
   letter/solfège naming and interval colors. `+page.svelte:43-54` (`showChord` →
   `spellChord`) renders `<PianoKeyboard notes={result.notes} />` plus `formulaFor(result)`
   (letter + solfège + `IntervalChip` by role). LOOK-01 core.
2. ✓ `/` is the lookup page; a persistent Print Shop masthead with Lookup (active) and
   Showcase links wraps every route. `+layout.svelte:14-33` (nav + `{@render children()}`,
   active via `$page.url.pathname`).
3. ✓ Unrecognized input shows a non-blocking rotating hint and leaves the last result
   rendered. `+page.svelte:55-67` else-branch never assigns `result` (D-08).

### Plan 02-02 — mid-song ergonomics
4. ✓ Row of last 5 distinct symbols; tapping one re-stamps without retyping.
   `RecentChipRow {recent} onselect={showChordFromSymbol}` (`+page.svelte:136`);
   `recentLookups.ts` dedupes + caps at 5.
5. ✓ ♯/♭ helper buttons insert the glyph at the caret; input autofocuses on load and
   re-selects its content after a stamp. `insertGlyph` (`+page.svelte:87-97`),
   `use:autofocus`, `focusAndSelectInput` (`.select()`).
6. ✓ Recents persist across reloads via `localStorage` key `music-learn:recent-lookups`,
   device-local (cross-device is Phase 8). `recentLookups.ts`.

### Plan 02-03 — did-you-mean recovery
7. ✓ Unrecognized input with exactly one confident candidate offers a single tappable
   inline suggestion; tapping stamps it. `+page.svelte:59-66,140-147`
   (`didYouMean` → `suggestion` → `data-testid="suggestion"` button → `showChordFromSymbol`).
8. ✓ No confident candidate falls back to rotating hints; never auto-corrects, never shows
   multiple. Single `suggestion` string (not a list); recovery requires an explicit tap.
9. ✓ Last successful result stays rendered under a failed submit, with or without a
   suggestion (D-08 carried).

## ROADMAP Success Criteria (3/3)

1. ✓ **Typing a chord symbol shows its notes highlighted on the keyboard fast enough to
   use mid-song.** Objective parts verified: renders on explicit submit; keyboard shows
   the correct highlighted notes and reactively updates on every subsequent lookup (the
   CR-01 stale-highlight bug found in review is fixed — `PianoKeyboard.svelte` now uses
   `$derived` for `noteAssignment`/`whiteKeys`/`blackKeys`, with a regression test).
   See recommended manual check below for the subjective real-device speed feel.
2. ✓ **Each highlighted note shows letter + solfège and is colored by interval role.**
   `formulaFor` renders letter + solfège per note; `PianoKeyboard` applies
   `--root/--third/--fifth/--seventh` key classes; interval colors are the locked Phase 1
   DESIGN-02 language.
3. ✓ **Unrecognized/malformed input gives a clear, non-blocking message rather than a wrong
   answer.** Input is trimmed (WR-01 fix); unrecognized input yields a rotating hint or a
   single did-you-mean suggestion; the prior result is never cleared and the app never
   emits a wrong chord.

## Code Review Resolution

Standard-depth review found 1 Critical + 6 Warnings; all fixed and committed
(`12efb16`, `5ad8517`, `04ea82e`, `0f6dbfa`, `345a543`, `2ce054c`, `3b5732e`) and
re-confirmed present in source. The 7 Info findings (IN-01..IN-07 — e.g. hydration-flash,
660px keyboard overflow on very narrow phones) are intentionally deferred, not gaps; they
are candidates for the Phase 9 responsive/deploy pass.

## Recommended Manual Spot-Check (non-blocking)

- On an actual phone at the piano, confirm the type→Stamp→see-notes loop feels fast enough
  mid-song and the keyboard fits the portrait viewport. This is the one subjective,
  device-dependent slice of success criterion 1 that cannot be asserted from code or jsdom
  tests. Info finding IN-07 (keyboard horizontal overflow on ≤375px) is the most likely
  thing this surfaces and is already logged for the responsive phase.

**Verdict: PASSED.** All 9 must_haves and all 3 success criteria are satisfied in the
committed code, the critical review finding is fixed, and the full suite is green.
