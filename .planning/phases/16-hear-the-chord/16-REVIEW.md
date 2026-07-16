---
phase: 16-hear-the-chord
reviewed: 2026-07-16T21:16:35Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/app.css
  - src/lib/audio/audio.ts
  - src/lib/audio/audio.test.ts
  - src/lib/components/BuildSession.svelte
  - src/lib/components/ChordGlyph.svelte
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/components/buildSession.test.ts
  - src/lib/components/chordGlyph.test.ts
  - src/lib/components/pianoKeyboardPulse.test.ts
  - src/routes/progress/+page.svelte
  - src/routes/progressStudyToggle.test.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-07-16T21:16:35Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 16 ("hear the chord") wires audio playback and a shared `.pulse-once` /
`--pending` animation vocabulary into the BUILD reveal: a new `playArpeggio`
audio primitive, `studyMode` persistence, `pulseToken`/`pendingLetters` props
on `PianoKeyboard` and `ChordGlyph`, the `triggerReveal`/`hearAgain`/
`startArpeggioRoll` orchestration in `BuildSession`, and a STUDY MODE toggle on
/progress.

The plumbing is careful — timer cleanup on destroy, sound-off pulse-only fall
back, best-effort FSRS write, lazy localStorage reads. No security issues, no
null-deref or data-loss risks were found. However, the **study-mode arpeggio
roll is not actually synchronized between audio and lighting**, and the arpeggio
voices notes differently from both the keyboard layout and the block strike.
These are correctness defects in the headline feature of the phase, but they
degrade experience rather than crash or corrupt, so they are classified WARNING.
Chord rolls happen to be correct; scales are where the defects bite hardest.

No structural pre-pass (`<structural_findings>`) was provided.

## Warnings

### WR-01: Study-mode initial reveal desyncs audio ahead of lighting by 260ms

**File:** `src/lib/components/BuildSession.svelte:405-429` (and `:456`)
**Issue:** `startArpeggioRoll` fires `playArpeggio(letters, { staggerMs: 260 })`
(line 408) with **no first-note delay** — `playArpeggio` schedules its notes at
`index * staggerMs`, so note 0 sounds immediately. But the visual "un-pending"
timers (line 416) and the block-strike timer (line 426) are offset by
`opts.firstNoteDelayMs`, which `triggerReveal` sets to **260ms** on the initial
reveal (line 456). Result: on the primary reveal path the audio arpeggio plays
at t = 0/260/520/780 while the corresponding keys light at t = 260/520/780/1040
— a fixed 260ms audio-leads-visual desync. The plan's stated contract
(D-05/D-06) is "each key lighting as its note sounds." `hearAgain`
(`firstNoteDelayMs: 0`) is correctly in sync, which makes the initial path the
inconsistent one. (On a cold audio start, `ensureAudioReady` latency can widen
the gap further, since the visual timers are fixed regardless.)
**Fix:** Apply the same first-note delay to the audio as to the visuals — either
give `playArpeggio` a `startDelayMs`/`firstNoteDelayMs` option and pass 260 on
the initial reveal, or drive both audio and lighting from the one timer set.
```ts
// audio.ts
export function playArpeggio(notes: string[], opts: { staggerMs: number; startDelayMs?: number }): void {
    ...
    setTimeout(() => { ... }, (opts.startDelayMs ?? 0) + index * opts.staggerMs);
}
// BuildSession.startArpeggioRoll
playArpeggio(letters, { staggerMs: ARPEGGIO_STAGGER_MS, startDelayMs: opts.firstNoteDelayMs });
```

### WR-02: `playArpeggio` voices every note at octave 4, mismatching the keyboard and block strike

**File:** `src/lib/audio/audio.ts:274-285`
**Issue:** `playArpeggio` computes each pitch as `toPitch(note, 4)` — a flat
octave-4 voicing for every entry. Its doc claims this is "voiced at octave 4,
matching the reveal keyboard's voicing," but the reveal keyboard and the
block-strike `playChord` both use `toAscendingPitches` (voicing.ts:24), which
walks octaves upward so the sequence is monotonically ascending. For chords
(C/E♭/G/B♭) the two happen to coincide, so chord rolls are fine. For a **scale**
(e.g. G major → `['G','A','B','C','D','E','F#','G']`) `toPitch(note,4)` yields
`G4 A4 B4 C4 D4 E4 F#4 G4`, where C4–F#4 sound *below* the tonic G4 — the "roll"
descends at C instead of ascending, does not match the keyboard (which lays the
scale out ascending across two octaves), and does not match the ascending block
strike that follows it. Enharmonic-wrap chords (e.g. A♭m7 with C♭) have the same
mismatch.
**Fix:** Voice the arpeggio with the same ascending logic the keyboard/block use,
so the rolled pitches equal the struck pitches:
```ts
export function playArpeggio(notes: string[], opts: { staggerMs: number }): void {
    if (!soundEnabled() || notes.length === 0) return;
    const pitches = toAscendingPitches(notes);
    pitches.forEach((pitch, index) => {
        setTimeout(() => void withInstrument((inst) =>
            inst.triggerAttackRelease(pitch, NOTE_DURATION, undefined, NOTE_VELOCITY)), index * opts.staggerMs);
    });
}
```

### WR-03: Letter-keyed `pendingLetters` cannot represent a scale's repeated tonic octave

**File:** `src/lib/components/BuildSession.svelte:407-419`; `src/lib/components/PianoKeyboard.svelte:533-535`
**Issue:** `pendingLetters` is a `Set<string>` of letters, and `pendingClass`
dims a key purely by `pendingLetters?.has(letter)`. A major-scale construction's
`earnedNotes` ends on the tonic an octave up, so `letters` contains the tonic
letter twice (e.g. G at index 0 and index 7). `new Set(letters)` collapses it to
one entry, and the per-note un-pend timer for index 7 (`next.delete('G')`) is a
no-op because index 0 already removed it. Both physical G keys (octave 4 and
octave 5) therefore un-dim together at the *first* tick — the octave-tonic key
lights ~1.8s before its own arpeggio note actually sounds. The dimming model is
octave-agnostic while the roll is position/octave-specific.
**Fix:** Key the pending state by position/octave rather than letter (e.g. track
pending by earned-note index and have `PianoKeyboard` receive a per-key pending
signal), mirroring how `flashWrongKey` already distinguishes duplicate letters by
`{ letter, octave }`.

### WR-04: `pulseToken === 0` triggers an unintended pulse on the study-mode reveal mount

**File:** `src/lib/components/PianoKeyboard.svelte:433-435`; `src/lib/components/ChordGlyph.svelte:38-40`; `src/lib/components/BuildSession.svelte:94,454-457`
**Issue:** `revealPulseToken` is documented as "Starts at 0 (no pulse before any
reveal has happened)" (BuildSession:94), but both pulse effects guard only
`if (token === undefined) return;` — a literal `0` passes the guard and schedules
a pulse. In the study-mode reveal branch, `triggerReveal` calls
`startArpeggioRoll` and returns **without** bumping `revealPulseToken` (the bump
happens later inside the block-strike timer). So the complete-state
`PianoKeyboard`/`ChordGlyph` mount with `pulseToken={revealPulseToken}` still at
its pre-reveal value (0 on the first build, or a stale prior value on later
builds), and the effect fires a `.pulse-once` at mount — on keys that are still
dimmed/pending — before the roll has run, in addition to the intended pulse at
the block strike. The non-study path is unaffected because it bumps the token
synchronously before mount. Not covered by the study-mode tests (they assert
`--pending` counts and `playChord`, never the pulse class).
**Fix:** Treat 0 as "no pulse" to match the documented contract, e.g.
`if (token === undefined || token === 0) return;` in both effects; or have the
study branch withhold the token from the keyboard/glyph until the block-strike
bump (e.g. start the complete view at an explicit "no pulse yet" sentinel).

## Info

### IN-01: Tautological assertion in the destroy-cleanup test

**File:** `src/lib/components/buildSession.test.ts:287`
**Issue:** The test "clears pending timers on destroy so they never fire against
a torn-down instance" ends with `expect(true).toBe(true);` — it can never fail
and asserts nothing about timer cleanup. (The newer phase-16 roll-cleanup test at
:1122-1148 does correctly assert `playChordMock` is not called after unmount, so
the mechanism is covered elsewhere; this older test is dead weight.)
**Fix:** Assert an observable consequence (e.g. spy the audio/pacing effect and
assert it is not invoked after `unmount()`), or delete the redundant test.

### IN-02: `playArpeggio` note timers are untracked and unstoppable

**File:** `src/lib/audio/audio.ts:274-285`
**Issue:** Unlike the module's `heldNotes`/`releaseAll` discipline, the
`setTimeout`s scheduled inside `playArpeggio` are never retained, so there is no
way to cancel an in-flight arpeggio from the audio layer (e.g. on
`setSoundEnabled(false)` mid-roll, the already-scheduled note callbacks still run
`withInstrument`, which plays through the still-live synth because
`ensureAudioReady`'s early return does not clear `activeInstrument`). BuildSession
compensates by clearing its *own* `rollTimers`, but the audio primitive itself
leaks. Low impact today (only BuildSession calls it), but worth noting for reuse.
**Fix:** Consider returning a cancel handle from `playArpeggio`, or re-check
`soundEnabled()` inside each scheduled callback before attacking.

---

_Reviewed: 2026-07-16T21:16:35Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
