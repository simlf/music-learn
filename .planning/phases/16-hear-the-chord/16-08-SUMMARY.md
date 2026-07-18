---
phase: 16-hear-the-chord
plan: 08
subsystem: ui
tags: [svelte, piano-keyboard, audio-sync, study-mode, tonal]

# Dependency graph
requires:
  - phase: 16-hear-the-chord (plan 07)
    provides: "playArpeggio({ staggerMs, startDelayMs? }) voicing ascending root-position via toAscendingPitches"
provides:
  - "BuildSession's study-mode roll passes startDelayMs through to playArpeggio, syncing each note's audio attack with its key's visual un-dim"
  - "Pending state keyed by { letter, octave } ({ letter, octave }[] pendingKeys), mirroring flashWrongKey, so a scale's duplicate-tonic octave un-dims independently"
  - "PianoKeyboard's pendingClass matches the ASSIGNED note's own spelling (key.note?.letter), not the physical key's generic label - fixes flatted/enharmonic notes never dimming"
affects: [16-hear-the-chord follow-ups, any future scale/keyboard-layout work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Octave-discriminating state shape ({ letter, octave }) reused a third time (flashWrongKey, pressedKey, now pendingKeys) for any per-physical-key transient state"
    - "pendingClass/stampedClass-family functions must be called with the note's OWN spelling (key.note?.letter), not the physical key's generic label (key.letter/key.sharpLetter) - only flashWrongClass/selectedClass/wrongClass (transient tap-driven state keyed to what the USER pressed) should use the generic label"

key-files:
  created:
    - .planning/phases/16-hear-the-chord/deferred-items.md
  modified:
    - src/lib/components/BuildSession.svelte
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/buildSession.test.ts
    - src/lib/components/pianoKeyboardPulse.test.ts

key-decisions:
  - "Used F major (not G major) for the BuildSession-level duplicate-tonic test, after discovering G major hits an unrelated, pre-existing keyboardLayout.ts collision that collapses its octave-up tonic onto the SAME physical key as the root (logged in deferred-items.md, left unfixed - out of this plan's authorized files)"
  - "Fixed pendingClass's letter-matching bug (Rule 1): both template call sites passed the physical key's generic label instead of the assigned note's own spelling, so any flatted/enharmonic earned note (e.g. B♭, E♯-on-F-key) never dimmed during the roll - found while writing Task 3's F-major test, which surfaced a B♭ 4th degree that stayed lit at t=0 instead of pending"

patterns-established:
  - "Any new per-key transient/derived prop on PianoKeyboard should default to { letter, octave } shape and match against key.note?.letter (own spelling), following flashWrongKey/pressedKey/pendingKeys precedent"

requirements-completed: [HEAR-02]

coverage:
  - id: D1
    description: "Study-mode initial reveal: each note's audio attack (playArpeggio startDelayMs) and its key's visual un-dim land on the same tick (WR-01 closed)"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > study ON + sound ON rolls the arpeggio via playArpeggio (not an immediate block strike), dimming earned keys as pending until each sounds, then strikes the block chord"
        status: pass
      - kind: unit
        ref: 'src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > "Hear again" honors LIVE study+sound state, not a snapshot from reveal time: replays the roll while study is on, then falls back to the block strike once study flips off'
        status: pass
    human_judgment: false
  - id: D2
    description: "A scale's duplicate tonic (root at both octave ends) keeps EACH octave's key pending until that octave's own note sounds, keyed by { letter, octave } (WR-03 closed)"
    requirement: "HEAR-02"
    verification:
      - kind: unit
        ref: "src/lib/components/buildSession.test.ts#BuildSession study-mode roll, HEAR-02 > an F major scale roll keeps the octave-up tonic pending independently of the low tonic (gap 3 / WR-03)"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pending (pendingKeys) > octave-discrimination (gap 3 / WR-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "PianoKeyboard exposes pendingKeys?: { letter, octave }[] with octave-discriminating pendingClass, gated on role; no pendingLetters identifier remains"
    verification:
      - kind: unit
        ref: "src/lib/components/pianoKeyboardPulse.test.ts#PianoKeyboard pending (pendingKeys) (7 tests)"
        status: pass
      - kind: unit
        ref: "src/lib/components/pianoKeyboardConstruct.test.ts, src/lib/components/pianoKeyboardInspect.test.ts (89 combined tests, no regression)"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-07-17
status: complete
---

# Phase 16 Plan 08: Sync Study Roll Audio/Visual + Octave-Keyed Pending Summary

**Closed the two study-roll defects (WR-01 audio/visual desync, WR-03 duplicate-tonic early un-dim) by threading playArpeggio's startDelayMs through and re-keying BuildSession/PianoKeyboard's pending model from `Set<string>` to `{ letter, octave }[]`, plus fixing a related letter-matching bug that silently broke pending for any flatted/enharmonic note.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-07-16T22:47:00Z (approx, from worktree HEAD state)
- **Completed:** 2026-07-16T23:42:00Z (approx)
- **Tasks:** 3 (plus one follow-up bug-fix commit discovered during Task 3)
- **Files modified:** 4 (2 source, 2 test) + 1 new deferred-items.md

## Accomplishments
- `startArpeggioRoll` now passes `startDelayMs: opts.firstNoteDelayMs` to `playArpeggio`, so the initial reveal's audio and visual un-dim share the same 260ms delay, and Hear-again (0ms) stays synced (WR-01 closed).
- `pendingKeys` (`{ letter, octave }[]`) replaces `pendingLetters` (`Set<string>`) end-to-end (BuildSession state, `resetSessionUiState`, the per-note un-pend timer, the `PianoKeyboard` prop), mirroring `flashWrongKey`'s existing octave-discriminating shape, so a scale's duplicate tonic un-dims one octave at a time instead of both keys clearing on the first tick (WR-03 closed).
- `PianoKeyboard`'s `pendingClass(letter, octave, role)` now takes an octave and matches by letter+octave, and — discovered mid-implementation — the two template call sites needed to pass the ASSIGNED note's own spelling (`key.note?.letter`) rather than the physical key's generic label (`key.letter`/`key.sharpLetter`), fixing a pre-existing bug where any flatted/enharmonic earned note (B♭, E♭, or a chroma-fallback-wrapped E♯) never got the `--pending` dim at all.
- Full test coverage added: initial-reveal `startDelayMs` assertion, Hear-again `startDelayMs: 0` assertion, an F-major-scale BuildSession integration test proving octave-independent pending, and a direct PianoKeyboard-level octave-discrimination unit test.
- Logged (not fixed, out of scope) a genuinely separate `keyboardLayout.ts` defect discovered while writing the duplicate-tonic test: G major's `assignNotesToKeys` cursor collides and wraps the octave-up tonic onto the SAME physical key as the root, so G major never renders two distinct role-lit tonic keys. Used F major for the BuildSession-level test instead (its degrees don't hit the collision), and documented the defect for a future plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sync the roll audio and rebuild the pending model by { letter, octave } in BuildSession** - `b926f3c` (feat)
2. **Task 2: Make PianoKeyboard pending octave-aware (pendingKeys prop)** - `f018dee` (feat)
3. **[Deviation] Fix pendingClass letter-matching bug found while writing Task 3's tests** - `db2dda3` (fix)
4. **Task 3: Assert audio/visual sync and duplicate-tonic pending in the component tests** - `75e17e3` (test)

**Plan metadata:** (this commit, docs: complete plan — see final_commit step)

## Files Created/Modified
- `src/lib/components/BuildSession.svelte` - `pendingKeys` state, `toAscendingPitches`-derived `{ letter, octave }[]` seeding/un-pend in `startArpeggioRoll`, `startDelayMs` passed to `playArpeggio`
- `src/lib/components/PianoKeyboard.svelte` - `pendingKeys?: { letter; octave }[]` prop, octave-aware `pendingClass`, both template call sites fixed to pass `key.note?.letter`
- `src/lib/components/buildSession.test.ts` - updated initial-reveal assertion, added Hear-again sync assertion, added F-major duplicate-tonic test
- `src/lib/components/pianoKeyboardPulse.test.ts` - migrated 3 tests to `pendingKeys`, added octave-discrimination test
- `.planning/phases/16-hear-the-chord/deferred-items.md` - new: documents the out-of-scope `keyboardLayout.ts` G-major collision defect

## Decisions Made
- Used F major instead of G major for the BuildSession-level duplicate-tonic test after empirically confirming (via a direct `render(PianoKeyboard, ...)` probe) that G major's octave-up tonic collapses onto the root's own physical key due to an unrelated `keyboardLayout.ts` cursor-collision defect - documented in `deferred-items.md` rather than fixed, since `keyboardLayout.ts` is not one of this plan's authorized files.
- Fixed `pendingClass`'s letter-matching bug (Rule 1 - auto-fix bug) in the same file/function this plan was already modifying for octave-awareness, rather than deferring it: it directly blocked the plan's own success criteria (flatted/enharmonic notes never dimming) and lived entirely inside `pendingClass` and its two template call sites in `PianoKeyboard.svelte`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pendingClass matched the physical key's generic label instead of the assigned note's own spelling**
- **Found during:** Task 3 (writing the F-major duplicate-tonic test; a B♭ 4th-degree key stayed lit instead of pending at roll start)
- **Issue:** The two `pendingClass(...)` template call sites passed `key.letter` (white) / `key.sharpLetter` (black) - the physical key's generic label - instead of `key.note?.letter`, the note's own correctly-spelled letter. `pendingKeys` is built from `earnedNotes`' own spelling (e.g. `"B♭"`), which never equals a black key's generic `sharpLetter` (`"A♯"`), and never equals a white key's base letter for a chroma-fallback-wrapped enharmonic (e.g. `E♯` landing on the `F` key). Any such note silently never got `--pending`, even before this plan's octave-keying change (the original `pendingLetters` Set-based code had the identical bug, just untested by the pre-existing suite, which only asserted `.length > 0`, not an exact count).
- **Fix:** Changed both `pendingClass(...)` call sites to pass `key.note?.letter ?? key.letter` / `key.note?.letter ?? key.sharpLetter`.
- **Files modified:** `src/lib/components/PianoKeyboard.svelte`
- **Verification:** F-major duplicate-tonic test now asserts an exact `8` pending keys at roll start (previously `7`, silently missing the B♭ 4th degree); full suite green.
- **Committed in:** `db2dda3`

**2. [Scope boundary - deferred, not fixed] `keyboardLayout.ts`'s `assignNotesToKeys` can wrap a scale's octave-up tonic onto the low tonic's own physical key**
- **Found during:** Task 3 (writing the duplicate-tonic test with G major, the plan's specified example)
- **Issue:** G major's 7th degree (F♯) is assigned to the black key at `afterWhiteIndex: 10`, giving `position: 11`, which numerically collides with the SECOND G white key's own `index: 11` in the shared cursor-position numbering. The cursor advances past `11`, so the octave-up tonic G wraps to the LOWEST-position G candidate (`index: 4`) - the SAME key as the root. Confirmed via a direct component-render probe: `rootCount === 1` for G major's `earnedNotes` on a 2-octave keyboard vs `rootCount === 2` for F major.
- **Not fixed:** `keyboardLayout.ts` is not one of this plan's authorized files (`BuildSession.svelte`, `PianoKeyboard.svelte`, and their two test files only), and the bug pre-dates this plan.
- **Workaround:** Used F major (whose degrees don't hit the collision) for the BuildSession-level duplicate-tonic integration test, preserving the same test intent.
- **Logged in:** `.planning/phases/16-hear-the-chord/deferred-items.md`

---

**Total deviations:** 2 (1 auto-fixed bug, 1 deferred out-of-scope discovery)
**Impact on plan:** The auto-fixed bug was necessary for the plan's own correctness claim (flatted notes dim correctly) and lived entirely within the files this plan already touches. The deferred item is a narrower, separate defect in note-to-key assignment that doesn't block HEAR-02's fix - it only affects which scale tonics visually demonstrate two distinct physical keys, and is fully documented for a future plan. No scope creep.

## Issues Encountered
None beyond the two deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HEAR-02's study-mode roll now syncs audio/visual timing on both initial reveal and Hear-again, and correctly tracks per-octave pending state for chords and (non-colliding) scales.
- A follow-up plan should address the `keyboardLayout.ts` `assignNotesToKeys` collision (see `deferred-items.md`) so every major scale's octave-up tonic renders as a visually distinct key, not just those whose degrees happen to avoid the position-numbering collision.

---
*Phase: 16-hear-the-chord*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/lib/components/BuildSession.svelte
- FOUND: src/lib/components/PianoKeyboard.svelte
- FOUND: .planning/phases/16-hear-the-chord/deferred-items.md
- FOUND: .planning/phases/16-hear-the-chord/16-08-SUMMARY.md
- FOUND commit: b926f3c
- FOUND commit: f018dee
- FOUND commit: db2dda3
- FOUND commit: 75e17e3
