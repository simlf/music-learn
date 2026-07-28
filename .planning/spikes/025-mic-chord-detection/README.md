---
spike: 025
name: mic-chord-detection
type: feasibility
validates: >
  Given that Web MIDI does not exist on Safari or iOS and the owner can only put
  a PHONE near his piano, when he plays a chord acoustically, then a chromagram
  detector running in the browser can VERIFY that the expected pitch classes are
  present and no unexpected pitch class is, fast enough and reliably enough to
  grade a drill. Verification against a known target, not transcription.
verdict: GO WITH LIMITS
related: [008-scale-keyboard-drill, 007-construct-not-memorize]
tags: [input, audio, mic, drills, feasibility]
---

# Spike 025: Microphone Chord Verification

## What This Validates

The planned Web MIDI "play to answer" input was abandoned twice over: Apple has
said it will not ship Web MIDI (fingerprinting), so Safari and every iOS browser
are out, and there is nowhere to put a laptop near the piano anyway. A phone can
sit on the music desk. So: can the phone microphone grade a drill?

The framing that makes this tractable is that the app **already knows the
answer**. "Play the notes of Cm7", "play the shell of G7", the scale drill: every
one has a known target chroma set. The only identification-shaped drill (name-it)
is answered by multiple choice, not by playing. So the question is never
"transcribe this audio", it is "are these four pitch classes present, and is
nothing else". That is an order of magnitude easier, and it is how Simply Piano
and Flowkey work.

It also fits the codebase: the app grades by chroma and never by letter string
(the standing D-01/D-02 invariant), `src/lib/drills/matchChord.ts` consumes a
chroma set, and a chromagram IS a 12-bin pitch-class vector.

This spike builds a throwaway detector and **measures** true-accept rate,
false-accept rate, latency, octave and bass sensitivity, dim7 symmetry, sustain
bleed, and the app's own speaker leaking into the mic, on real piano samples,
clean and degraded.

## Method

**Test signal is the repo's own Salamander Grand Piano set**, not synthesised
sine stacks. `static/samples/salamander/` ships 30 mp3 files at minor-third
spacing; `harness/render.mjs` emulates what `Tone.Sampler` does in
`src/lib/audio/audio.ts` (nearest sample, repitched by `2^(semitones/12)`, linear
interpolation), then strikes chord notes with up to 18 ms of human onset jitter
and up to 18% per-note gain variation, held with the sample's natural decay. Real
partials, real inharmonicity, real decay. A sine-based test would have produced a
flattering and useless number.

Decoding: there is no `ffmpeg` on this machine and no new npm dependency was
allowed, so `harness/decode.sh` uses macOS's built-in `afconvert` to make mono
16-bit 44.1 kHz WAVs in a temp dir. No decoder dependency, nothing added to
`package.json`.

**The detector** (`harness/detect.mjs`, ~250 lines, zero deps):

1. Decimate 44.1 kHz to 11.025 kHz (4th-order anti-alias lowpass at 4.6 kHz).
2. Constant-Q magnitude spectrum, one bin per semitone from C2 (midi 36) to G7
   (midi 103), Q = 45, Hann kernels, longest window 4096 samples = 372 ms.
3. Harmonic-sum salience per candidate fundamental over partials 1 to 8, using a
   partial amplitude profile **measured off the Salamander samples themselves**
   (`harness/partials.mjs`): `[1.0, 0.778, 0.352, 0.173, 0.226, 0.186, 0.132,
   0.027]`. Upper partials are read as the max over the predicted bin and the one
   above, because piano inharmonicity stretches them sharp. Divided by the
   partial weight actually in band, so a high note is not penalised for having
   fewer partials inside the analysed range. Minus a sub-harmonic penalty.
4. **Matching pursuit**: take the most harmonically supported local-maximum bin,
   multiplicatively cancel its whole partial series out of the residual, repeat
   up to 10 times. This is the overtone-ghost suppression. A plain chromagram
   without it lights up every octave and fifth.
5. Fold the surviving note strengths into 12 chroma bins, max-normalise. Record
   the lowest surviving note as the bass estimate.
6. **Decision** (target-driven, so one analysis scores against any target):
   accept a frame when the weakest EXPECTED chroma clears 0.20, no unexpected
   chroma exceeds 0.25, and the weakest expected beats the strongest unexpected
   by 0.15. Accept the answer only after **3 consecutive** frames agree
   (46.4 ms hop, 5-frame trailing chroma average, 800 ms decision window from
   onset).

**Degradation** is applied at the analysis rate: 2nd-order highpass at 100 Hz for
the phone capsule rolloff ("phoneHard" is 4th-order at 150 Hz), a synthesised
small-room impulse response (direct + 8 randomised early reflections + decaying
noise tail, RT60 0.5 s) parameterised by **direct-to-reverberant ratio** rather
than a wet percentage, and additive pink noise at a stated SNR. `room12` is a
phone on the music desk; `room6` is a phone a metre or two away; `room0` is
across the room.

Everything is seeded and reproducible. `harness/measure.mjs` runs the whole grid
in about 25 seconds and writes `harness/results.txt` and `harness/results.json`.

**Thresholds were not quietly tuned to flatter the answer.** `results.txt` E0
prints the entire 256-point sweep over the five decision parameters against both
the clean and the realistic degraded condition. The operating point is picked by
one stated rule, `mean true accept - 5 x mean false accept`, the 5x being an
explicit value judgement (a false accept teaches wrong theory, a false reject
only annoys). The one confusion class deliberately excluded from that objective
is fifth-omission, because it is a physical limit no threshold can win; it is
still reported in full.

## How to Run

The live page, which is the part that actually matters:

```
cd .planning/spikes/025-mic-chord-detection
python3 -m http.server 4825
# open http://localhost:4825
```

Add this to `.claude/launch.json` if you want the preview pane (not edited here,
it is shared):

```json
{
	"name": "spike025",
	"runtimeExecutable": "npx",
	"runtimeArgs": ["-y", "serve", ".planning/spikes/025-mic-chord-detection", "-l", "4825"],
	"port": 4825
}
```

**To test on the phone you need a secure context.** `getUserMedia` is refused on
a plain `http://192.168.x.x` address. Three ways round it, cheapest first:

- Drop `index.html` into the app's `static/` and reach it over the existing
  deployment at `https://your-host.your-tailnet.ts.net:8091`, which is already https so
  the mic prompt appears.
- Any https tunnel to the local port.
- Chrome desktop only: `--unsafely-treat-insecure-origin-as-secure`.

The offline measurement:

```
cd .planning/spikes/025-mic-chord-detection/harness
./decode.sh /tmp/salamander-wav          # macOS afconvert, ffmpeg line in the script
WAV_DIR=/tmp/salamander-wav node measure.mjs
node portcheck.mjs                        # proves index.html runs the same algorithm
```

`portcheck.mjs` exists because the page inlines its own copy of the detector (no
build step, no CDN, strict-CSP habit). Its output was compared against the same
code path run in the browser and matched to eight decimal places: same picked
notes, same chroma vector. The page is not a different detector.

## What to Expect

`index.html` on the phone: tap "Enable microphone", pick a root and a quality,
play the chord. Twelve live bars, green for expected pitch classes and red for
anything that should not be there. The verdict line is specific rather than
binary: "not yet, missing G" or "not yet, extra Bb", then "YES, that is the
chord". Underneath, the notes it picked with octaves, its bass estimate, the two
numbers the decision turns on, and the consecutive-agreeing-frame counter. It
requests `echoCancellation`, `noiseSuppression` and `autoGainControl` all off,
because phone voice processing mangles a piano.

## Results

**Verdict: GO WITH LIMITS.** Microphone verification works well enough to grade
the chord-construction family and badly enough that it must not grade the
inversion family. The specific confusions the brief called out as the dangerous
ones (`Cm7` vs `Cm7b5`, `Cmaj7` vs `C7`, `Cm7` vs `C7`) false-accept at
**0.0% in every one of the 13 signal conditions**, which is the single most
important number here. Everything else is a consequence of that being true.

Operating point: `tPresent 0.20, tExtra 0.25, margin 0.15, stability 3,
smooth 5, window 0.8 s`. All figures below are 12 roots per cell, one close
left-hand voicing rooted in the C3 octave, unless stated.

### True accept: did the correct answer confirm?

| quality | clean | phone | phone +room12 | phone +room6 | phone +room6 +snr15 | phone +room0 +snr10 |
| --- | --- | --- | --- | --- | --- | --- |
| maj7 | 100.0% | 100.0% | 91.7% | 91.7% | 91.7% | 83.3% |
| 7 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| m7 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 91.7% |
| m7b5 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| dim7 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 91.7% |
| 6 | 100.0% | 100.0% | 100.0% | 91.7% | 91.7% | 91.7% |
| maj triad | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| min triad | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| dim triad | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| aug triad | 100.0% | 100.0% | 91.7% | 75.0% | 75.0% | 66.7% |
| shell 7 (R-3-7) | 100.0% | 100.0% | 91.7% | 83.3% | 83.3% | 75.0% |
| shell m7 | 100.0% | 100.0% | 91.7% | 91.7% | 91.7% | 75.0% |
| shell maj7 | 91.7% | 91.7% | 83.3% | 66.7% | 66.7% | 58.3% |

### False accept: did a wrong answer confirm?

Every cell here should read 0.0%. The first six rows are the confusions the brief
named. `st` is semitones from the root.

| played -> target | delta | clean | phone | phone +room12 | phone +room6 +snr15 | phone +room0 +snr10 |
| --- | --- | --- | --- | --- | --- | --- |
| m7 -> m7b5 | -6st +7st | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| m7b5 -> m7 | -7st +6st | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| maj7 -> 7 | -10st +11st | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 7 -> maj7 | -11st +10st | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| m7 -> 7 | -4st +3st | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 7 -> m7 | -3st +4st | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| maj triad -> maj7 | missing 11st | 0.0% | 0.0% | 0.0% | 0.0% | 8.3% |
| maj7 -> maj triad | extra 11st | 8.3% | 8.3% | 8.3% | 8.3% | 8.3% |
| min triad -> m7 | missing 10st | 0.0% | 0.0% | 0.0% | 8.3% | 16.7% |
| m7 -> min triad | extra 10st | 0.0% | 0.0% | 0.0% | 8.3% | 16.7% |
| dim triad -> dim7 | missing 9st | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| dim7 -> dim triad | extra 9st | 0.0% | 0.0% | 0.0% | 0.0% | 8.3% |
| **shell 7 -> 7** | **missing 5th** | **66.7%** | **66.7%** | **66.7%** | **75.0%** | **58.3%** |
| **shell m7 -> m7** | **missing 5th** | **25.0%** | **25.0%** | **58.3%** | **41.7%** | **41.7%** |
| **shell maj7 -> maj7** | **missing 5th** | **50.0%** | **58.3%** | **66.7%** | **41.7%** | **58.3%** |
| 7 -> shell 7 | extra 5th | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| m7 -> shell m7 | extra 5th | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| maj7 -> shell maj7 | extra 5th | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |

Full 13x13 played-versus-target cross matrix at `phone+room6+snr15`: off-diagonal
false accepts **25/1872 = 1.3%**, and 19 of those 25 are the three
fifth-omission cells. Wrong-ROOT false accepts (right quality, wrong root) are
**0/132 for maj7, 7, m7 and m7b5**, and 36/132 for dim7, all 36 of which are the
transposition-invariant chroma sets that must accept.

**The fifth cannot be verified as present or absent.** This is the sharpest
finding in the spike and it is physics, not tuning. The perfect fifth above the
root is the root's own 3rd partial, so a voicing that omits the fifth still shows
a fifth in the chromagram. Playing root-3rd-7th and being asked for the full
seventh chord gets credit 25% to 75% of the time. The reverse direction is clean
at 0.0%: an EXTRA fifth is always caught, because the shell target has the fifth
as unexpected and it is then genuinely strong. So the shell-voicing drill is safe
in the direction it actually asks (target = shell) and the full-chord drill
cannot notice a dropped fifth.

The other residual false accepts (8.3% to 16.7%) are all the same shape: a chord
whose 7th was played when a triad was asked for, or vice versa. The upper voice of
a close low voicing sits 6 to 12 dB below the bass in the chromagram, so "weakly
present expected note" and "faintly present unexpected note" are not separable by
one threshold. Bounding the decision window to 800 ms after onset cut this class
roughly in half, because the 7th is strongest immediately after the strike.

### Clean versus degraded, side by side

The headline pair, averaged over maj7, 7, m7, m7b5 and dim7 across all 12 roots,
with false accept over the twelve one-chroma-apart confusions:

| condition | true accept | false accept | median latency |
| --- | --- | --- | --- |
| clean render | 100.0% | 0.7% | 464 ms |
| phone highpass only | 100.0% | 0.7% | 464 ms |
| phone + pink noise at 20 dB SNR | 100.0% | 0.7% | 464 ms |
| phone + pink noise at 10 dB SNR | 98.3% | 0.7% | 464 ms |
| phone + room, DRR 12 dB (on the music desk) | 98.3% | 0.7% | 464 ms |
| phone + room, DRR 6 dB (a metre or two away) | 98.3% | 2.1% | 464 ms |
| phone + room DRR 6 + 15 dB SNR (realistic) | **98.3%** | **2.1%** | **464 ms** |
| phone + room DRR 6 + 10 dB SNR | 98.3% | 2.1% | 464 ms |
| phone + room, DRR 0 dB (across the room) | 93.3% | 4.2% | 464 ms |
| phone + room DRR 0 + 10 dB SNR | 93.3% | 5.6% | 464 ms |
| 4th-order 150 Hz highpass + room 6 + 15 dB | 98.3% | 3.5% | 464 ms |

**The clean-to-degraded delta is small: 100% to 98.3% true accept, 0.7% to 2.1%
false accept, no latency change.** That is the reassuring answer, and it is
reassuring specifically because the harmonic-sum design does not depend on the
fundamental. The phone's 100 Hz rolloff removes the fundamental of every bass
note below G2 and changes nothing, because the note is being found from its
partials.

Degradation only bites when the phone is far from the piano. At DRR 0 dB the
false-accept rate roughly triples. Practical instruction: put the phone on the
music desk, not on the sofa.

One honest caveat about how this number was obtained. This spike first modelled
the room with a Freeverb-style Schroeder network at 30% wet, and got 41% to 75%
true accept. That reverb's comb resonances colour the spectrum in a way a real
room does not, and it was flattening real partials. Replacing it with a
spectrally flat synthesised impulse response, which is the physically defensible
model, moved true accept to 98.3%. The Schroeder condition is still in the table
in `results.txt` as `phone+schroeder30+snr15` so the sensitivity is visible.
Interpretation: the detector is robust to noise and to bass rolloff, and
sensitive to strong spectral colouration. A real room and a real phone capsule
both colour the spectrum somewhat. **This is the number most likely to be
optimistic, and only the real piano in the real room settles it.**

### Latency

| condition | median | p90 |
| --- | --- | --- |
| clean | 464 ms | 464 ms |
| phone + room6 + snr15 | 464 ms | 511 ms |
| phone + room0 + snr10 | 464 ms | 604 ms |

Median latency is 464 ms in every single condition, because 464 ms **is the
floor**: 372 ms for the longest constant-Q kernel plus 2 hops of the 3-frame
stability requirement. It is not tunable without giving up frequency resolution,
and the resolution is what buys the 0.0% on G versus Gb. Distinguishing a
semitone at C3, where adjacent semitones are 7.8 Hz apart, needs roughly a third
of a second of signal. That is the trade and it is a fair one for this app: play
the chord, hold it, half a second later it confirms. It is not fast enough for
anything rhythmic.

Production latency will be higher, because these figures assume the onset time is
known exactly. Onset detection was not built and not measured.

### Octave and bass sensitivity

Chroma is octave-blind by construction, and that is confirmed: the same chroma
set played in different octaves scores against one target identically, so the
detector cannot tell a chord at C2 from the same chord at C4.

What the octave sweep also exposed is a **usable register**, measured at
`phone+room6+snr15`, 5 roots per cell:

| target | root at midi 36 (C2) | 48 (C3) | 60 (C4) | 72 (C5) | 79 (G5) |
| --- | --- | --- | --- | --- | --- |
| maj7 | 100.0% | 100.0% | 60.0% | 40.0% | 0.0% |
| 7 | 100.0% | 100.0% | 80.0% | 40.0% | 0.0% |
| m7 | 100.0% | 100.0% | 60.0% | 40.0% | 0.0% |
| m7b5 | 100.0% | 100.0% | 100.0% | 60.0% | 0.0% |

Reliable for roots in C2 to B3, degrading above middle C, useless above about G5.
Cause: the harmonic sum needs about three octaves of headroom above the
fundamental, and the 4.6 kHz anti-alias ceiling runs out. Raising the analysis
rate would push the ceiling up at proportional CPU cost. This is not a problem
for the app as it exists, because chord-symbol drills are left-hand voicings, but
it does mean a right-hand-register variant would need retuning.

Bass estimation, which is what the **inversion** drill needs
(`src/lib/drills/matchInversion.ts` grades on a required bass chroma):

| condition | bass chroma correct |
| --- | --- |
| clean | 96.9% |
| phone | 96.9% |
| phone + room6 | 91.7% |
| phone + room6 + snr15 | 88.5% |

Error breakdown at `phone+room6+snr15`: 82.8% exact including octave, 0% octave-up
errors, 1.0% octave-down, 16.1% a different chord tone reported as the lowest
note, 0% no estimate. The classic missing-fundamental octave error did **not**
show up, which is a genuine (mildly surprising) success of the harmonic-sum
design plus the sub-harmonic penalty. The failures are the detector picking a
different chord tone as the lowest note, not misjudging the octave.

End-to-end, grading exactly as `matchInversion` does (chroma set correct AND
bass chroma correct), 192 voicings across 4 qualities, 12 roots, 4 inversions:

| condition | correct inversion accepted | wrong inversion falsely accepted |
| --- | --- | --- |
| clean | 79.7% | 1.4% |
| phone + room6 + snr15 | 73.4% | 3.5% |

**That is not good enough to grade the inversion family.** Rejecting one in four
correct answers would make the drill feel broken, and the brief was right to
expect this to fail. It fails less badly than expected (the failure is
false-reject, not false-accept), but 73% is not a grader.

### dim7 symmetry

Confirmed as a collision, in both clean and degraded conditions: Cdim7 played
accepts against targets Cdim7, Ebdim7, Gbdim7 and Adim7, all four. The chroma
sets are literally identical, `{0,3,6,9}`. **This is not a mic regression.** The
app's existing `matchChord.ts` already grades by chroma-set equality and already
has exactly this collision for keyboard and MIDI input. The mic inherits it and
adds nothing.

### Sustain and pedal bleed

Fm7 struck, then the target chord struck 1.0 s later, analysis anchored to the
second onset, at `phone+room6+snr15`:

| previous chord still ringing at | new target accepted | OLD chord still accepted |
| --- | --- | --- |
| silence | 91.7% | 0.0% |
| -12 dB | 86.1% | 0.0% |
| -6 dB | 77.8% | 0.0% |
| 0 dB (sustain pedal down) | 44.4% | 0.0% |

Bleed costs recall, never precision. **The old chord was never falsely accepted,
in any of the 144 trials.** With the pedal down, more than half of correct
answers are rejected, because the previous chord's pitch classes are still
sitting in the chromagram as unexpected notes. Product consequence: the drill has
to tell him to lift the pedal, or wait out the decay, and a rejection during
ring-out needs to say so rather than say "wrong".

### The app's own audio output

The app plays chords through the speaker (`src/lib/audio/audio.ts`, with a sound
toggle and a study mode). At `phone+room6+snr15`:

| scenario | result |
| --- | --- |
| app plays the target, user plays nothing | **accepted 97.2%** (the app grades itself) |
| app plays the target, user plays a one-chroma-off chord | target accepted 13.9% (wrong answer credited) |
| unrelated app audio 20 dB below the piano, user plays correctly | still accepted 94.4% |

**Without gating, the feature is broken, not degraded.** A mic-input drill that
plays its own answer aloud will confirm itself 97% of the time with the user's
hands in his lap. Required gating, in order of preference: suppress all app
playback while the mic is listening (`releaseAll()` plus a listening flag that
makes `playChord` a no-op, which the module is already structured for via its
existing sound toggle); or require headphones; browser echo cancellation is not
an option since it must be off for the piano to survive. The third row is the
good news: 20 dB of leakage is tolerable, so a quiet UI click does not need
gating, only chord playback does.

### Single notes in sequence (the scale drill)

Eight notes of C major struck one at a time at 2 notes per second: **8 of 8**
became the top chroma inside their own window, clean and degraded alike. Positive
but weak evidence. It shows monophonic tracking is not the hard case; it does not
show that an ordered sequence grader works, and per-note onset segmentation was
not built. The scale drill needs its own spike.

## Which drill families could use mic input

**Yes, on these numbers:**

- **Chord construction** ("play the notes of Cm7"), the app's core value. 92% to
  100% true accept degraded, 0.0% false accept on every one-chroma substitution,
  464 ms. This is the case mic input was worth spiking for.
- **Shell voicing** in the direction the drill asks (target = shell). Adding the
  fifth is caught at 0.0%; 83% to 92% true accept degraded.

**No:**

- **Inversions.** 73.4% true accept degraded on the required bass. Bass chroma is
  88.5% accurate, which is not a grader. This is a real product limitation:
  the inversion family stays keyboard-only.
- **Full-chord targets where a dropped fifth matters.** A missing fifth is
  invisible because the fifth is the root's 3rd partial. If the app wants to
  insist on the fifth, only the keyboard can enforce it.

**Not applicable:**

- **Name-it** is multiple choice, not played.

**Unknown, needs its own work:**

- **Scale drill.** Encouraging monophonic result, no sequence grader built.
- **Progressions.** Chord-to-chord works only if the pedal is up; see the bleed
  table.

## Limitations

What was verified in an offline render, and what genuinely needs the real piano.

Verified offline, and therefore trustworthy only to the extent the model is:

1. Signal is repitched Salamander samples, one velocity layer. A real acoustic
   piano adds **sympathetic resonance** between undamped strings, key and action
   noise, and per-note velocity variation. Sympathetic resonance in particular
   adds energy at pitch classes nobody played and is not modelled at all. This is
   the most likely source of real-world false rejects.
2. The room is a synthesised impulse response, not a measured one. See the
   Schroeder-versus-IR paragraph above: this single choice moved true accept by
   more than 20 points, so it is the most load-bearing assumption in the spike.
3. Noise is pink and stationary. Real room noise is a fridge, traffic, a
   fan, and none of it is stationary.
4. The phone is modelled as a highpass. Not modelled: the handset's actual
   frequency response, its limiter, AGC if it cannot be disabled, and iOS voice
   processing, which on some iOS versions is applied regardless of the
   `echoCancellation: false` constraint. **If iOS refuses raw capture, every
   number in this document is void.** That is a single yes/no question that only
   the device answers.
5. Onset time is known exactly (t = 0). Production needs onset detection, which
   was neither built nor measured, and it will add latency and its own errors.
6. One voicing shape per quality: close, root position, rooted in the C3 octave,
   plus the three shells. Wide voicings, rootless voicings, tenths and drop-2
   were not tested.
7. Thresholds were selected on the same 12-root grid they are reported on. The
   full sweep is published so the sensitivity is visible (true accept moves
   between 85% and 100% over the plausible region, false accept between 0.5% and
   3%), but these are not held-out numbers.

Needs his actual piano and actual room, and cannot be settled here:

- Whether iOS grants unprocessed microphone capture at all.
- Whether his piano's tuning and stretch keep partials inside the ±1 bin
  tolerance the detector allows.
- How much sympathetic resonance an undamped real piano adds.
- Whether his playing dynamics keep the 7th audible; a softly voiced 7th is the
  first thing to disappear.
- Whether 464 ms feels immediate or laggy to him.

`index.html` exists precisely so those five questions can be answered in ten
minutes at the piano.

## Recommended Production Shape

If this ships:

- **A verifier, not an input device.** The mic cannot independently produce a
  chroma set, so it does NOT slot into `matchChord.ts` as a note-set producer the
  way the keyboard and the abandoned MIDI adapter would have. It needs the target
  to decide. The seam is a service, roughly
  `verifyTargetChroma(target: Set<number>): Promise<{accepted, latencyMs, chroma}>`,
  sitting beside `matchChord` rather than feeding it. Grading stays chroma-only,
  so the D-01/D-02 invariant is preserved.
- **Capture** via `AudioWorklet` (the spike page uses an `AnalyserNode` with
  `fftSize` 32768, which is fine for a demo but couples the window to the FFT
  size). Constraints `echoCancellation: false, noiseSuppression: false,
  autoGainControl: false, channelCount: 1`, and feature-detect: if the platform
  will not honour them, do not offer the feature.
- **Cost** is trivial: about 112k multiply-accumulates per frame at 21 frames per
  second, roughly 2.4 MMAC/s, with precomputed kernels. No model, no wasm, no
  network. Bundle impact is a few kB of arithmetic.
- **Gate app audio while listening.** Non-negotiable, see the 97.2%.
- **Show the chromagram.** At 92% to 100% true accept, roughly one correct answer
  in twenty gets rejected, and a black-box "wrong" on a right answer is
  infuriating. The spike page's "missing G" / "extra Bb" wording plus the live
  bars makes a rejection legible and teaches something even when it misfires.
- **Keep the on-screen keyboard as the authoritative input.** Mic is an
  alternative for the chord-construction and shell families, never the only path,
  and never for inversions.
- **Tell him to lift the pedal**, and phrase a ring-out rejection as ring-out.

Next step, before any production work: open `index.html` on the phone at the
piano and answer the five real-room questions above. Specifically check that
`m7` versus `m7b5` still separates cleanly on his instrument, since that is the
whole basis of the go verdict, and watch whether pedal-up sympathetic resonance
lights up chroma bins nobody played.
