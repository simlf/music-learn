---
spike: 009
name: recall-modes
type: build
validates: >
  Given one target fact (e.g. the chord Cm7), when the user is drilled across
  rotating modes (A recognition->production: see the symbol, play the notes;
  B audiation->naming: hear the chord, name it from choices; C formula->build:
  given "minor 7th: 1 b3 5 b7", build it; optional D notes->symbol: see spelled
  notes, pick the symbol), then the same fact is retrieved via different cues
  and the rotation feels like it deepens memory rather than gaming one pattern.
verdict: validated-with-caveats
related: [006]
tags: [learning, memory]
---

# Spike 009 — Multi-modal recall

## What This Validates

The app today mostly drills one direction: chord symbol -> notes (construction)
plus its mirror (identification). This spike tests the learning-science claim
that encoding one fact through several retrieval routes builds more independent
recall paths to it than hammering a single route. It drills the SAME four facts
(one per seventh-chord family: `Cm7`, `Fmaj7`, `G7`, `Bm7b5`) from four angles:

- **Mode A — recognition -> production.** See `Cm7`, play the notes on a
  one-octave keyboard. (visual symbol -> motor/spatial. The app's main path.)
- **Mode B — audiation -> naming.** Hear the chord, name it from 4 choices.
  (auditory -> verbal. The risky one.)
- **Mode C — formula -> build.** Given "minor 7th: 1 ♭3 5 ♭7" and a root, build
  it. (analytic/verbal -> motor. Encodes the construction rule, not the glyph.)
- **Mode D — notes -> naming.** See spelled notes `C E♭ G B♭`, pick the symbol.
  (spatial/visual -> verbal. The reverse of A.)

A live **recall map** (fact x mode grid) fills in as you answer, so the "one
fact, many paths" idea is visible: a fully-drilled fact lights its whole row.

## Research

Learning-science basis (grounded in the project's own `R3-learning.md`, which
already argues for multisensory encoding on answer reveal):

- **Dual coding (Paivio).** Verbal, auditory, and visual/spatial codes are
  stored partly independently; a fact encoded in several codes has more
  redundant retrieval routes. Modes A/C (spatial+motor), B (auditory), and D
  (visual notation) deliberately spread the same fact across codes.
- **Encoding variability / multiple retrieval cues.** Memory strength is
  cue-dependent. Varying the study context and the cue attaches the target to
  more distinct cues, so more real-world situations can trigger recall. Drilling
  `Cm7` only as "symbol -> notes" builds exactly one cue; a musician meets the
  fact as a sound, a fingering, and a formula too.
- **Transfer-appropriate processing.** Retrieval is best when practice
  processing matches the test. The real "test" for this user is multi-form: read
  a chart (D-ish / A), hear a change and match it (B), reason from a formula when
  stuck (C). Practicing all forms is what the eventual use demands.
- **Interleaving + desirable difficulty.** Mixing modes (and facts) is harder in
  the moment and feels less fluent, but interleaved practice out-performs blocked
  practice for retention and discrimination (R3-learning cites PMC4989027). Mode
  rotation is a built-in interleave.
- **Expertise-reversal / fading scaffolds.** Mode C is essentially a worked-
  example cue; high guidance helps novices and should fade as accuracy grows
  (R3-learning section 1). So rotation weighting should shift over time, not stay
  uniform.

`tonal@6.4.3` supplies everything each mode needs (verified in node, see trail):

- `Chord.get("Cm7").notes` -> `['C','Eb','G','Bb']`, `.intervals` ->
  `['1P','3m','5P','7m']` (Mode A grading + Mode C formula + Mode D prompt).
- `.aliases` -> `['m7','min7','mi7','-7']` (available for alias-tolerant naming).
- `Note.chroma` / `Note.freq` for octave-free grading and chord audio.
- **Caveat found:** `Chord.detect(['C','Eb','G','Bb'])` returns
  `['Cm7','Eb6/C']`, and `['C','Eb','Gb','Bb']` returns `['Cm7b5','Ebm6/C']` —
  inversion/enharmonic alternates leak in. So Mode B/D naming must be
  **multiple-choice against the canonical target symbol**, never free-text
  graded through `detect`. This is why both naming modes use fixed choices.

## How to Run

Self-contained single file, `tonal` loaded from esm.sh (needs network on first
load), chord audio via raw WebAudio (no build, no deps to install).

Option 1 (preview config, already added):

```
# launch.json has a "spike009" entry serving this dir on :4809
```

Option 2 (any static server):

```
cd .planning/spikes/009-recall-modes
python3 -m http.server 4809
# open http://localhost:4809/index.html in a Chrome-family browser
```

Click a key to select/hear it; **Check** grades a build; naming modes auto-play
and grade on choice click. Toggle **Rotate per fact** vs **Lock to one mode** at
the top to feel the difference between multi-modal and single-mode drilling.

## What to Expect

- Fact 1 (`Cm7`) is presented four times in a row, once per mode, then the drill
  moves to Fact 2 (`Fmaj7`), etc. The recall map row for a fact fills L-to-R.
- Build modes (A, C) stamp interval colors on the correct keys on reveal (root
  vermilion, third verdigris, fifth tan, seventh mustard) and gray-out wrong
  extras — the Print Shop feedback grammar from sketch 001.
- Naming modes (B, D) mark the correct choice green and your wrong pick, if any.
- Every reveal plays the chord (multisensory encoding on feedback, per R3).
- Switching to **Lock to one mode** drills one route across all facts, so you
  can directly compare the felt monotony against the rotation.

## Investigation Trail

1. Read app conventions: `audio.ts` (synth-first gesture-safe engine, ascending
   voicing, chroma-based thinking), `chord.ts` (`spellChord` -> roles via
   `(deg-1)%7+1`, glyph normalization), `generateQuestion.ts` (same-root
   distractor rule from sketch 002: identification options share the root so the
   user must read *quality*, not match a visible root), and `R3-learning.md`
   (multisensory-reveal rationale, interleaving, fading scaffolds).
2. Verified `tonal` in node for all four facts: notes, intervals, formula text
   (`1 ♭3 5 ♭7` etc.), interval->role mapping, and same-root 4-choice sets all
   correct. Found the `Chord.detect` inversion-leak caveat -> forced MC naming.
3. Built the single-file demo reusing app grammar: chroma-set grading (octave/
   inversion/order-agnostic, matching `matchChord`), same-root quality choices
   (matching `pickDistractors`), interval-color reveal (matching sketch 001).
4. Exercised it in a real browser (preview server :4809), beyond happy path:
   - Mode A correct build -> ✓, interval colors on pc 0/3/7/10, score +1.
   - Mode B **wrong** pick -> correct green + pick red, answer revealed.
   - Mode C formula build correct; Mode D notes->name correct.
   - After Mode D, drill advanced Fact 1 -> Fact 2 at Mode A (rotation wraps).
   - Recall map row for `Cm7` read ✓ ✗ ✓ ✓ — paths tracked per mode.
   - Lock-mode toggle revealed the picker and locked to Mode B naming.
   - Console: no errors.

## Results

**Verdict: VALIDATED, with caveats.** Rotating the same fact through recognition,
audiation, formula, and notation cues is buildable on the current stack with no
new dependencies, and the recall map makes the "multiple paths to one fact"
premise legible and motivating rather than abstract. The four modes reuse
machinery the app already has (chroma grading, same-root distractors, interval-
color reveal), so this is a scheduler/rotation feature, not a rebuild.

Which modes earn their keep:

- **Mode A (recognition -> production): core. Keep as the spine.** It is the
  product's stated core value and the transfer task.
- **Mode C (formula -> build): earns its keep, but as a scaffold, not a peer.**
  It teaches the *construction rule* ("minor 7th = 1 ♭3 5 ♭7") that generalizes
  across all twelve roots, which is exactly the "construct don't memorize" thesis
  of spike 007. It should appear early for a new chord type and fade as accuracy
  grows (expertise reversal). Left on at full weight forever it becomes a
  gimmick — a fluent user doesn't need the formula spelled out.
- **Mode D (notes -> symbol): earns its keep cheaply.** It is the literal reverse
  of A and the closest thing to reading a chart's spelled voicing, and it reuses
  Mode B's whole apparatus. Low cost, real distinct cue. Keep.
- **Mode B (audiation -> naming): the risky one — keep, but demote and constrain.**
  Naming a chord by ear is genuinely hard at beginner level. Two honesty
  measures were forced during the build: (1) multiple-choice, never free-text
  (also required by the `detect` caveat), and (2) **same-root** choices, so the
  user names the *quality by ear* rather than also having to identify the root by
  ear — a much fairer beginner task. Even so, without the sound this collapses to
  a coin-flip among four qualities. Verdict: valuable as an ear-seeding /
  reward-flavored cue paired with the always-on reveal sound, but it should NOT
  gate progress and should carry the lowest rotation weight until the user has
  clearly mastered a chord's other modes. Treat it as ear-training on-ramp, not a
  fluency test.

Rotation strategy recommendation:

- **Rotate per FACT, not per session.** Per-fact rotation (A->B->C->D on `Cm7`,
  then move on) is the design that makes multi-modal encoding felt and keeps the
  interleaving benefit; a per-session single mode is just the current app. The
  demo confirms per-fact rotation reads clearly and the recall map reinforces it.
- **But do not rotate all four uniformly.** Weight by mode role and by the
  fact's maturity: a *new* chord type leads with C (formula scaffold) + A, adds D
  as it firms up, and only sprinkles B once A/C/D are solid. A *mature* fact
  drops C entirely and rotates A/D with occasional B for maintenance and ear
  seeding. This is fading scaffolds expressed as a rotation schedule.
- **Don't drill every mode of every fact every session** — that quadruples
  session length. Pick 1-2 modes per fact per encounter, chosen to cover the
  fact's weakest paths over time (see SRS note).

How this combines with the SRS scheduler (spike 006 / ts-fsrs, R3 section 6):

- **The scheduling unit should be per (fact, mode), not per fact.** Each cell of
  the recall map is its own retrieval event with its own strength. That is the
  natural FSRS card granularity: `Cm7|A`, `Cm7|B`, `Cm7|C`, `Cm7|D` are four
  cards that share a fact. This is exactly the multi-cue premise in data form.
- **Introduce a fact's modes staggered, not all at once**, so FSRS isn't handed
  four brand-new cards simultaneously (overwhelm + expertise-reversal). Graduate
  A/C first; unlock D, then B, as the earlier cards mature — mirroring
  R3-learning's scaffold-graduation ladder.
- **Grade with the fluency signal, not just pass/fail.** Reuse R3 mechanic #2
  (record `elapsedMs`): map wrong -> Again, slow-correct -> Hard, correct ->
  Good, fast-correct -> Easy. A fast-correct on Mode A but a slow, guessy Mode B
  correctly produces different due-dates per cue — the scheduler then naturally
  surfaces the weak *path*, which is the whole point of multi-modal drilling.
- **Cross-mode priming is a real risk to watch:** answering `Cm7` via Mode A
  seconds before its Mode B card means the Mode B "recall" is partly working
  memory, not long-term retrieval. Space a fact's modes apart within/across
  sessions (delayed-retry style, R3 mechanic #5) rather than back-to-back, EXCEPT
  during the deliberate first-encounter teaching pass where back-to-back
  multi-modal exposure is the point. So: per-fact rotation for *teaching* a new
  chord; per-mode-spaced FSRS scheduling for *reviewing* known ones.
