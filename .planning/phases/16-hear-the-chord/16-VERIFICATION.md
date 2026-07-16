---
phase: 16-hear-the-chord
verified: 2026-07-16T23:30:00Z
status: gaps_found
score: 5/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Study mode ON + sound ON: the arpeggio roll lights each key as its note actually sounds"
    status: failed
    reason: "playArpeggio (audio.ts) schedules note attacks at index*staggerMs with no start-delay parameter, while BuildSession's per-note pending->lit visual timers are offset by firstNoteDelayMs (260ms on the initial reveal). Audio for each note therefore sounds 260ms BEFORE its own key un-dims, on every roll note, on the primary (initial) reveal path -- the exact path the must-have describes. This is confirmed directly in the source (audio.ts:274-285 has no delay parameter; BuildSession.svelte:405-429 applies firstNoteDelayMs only to the visual timers) and is not caught by any existing test (buildSession.test.ts's study-roll tests only assert playArpeggio was called with the right args and that pending count is >0 then 0 -- they never assert the audio/visual timestamps line up)."
    artifacts:
      - path: "src/lib/audio/audio.ts"
        issue: "playArpeggio(notes, { staggerMs }) has no startDelayMs/firstNoteDelayMs option; note 0 always attacks at t=0"
      - path: "src/lib/components/BuildSession.svelte"
        issue: "startArpeggioRoll (lines 405-429) calls playArpeggio(letters, { staggerMs }) with no delay, but schedules the matching visual un-pend timers at opts.firstNoteDelayMs + index*staggerMs (260ms on first reveal) -- a fixed 260ms audio-leads-visual desync on every note of the initial reveal roll"
    missing:
      - "Give playArpeggio a startDelayMs option (or otherwise drive audio and visual un-pend from one shared timer set) and pass firstNoteDelayMs through to it on the initial reveal, so each key's un-dim and its note's audio attack land in the same tick"
  - truth: "Study mode arpeggio roll voices notes matching the reveal keyboard/block-strike voicing (implied by 'each key lighting as its note sounds' -- the sounding pitch must correspond to the lit key)"
    status: failed
    reason: "playArpeggio voices every note at a flat octave 4 via toPitch(note, 4), while the reveal keyboard and playChord (block strike) both use toAscendingPitches, which walks octaves upward so the sequence is monotonically ascending. Confirmed in source: audio.ts's own doc comment claims octave-4 voicing 'match[es] the reveal keyboard's voicing,' but voicing.ts shows toAscendingPitches is the keyboard/block convention, not flat octave 4. For a scale (e.g. G major: G A B C D E F# G) this produces a roll that descends mid-sequence and mismatches both the two-octave keyboard layout and the ascending block strike that follows it. Chord rolls happen to coincide (chord tones stay within one octave span) so this defect is scale-only, but study mode is wired identically for both kind==='chords' and kind==='scales' in BuildSession, so scales are squarely in scope."
    artifacts:
      - path: "src/lib/audio/audio.ts"
        issue: "playArpeggio uses toPitch(note, 4) (flat octave) instead of toAscendingPitches (ascending octave walk used by playChord/keyboard)"
    missing:
      - "Voice playArpeggio with the same toAscendingPitches logic playChord and the keyboard use, so rolled pitches equal struck pitches for both chords and scales"
  - truth: "pendingLetters correctly represents every earned note's pending state (implied precondition for 'each key lighting as its note sounds' when a construction's earned notes include a repeated letter, e.g. a scale's tonic-at-both-ends)"
    status: failed
    reason: "pendingLetters is a Set<string> keyed by letter; a completed scale's earnedNotes ends on the tonic an octave up, so letters contains the tonic letter twice. new Set(letters) collapses this to one entry, so the per-note un-pend timer for the second (higher-octave) occurrence is a no-op (next.delete(letter) already ran). Both physical keys for that letter (the two octaves) un-dim together at the FIRST tick, roughly 1.8s before the octave-tonic key's own arpeggio note actually sounds. Confirmed directly in source: PianoKeyboard's pendingClass (pianoKeyboardPulse tests never exercise a duplicate-letter scenario) keys purely off letter, with no octave discrimination, unlike flashWrongKey which already tracks { letter, octave }."
    artifacts:
      - path: "src/lib/components/BuildSession.svelte"
        issue: "pendingLetters = new Set(letters) collapses a scale's duplicate tonic letter (root at octave 4 and octave 5) into one Set entry"
      - path: "src/lib/components/PianoKeyboard.svelte"
        issue: "pendingClass keys purely by letter, with no per-octave distinction, so it cannot represent two physically distinct pending keys sharing a letter"
    missing:
      - "Key pending state by position/octave (not bare letter), mirroring how flashWrongKey already distinguishes duplicate letters by { letter, octave }"
deferred: []
human_verification: []
---

# Phase 16: Hear The Chord Verification Report

**Phase Goal:** When a BUILD (formula→build) answer is revealed, the chord sounds automatically with a visual pulse synced to the strike so audio memory forms; with sound off the reveal still pulses visually, never a silent dead-end.
**Verified:** 2026-07-16T23:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On BUILD complete, the correct chord auto-plays exactly once via `playChord` when sound is on, in the same transition that bumps the pulse | ✓ VERIFIED | `BuildSession.svelte:451-464` `triggerReveal()` fires inline inside the `feedbackTimer` callback at the exact tick `sessionState = 'complete'` is set (`:557-563`), never from a reactive `$effect`. Non-study path: `if (soundEnabled()) { void ensureAudioReady(); playChord(letters); } revealPulseToken += 1;` — audio call and pulse bump are in the same synchronous function body. Test `buildSession.test.ts:972` confirms `playChord` fires exactly once with the earned-note letters at reveal. |
| 2 | The lit keys and serif `ChordGlyph` pulse once, visually sequenced so the pulse never fights the stamp-in entrance | ✓ VERIFIED | `app.css:147-153`: the combined `.piano-keyboard__key--stamped.pulse-once, .chord-glyph--stamped.pulse-once` rule sequences `stamp-in 240ms ease-out, pulse-once 200ms ease-out 240ms` — CSS-driven, so the pulse always lands after the entrance settles regardless of exact JS timing. `PianoKeyboard.svelte:429-445` and `ChordGlyph.svelte:33-50` both retrigger `.pulse-once` via a remove-then-re-add on each new `pulseToken`, confirmed by `pianoKeyboardPulse.test.ts` and `chordGlyph.test.ts` (both pass, including the retrigger-while-mounted case). |
| 3 | A ghost "Hear again" control is present, never disabled, first in the action row, and replays the chord/pulse on demand, reading sound/study state live | ✓ VERIFIED | `BuildSession.svelte:884` renders the ghost `Button` as the first child of the action row; `hearAgain()` (`:478-491`) has no disabled binding and reads `studyModeEnabled()`/`soundEnabled()` live at call time. `buildSession.test.ts:998` and `:1093` (live-state branch test) both pass. |
| 4 | With sound off, the reveal still runs the visual pulse — no `playChord` call, no error, no dead-end | ✓ VERIFIED | `revealPulseToken += 1` sits unconditionally at the end of both `triggerReveal()` and the non-roll branch of `hearAgain()`, outside the `soundEnabled()` gate. `buildSession.test.ts:1011` confirms: sound off, `playChord` never called, `build-complete` still renders, `Hear again` present and enabled. |
| 5 | A `ChordGlyph` renders in the complete block for chord targets only (not scales), stamped in above the heading | ✓ VERIFIED | `BuildSession.svelte:846-855`: `{#if kind === 'chords'}` gates a `build-complete-target` div containing `<ChordGlyph ... stamped pulseToken={revealPulseToken} />`, positioned before the heading. `buildSession.test.ts:980` (chord case) and `:987` (scale case, asserting the glyph is absent) both pass. |
| 6 | Study mode ON + sound ON: the roll (root→3rd→5th→7th) lights each key as its own note actually sounds | ✗ FAILED | `startArpeggioRoll` (`BuildSession.svelte:405-429`) passes `playArpeggio(letters, { staggerMs: 260 })` with no start delay, so audio fires at `index*260` (0/260/520/780ms). The matching visual un-pend timers fire at `firstNoteDelayMs + index*260` = 260/520/780/1040ms on the initial reveal. Every note's audio therefore sounds a fixed 260ms BEFORE its own key visually un-dims. Confirmed directly in source; not exercised by any test (existing study-roll tests only assert call args and pending-count transitions, never relative timing). |
| 7 | Study-mode roll voices/keys every earned note (including a scale's duplicate tonic letter) correctly, matching the struck pitches | ✗ FAILED | Two independent defects confirmed in source: (a) `playArpeggio` voices every note at flat `toPitch(note, 4)` while the keyboard/block use ascending-octave `toAscendingPitches` — for a scale this makes the roll descend mid-sequence, mismatching both the keyboard layout and the block strike (`audio.ts:274-285` vs `voicing.ts:13-33`). (b) `pendingLetters = new Set(letters)` collapses a scale's duplicate tonic letter into one Set entry, so the octave-tonic key un-dims a full roll-cycle early, before its own note sounds (`BuildSession.svelte:407` vs `PianoKeyboard.svelte:529-535`, which keys pending state purely by letter with no octave discrimination). |

**Score:** 5/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/audio/audio.ts` — `playArpeggio`, `studyModeEnabled`, `setStudyModeEnabled` | New audio primitives + persisted toggle | ✓ VERIFIED | All three exported; `_resetForTests` clears `studyMode`; sound-gate (`soundEnabled()` early-return) preserved on `playArpeggio`. However `playArpeggio`'s voicing (`toPitch(note,4)`) and lack of a start-delay parameter are substantively wrong per Truths 6/7 above — the export exists and is wired, but its behavior is incorrect for its stated purpose. |
| `src/app.css` — `pulse-once` keyframe + reduced-motion | Shared keyframe, first-reveal combined rule, extended reduced-motion block | ✓ VERIFIED | `@keyframes pulse-once` (line 128), `.pulse-once` rule (143-145), combined first-reveal rule (148-153), single `@media (prefers-reduced-motion: reduce)` block extended to cover `.pulse-once` and `.piano-keyboard__key--pending` (155-163). |
| `src/lib/components/PianoKeyboard.svelte` — `pulseToken`/`pendingLetters` | Additive, opt-in pulse + pending props | ✓ VERIFIED (props/wiring) — see Truth 7 for a correctness defect in the data it's fed | `pulseToken`/`pendingLetters` props present (146, 155), `pulseClass`/`pendingClass` helpers gated on role (522-534), retrigger effect (429-445). `pianoKeyboardPulse.test.ts`, `pianoKeyboardConstruct.test.ts`, `pianoKeyboardInspect.test.ts` all pass (no regression). |
| `src/lib/components/ChordGlyph.svelte` — `stamped`/`pulseToken` | Opt-in entrance + pulse props | ✓ VERIFIED | Props present, byte-identical default render, retrigger-while-mounted proven by `chordGlyph.test.ts` (all pass). |
| `src/routes/progress/+page.svelte` — STUDY MODE toggle | Verbatim sibling of SOUND toggle | ✓ VERIFIED | `toggleStudyMode()` (line 99), `STUDY MODE` label + `STUDY MODE ON/OFF` button (223-231), reads/writes `studyModeEnabled()`/`setStudyModeEnabled()`. `progressStudyToggle.test.ts` passes. |
| `src/lib/components/BuildSession.svelte` — reveal wiring | `revealPulseToken`, `triggerReveal`, `hearAgain`, roll scheduler, cleanup | ✓ VERIFIED (wiring) — see Truths 6/7 for the roll's behavioral defects | `triggerReveal`/`hearAgain`/`startArpeggioRoll`/`clearRollTimers` all present and called from the correct sites (`feedbackTimer` callback, `resetSessionUiState`, `onDestroy`). The wiring itself is sound; the roll's timing/voicing/pending-key data it drives is not. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `BuildSession.svelte` feedbackTimer callback | `triggerReveal()` | inline call at `sessionState = 'complete'` | ✓ WIRED | Fires exactly once per completion; not inside a `$effect`. |
| `triggerReveal()`/`hearAgain()` | `soundEnabled()`/`studyModeEnabled()` | live read at call time | ✓ WIRED | Confirmed by the "Hear again honors LIVE study+sound state" test (`buildSession.test.ts:1093`), which flips the mocked toggle mid-test and observes the branch change. |
| `startArpeggioRoll` | `playArpeggio` (audio stagger) + per-note visual timers (pending→lit) | shared `ARPEGGIO_STAGGER_MS` constant, but NOT a shared start-delay | ⚠️ PARTIAL | Both consumers use `staggerMs`/`ARPEGGIO_STAGGER_MS = 260`, but only the visual timers apply `firstNoteDelayMs`; `playArpeggio` receives no delay. This is the root cause of Truth 6's failure. |
| `PianoKeyboard`/`ChordGlyph` `pulseToken` prop | shared `app.css` `.pulse-once` keyframe | class add/remove effect | ✓ WIRED | Both components retrigger correctly; verified by both component test suites. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| HEAR-01 | 16-01, 16-02, 16-03, 16-05 | Correct chord auto-plays via `playChord` the instant the answer stamps in, lit keys + serif glyph pulse once in time, "Hear again" replays | ✓ SATISFIED | Truths 1-3, 5 above; all supporting tests pass. |
| HEAR-02 | 16-01, 16-04, 16-05, 16-06 | Sound-off reveal still pulses (no dead-end); optional roll-then-block "study" playback (arpeggiate root→3rd→5th→7th, each key lighting) available as a toggle | ⚠️ PARTIALLY SATISFIED | The sound-off/no-dead-end half is fully satisfied (Truth 4). The study-mode roll half is NOT satisfied as specified: the roll runs and the toggle exists and persists, but "each key lighting [as its note sounds]" is measurably false by a fixed 260ms audio-leads-visual offset (Truth 6), and the roll additionally mis-voices/mis-keys scale reveals (Truth 7). |

No orphaned requirement IDs: REQUIREMENTS.md maps only HEAR-01 and HEAR-02 to Phase 16, and both are claimed across the six plans' `requirements` frontmatter.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any file touched by this phase. No empty stub implementations found.

A related, lower-severity issue flagged by the code review (WR-04) is a real but narrower correctness defect: on the study-mode reveal path, `PianoKeyboard`/`ChordGlyph` mount with `pulseToken` still at its pre-reveal value (`0` on the first build in a session, since `triggerReveal`'s study branch returns without bumping the token), and both components' pulse-retrigger effects treat `token === 0` as a valid value (only `undefined` is excluded) — so a spurious `.pulse-once` fires at mount, on keys still dimmed/pending, before the roll has even started. This compounds Truth 6's desync in study mode but is scoped to the same underlying feature (the study roll), not a separate goal-level truth.

### Gaps Summary

The BASE reveal — the non-study, default path that HEAR-01 and the sound-off half of HEAR-02 describe — is solid: auto-play, pulse, Hear-again, and the sound-off collapse are all correctly wired, tested, and traced to source with no defects found. This is the majority of the phase goal and it works.

The STUDY MODE half of HEAR-02, however, is explicitly required by both the roadmap requirement text ("each key lighting") and Plan 16-06's own must-have truth ("each key lighting as its note sounds"), and it is demonstrably broken in the actual codebase, not merely a stylistic nit:

1. A fixed 260ms audio-leads-visual desync on every note of the initial-reveal roll (confirmed in source: `playArpeggio` has no start-delay parameter that mirrors the visual timers' `firstNoteDelayMs`).
2. Scale rolls mis-voice notes (flat octave 4 vs. the keyboard/block's ascending-octave convention), producing an audibly-descending roll for scales that visually ascend.
3. A scale's duplicate tonic letter collapses in the `pendingLetters` Set, causing the octave-tonic key to un-dim a full roll-cycle before its own note sounds.
4. A related mount-time spurious pulse in study mode (pulseToken===0 not excluded).

None of the existing tests exercise the audio/visual relative timing, the scale voicing, or the duplicate-letter scenario — they only assert call arguments and coarse pending-count transitions, so the test suite is green despite these defects being real and directly traceable in the source. This is exactly the "task completion ≠ goal achievement" pattern: the study-mode toggle and roll scaffolding all exist and are wired, but the behavior the phase goal and HEAR-02 promise — key lighting synced to the sound it represents — does not hold for the study path.

**This looks like an incomplete implementation, not an intentional deviation** — the code's own doc comments (e.g. `playArpeggio`'s "matching the reveal keyboard's voicing") assert the correct behavior that the code does not actually deliver, indicating an oversight rather than a considered tradeoff. No override is suggested; these are structured as gaps for `/gsd-plan-phase --gaps`.

---

_Verified: 2026-07-16T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
