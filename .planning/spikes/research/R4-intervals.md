# R4: Intervals Everywhere + Interval Recognition Drill

Research for spike track 004 (intervals). Locked decision: interval labels/colors surfaced in lookup, drills, and scale/key exploration (tap a key: hear it AND see its interval from the root), plus a dedicated interval recognition drill.

Repo state read on 2026-07-14 at main (49b76a7).

---

## 0. Ground truth: what the codebase already has

| Piece | File | State |
|---|---|---|
| `IntervalRole` type | `src/lib/theory/types.ts:8` | `'root' \| 'third' \| 'fifth' \| 'seventh'` only. This union IS the color key for the whole pipeline. |
| Role assignment | `src/lib/theory/chord.ts` `roleForDegree()` | Maps tonal interval degree 1/3/5/7 to roles; any other degree silently falls back to `'root'` (documented as a v1-only shortcut). |
| Interval labels | `src/lib/lookup/chordPresentation.ts` `formulaFor()` | Already computes quality-first shorthand per chord tone via `Interval.distance`: root shown as `R`, others as `m3`, `M3`, `P5`, `d5`, `m7`, `M7`, `d7`. Used on lookup page AND drills wrong-answer reveal. |
| Interval chips | `src/lib/components/IntervalChip.svelte` | Mono tag filled with the role color token. Only 4 modifier classes (root/third/fifth/seventh). |
| Keyboard | `src/lib/components/PianoKeyboard.svelte` | Two mutually exclusive behaviors today: display-only (default) and `interactive` (drill answering: tap toggles selection). Press cue + haptic already exist, gated behind `interactive`. Keys know their letter and (for black keys) both enharmonic spellings. |
| Layout math | `src/lib/components/keyboardLayout.ts` | Pure, chroma-aware note-to-key assignment. Key position encodes octave (7 white keys per octave). |
| Drill machinery | `src/lib/drills/generateQuestion.ts`, `matchChord.ts` | `DrillQuestion` is chord-only (`construction \| identification`). Grading is chroma-set equality. Identification flow already proves the "tap a choice = complete answer" pattern. |
| Audio | `src/lib/audio/playChord.ts` | Lazy `Tone.PolySynth`, `playChord(letters)` with ascending-octave voicing. No single-note entry point yet (trivial to add). |
| Persistence | `src/lib/api/progress.ts` | `AnswerEvent.kind: 'chord' \| 'scale'`. Needs `'interval'` added for the new drill. |
| Color tokens | `src/app.css` | Fixed interval language (DESIGN-02): root `#c8502e` vermilion, third `#3e7d6b` verdigris, fifth `#a89a7f` tan, seventh `#f0c948` mustard, plus `--color-on-*` text pairs and wrong grays. No tokens for 2nds/4ths/6ths/9ths. |
| Design contract | `.claude/skills/sketch-findings-music-learn/SKILL.md` | Interval colors reserved for revealed/correct notes; ink-hatch = selected/pending; everything must survive the one-octave phone keyboard; no em dashes in copy. |
| Scale surface | none | No `Scale` usage anywhere in `src/` yet. Scales arrive in another track; this research defines what they inherit. |

Verified against installed tonal (6.x): `Interval.distance('C','Eb')` returns `"3m"`, `Interval.get('3m')` returns `{ num: 3, q: 'm', semitones: 3, ... }`, `Interval.distance('C','F#')` returns `"4A"`, `Note.transpose('C','3m')` returns `"Eb"`. Pitch-class inputs always yield ascending simple intervals, which is exactly the drill semantics we want.

Recurring wart worth fixing while here: `toAsciiAccidentals()` is copy-pasted in 4+ files (`chordPresentation.ts`, `matchChord.ts`, `keyboardLayout.ts`, `drills/+page.svelte`, `playChord.ts` has its own variant). The new interval module should export it once and callers should migrate opportunistically.

---

## 1. Interval naming convention

### Recommendation: shorthand primary, French long name secondary

Mirror the note-naming pattern the app already teaches with (`NoteLabel.svelte`: letter bold primary, French solfège small mono secondary):

- **Primary (chips, registers, choice buttons): quality-first shorthand** in mono: `R`, `m3`, `M3`, `P4`, `A4`, `P5`, `d5`, `m7`, `M7`, `d7`. This is what `formulaFor()` already renders, what jazz literature and lead-sheet annotations use, and it is compact enough for a 12px chip and a phone-width choice grid.
- **Secondary (readouts, choice button sublabels, aria-labels): French long name**: `tierce mineure`, `quinte juste`, `septieme mineure` (with proper accents in actual copy: `septième mineure`). The user is a French classical pianist; these are the names from conservatory solfège training and the strongest memory hook available.

Rejected alternatives:
- `3m` (tonal's native order): reads as "3 minor", unnatural in both English and French; also `formulaFor()` already flips it, so quality-first is the established app convention.
- English long names ("minor 3rd"): no advantage over shorthand for this user, and doubles copy length.
- French-first everywhere: French long names are too long for chips and choice buttons ("quarte augmentée" is 16 chars); French belongs in the secondary slot, same as solfège does today.

### French name table (v1 space)

| Short | Semitones | French |
|---|---|---|
| R (1P) | 0 | fondamentale (in chord context) / unisson (in interval drill) |
| m2 | 1 | seconde mineure |
| M2 | 2 | seconde majeure |
| m3 | 3 | tierce mineure |
| M3 | 4 | tierce majeure |
| P4 | 5 | quarte juste |
| A4 | 6 | quarte augmentée (le triton) |
| d5 | 6 | quinte diminuée (le triton) |
| P5 | 7 | quinte juste |
| A5 | 8 | quinte augmentée |
| m6 | 8 | sixte mineure |
| M6 | 9 | sixte majeure |
| d7 | 9 | septième diminuée |
| m7 | 10 | septième mineure |
| M7 | 11 | septième majeure |
| P8 | 12 | octave juste |
| m9/M9 | 13/14 | neuvième mineure/majeure |

Gender note for generated copy: interval nouns are feminine (seconde, tierce, quarte, quinte, sixte, septième, octave, neuvième) so qualities agree as mineure/majeure/juste/augmentée/diminuée; the two exceptions are masculine `unisson` and `triton` (unisson juste, unisson augmenté). Bake agreement into the lookup table rather than string concatenation.

Copy rule reminder: no em dashes anywhere. Use periods, colons, commas, or the middle dot the score register already uses (`0 RIGHT · 0 STREAK`).

---

## 2. Surfacing plan per surface

### 2a. Lookup page (`src/routes/+page.svelte`)

The interval formula readout already exists (`data-testid="interval-formula"`): one column per chord tone with IntervalChip + letter + solfège. Extend, do not redesign:

1. **Add the French long name to each chip's `title` and `aria-label`** (`IntervalChip` gains an optional `longName` prop). Zero visual change, hover/screen-reader gain.
2. **Make the keyboard inspectable** (see 2b). Tapping a highlighted key plays that note and updates a one-line **interval register** placed between the keyboard and the formula row, mono uppercase in the Print Shop status-register style:

   `E♭ · Mi♭ · m3 · tierce mineure · 3 demi-tons`

   The register is empty (or shows `Tap a key to inspect it.`) until first tap. One line, no layout jump: reserve its height.
3. **Make each formula column a tap target** that does the same thing as tapping the key (plays note, fills register, briefly pulses the matching key with the existing press cue). This unifies "the chip row" and "the keyboard" into one interactive explanation instead of two parallel readouts.

That is the whole lookup change. The formula columns do NOT grow a fourth line of French text; long names live in the register and tooltips to keep the row calm.

### 2b. Keyboard tap-to-inspect mode (`PianoKeyboard.svelte`)

**New prop `inspectable?: boolean`, mutually exclusive with `interactive`** (same pattern as `interactive` and `wrongLetters`: omitted props keep the display-only render byte-identical, which is the component's established compatibility contract).

Behavior when `inspectable`:
- Keys get `role="button"`, tabindex, pointer handlers, and the existing press cue + haptic (reuse `handlePointerDown`; lift its `interactive` gate to `interactive || inspectable`).
- Tap fires `onInspect(payload)` where payload is `{ letter, solfege, octave, role?: IntervalRole, inChord: boolean }`:
  - Highlighted key: use its assigned `SpelledNote` (correct enharmonic spelling and role).
  - Unhighlighted key: white keys report their natural letter; black keys report the enharmonic spelling that yields the simpler interval from the current root (helper `intervalFromRoot`, section 5, picks between `sharpLetter`/`flatLetter`).
- No persistent selected state: inspect is transient (press cue only). Ink-hatch stays reserved for drill pending-selection, interval colors stay reserved for revealed/correct notes. No new key treatment is introduced, which keeps the Sketch 001 feedback grammar intact.
- Octave for playback comes from key position: `octave = 4 + floor(whiteIndex / 7)` (black keys via `afterWhiteIndex`). Add `playNote(pitch: string)` next to `playChord` in `src/lib/audio/playChord.ts`, sharing the lazy synth. Tap handlers are user gestures, so `Tone.start()` is satisfied.

**Mode conflict analysis:** drills pass `interactive` (answer mode) or nothing (reveal mode). Lookup and future scale pages pass `inspectable`. The two flags never coexist on the same instance; assert-and-prefer-`interactive` if both are ever passed. One deliberate crossover: on the drills wrong-answer reveal, the reveal keyboard switches from display-only to `inspectable` (see 2c), which is safe because `interactive` is already false there.

### 2c. Drills feedback (`src/routes/drills/+page.svelte`)

The wrong-answer reveal already shows the merged feedback keyboard plus the interval formula chips with letter and solfège. Additions, in priority order, all clutter-free:

1. **Make the reveal keyboard `inspectable`.** After grading, tapping any interval-colored key plays it and shows the register line (same component as lookup). This converts the "study the reveal" moment into active exploration with zero new static UI. Currently the reveal keyboard is display-only (`interactive={false}` via `showConstructionReveal`), so this is purely additive.
2. **French long name on chips** via the same `longName` tooltip/aria prop as lookup.
3. Nothing else. Do not add a fourth text row to the formula columns and do not add a legend entry; the existing legend (chord color vs wrong gray) is already at the density ceiling for one-octave phone width.

### 2d. Scale/key exploration (future track, contract only)

No scale surface exists yet. What this track must leave behind so scales get intervals for free: extended `IntervalRole` (section 4) so a 7-degree scale renders as `SpelledNote[]` with per-degree roles through the existing keyboard/chip pipeline, plus `inspectable` + `intervalFromRoot` so "tap a scale degree: hear it, see `M6 · sixte majeure`" needs no new machinery.

---

## 3. Interval recognition drill

### Recommended v1 question types (both; each reuses a proven flow)

**Type A: interval identification.** Two notes highlighted on the keyboard (root filled with `--color-root`, target filled with its degree-class color, both labeled with NoteLabel). Prompt: `Name this interval.` Four choice buttons, each showing shorthand primary and French secondary, e.g. button content `m3` over `tierce mineure`. Tapping a choice is the complete answer (exactly the existing identification flow: `selectChoice`, `answered`, feedback block, Next).

**Type B: interval construction.** Root highlighted on the keyboard (vermilion, NoteLabel). Prompt: `Tap a m3 above C. Tierce mineure.` Keyboard is `interactive`; the FIRST tap is graded immediately (no Check button: single-note answers do not need chord assembly, mirroring identification's tap-is-answer rule D-05). Correct: target key stamps in its degree color. Wrong: tapped key goes wrong-gray with ✕, correct key stamps in color, register line shows what the tapped note actually was: `You tapped E · M3 · tierce majeure.`

Both types grade by chroma arithmetic, octave-agnostic like `matchChord`:

```
correct = (tappedChroma - rootChroma + 12) % 12 === question.semitones
```

Enharmonic answers are accepted by construction (chroma-level), consistent with D-01/D-02. A4 and d5 are the one ambiguous pair (6 semitones); in Type A, never offer both as choices in the same question.

**Audio-first (hear two notes, name the interval): defer.** It needs the sampled-piano track (002) landed, sequenced playback, and replay controls. Design the question union so `kind: 'interval-ear'` can slot in later without schema change.

### Question generation

New module `src/lib/drills/generateIntervalQuestion.ts` following `generateQuestion.ts` patterns (pure, `Math.random`, bounded):

- Root drawn from the proven `ROOTS` matrix (`src/lib/theory/randomChord.ts`).
- Interval drawn from a fixed v1 pool: `m2 M2 m3 M3 P4 A4 P5 m6 M6 m7 M7 P8` (the chord-tone intervals plus their neighbors; matches what the chord drills implicitly teach).
- Target letter via `Note.transpose(rootAscii, tonalName)`; if the spelled target falls off the one-octave C-to-C span, the keyboard's existing wrap-around (D-02, `assignNotesToKeys`) already handles display, and grading is chroma-based anyway.
- Type A distractors: prefer near-misses (same degree different quality: m3 vs M3; then adjacent degree same quality), exclude enharmonic equivalents of the answer (A4 vs d5), exactly like `pickDistractors`' near-miss-first policy.

### Integration into the drill page

`DrillQuestion` becomes a discriminated union:

```ts
type DrillQuestion = ChordQuestion | IntervalQuestion;
interface IntervalQuestion {
  kind: 'interval-identification' | 'interval-construction';
  root: string;            // display glyphs, e.g. "F♯"
  interval: IntervalInfo;  // section 5
  choices?: string[];      // shorthand names, Type A only
}
```

Deck mixing: keep ONE drills page (the score register, stamp beat, layouts, and landscape grid all carry over). Add a mono mode row above the card: `CHORDS · INTERVALS · MIX` (default MIX). `generateQuestion(mode)` draws chord questions, interval questions, or interleaves. This satisfies "dedicated interval recognition drill" (INTERVALS mode) without forking the page. The template gains two `{#if}` branches beside the existing construction/identification ones; feedback reuses the same feedback block with an interval-specific reveal (register line + colored keys) instead of the chord formula row.

Persistence: extend `AnswerEvent.kind` union in `src/lib/api/progress.ts` with `'interval'`; `item` is the shorthand name (`"m3"`), so the progress page's weakest-items view aggregates per interval class for free. Backend must tolerate the new kind (same track as the Phase 8 docker compose backend; check the server-side enum).

---

## 4. Interval color tokens

Current DESIGN-02 language is fixed and reserved: root vermilion, third verdigris, fifth tan, seventh mustard. 2nds/4ths/6ths have nothing, which blocks both scale rendering and interval drills for non-chord-tone intervals.

**Proposal: extend the language with three new degree-class inks, keeping the degree-class rule: an interval's color follows its simple degree, and compound extensions map down (9 shares 2, 11 shares 4, 13 shares 6, alterations keep their degree's color).** This caps the language at 7 colors forever and matches how jazz theory names extensions.

Print Shop palette additions (letterpress ink feel: desaturated, ink-compatible, distinct from the existing four and from the wrong grays at one-octave phone size):

```css
/* Interval color language extension (degree classes 2/4/6; 9/11/13 map down) */
--color-second: #5b7a8c;   /* slate blue: cool, recedes next to verdigris */
--color-fourth: #7d5a72;   /* plum: clearly separate from vermilion and tan */
--color-sixth: #6b7135;    /* olive: earthy sibling of mustard without competing */

--color-on-second: #ffffff;
--color-on-fourth: #ffffff;
--color-on-sixth: #ffffff;
```

Rationale per pairing: seconds sit next to roots on the keyboard, so slate-vs-vermilion is a strong adjacent contrast; fourths sit between thirds and fifths, plum separates from both verdigris and tan; sixths sit between fifths and sevenths, olive reads apart from both tan and mustard. All three hold the 2px ink border and white label text (each is dark enough for the `--color-on-*` white-text rule that vermilion and verdigris follow). Verify exact hexes against paper `#f2ecdd` in the browser before locking; treat the values above as starting points inside the locked palette temperature, and confirm the wrong-gray `#b8b0a0` still reads as "not a color" beside them.

Type plumbing: extend `IntervalRole` to `'root' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | 'seventh'`, extend `roleForDegree()` in `chord.ts` (2,9 to second; 4,11 to fourth; 6,13 to sixth) replacing the silent fall-back-to-root, add the three modifier classes to `IntervalChip.svelte` and `PianoKeyboard.svelte`. This one union extension lights up chips, keyboard fills, and future sus/6/9 chords and scales simultaneously, because every consumer already switches on `IntervalRole`.

---

## 5. Data/code contract: interval helper API

New pure module `src/lib/theory/interval.ts` (same purity rules as the rest of `src/lib/theory`: no DOM, no audio, no Svelte). Built on tonal `Interval` + `Note` (verified shapes against installed tonal 6.x).

```ts
import { Interval, Note } from 'tonal';
import type { IntervalRole } from './types';

/** One interval, fully named for every UI surface. */
export interface IntervalInfo {
  /** Quality-first shorthand, the app's primary label: "m3", "P5", "A4". */
  short: string;
  /** French long name, the secondary label: "tierce mineure". Correct gender agreement baked in. */
  long: string;
  /** Simple degree number 1..8 (compounds report their compound number in `degree`, simple class in `role`). */
  degree: number;
  /** Tonal quality letter: P | M | m | A | d (dd/AA possible for exotic spellings). */
  quality: string;
  /** Semitone count, 0..12 for simple intervals (pitch-class inputs are always simple ascending). */
  semitones: number;
  /** Degree-class color key: maps straight onto IntervalChip / keyboard fills. 9->second, 11->fourth, 13->sixth. */
  role: IntervalRole;
  /** Tonal's native name ("3m"), kept for round-tripping into Note.transpose. */
  tonalName: string;
}

/** Shared glyph-to-ASCII normalization, exported to retire the 4+ private copies across the codebase. */
export function toAsciiAccidentals(letter: string): string;

/**
 * Ascending interval from noteA to noteB, pitch-class based (octave-agnostic,
 * matching matchChord's chroma semantics). Accepts display glyphs or ASCII.
 * Total: unparseable input returns a recognizable empty IntervalInfo rather than throwing.
 */
export function intervalBetween(noteA: string, noteB: string): IntervalInfo;

/**
 * Interval from a root to a keyboard key. Strings resolve like intervalBetween;
 * a black-key pair picks whichever enharmonic spelling yields the simpler
 * quality from this root (prefer P/M/m over A/d, then smaller |alt|), so
 * tapping the F#/Gb key over a C root reads "A4, quarte augmentee" not "d5"
 * picked arbitrarily. Feeds PianoKeyboard's inspect mode.
 */
export function intervalFromRoot(
  root: string,
  key: string | { sharpLetter: string; flatLetter: string }
): IntervalInfo;

/** Spelled target for drill generation: transposeFrom("C", "m3") returns "E♭" (display glyphs). */
export function transposeFrom(root: string, short: string): string;

/** The v1 interval-drill pool, exported so generateIntervalQuestion and tests share one list. */
export const DRILL_INTERVALS: readonly string[]; // ["m2","M2","m3","M3","P4","A4","P5","m6","M6","m7","M7","P8"]
```

Implementation notes:
- `intervalBetween` = `Interval.get(Interval.distance(asciiA, asciiB))`, then flip tonal's `"3m"` to `"m3"` (the exact transform `formulaFor()` already does), look up French via the gender-correct table from section 1, and map degree to role.
- `formulaFor()` in `chordPresentation.ts` should be refactored onto `intervalBetween` so the lookup formula, drill feedback, inspect register, and interval drill all share one naming source. Its regex flip and private `toAsciiAccidentals` both disappear.
- `transposeFrom` = `Note.transpose(ascii(root), toTonalName(short))` + glyph restore; verified `Note.transpose('C','3m') === 'Eb'`, `Note.transpose('F#','5P') === 'C#'`.
- Grading helper for Type B can live in `generateIntervalQuestion.ts` as pure chroma math; no new matcher module needed.

---

## 6. Suggested build order for track 004

1. `src/lib/theory/interval.ts` + tests (naming table incl. French gender, intervalBetween, intervalFromRoot enharmonic pick, transposeFrom). Pure, TDD-friendly, unblocks everything.
2. Extend `IntervalRole` + `roleForDegree` + 3 color tokens + `IntervalChip`/`PianoKeyboard` modifiers + `--color-on-*` pairs.
3. Refactor `formulaFor` onto the new module (behavior-identical for the v1 chord space; existing tests must pass unchanged).
4. `playNote` in `playChord.ts`; `inspectable` mode + `onInspect` in `PianoKeyboard` (gated prop, display render byte-identical when omitted).
5. Lookup page: inspect register + tappable formula columns + chip tooltips.
6. Drills reveal keyboard becomes inspectable.
7. `generateIntervalQuestion.ts` + drill page union branches + mode row + `AnswerEvent.kind: 'interval'`.
8. Browser verification at 390px portrait and 844x390 landscape (one-octave survival rule applies to the two-note identification highlight and the register line).
