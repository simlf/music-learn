---
phase: 03-on-screen-drill-loop
reviewed: 2026-07-13T01:37:40Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/drills/matchChord.ts
  - src/lib/drills/generateQuestion.ts
  - src/lib/components/PianoKeyboard.svelte
  - src/routes/+layout.svelte
  - src/routes/drills/+page.svelte
  - tests/drills.e2e.test.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-07-13T01:37:40Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the Phase 3 drill loop: the pure pitch-class matcher (`matchChord`), the question/distractor generator (`generateQuestion`), the interactive/display-only `PianoKeyboard`, the `/drills` page, and the drills e2e suite. Cross-referenced the theory-engine dependencies (`spellChord`, `randomChord`, `chordPresentation`, `types`) and verified several claims empirically by running tonal against the full 12-root x 8-quality v1 chord matrix.

The chroma matcher itself is solid: I ran every one of the 96 v1 chords through the same glyph→ASCII→`Note.chroma` pipeline `matchChord` uses and no note ever produced an out-of-range or `NaN` chroma, including double-flat dim7 spellings like `Cdim7`'s `B♭♭`. Exact-set equality, octave/duplicate/order agnosticism, and enharmonic equality all hold. The Phase 2 CR-01 stale-`$derived` bug is fixed here — `PianoKeyboard` correctly uses `$derived` for its key assignments, so it reacts to `notes` prop changes across questions.

Correctness is not clean, though. Two BLOCKERs: (1) the construction-mode **Check button double-counts the score** because, unlike `selectChoice`, `checkAnswer` has no `answered` guard and the button is only disabled on empty selection — every extra Check click after answering re-runs `recordGrade`, silently corrupting the D-10 tally the phase exists to track; (2) the `PianoKeyboard` **cannot render 37 of the v1 chord-note spellings** (`F♭`, `E♯`, `C♭`, and all double-flats), so the identification "mystery chord" keyboard and the wrong-answer "here is the shape" keyboard silently omit notes for a large fraction of chords, teaching an incomplete shape. Both ship green because no test exercises them (all tests pin Cm7, which happens to render cleanly and only ever Checks once).

## Critical Issues

### CR-01: Construction `checkAnswer` has no `answered` guard — re-clicking Check double-counts the score

**File:** `src/routes/drills/+page.svelte:89-98` (handler), `144-151` (button gating)
**Issue:** In construction mode the Check button is rendered `disabled={selected.size === 0}` — it is *not* disabled once the question is answered. Compare the identification choice buttons at line 166 (`disabled={answered}`) and `selectChoice` at line 102 (`if (answered) return`). `checkAnswer` (line 89) has neither guard. After a first Check, `answered` becomes true and `toggleKey` freezes the selection, but `selected.size` is still > 0, so the Check button stays enabled. Every subsequent click re-runs `checkAnswer()` → `recordGrade(result.correct)`:

- On a correct answer: `score.correct` and `score.streak` each increment again on every extra click (a user can click Check five times and register 5 correct / streak 5 from one right answer).
- On a wrong answer: streak is re-zeroed and a fresh wrong-headline variant is re-rolled on each click (visible flicker of the headline text).

The in-session score (D-10) is the tracked deliverable of this phase; silently double-counting it is data corruption, not cosmetic.

**Fix:** Guard the handler and disable the button once answered, mirroring the identification path:
```svelte
function checkAnswer() {
	if (answered) return;
	// ...unchanged...
}
```
```svelte
<Button
	type="button"
	variant="primary"
	disabled={selected.size === 0 || answered}
	onclick={checkAnswer}
>
	Check
</Button>
```
(Disabling `Clear` when `answered` is also worth considering, though it does not corrupt state.)

### CR-02: PianoKeyboard silently drops notes it can't map to a key (F♭, E♯, C♭, all double-flats) — mystery/shape keyboards show incomplete chords

**File:** `src/lib/components/PianoKeyboard.svelte:107-136` (`assignNotesToKeys`), reached from `src/routes/drills/+page.svelte:158` (identification mystery keyboard) and `191` (wrong-answer "here is the shape")
**Issue:** `assignNotesToKeys` matches white notes by exact letter against `WHITE_LETTERS` (natural letters only) and black notes by exact letter against each key's `sharpLetter`/`flatLetter` (single-accidental spellings only: `C♯/D♭`, `D♯/E♭`, `F♯/G♭`, `G♯/A♭`, `A♯/B♭`). tonal spells many v1 chords with enharmonic letters that match *none* of these buckets. Running all 96 v1 chords through the same letter set the component uses, 37 chord-note occurrences are unrenderable, e.g.:

- `F#maj7` → notes `F♯ A♯ C♯ E♯`; `E♯` (chroma 5) matches no key, so the keyboard highlights only 3 of the 4 notes.
- `Dbm7` → `D♭ F♭ A♭ C♭`; both `F♭` (chroma 4) and `C♭` (chroma 11) are dropped — half the chord is missing.
- `Cdim7` → `C E♭ G♭ B♭♭`; the diminished-7th `B♭♭` (chroma 9) is dropped.
- Also affects `Fdim`, `Abm`, `Bbdim7`, `Ddim7`, etc. — every flat-side dim/half-dim and F#maj7.

When `assignNotesToKeys` finds `candidates.length === 0` it `continue`s (line 126), so the note is simply not highlighted — no error, no fallback. This corrupts the identification drill's core teaching surface: the player is shown a "mystery chord" keyboard with fewer notes than the chord has, then asked to name it, and later shown a wrong-answer "shape" that is also incomplete. Because `matchChord` grades on chroma (not keys), construction *grading* is unaffected — this is purely the visual/teaching path, but it is the visual path the identification drill depends on to be answerable.

The unrenderable notes are enharmonic equivalents of keys that *do* exist (F♭=E white key, E♯=F white key, C♭=B white key, B♭♭=A white key, etc.), so the fix is to match at the chroma level rather than the spelled-letter level.

**Fix:** Fall back to chroma matching when the literal letter matches no key. Compute each note's chroma (`Note.chroma(toAsciiAccidentals(note.letter))`) and each key's chroma once, and assign a note to the key whose chroma equals the note's chroma (still walking left-to-right from the cursor to preserve ascending order). This keeps the letter-first preference for the common single-accidental spellings while ensuring double-flats and cross-enharmonic spellings still land on their real key. Add a test that renders an identification/display keyboard for `F#maj7` and `Cdim7` and asserts all four notes are highlighted.

## Warnings

### WR-01: `pickDistractors` mis-detects the root of every F# chord, breaking near-miss classification

**File:** `src/lib/drills/generateQuestion.ts:56-58`
**Issue:** `correctRoot = ROOTS.find((root) => correctSymbol.startsWith(root))`. `ROOTS` lists `'F'` (index 5) before `'F#'` (index 6), and `Array.find` returns the first match. For any F#-rooted correct answer (e.g. `F#m7`), `startsWith('F')` is true first, so `correctRoot` resolves to `'F'` and `correctQuality = 'F#m7'.slice(1) = '#m7'`. Verified empirically. Consequences for the near-miss/other bucketing (lines 62-69):

- No candidate quality equals `'#m7'`, so no candidate is a "same-quality near miss."
- `root === correctRoot` matches actual **F**-rooted candidates (a *different* root) and treats them as near-misses, while the genuine F#-rooted near-misses fall into the "other" bucket.

The function still returns 3 valid, parseable, non-enharmonic distractors (all 96 cells are still enumerated and bucketed), so multiple-choice correctness is preserved — hence WARNING not BLOCKER — but the pedagogical "plausible near-miss first" intent (D-05/D-06) is inverted for 1 of every 12 roots. All other roots are safe because `Db/Eb/Ab/Bb` correctly precede `D/E/A/B` in `ROOTS`; only `F`/`F#` are in the wrong relative order for `startsWith`.

**Fix:** Match the root exactly against the known space instead of by prefix, e.g. pick the longest matching root or reconstruct from the generator:
```ts
const correctRoot = ROOTS
	.filter((root) => correctSymbol.startsWith(root))
	.sort((a, b) => b.length - a.length)[0];
```
(Longest-prefix wins, so `'F#'` beats `'F'`.) Better still, have `randomChord`/`generateQuestion` carry the drawn `{ root, quality }` through so `pickDistractors` never re-parses the symbol.

### WR-02: Construction played-diff labels black keys by sharp spelling regardless of the chord's real spelling

**File:** `src/routes/drills/+page.svelte:202-218`, driven by `PianoKeyboard.svelte:217,221-223` (black keys always emit `sharpLetter`)
**Issue:** Interactive black keys always toggle/report their `sharpLetter` (`toggleKey(key.sharpLetter)`, `selected?.has(key.sharpLetter)`), so `selected` only ever contains sharp spellings. The "You played:" diff (line 206) prints those raw sharp letters, while "Correct:" (line 217) prints tonal's spelled letters. For a flat-spelled chord like `Cm7` (correct notes `C, E♭, G, B♭`) a fully-correct answer reads `You played: C, D♯, G, A♯` vs `Correct: C, E♭, G, B♭`. Grading is correct (chroma-level), but the teaching diff shows the player "wrong-looking" sharp names next to the flat correct names, undercutting the chord-spelling-fluency goal. This is a UX/teaching-clarity defect, not a grading bug.

**Fix:** When rendering the played-diff, translate each played chroma to the chord's own spelling where it matches a target note (fall back to a neutral enharmonic label otherwise), or drive key labels from the target spelling when a target note occupies that key. At minimum, present played notes by chroma-matched target letters so a correct answer's diff reads identically to "Correct:".

### WR-03: `isExtraLetter` treats an unparseable label as chroma-less and can silently misclassify

**File:** `src/routes/drills/+page.svelte:119-122`
**Issue:** `isExtraLetter` calls `Note.chroma(toAsciiAccidentals(letter))`. Because black keys only ever contribute sharp single-accidental letters and white keys contribute natural letters, `letter` is always parseable *today*, so `chroma` is a valid 0-11 number. But the function has no guard: if the key-label source ever changes (e.g. the WR-02 fix introduces flat/double-accidental labels, or Phase 4 MIDI feeds a different label set), `Note.chroma` returns `undefined`, and `feedback.extra.includes(undefined)` is always `false`, so a genuinely-extra note would silently render as non-extra (no error box). The same latent fragility exists in `checkAnswer` (line 91) which maps selected letters to chroma with no validation before feeding `matchChord`.

**Fix:** Validate the chroma and treat an unresolved label defensively:
```ts
function isExtraLetter(letter: string): boolean {
	const chroma = Note.chroma(toAsciiAccidentals(letter));
	if (chroma === undefined) return false; // or surface as extra, but decide explicitly
	return feedback?.extra.includes(chroma) ?? false;
}
```
Ideally centralize the `letter → chroma` conversion (currently duplicated in `matchChord.ts:14-17`, `chordPresentation.ts:18-21`, and `+page.svelte:37-40, 91, 120`) into one shared, guarded helper.

### WR-04: `MAX_DISTRACTOR_ATTEMPTS` counts skips, so a pathological space could return fewer than `count` distractors

**File:** `src/lib/drills/generateQuestion.ts:74-83`
**Issue:** The loop increments `attempts` on *every* candidate examined (including `chosen.includes`, unparseable, and enharmonic skips), and breaks when `attempts >= 200`. With 96 candidates the cap (200) can never be hit before the candidate list is exhausted, so today it always yields 3. But the cap is defended as the safety net against a "degenerate matrix state" (comment line 38 / T-03-02); if the matrix ever grew past ~200 cells with many skips, the function could break early and return fewer than `count` distractors, and `generateQuestion` would then build an identification question with fewer than 4 choices (line 112) with no assertion catching it. The safety mechanism is coupled to the current matrix size in a way that isn't self-evident.

**Fix:** Cap on iterations of the (finite) candidate list rather than a magic 200 that must stay larger than the matrix, or assert `chosen.length === count` before returning and fall back to filling from the full space. Since `orderedCandidates` is already the complete finite space, the `for...of` naturally terminates — the attempt cap can simply be removed, or replaced with `attempts >= orderedCandidates.length`.

## Info

### IN-01: `spellChord(question.symbol)` re-parses on every render via `$derived`

**File:** `src/routes/drills/+page.svelte:46`
**Issue:** `const target = $derived(spellChord(question.symbol))` re-runs `spellChord` (a tonal `Chord.get`) whenever any dependency of the render invalidates. It's cheap and `question` only changes on Next, so this is fine functionally, but note that `question` already knows its symbol and the identification path also feeds the symbol to `pickDistractors` separately. Minor; no action required.

### IN-02: `letter + i` and `entry.role + entry.letter` keys are fine but fragile if labels collide

**File:** `src/routes/drills/+page.svelte:206` (`letter + i`), `194` (`entry.role + entry.letter`)
**Issue:** The played-diff uses `letter + i` (index-suffixed, safe against duplicate letters) and the formula loop keys on `role + letter`. Both are acceptable. Flagging only that `role + letter` assumes no two formula entries share a role+letter — true for v1 four-note chords. No action.

### IN-03: Duplicated `toAsciiAccidentals` helper across four files

**File:** `src/lib/drills/matchChord.ts:14-17`, `src/routes/drills/+page.svelte:37-40`, `src/lib/lookup/chordPresentation.ts:18-21` (and the inverse `toAccidentalGlyphs` in `src/lib/theory/chord.ts:67-69`)
**Issue:** The identical `♯→#`, `♭→b` conversion is copy-pasted in at least three reviewed/dependency files. Not a bug, but a single-source helper (e.g. in `$lib/theory`) would prevent drift and pairs naturally with the WR-03 centralization suggestion.

---

_Reviewed: 2026-07-13T01:37:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
