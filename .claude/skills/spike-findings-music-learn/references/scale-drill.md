# Scale Keyboard Drill

Synthesized from spike 008. Fixes the concrete user complaint: the /scales Practice tab (abstract degree ladder) is confusing. Replace it with playing the scale on a real tappable keyboard.

## Requirements (non-negotiable)

- **Grade by MIDI/chroma, never by letter string.** This is the load-bearing decision. The current `scaleDrill.ts` grades by letter equality and the keyboard reports black keys by sharp spelling, so `Bb` never matches a tapped `A#` and Gb major's `Cb` never matches the B-natural key. Comparing `baseMidi + semitoneOffset` is enharmonic-blind for free (no special-casing Cb/E#/B#/double-flats). Proven: Gb major's `Cb` graded clean at MIDI 71 on the B key.
- **Tonic-anchored movable one-octave window.** A fixed C-to-C octave strands non-C scales (this is exactly why sketch 002 abandoned the keyboard). A movable start-midi where the leftmost key is the tonic makes every scale ascend strictly left-to-right in one octave — how you actually play a scale.
- **End on the octave (degree 8).** Reads as "playing the scale" far better than stopping on the 7th; cheap and musically correct.
- **Ascending AND descending.**
- Works on a one-octave phone-width keyboard.

## How to Build It

- Extend the existing pure state machine `src/lib/practice/scaleDrill.ts`: change `letters` to `{chroma, midi, degree}`, add degree-8 octave and descending. It is ~90% there and its state-machine / component-owns-render split is exactly right.
- Reuse the drill CHROME (prompt line, pass state, future FSRS/streak hook), not the DrillQuestion union.

```js
import { Scale, Note } from 'tonal';
const notes = Scale.get('F major').notes; // ["F","G","A","Bb","C","D","E"]
// per degree: target = { name, chroma: Note.chroma(name), midi: baseMidi + offset, degree }
// grade a tap: tap.midi === expected.midi   (absolute-midi, enharmonic-blind)
```

- Keyboard: real black/white geometry (percentage layout math from `PianoKeyboard.svelte`), per-key sound on correct tap, wrong-tap flash, pass state ("F major, clean") + reset.
- Keep the slim 1-8 ladder only as a thin progress strip ABOVE the keyboard.

## What to Avoid

- **Do NOT offer keyboard-vs-ladder as a toggle.** The user called the ladder confusing; a toggle just re-ships the confusion behind a switch. The keyboard IS the Practice tap surface. Replace the ladder.
- **Do NOT fold scales into the unified drill engine.** A chord/interval question is a one-shot graded answer; a scale is an ordered multi-tap sequence that does not fit the `DrillQuestion` union. Keep a DEDICATED scale drill.
- Do NOT grade by letter string (see Requirements).
- Leave the Explore tab (degree strip + interval inspect) untouched.

## Constraints

- `tonal@6.4.3` (`Scale.get`, `Note.chroma`, `Note.midi`).
- Black-key tonics: the literal leftmost key is the white key below the tonic, so a black-key tonic becomes the first *black* key. "Leftmost = tonic" degrades to "tonic is the first highlighted key" — reads fine and honest; forcing a black key to the literal edge looks broken.
- 375px gives ~40px white keys (just under the 44px touch ideal); inherit the app's existing phone padding-trim trick from `PianoKeyboard.svelte`.

## Origin

Synthesized from spikes: 008
Source files: sources/008-scale-keyboard-drill/
