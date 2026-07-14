# "Build It" Construction Mode

Synthesized from spike 007 (construct, don't memorize). Formula-driven derivation: the learner produces every note past the root by applying an interval rule, instead of reading a finished note list. Generation effect made physical.

## Requirements (non-negotiable)

- **Match taps by chroma/MIDI, render tonal's own spelling.** Comparing letter names false-negatives E♭ vs D♯. Use the chord/scale's OWN spelling from `Chord.get`/`Scale.get` (B𝄫 must stay B𝄫) — do NOT reuse the app's `intervalFromRoot` "simplest enharmonic" pick (that is for inspect mode).
- **Instruction uses consecutive-note intervals, not root-relative.** tonal gives root-relative (`1P 3m 5P 7m`); "stack a minor 3rd" needs `Interval.distance` between adjacent notes. Cm7 -> stacked m3, M3, m3.
- **Covers chords AND scales** (one engine, two grammars: stack thirds vs step W/H). Generalization is cheap and proven.
- **Two octaves minimum** on the keyboard (7th chords + scale closing octave). Phone one-octave layout needs horizontal-scroll or compressed two-octave affordance for this mode.
- Enharmonic collision is a teaching moment, not a bug to hide.
- Count-up hint is opt-in (preserve desirable difficulty).

## How to Build It

```js
import { Chord, Scale, Interval, Note } from 'tonal';

// Chord target (keep the chord's own spelling):
const c = Chord.get('Cm7');
c.intervals; // ["1P","3m","5P","7m"]  (root-relative, for reference/labels)
c.notes;     // ["C","Eb","G","Bb"]    (canonical spelling; Cdim7 -> [...,"Bbb"])
c.tonic;     // "C"

// The "stack a ..." instruction = interval between CONSECUTIVE notes:
Interval.distance('Eb', 'G'); // "3M"  -> "stack a major 3rd"
Interval.get('3M').semitones; // 4     -> "(4 half steps)" gloss + wrong-tap distance

// Scale target: same loop, relabel seconds as whole/half:
Scale.get('D dorian').notes; // ["D","E","F","G","A","B","C"]
// consecutive intervals -> 2M=whole step, 2m=half step (W W H W W W H for major)

// Ascending voicing keeps the build rising; place each note at lowest MIDI above the previous.
Note.midi('C4'); Note.chroma('Eb'); // chroma/MIDI power tap matching + octave logic
```

- Put phrasing in the theory engine: extend `interval.ts` with a `phraseStep`/consecutive-interval helper (`3m`->"minor 3rd", `2M`->"whole step") so it is unit-testable and shared, not trapped in a component.
- Reuse `PianoKeyboard.svelte` via a new gated `constructable` mode (sibling to `interactive`/`inspectable`): emits taps, receives per-step target + role highlighting; keep the gated-prop compatibility contract.
- Flow: root pre-placed -> prompt next interval only + one-line WHY -> tap -> confirm/correct -> advance -> summary states the rule + spelled result. Running formula strip fills in (`C -> m3 -> E♭ -> M3 -> ?`).
- Diagnostic wrong-answer feedback: "N half steps too high/low" + interval restatement (keeps the learner reasoning in interval space); "right note, wrong octave, you are stacking UPWARD" branch.
- Feed correct/incorrect step outcomes into the FSRS layer as gradeable events (this is Mode C in the memorization engine).
- Place upstream of recall drilling: "Build Cm7" first, then later "recall Cm7". Fits the sketch-007 on-ramp stepper.

## What to Avoid

- Do NOT compare letter names for correctness.
- Do NOT re-derive enharmonics with a fresh "simplest" guess; read the chord/scale's own spelling.
- Do NOT show the answer note list; the learner must produce it.
- Pace steps (the spike used ~650 ms inter-step advance) so a human sees each confirmation.

## Constraints

- `tonal@6.4.3`. Returns ASCII accidentals (`Eb`, `F#`) -> convert to glyphs (♭/♯) via the app's `toAccidentalGlyphs`.
- **No double-flat/double-sharp glyph token exists yet.** B𝄫 rendered as `B♭♭` in the spike; real build may want a `𝄫`/`𝄪` display pass. Double accidentals land on white keys (B𝄫=A, E♯=F) so pitch-class matching is mandatory.
- All 7 catalog targets fit C4–C6 (MIDI 60–84, highest A5=81).

## Origin

Synthesized from spikes: 007
Source files: sources/007-construct-not-memorize/
