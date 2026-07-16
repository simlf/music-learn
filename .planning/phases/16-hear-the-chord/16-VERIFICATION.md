---
phase: 16-hear-the-chord
verified: 2026-07-17T01:00:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "Study mode ON + sound ON: the roll (root→3rd→5th→7th) lights each key as its own note actually sounds (WR-01 / audio-visual desync)"
    - "Study-mode roll voices/keys every earned note (including a scale's duplicate tonic letter) correctly, matching the struck pitches (WR-02 voicing + WR-03 duplicate-tonic pending)"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "A scale's octave-up tonic renders as a visually distinct physical key for EVERY tonic (not just those whose degrees avoid a keyboardLayout.ts position-numbering collision)"
    addressed_in: "Not scheduled — logged in deferred-items.md for a future plan"
    evidence: "keyboardLayout.ts's assignNotesToKeys is not one of Phase 16's authorized files (BuildSession.svelte/PianoKeyboard.svelte only); the collision is a pre-existing, narrower defect in note-to-key assignment, confirmed not to block HEAR-01/HEAR-02 (F major and other non-colliding tonics behave correctly; only G major's octave-up tonic fails to visually distinguish itself, which is a keyboard-layout cosmetic issue, not an audio/pending-sync correctness issue)"
human_verification: []
---

# Phase 16: Hear The Chord Verification Report

**Phase Goal:** When a BUILD (formula→build) answer is revealed, the chord sounds automatically with a visual pulse synced to the strike so audio memory forms; with sound off the reveal still pulses visually, never a silent dead-end.
**Verified:** 2026-07-17T01:00:00Z (gap-closure re-verification)
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 16-07, 16-08).

## Gap-Closure Verification — 2026-07-17

This section supersedes the original 2026-07-16 verification's overall status/score
(kept below for the full truth/artifact history). It re-checks, from scratch and
independently of both plans' SUMMARY.md claims, whether the three formally-gated
gaps are actually closed in the current source, whether the two previously-passing
truths still hold (no regression), and whether the deferred `keyboardLayout.ts` item
is genuinely out of scope.

### Observable Truths (re-checked)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1-5 | (base reveal: auto-play, pulse, Hear again, sound-off collapse, ChordGlyph gating — see original table below) | ✓ VERIFIED (regression-checked) | Source at `BuildSession.svelte:461-501` (`triggerReveal`/`hearAgain`), `:855-864` (ChordGlyph gated on `kind === 'chords'`), `:894` (Hear again first in action row, no `disabled` binding) is unchanged in shape from the original verification; full suite (1041 tests) still green, no regression. |
| 6 | Study mode ON + sound ON: the roll lights each key as its own note actually sounds (audio/visual sync, WR-01) | ✓ VERIFIED | `audio.ts:278-293` `playArpeggio(notes, { staggerMs, startDelayMs? })` schedules each attack at `(opts.startDelayMs ?? 0) + index * opts.staggerMs` (`:291`). `BuildSession.svelte:413-439` `startArpeggioRoll` calls `playArpeggio(letters, { staggerMs: ARPEGGIO_STAGGER_MS, startDelayMs: opts.firstNoteDelayMs })` (`:418`) and schedules the matching per-note visual un-pend timer at the IDENTICAL formula `opts.firstNoteDelayMs + index * ARPEGGIO_STAGGER_MS` (`:420-427`) — audio and visual share one formula, not two independently-tuned ones. Proven by a real-timer (not fake-clock) test: `buildSession.test.ts:1048-1074` asserts `playArpeggioMock` is called with `{ staggerMs: 260, startDelayMs: 260 }` on the initial reveal and with `startDelayMs: 0` on Hear-again (`:1099-1132`), and `audio.test.ts:330-340` independently proves `playArpeggio`'s own scheduling honors `startDelayMs` (nothing attacks at t=0 when set). |
| 7 | Study-mode roll voices/keys every earned note (including a scale's duplicate tonic letter) correctly, matching the struck pitches (WR-02 voicing + WR-03 duplicate-tonic pending) | ✓ VERIFIED | **Voicing (WR-02):** `audio.ts:284` `playArpeggio` now voices via `toAscendingPitches(notes)` (the same function `playChord`, at `:254`, and the keyboard's own layout use), replacing the old flat `toPitch(note, 4)`. Proven by `audio.test.ts:311-328` (`'rolls a scale ascending, matching the block-strike voicing'`), which asserts the attacked pitch sequence `toEqual(toAscendingPitches(notes))` for a full scale. **Duplicate-tonic pending (WR-03):** `BuildSession.svelte:97` `pendingKeys` is now `{ letter: string; octave: number }[]` (was `Set<string>`); `startArpeggioRoll` (`:415-417`) builds `keys` via `Note.octave(pitches[i])`, so a scale's octave-up tonic gets its own `{ letter, octave }` entry distinct from the root's. `PianoKeyboard.svelte:547-551` `pendingClass(letter, octave, role)` matches on BOTH letter and octave, mirroring `flashWrongKey`'s existing shape; both template call sites (`:575-579`, `:627-631`) pass `key.note?.letter ?? key.letter` — the assigned note's own spelling, fixing a co-discovered bug where flatted/enharmonic notes never dimmed. Proven by `buildSession.test.ts:1162+` (F-major duplicate-tonic integration test: low tonic un-dims on its own tick, octave-up tonic stays pending until ITS tick) and `pianoKeyboardPulse.test.ts` (`PianoKeyboard pending (pendingKeys)`, direct octave-discrimination unit test). |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

### Gaps Closed (from 2026-07-16 verification)

| Gap | Fix location | Verified by |
|-----|-------------|-------------|
| WR-01: audio-leads-visual 260ms desync | `audio.ts` `startDelayMs` param (plan 16-07) + `BuildSession.svelte` threading it through (plan 16-08) | `audio.test.ts:330`, `buildSession.test.ts:1058-1061,1113-1116` |
| WR-02: scale roll voiced flat-octave-4 instead of ascending | `audio.ts:284` `toAscendingPitches` (plan 16-07) | `audio.test.ts:311-328` |
| WR-03: duplicate scale tonic collapses in a letter-only `Set` | `BuildSession.svelte`/`PianoKeyboard.svelte` `{letter,octave}`-keyed `pendingKeys` (plan 16-08) | `buildSession.test.ts` F-major test, `pianoKeyboardPulse.test.ts` octave-discrimination test |

No regressions found in the previously-passing five truths, all 89 existing `PianoKeyboard`-family tests, or any other suite.

### Independent Test + Check Re-Run (not trusting SUMMARY.md claims)

Both commands were re-run fresh in this worktree (`music-learn-phase16`, branch `gsd/phase-16-hear-the-chord`), not read from any prior report:

```
$ npx vitest run
 Test Files  75 passed (75)
      Tests  1041 passed (1041)
   Duration  96.90s
```

```
$ npm run check
1784242035801 COMPLETED 1296 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

Both are fully green with zero errors/warnings. No test was skipped or filtered.

### Deferred Item Check: `keyboardLayout.ts` G-major collision

Confirmed genuinely out of Phase 16 scope and non-blocking for HEAR-01/HEAR-02:

- **Not in an authorized file.** Both 16-07's and 16-08's PLAN.md frontmatter scope files to `src/lib/audio/audio.ts`/`audio.test.ts` (16-07) and `BuildSession.svelte`/`PianoKeyboard.svelte`/their two test files (16-08). `src/lib/components/keyboardLayout.ts` — where `assignNotesToKeys` lives — is in neither list.
- **Pre-existing, not introduced by this phase.** The collision (G major's 7th-degree black-key "position" numerically colliding with the octave-up tonic's white-key index, causing the cursor to wrap the octave-up G onto the SAME physical key as the root) predates Plans 16-07/16-08; it was only *discovered* while writing 16-08's duplicate-tonic test.
- **Does not block HEAR-01/HEAR-02.** HEAR-02's own text ("optional roll-then-block 'study' playback ... each key lighting") is satisfied by the `{letter,octave}`-keyed pending fix for every tonic whose degrees don't hit the collision (confirmed working for F major, and by construction for any chord — chords never have a duplicate letter). The G-major case is narrower: its octave-up tonic key never gets an interval-role in the first place (a `keyboardLayout.ts` note-to-key assignment defect), so there is no pending-state bug to observe there — the key simply doesn't visually distinguish itself as a second tonic. This is a cosmetic/pedagogical layout gap in a different subsystem, not a violation of "each key lights as its note sounds" for the keys that DO get assigned a role.
- **Documented for follow-up**, not silently dropped: `deferred-items.md` records the root cause, a confirmed repro (`rootCount === 1` for G major vs `rootCount === 2` for F major on a direct component-render probe), and a suggested fix (disjoint white/black position numbering).

Verdict: correctly deferred, not a gap against this phase's goal.

### Other Note (not a gap): WR-04 pulse-on-mount, explicitly out of scope

The original verification's Anti-Patterns section flagged a related but explicitly
non-gated issue: `PianoKeyboard`/`ChordGlyph`'s pulse-retrigger `$effect` guards only
`if (token === undefined) return`, so a literal `0` (the pre-reveal default of
`revealPulseToken`) still schedules a `.pulse-once` at mount. In the study-mode roll,
the complete-state `PianoKeyboard`/`ChordGlyph` mount before `revealPulseToken` is
bumped (bump happens later, at the block-strike timer), so a spurious pulse fires on
still-dimmed keys at roll start. `16-08-PLAN.md` explicitly scopes this OUT ("Scope
guard: this plan closes ONLY gaps 1 and 3. WR-04 ... is a related, lower-severity
code-review note, NOT one of the three verification gaps — do not change the
pulse-token guard here"), and confirmed still present, unchanged, in the current
source (`PianoKeyboard.svelte:437-439`, `ChordGlyph.svelte:38-40` both still read
`if (token === undefined) return;`). This is a cosmetic double-pulse-cue defect on
the study-roll entrance only — it does not affect the pending/lit correctness that
HEAR-02's "each key lighting as its note sounds" describes (that is governed
entirely by `pendingKeys`, which this phase's gap closure fixed), and does not
affect the non-study reveal path (which bumps the token synchronously before
mount). Left as a known, deliberately-scoped-out item; not treated as a phase-16
gap since neither the original verification nor either gap-closure plan gated on
it.

### Requirements Coverage (re-checked)

| Requirement | Status | Evidence |
|--------------|--------|----------|
| HEAR-01 | ✓ SATISFIED | Unchanged from original verification (Truths 1-3, 5); no regression found in this re-check. |
| HEAR-02 | ✓ SATISFIED | Sound-off half unchanged (Truth 4). Study-mode roll half — previously ⚠️ PARTIALLY SATISFIED — is now fully satisfied: audio/visual sync (Truth 6) and voicing + duplicate-tonic pending (Truth 7) are both closed with source + test evidence above. |

### Verdict

**PASS** — HEAR-01: PASS. HEAR-02: PASS (both the sound-off and study-mode-roll halves).

- `npx vitest run` → 75 files, 1041 tests, all passed.
- `npm run check` → 1296 files, 0 errors, 0 warnings.
- Gap 1 (WR-01, audio/visual desync): closed, `audio.ts:278-293` + `BuildSession.svelte:413-439`, `startDelayMs` threaded through with an identical formula on both sides.
- Gap 2 (WR-02, flat-octave scale voicing): closed, `audio.ts:284` now uses `toAscendingPitches`.
- Gap 3 (WR-03, duplicate-tonic pending collapse): closed, `pendingKeys: {letter,octave}[]` in `BuildSession.svelte:97` + `PianoKeyboard.svelte:547-551`.
- Deferred `keyboardLayout.ts` G-major collision: confirmed genuinely out of phase-16 scope (wrong file, pre-existing, cosmetic-only), does not block HEAR-01/HEAR-02.
- No regressions in the five previously-passing truths.
- No new gaps found.

---

## Original Verification (2026-07-16) — kept for history

**Verified:** 2026-07-16T23:30:00Z
**Status at the time:** gaps_found
**Score at the time:** 5/7 must-haves verified

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On BUILD complete, the correct chord auto-plays exactly once via `playChord` when sound is on, in the same transition that bumps the pulse | ✓ VERIFIED | `BuildSession.svelte:451-464` `triggerReveal()` fires inline inside the `feedbackTimer` callback at the exact tick `sessionState = 'complete'` is set (`:557-563`), never from a reactive `$effect`. Non-study path: `if (soundEnabled()) { void ensureAudioReady(); playChord(letters); } revealPulseToken += 1;` — audio call and pulse bump are in the same synchronous function body. Test `buildSession.test.ts:972` confirms `playChord` fires exactly once with the earned-note letters at reveal. |
| 2 | The lit keys and serif `ChordGlyph` pulse once, visually sequenced so the pulse never fights the stamp-in entrance | ✓ VERIFIED | `app.css:147-153`: the combined `.piano-keyboard__key--stamped.pulse-once, .chord-glyph--stamped.pulse-once` rule sequences `stamp-in 240ms ease-out, pulse-once 200ms ease-out 240ms` — CSS-driven, so the pulse always lands after the entrance settles regardless of exact JS timing. `PianoKeyboard.svelte:429-445` and `ChordGlyph.svelte:33-50` both retrigger `.pulse-once` via a remove-then-re-add on each new `pulseToken`, confirmed by `pianoKeyboardPulse.test.ts` and `chordGlyph.test.ts` (both pass, including the retrigger-while-mounted case). |
| 3 | A ghost "Hear again" control is present, never disabled, first in the action row, and replays the chord/pulse on demand, reading sound/study state live | ✓ VERIFIED | `BuildSession.svelte:884` renders the ghost `Button` as the first child of the action row; `hearAgain()` (`:478-491`) has no disabled binding and reads `studyModeEnabled()`/`soundEnabled()` live at call time. `buildSession.test.ts:998` and `:1093` (live-state branch test) both pass. |
| 4 | With sound off, the reveal still runs the visual pulse — no `playChord` call, no error, no dead-end | ✓ VERIFIED | `revealPulseToken += 1` sits unconditionally at the end of both `triggerReveal()` and the non-roll branch of `hearAgain()`, outside the `soundEnabled()` gate. `buildSession.test.ts:1011` confirms: sound off, `playChord` never called, `build-complete` still renders, `Hear again` present and enabled. |
| 5 | A `ChordGlyph` renders in the complete block for chord targets only (not scales), stamped in above the heading | ✓ VERIFIED | `BuildSession.svelte:846-855`: `{#if kind === 'chords'}` gates a `build-complete-target` div containing `<ChordGlyph ... stamped pulseToken={revealPulseToken} />`, positioned before the heading. `buildSession.test.ts:980` (chord case) and `:987` (scale case, asserting the glyph is absent) both pass. |
| 6 | Study mode ON + sound ON: the roll (root→3rd→5th→7th) lights each key as its own note actually sounds | ✗ FAILED (now closed, see Gap-Closure section above) | `startArpeggioRoll` (`BuildSession.svelte:405-429`) passes `playArpeggio(letters, { staggerMs: 260 })` with no start delay, so audio fires at `index*260` (0/260/520/780ms). The matching visual un-pend timers fire at `firstNoteDelayMs + index*260` = 260/520/780/1040ms on the initial reveal. Every note's audio therefore sounds a fixed 260ms BEFORE its own key visually un-dims. |
| 7 | Study-mode roll voices/keys every earned note (including a scale's duplicate tonic letter) correctly, matching the struck pitches | ✗ FAILED (now closed, see Gap-Closure section above) | Two independent defects: (a) `playArpeggio` voiced every note at flat `toPitch(note, 4)` instead of ascending `toAscendingPitches`. (b) `pendingLetters = new Set(letters)` collapsed a scale's duplicate tonic letter into one Set entry, so the octave-tonic key un-dimmed a full roll-cycle early. |

**Score at the time:** 5/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/audio/audio.ts` — `playArpeggio`, `studyModeEnabled`, `setStudyModeEnabled` | New audio primitives + persisted toggle | ✓ VERIFIED | All three exported; `_resetForTests` clears `studyMode`; sound-gate (`soundEnabled()` early-return) preserved on `playArpeggio`. |
| `src/app.css` — `pulse-once` keyframe + reduced-motion | Shared keyframe, first-reveal combined rule, extended reduced-motion block | ✓ VERIFIED | `@keyframes pulse-once` (line 128), `.pulse-once` rule (143-145), combined first-reveal rule (148-153), single `@media (prefers-reduced-motion: reduce)` block extended to cover `.pulse-once` and `.piano-keyboard__key--pending` (155-163). |
| `src/lib/components/PianoKeyboard.svelte` — `pulseToken`/`pendingKeys` | Additive, opt-in pulse + pending props | ✓ VERIFIED | `pulseToken`/`pendingKeys` props present (146, 159), `pulseClass`/`pendingClass` helpers gated on role (526-551), retrigger effect (437-450). |
| `src/lib/components/ChordGlyph.svelte` — `stamped`/`pulseToken` | Opt-in entrance + pulse props | ✓ VERIFIED | Props present, byte-identical default render, retrigger-while-mounted proven by `chordGlyph.test.ts`. |
| `src/routes/progress/+page.svelte` — STUDY MODE toggle | Verbatim sibling of SOUND toggle | ✓ VERIFIED | `toggleStudyMode()`, `STUDY MODE ON/OFF` button, reads/writes `studyModeEnabled()`/`setStudyModeEnabled()`. `progressStudyToggle.test.ts` passes. |
| `src/lib/components/BuildSession.svelte` — reveal wiring | `revealPulseToken`, `triggerReveal`, `hearAgain`, roll scheduler, cleanup | ✓ VERIFIED | `triggerReveal`/`hearAgain`/`startArpeggioRoll`/`clearRollTimers` all present and called from the correct sites. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BuildSession.svelte` feedbackTimer callback | `triggerReveal()` | inline call at `sessionState = 'complete'` | ✓ WIRED | Fires exactly once per completion; not inside a `$effect`. |
| `triggerReveal()`/`hearAgain()` | `soundEnabled()`/`studyModeEnabled()` | live read at call time | ✓ WIRED | Confirmed by the "Hear again honors LIVE study+sound state" test, which flips the mocked toggle mid-test and observes the branch change. |
| `startArpeggioRoll` | `playArpeggio` (audio stagger) + per-note visual timers (pending→lit) | shared `ARPEGGIO_STAGGER_MS` AND (as of 16-08) shared `firstNoteDelayMs` | ✓ WIRED (previously ⚠️ PARTIAL — closed by 16-08) | Both consumers now use the identical `opts.firstNoteDelayMs + index * ARPEGGIO_STAGGER_MS` formula. |
| `PianoKeyboard`/`ChordGlyph` `pulseToken` prop | shared `app.css` `.pulse-once` keyframe | class add/remove effect | ✓ WIRED | Both components retrigger correctly; verified by both component test suites. |

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any file touched by either the original phase or the 16-07/16-08 gap-closure plans. (`BuildSession.svelte`'s `formula-chip--placeholder` CSS class/testid is a legitimate UI element name — a dashed "?" placeholder chip for the next unearned formula step — not a stub marker.)

---

_Re-verified: 2026-07-17T01:00:00Z_
_Original verification: 2026-07-16T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
