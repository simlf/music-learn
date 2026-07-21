---
phase: 25-contextual-learning-from-session-6-sketches-progression-dril
reviewed: 2026-07-21T17:13:24Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - src/lib/practice/progressions.ts
  - src/lib/practice/progressions.test.ts
  - src/lib/practice/shellVoicing.ts
  - src/lib/practice/shellVoicing.test.ts
  - src/lib/practice/confidenceLog.ts
  - src/lib/practice/confidenceLog.test.ts
  - src/lib/practice/voicingMet.ts
  - src/lib/practice/voicingMet.test.ts
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/components/pianoKeyboardGhost.test.ts
  - src/lib/components/ProgressionDrill.svelte
  - src/lib/components/progressionDrill.test.ts
  - src/lib/components/RecallSession.svelte
  - src/lib/components/recallSession.test.ts
  - src/lib/components/ShellVoicingDrill.svelte
  - src/lib/components/shellVoicingDrill.test.ts
  - src/lib/i18n/messages.test.ts
  - src/lib/i18n/messages/chrome.ts
  - src/lib/i18n/messages/index.ts
  - src/lib/i18n/messages/progress.ts
  - src/lib/i18n/messages/progressions.ts
  - src/lib/i18n/messages/recall.ts
  - src/lib/i18n/messages/voicings.ts
  - src/routes/+layout.svelte
  - src/routes/progress/+page.svelte
  - src/routes/progressCalibration.test.ts
  - src/routes/progressions/+page.svelte
  - src/routes/progressionsPage.test.ts
  - src/routes/voicings/+page.svelte
  - src/routes/voicingsPage.test.ts
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-07-21T17:13:24Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Phase 25 adds four pure practice modules (progressions engine, shell-voicing engine, confidence log, voicing-met store), two new drill components (`ProgressionDrill`, `ShellVoicingDrill`), the `ghostKeys` treatment on `PianoKeyboard`, confidence dots in `RecallSession`, and the calibration card on `/progress`, plus i18n domains and nav wiring. Cross-module behavior was verified against `matchChord`, `spellChord`, `keyboardLayout`, `randomChord.ROOTS`, and `toAscendingPitches` rather than trusted from the docstrings.

The pure modules (`confidenceLog`, `voicingMet`, `progressions`) are solid: total functions, schema-guarded localStorage reads, silent-degrade writes, ring-buffer cap, no injection or `{@html}` exposure anywhere in the new code, and no em dashes in the new EN/FR copy. The i18n parity and collision tests cover the two new domains.

The real defects cluster in the shell-voicing feature's letter/octave-keyed ghost matching (which silently fails for flat-spelled and off-span notes), a semantic contradiction between "ghost = allowed but not required" and the exact-set grading, an out-of-key distractor pool for minor progressions, an unguarded async card load, and Hard grades being logged as incorrect in the confidence log. No Critical (security/crash/data-loss) issues found.

## Warnings

### WR-01: Ghost markers never render for flat-spelled roots/fifths (letter-string matching against sharp-only key labels)

**File:** `src/lib/components/ShellVoicingDrill.svelte:104-112`, `src/lib/components/PianoKeyboard.svelte:579-588`
**Issue:** `ghostKeys` entries carry the chord's own spelled letter from `spellChord` (glyph accidentals: `E♭`, `A♭`, `G♭`). In the subtract stage the keyboard renders with `notes={[]}` (line 264), so every black key has no assigned note and `ghostClass`/`ghostMarker` fall back to `key.sharpLetter` (`D♯`, `G♯`, `F♯`). A flat-spelled ghost letter can therefore never equal a black key's comparison letter, and the marker silently does not render. This affects every flat-rooted draw from the fact catalog (`Db`, `Eb`, `Ab`, `Bb` roots — 4 of 12), every flat-spelled fifth (e.g. fifth of `Dbmaj7` = `A♭`), and every `m7b5`/`dim7` chord whose flattened fifth spells flat (`G♭` on `Cm7b5`/`Cdim7`). The `flatLetter` field exists on `BlackKey` but is never consulted. This is the letter-string-matching failure mode the project's own "grade by chroma/MIDI, never letter strings" rule exists to prevent; the drill's tests only exercise `Cmaj7` (all natural/sharp-free), so the gap is invisible to the suite.
**Fix:** Match ghost entries by chroma instead of spelled letter, e.g. in `PianoKeyboard.svelte`:
```ts
function ghostEntryFor(letter: string, altLetter: string | undefined, octave: number) {
	const chroma = Note.chroma(toAsciiAccidentals(letter));
	return ghostKeys?.find(
		(k) => Note.chroma(toAsciiAccidentals(k.letter)) === chroma && k.octave === octave
	);
}
```
(or, minimally, compare against both `sharpLetter` and `flatLetter` for black keys). Add a test drawing a flat-rooted seventh chord (e.g. force `Ebmaj7`) asserting `[data-ghost="R"]` and `[data-ghost="5"]` render.

### WR-02: Ghost octaves are pinned to the audio voicing and fall off the visible span on one-octave (phone) keyboards

**File:** `src/lib/components/ShellVoicingDrill.svelte:93-112`, `src/lib/components/PianoKeyboard.svelte:579-588`
**Issue:** `pitchOctaveByLetter` derives each marker's octave from `toAscendingPitches` (audio voicing, base octave 4, ascending). Any stack note that ascends past B lands in octave 5 (e.g. `G7` → fifth `D5`; `Fmaj7` → fifth `C5` is the lone octave-5 key that exists). The drill's keyboard passes no `octaves` prop (line 263), so on phone widths `PianoKeyboard` self-measures to 1 octave (`C4..C5`), where octave-5 keys other than the top C do not exist — the ghost root/fifth markers silently vanish on exactly the device class this app targets. Since the subtract-stage keyboard renders no other notes and grading is chroma-based (octave-agnostic), pinning ghosts to the audio octave buys nothing here.
**Fix:** Make the subtract-stage ghost matching octave-agnostic (drop the `octave` equality for this consumer, or pass ghost entries per visible octave), or pin the ghost octave to the keyboard's own base octave 4 for root-position stacks. Alternatively pass `octaves={2}` explicitly and accept the narrower keys.

### WR-03: Subtract-stage grading contradicts the ghost "allowed but not required" semantic — playing a ghost-marked note grades wrong

**File:** `src/lib/components/ShellVoicingDrill.svelte:91,139-153`, `src/lib/components/PianoKeyboard.svelte:160-174`
**Issue:** `PianoKeyboard`'s `ghostKeys` contract (and the SK-019 sketch language it cites) defines a ghost key as "allowed but not required," explicitly distinct from the wrong-fill "which reads as an error." But `check()` grades via `matchChord`, which requires exact chroma-set equality against `shellNotes` (2 notes). A learner who plays the shell plus the ghost-hatched root — a combination the UI explicitly labels allowed — gets `extra: [rootChroma]`, `correct: false`, and the "Not quite. Try again." retry. The two halves of the feature disagree about what the R/5 hatch means.
**Fix:** Either (a) grade with an optional-set-aware rule in `check()`:
```ts
const optionalChroma = new Set(
	optionalMarkers(chord).map((m) => Note.chroma(toAsciiAccidentals(m.letter)))
);
const result = matchChord(playedChroma, target);
const disallowedExtra = result.extra.filter((c) => !optionalChroma.has(c));
const correct = result.missing.length === 0 && disallowedExtra.length === 0;
```
so shell + optional root/fifth passes (subtract stage only), or (b) change the marker semantics and copy to "drop these" and update the `ghostKeys` doc contract in `PianoKeyboard.svelte`. Pick one; today the component doc and the grader assert opposite contracts.

### WR-04: Minor-mode progressions draw name distractors from the parallel MAJOR key, contradicting the engine's "never an out-of-key chord" contract

**File:** `src/lib/practice/progressions.ts:154-173`
**Issue:** `nameChoices` builds its distractor pool from `diatonicSevenths(key)`, which is hardcoded to `MAJOR_DEGREE_INTERVALS` + `MAJOR_DIATONIC_QUALITIES`. For the `minor-ii-V-i` template keyed to A, the drill banner reads "KEY: A MINOR" but the choice chips are drawn from A **major**'s sevenths (`Amaj7`, `C♯m7`, `G♯m7b5`, ...), directly contradicting the function's own doc ("Never an out-of-key chord") and the same-key pedagogy the drill is built on. It also makes minor bars trivially guessable: the correct `Bm7b5`/`Am7` is stylistically the only non-parallel-major symbol in the grid. The test suite covers `nameChoices` for major keys only.
**Fix:** Make the pool mode-aware: add a `MINOR_DIATONIC_QUALITIES` table (e.g. natural minor with the template's dominant-V convention: `m7, m7b5, maj7, m7, 7, maj7, 7` or the pedagogically chosen set), select interval/quality tables by the template's `mode`, and pass the mode (or the template) into `nameChoices`. Add a minor-key `nameChoices` test asserting every choice is diatonic to the minor key.

### WR-05: ShellVoicingDrill derives its stage from stale/racy card data (no request guard on the async load)

**File:** `src/lib/components/ShellVoicingDrill.svelte:49-58`
**Issue:** `loadCards(forSymbol)` assigns `cards` unconditionally when `getAllCards()` resolves. Two problems: (1) on mount and after every `next()`, `cards` still holds the previous chord's records (or the initial `[]`) until the promise resolves, so `stage` transiently renders the wrong pedagogy stage — a drill-mature chord flashes the meet compare card, and a fast "Got it" tap during that window writes a spurious `voicingMet` mark for the new chord; (2) two in-flight loads (rapid Next taps) can resolve out of order, leaving `cards` filtered for a chord that is no longer `symbol`, so the stage for the current chord is computed from another chord's maturity until something else re-triggers the effect.
**Fix:** Guard the assignment against the current symbol:
```ts
async function loadCards(forSymbol: string) {
	const all = await getAllCards();
	if (forSymbol !== symbol) return; // stale response, a newer draw superseded it
	cards = all.filter((card) => card.factId === `chord-formula:${forSymbol}`);
}
```
and add a `loading` flag (set before the await, cleared in the guard path) that suppresses the stage UI (or at least the meet stage's "Got it" action) until the first load for the current symbol lands.

### WR-06: Confidence log records FSRS `Hard` grades as incorrect, skewing calibration and danger cards

**File:** `src/lib/components/RecallSession.svelte:639-645`
**Issue:** `handleGrade` logs `correct: rating === Rating.Good || rating === Rating.Easy`. In FSRS, `Hard` is a *passing* grade (recalled, with effort); only `Again` is a lapse. A user who picks the "!" (certain) dot and then honestly grades `Hard` is recorded as confident-but-**wrong**, inflating the MISCALIBRATED flag and pushing correctly-recalled cards into the `/progress` "Confident but wrong" danger list — the exact surface 020-C builds on this field. Over time this systematically biases `certain` accuracy downward relative to `somewhat`.
**Fix:** Treat `Hard` as correct for calibration purposes: `correct: rating !== Rating.Again`. If the stricter reading is intentional (Hard = "not fluent enough to count"), document that decision in `confidenceLog.ts`'s contract and in the calibration card copy, because it changes what "accuracy" means on `/progress`.

## Info

### IN-01: ProgressionDrill's Check button is enabled with an empty selection, unlike every sibling drill

**File:** `src/lib/components/ProgressionDrill.svelte:225`
**Issue:** `RecallSession` (line 739) and `ShellVoicingDrill` (line 275) both render Check with `disabled={selected.size === 0}`. `ProgressionDrill` omits the guard, so tapping Check with nothing selected runs a guaranteed-wrong `matchChord` and shows the retry line.
**Fix:** Add `disabled={selected.size === 0}` to the Check button for consistency.

### IN-02: An empty progression (`bars: []`) renders a dead-end drill with no controls

**File:** `src/lib/components/ProgressionDrill.svelte:63-64,204,235`; `src/lib/practice/progressions.ts:137-152`
**Issue:** `complete` requires `bars.length > 0`, and the name/play UI requires `currentBar`. If `buildProgression` ever returned `[]` (it drops any bar failing `spellChord` recognition and returns `[]` for an unknown template/key), the component renders only the "BAR 1/0" banner: no chips, no keyboard, no Again button. Unreachable today (the reachability test proves every template x key spells), but the engine is explicitly total and a future template edit would turn this into a silent dead end.
**Fix:** In `drawProgression()`/`again()`, redraw (or fall back to the first template on C) when `bars.length === 0`, or render the completion card's Again control for the empty case.

### IN-03: `data-ghost` attribute is applied to role-lit keys even though the ghost class is role-gated

**File:** `src/lib/components/PianoKeyboard.svelte:626,683-686`
**Issue:** `ghostClass` correctly excludes keys carrying an interval-role fill, but `ghostMarker` has no role guard, so a matching role-lit key still gets `data-ghost="R"` in the DOM (no visual effect, since the `::after` is gated on the class, but the attribute contradicts the "role wins" contract and could mislead future selectors/tests that query `[data-ghost]`).
**Fix:** Gate the attribute the same way: `data-ghost={key.note?.role ? undefined : ghostMarker(...)}` or fold the role check into `ghostMarker`.

### IN-04: Stale structural comments after this phase's additions

**File:** `src/routes/+layout.svelte:66-70`; `src/lib/i18n/messages/index.ts:24-28`; `src/lib/i18n/messages.test.ts:17-20`
**Issue:** The More-sheet comment still says "the remaining 4 destinations" (now 6 after `/progressions` and `/voicings`); `messages/index.ts` and `messages.test.ts` still describe "chrome + 8 stubs"/"nine per-domain modules" (now 11 domains).
**Fix:** Update the counts (or drop the numerals so the comments can't drift again).

### IN-05: Confidence entry is logged before the FSRS grade commits, so a failed `recordGrade` still leaves a log entry

**File:** `src/lib/components/RecallSession.svelte:634-657`
**Issue:** `logConfidence` runs before `await recordGrade(...)`. If the deck write throws (the path that flips `pageState = 'error'`), the confidence log has already recorded a review that never happened in the deck; on retry the same card grades again and logs a second entry. Low impact (single user, 500-entry ring buffer, calibration is aggregate), but the log and deck can diverge by design order.
**Fix:** Move the `logConfidence` call after the successful `recordGrade` await (the comment's stated reason — capturing the card's own factId/mode before `advanceQueue` — still holds there, since `currentCard` is captured in scope).

## Reviewed clean

- `src/lib/practice/confidenceLog.ts` / `voicingMet.ts`: schema-guarded reads, silent-degrade writes, ring-buffer cap, divide-by-zero-guarded `miscalibrated` flag — all verified against the tests.
- No XSS surface in new code: chord symbols and song names render via text interpolation only; the layout's `{@html}` usage is limited to pre-existing in-repo SVG constants.
- No hardcoded secrets, debug artifacts (`console.log`/`debugger`), or empty catches without an intent comment.
- No em dashes in any new EN/FR UI string; i18n parity + collision tests cover both new domains; `nav.progressions`/`nav.voicings` are reachable from both masthead and More sheet (tested).
- Grading paths in all three drills go through `matchChord` chroma sets, never letter strings (the letter-matching issue in WR-01 is display matching, not grading).

---

_Reviewed: 2026-07-21T17:13:24Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
