---
spike: 008
name: scale-keyboard-drill
type: build
validates: >
  Given a scale prompt (e.g. "Play F major, ascending"), when the user taps the
  scale notes in order on a real on-screen piano keyboard, then the app checks
  each tap is the correct next scale degree, highlights and sounds correct
  notes, flags wrong taps, and grades the run like the app's other drills
  (question -> answer -> pass/fail). It must work on a one-octave phone-width
  keyboard.
verdict: VALIDATED
related: [004-scale-drill-ascending, 002-scale-tonic-anchored, 001-merged-feedback-keyboard]
tags: [scales, drills]
---

# Spike 008: Scale Keyboard Drill

## What This Validates

The /scales "Practice" tab today is an abstract degree ladder plus a row of
colored degree cells (`ScalePractice.svelte`). The user's complaint: to
practice a scale they want to PLAY IT ON A PIANO by tapping keys, not read an
abstract ladder.

This spike validates that a returning pianist can practice a scale by tapping
its notes bottom-to-top on a real on-screen keyboard, with each tap graded as
the correct next degree, correct notes stamped and sounded, wrong taps flagged,
and the run graded pass/fail like the app's chord and interval drills. The hard
part it had to prove out: a fixed C-to-C octave strands every non-C scale, and
tapping a black key must match a scale note regardless of how each is spelled
(the black key between A and B is "A#" to the keyboard but "Bb" to F major, and
"Cb" is really the B natural key).

## Research

**tonal scale spelling (confirmed against tonal@6.4.3):**

```
F major   -> F  G  A  Bb C  D  E    chroma 5,7,9,10,0,2,4
C major   -> C  D  E  F  G  A  B    chroma 0,2,4,5,7,9,11
B major   -> B  C# D# E  F# G# A#   chroma 11,1,3,4,6,8,10   (5 sharps)
Gb major  -> Gb Ab Bb Cb Db Eb F   chroma 6,8,10,11,1,3,5   (has Cb!)
Db major  -> Db Eb F  Gb Ab Bb C   chroma 1,3,5,6,8,10,0
A dorian  -> A  B  C  D  E  F# G    chroma 9,11,0,2,4,6,7    (a mode)
Bb minor  -> Bb C  Db Eb F  Gb Ab  chroma 10,0,1,3,5,6,8
```

`Scale.get("F major").notes` returns `["F","G","A","Bb","C","D","E"]` exactly
as the brief predicted. `Note.chroma(note)` and `Note.midi(note+"4")` give the
pitch identity that grading must key off.

**How the real app already grades scale taps** (`src/lib/practice/scaleDrill.ts`):
a pure state machine, `step` cursor over an array of degree LETTERS, `gradeTap`
advances only on exact-letter match of the expected next letter, flags anything
else. Out-of-order taps of an in-scale letter are correctly wrong. Solid model
- but **it grades by letter string**, which is the latent bug for a keyboard:
the keyboard reports black keys by their sharp spelling (`sharpLetter`, e.g.
"A#"), so a scale spelled "Bb" would never match a tapped "A#". The keyboard
drill must grade by **chroma / midi**, not letter.

**How the keyboard is laid out** (`PianoKeyboard.svelte`, `keyboardLayout.ts`):
hardwired C-to-C via `whiteLettersForOctaves` / `blackKeysForOctaves`, one
octave on phone width, two on wider screens. `assignNotesToKeys` matches notes
to keys by letter with a chroma fallback for exotic spellings (Cb, E#, double
flats). There is no way to start the window anywhere but C - this is exactly why
scales were pulled OFF the keyboard in sketch 002 (the C-to-C span "stranded
non-C scales"). The `assignNotesToKeys` wrap-around (D-02) folds overflow notes
back into the octave, which is fine for a chord snapshot but produces a
left/right zigzag for an ascending scale run and is the wrong tool here.

**How drills frame a question** (`generateQuestion.ts`, `drills/+page.svelte`):
`DrillQuestion` is a discriminated union (`chord` | `interval`) where a question
has a single answer graded once - construction (build the chord) or
identification (pick from 4 choices). A scale is a fundamentally different
interaction: an ordered multi-tap SEQUENCE, not a one-shot answer. It does not
fit the `DrillQuestion` union cleanly.

**Octave-span decision.** The brief offered two paths (movable tonic-anchored
window, or highlight-the-span on a fixed keyboard). This spike landed on the
**tonic-anchored one-octave window**: the visible keyboard starts at the tonic
(leftmost white key = tonic when the tonic is white; the white key just below it
when the tonic is a black key), spans tonic..octave, and renders real black/
white geometry for that slice. Every scale then ascends strictly left-to-right
with no wrap zigzag, and the whole run fits one phone-width octave. Grading is
by absolute midi (`baseMidi + semitoneOffset`), which is enharmonic-blind by
construction.

**Fold into unified drill engine, or dedicated?** Keep a DEDICATED scale
keyboard drill that reuses the drill CHROME (prompt line, pass state, and later
the FSRS/streak hook), but does NOT join the `DrillQuestion` union. Rationale in
Results.

## How to Run

```
cd .planning/spikes/008-scale-keyboard-drill
python3 -m http.server 4808
# open http://localhost:4808
```

Single self-contained `index.html`; imports `tonal` from
`https://esm.sh/tonal@6.4.3` (needs network on first load). Sound is a tiny
inline WebAudio synth - no Tone.js, no samples, works offline once tonal is
cached.

## What to Expect

- A row of scale buttons: F, C, B (5 sharps), Gb (has Cb), Db, A dorian, Bb minor.
- A prompt: "Play F major", an ASC/DESC toggle, and a "next: degree N (X)" hint.
- A 1-8 progress ladder (degree 8 is the octave - a scale you "play" lands on the octave).
- A tonic-anchored keyboard: leftmost key is the tonic; the scale ascends left to right.
- Tap the outlined next-expected key: it stamps (vermilion for tonic degrees,
  verdigris for the rest), sounds, and the ladder fills. Tap anything else: it
  flashes gray and shakes, sounds a low buzz, and does not advance.
- Finish the run: "Voila. F major, ascending. Clean." + "Run it again".
- A diagnostic log under the card dumps every scale's spelling + chroma so the
  grading model is auditable at a glance.

## Investigation Trail

1. Read the real app's `scaleDrill.ts`, `PianoKeyboard.svelte`, `keyboardLayout.ts`,
   `generateQuestion.ts`, `voicing.ts`, `scale.ts`, and the current
   `ScalePractice.svelte` / scales page to understand existing grammar.
2. Confirmed tonal spellings and chroma via Node, including the two spellings
   that break letter-based grading: Gb major's `Cb` (chroma 11 = B natural white
   key) and sharp-key `E#`/`B#` families.
3. Built the tonic-anchored movable-window keyboard with midi-based grading and
   drove it in a real browser (Chrome preview), not just by reading code.
4. Ran all 7 scales x 2 directions programmatically by clicking the
   next-expected key each step. Every run completed clean; captured the exact
   key each step landed on.
5. Probed the enharmonic edge cases: Gb major's `Cb` graded correctly at midi 71
   (the B key, displayed "Cb"); Bb minor's all-flat spelling landed right.
6. Probed a wrong tap (G natural during Gb major): it flashed, did not advance,
   left the expected degree unchanged.
7. Probed the black-tonic render (Gb): tonic is the first black key, window opens
   on the white key below it, run still reads left-to-right.
8. Resized to 375px phone width with B major (5 black keys, worst case): one
   octave, 8 white keys at 40px, black keys at 25px, all tappable. No console
   errors.

## Results

**Verdict: VALIDATED.** All 7 scales (white tonic, 5-sharp key, flat key with
Cb, black tonic, a mode, a minor) grade correctly ascending AND descending, on a
one-octave phone-width keyboard, with correct-note sound, wrong-tap flash, and a
pass state. Not a happy-path-only pass: the sharp/flat/mode/black-tonic and
enharmonic cases were all exercised.

**Strongest findings / surprises:**

1. **Grade by midi/chroma, never by letter.** This is the single load-bearing
   decision. The real `scaleDrill.ts` grades by letter equality, and the
   keyboard reports black keys by sharp spelling - so a scale spelled "Bb" would
   never match a tapped "A#", and Gb major's "Cb" would never match the B key.
   Comparing `baseMidi + semitoneOffset` makes grading enharmonic-blind for free
   and needs zero special-casing for Cb/E#/B#/double-flats.

2. **The tonic-anchored movable window fully solves the octave-span problem** -
   and it is genuinely better than the old C-to-C keyboard, not just a
   workaround. Every scale ascends strictly left-to-right in one octave, which
   is exactly how you play a scale on a real piano. This is the missing piece
   that made sketch 002 abandon the keyboard; it turns out a movable start-midi
   is all that was needed.

3. **Ending on the octave (degree 8) feels right.** Modeling the run as 8 taps
   (1..8, landing on the high tonic) reads as "playing the scale" far more than
   stopping on the 7th. Cheap to add, musically correct.

4. **Black-key tonics are the one soft spot.** When the tonic is black (Db, Eb,
   Gb, Ab, Bb, F#), the literal leftmost key is the white key below it and the
   tonic is the first BLACK key, so "leftmost = tonic" degrades to "the tonic is
   the first highlighted key." It reads fine and is honest (a real keyboard), but
   it is worth a deliberate UX call. Forcing a black key to be the literal left
   edge looks broken, so this is the right compromise.

5. **Phone width is tight but workable.** At 375px with 12px page padding, white
   keys are 40px (just under the 44px touch ideal); the real app already trims
   page/card padding on phone to recover the last few px (documented in
   `PianoKeyboard.svelte`'s 09-02 note). Not a blocker, just inherit that trick.

**REPLACE the ladder, don't offer a choice.** The keyboard should BE the
Practice tap surface. The user explicitly called the abstract ladder + degree
cells confusing; offering "keyboard vs ladder" as a toggle just re-ships the
confusion behind a switch. Keep the small 1-8 ladder as a slim PROGRESS
indicator above the keyboard (it earns its keep there), but the thing you tap is
the piano. The Explore tab (tonic-anchored degree strip + interval inspect from
sketch 002) stays as-is - it answers a different question ("what interval is
each degree").

**Keep it a dedicated drill, reusing drill chrome - do NOT fold into the
`DrillQuestion` union.** A chord/interval question is a single graded answer; a
scale is an ordered multi-tap sequence. Cramming a sequence into a union built
for one-shot answers (with `choices`, construction/identification directions,
etc.) would bloat `generateQuestion.ts` for no gain. Instead: a sibling scale
drill that (a) reuses the app's drill FRAMING - prompt line, pass state, and the
same FSRS/streak persistence hook the chord drills will use - and (b) extends the
existing `scaleDrill.ts` state machine to grade by chroma, support the degree-8
octave, and support a descending pass. `scaleDrill.ts` is ~90% there; the change
is `letters: string[]` -> a target list of `{chroma, midi, degree}` and a
chroma/midi compare in `gradeTap`. The pure-state-machine + component-owns-render
split it already has is exactly right; keep it.

**Concrete build delta for the real app:**
- New movable-window keyboard mode (start-midi = tonic) OR a dedicated
  `ScaleKeyboard.svelte` - the current `PianoKeyboard` is hardwired C-to-C via
  `whiteLettersForOctaves`/`blackKeysForOctaves` and its `assignNotesToKeys`
  wrap-around is the wrong grammar for an ascending run.
- Extend `scaleDrill.ts`: grade by chroma/midi, add degree 8 (octave), add
  descending. Keep its existing tests; add chroma-match and octave cases.
- Rework `ScalePractice.svelte`'s Practice tab to render the keyboard as the tap
  surface, keeping the 1-8 ladder as a progress strip only.
