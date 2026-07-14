---
spike: 007
name: construct-not-memorize
type: build
validates: >
  Given a chord or scale symbol (e.g. Cm7, F7, Bbmaj7, D dorian), when the user
  builds it note-by-note on a keyboard guided by the interval formula ("start on
  root C, stack a minor 3rd up to E♭, a major 3rd up to G, a minor 3rd up to
  B♭"), then the app teaches WHY those notes, verifies each step, and the learner
  internalizes the construction rule instead of a rote note list.
verdict: VALIDATED
related: [003, 005, 008]
tags: [learning, theory]
---

# Spike 007: Construct, Don't Memorize

## What This Validates

The pedagogical bet that **deriving** a chord or scale from its interval formula
teaches theory that sticks, where reading a finished note list does not. The
demo makes the learner produce every note past the root: it shows only the
symbol and the next interval instruction ("stack a minor 3rd up from C"), the
learner taps the key they believe is right, and the app confirms, corrects, and
explains WHY that note belongs before advancing. This is the generation effect
made physical: the answer is never on screen to be copied.

It also proves the idea generalizes past chords. The same engine drives scales
by switching the stack-of-thirds grammar for a stepwise whole/half grammar
(major = W W H W W W H), so one construction mechanic covers both `Cm7` and
`D dorian`.

## Research

**Why derivation beats rote (learning science):**

- **Generation effect** (Slamecka & Graf, 1978; robust in meta-analysis since):
  information a learner produces is remembered markedly better than the same
  information read. Tapping the note you reasoned out beats being shown it.
- **Active construction / constructivism**: knowledge assembled from a rule is
  encoded with its justification attached, so it is reconstructable later even
  when the specific item is forgotten. A learner who forgets the notes of `Cm7`
  but remembers "minor 7th = root, m3, M3, m3" regenerates the notes on demand.
- **Schema building & transfer**: a formula is a schema that transfers to unseen
  cases. "Stack thirds, minor or major per the quality" spells `Cm7`, `F7`, and
  a chord the learner has never drilled. A memorized list transfers to nothing.
- **Desirable difficulty** (Bjork): the small effort of computing each note is
  exactly the effort that produces durable memory; frictionless reading feels
  fluent but fades. The count-up hint is opt-in so the difficulty stays present
  by default.
- Fit to this learner: a returning classical pianist with strong motor/reading
  skills but beginner theory already has the keyboard in his hands. Giving him a
  rule to apply leverages the fluency he has and builds the theory he lacks.

**How `tonal` supplies the formula and spellings (all confirmed at v6.4.3):**

- `Chord.get("Cm7").intervals` → `["1P","3m","5P","7m"]`, `.notes` →
  `["C","Eb","G","Bb"]`, `.tonic` → `"C"`. Enharmonically correct spellings come
  for free: `Chord.get("Cdim7").notes` → `["C","Eb","Gb","Bbb"]` (B double-flat,
  not A).
- `Scale.get("D dorian").notes` → `["D","E","F","G","A","B","C"]`, `.intervals` →
  `["1P","2M","3m","4P","5P","6M","7m"]`, `.tonic` → `"D"`.
- **Step intervals** (the "stack a …" instruction) are computed between
  *consecutive* notes, not from the root: `Interval.distance("Eb","G")` → `"3M"`.
  For `Cm7` this yields m3, M3, m3; for a major scale, all `2M`/`2m` (whole/half).
- `Interval.get("3M").semitones` → `4` powers the "3 half steps" gloss and the
  wrong-tap distance feedback. `Note.chroma` / `Note.midi` resolve enharmonics
  and ascending octave placement. `Note.fromMidiSharps` walks the count-up hint.

**Phrasing each step in plain English** (see `phraseInterval` in the demo):
map tonal quality+degree to spoken names. `3m` → "minor 3rd", `3M` → "major
3rd", `7M` → "major 7th". Special-case seconds inside scales: `2M` → "whole
step", `2m` → "half step", because that is how the pattern is taught (W-W-H…).
French solfège is available via the app's `letterToSolfege` but was left out of
the spike to keep the interval-reasoning the sole focus.

## How to Run

Self-contained single file, no build step. It imports `tonal@6.4.3` from
esm.sh, so it needs network on first load; audio is a bare WebAudio oscillator
(no Tone.js, no samples) so it works offline once loaded.

```
# from repo root
python3 -m http.server 4807 --directory .planning/spikes/007-construct-not-memorize
# open http://localhost:4807
```

A `spike007` entry was added to `.claude/launch.json` for the preview pane.
Opening `index.html` directly via `file://` also works.

## What to Expect

1. Pick a symbol chip (five chords: `Cm7`, `F7`, `Bbmaj7`, `Bm7b5`, `Cdim7`; two
   scales: `C major`, `D dorian`). The answer notes are never listed.
2. The root appears pre-placed and colored on the keyboard. A prompt asks for
   the next interval only: "Step 1: stack a minor 3rd (3 half steps) up from C."
   A one-line WHY explains what that note is (the third of the chord). An opt-in
   "Show the count-up hint" walks the half steps.
3. Tap the key you think is right:
   - **Correct** → the key colors in, the note plays, a confirmation names it,
     and (when relevant) an enharmonic note explains the spelling. Advances.
   - **Wrong note** → "That is N half steps too high/low" plus a restatement of
     the interval. The key flashes gray; you retry.
   - **Right note, wrong octave** → "Right note, wrong octave. You are stacking
     UPWARD." Teaches the ascending-stack idea; you retry.
4. A running formula strip fills in (`C → m3 → E♭ → M3 → ? …`) as you go.
5. On completion, a summary states the rule you just used ("start on C, then
   stack minor 3rd, then major 3rd, then minor 3rd") and the spelled result.

## Investigation Trail

- Read the real app's `PianoKeyboard.svelte` (percentage-based white/black
  layout math, `role-*` interval-color classes, pointer press cue), `audio.ts`
  (synth-first, `playNote` contract), and the theory engine (`chord.ts`,
  `interval.ts`, `scale.ts`, `types.ts`). The spike mirrors the layout math and
  color tokens so it reads as the same product, but is fully standalone.
- Verified every `tonal` call headlessly in node against the installed
  `tonal@6.4.3` before wiring UI: chord intervals/notes/tonic, scale
  notes/intervals, consecutive-note step distances, and ascending MIDI voicing
  for all seven catalog items. Confirmed all target pitches land inside the
  rendered C4–C6 (MIDI 60–84) two-octave span (highest is A5 = 81).
- Drove the built demo in a real browser (preview pane): confirmed esm.sh
  loaded, no console errors, and exercised each branch, not just the happy path
  — wrong-note distance feedback, the enharmonic teaching on E♭/G♭/B𝄫, the
  wrong-octave hint, and both a chord and a scale to completion.
- One test-harness hiccup (not an app bug): scripted taps fired faster than the
  650 ms inter-step advance delay and desynced; re-running with >650 ms spacing
  completed cleanly. Worth noting the demo intentionally paces steps so a human
  sees each confirmation.

## Results

**VALIDATED.** Formula-driven construction is a strong, teachable mechanic and
it generalizes cleanly from chords to scales through one engine.

Key findings and surprises:

1. **The enharmonic moment is the best teaching, not a bug to hide.** Matching
   taps by pitch class (chroma) while labeling by tonal's correct spelling turns
   every accidental into a lesson: "This key is often called D♯, but Cm7 spells
   it E♭ so the chord reads as a clean stack of thirds." `Cdim7` produces the
   sharpest example — its 7th is B𝄫 (B double-flat), which is physically the
   white A key. Surfacing "this A is spelled B double-flat so the chord is four
   stacked minor thirds" is exactly the insight rote memorization never delivers.
2. **Step intervals, not root intervals, drive the instruction.** `tonal` gives
   intervals *from the root* (`1P 3m 5P 7m`); the "stack a …" prompt needs the
   interval between *consecutive* notes, computed with `Interval.distance`. Cm7's
   root-relative `3m,5P,7m` becomes the stacked `m3, M3, m3` — the actual thing a
   player stacks under their hand.
3. **Chords and scales are the same mechanic with two grammars.** Chords stack
   thirds; scales step by whole/half. Reusing the consecutive-interval engine and
   just relabeling seconds as W/H proved the derivation idea is not chord-specific
   — `D dorian` builds with the identical loop and closes on the octave.
4. **Octave wrap is free if you voice ascending.** Placing each note at the
   lowest MIDI above the previous one keeps the whole construction rising across
   the keyboard, so a scale's final note lands an octave above the root and a
   7th chord never collapses on itself. This also gives a natural "wrong octave"
   teaching branch when the learner taps the right pitch class too low/high.
5. **Wrong-answer feedback should be diagnostic, not just red.** "N half steps
   too high" plus the interval restatement keeps the learner reasoning in
   interval space rather than guessing keys. This matches sketch 005's
   always-on interval scaffold direction.

Gotchas for the real build:

- **Match by chroma, label by spelling.** Never compare letter names for
  correctness (E♭ vs D♯ would false-negative). Compare `Note.chroma`/MIDI and
  render `tonal`'s spelled name. The app's `intervalFromRoot` already picks the
  simplest enharmonic for inspect mode; construction needs the chord/scale's
  *own* spelling (B𝄫 must stay B𝄫), so read it from `Chord.get`/`Scale.get`,
  not from a fresh enharmonic guess.
- **Double-flats/sharps are real and land on white keys.** `Cdim7` → B𝄫 (=A),
  and sharp keys like F♯ major carry E♯ (=F). Any keyboard match must be
  pitch-class based or these break.
- **`tonal` returns ASCII accidentals** (`Eb`, `F#`); convert to glyphs (♭, ♯)
  for display, matching the app's existing `toAccidentalGlyphs` convention. Note
  the app has no double-flat glyph token yet — B𝄫 rendered as `B♭♭` here; the
  real build may want a `𝄫`/`𝄪` display pass.
- Copy rule honored: no em dashes anywhere in the demo or this README.

## Recommendation for the real build

Ship formula-driven construction as a distinct **"Build it"** drill mode, and do
it for **both chords and scales** (the generalization is cheap and proven). It is
the missing complement to the existing surfaces: the lookup page *shows* the
answer, sketch-003's badges *annotate* a shown chord, and the drills page *tests
recall*. This mode is where the learner *earns* the note list in the first place,
so it belongs upstream of recall drilling in the learning flow.

Concretely:

- **Where it lives:** a new mode on the drills surface (or a step in the beginner
  on-ramp from sketch 007's course stepper), positioned *before* recall drills
  for any given chord/scale. "Build `Cm7`" first, then later "recall `Cm7`."
  Reuse `PianoKeyboard.svelte` in a new `constructable` mode (a sibling to
  `interactive`/`inspectable`) that emits taps and receives per-step target +
  role highlighting; keep the gated-prop compatibility contract.
- **Phrase interval steps as spoken names with a semitone gloss:** "stack a minor
  3rd (3 half steps)". For scales use W/H: "a whole step up", "a half step up",
  and show the accumulating W-W-H pattern. Put this phrasing in the theory engine
  (extend `interval.ts` with a `phraseStep`/consecutive-interval helper) so it is
  unit-testable and shared, not trapped in a component.
- **Keep the WHY line and the enharmonic explainer** — they are the pedagogy.
  Make the count-up hint opt-in (preserve the desirable difficulty). Feed
  correct/incorrect step outcomes into the FSRS layer as a gradeable event so
  construction accuracy informs scheduling, same as recall.
- **Two octaves minimum** on the keyboard for construction (7th chords + scales
  with the closing octave need the range); the app's responsive one-octave phone
  layout will need a horizontal-scroll or a compressed two-octave affordance for
  this mode specifically.
