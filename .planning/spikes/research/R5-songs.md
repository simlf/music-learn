# R5: Song Builder + Presets — Research Findings

**Date:** 2026-07-14
**Status:** COMPLETE
**Question:** What chord data should the song presets ship with (Autumn Leaves in both common keys + 5 more beginner standards), do all those symbols work in the existing theory engine, and what data model / UX shape should the song builder take?

---

## TL;DR

- Autumn Leaves verified in both keys against a published lead sheet (32-bar AABC form, including the last-section passing chords `Gm7 C7 | Fm7 Bb7`). The **simplified preset versions of all 7 proposed songs parse and grade correctly in the current engine.**
- **Every proposed symbol parses via `spellChord`** (verified by running the engine's exact normalization + `Chord.get` against the repo's installed tonal@6.4.3). Nothing is UNRECOGNIZED.
- **But 6th/9th/#11 chords hit a role-tagging gap**: `roleForDegree` (src/lib/theory/chord.ts:76) only maps degrees 1/3/5/7 and silently tags a 6th, 9th, or #11 as `'root'`. Grading is unaffected (chroma-set based), but `formulaFor` (src/lib/lookup/chordPresentation.ts:33) special-cases `role === 'root'`, so e.g. **Gm6 renders TWO "R" chips** (G and E both labeled R, both vermilion). Flagged symbols: `Gm6, Em6, Am6, Fm6, C6, F6, D7b9, B7b9, E7b9, A7b9, G9, D7#11, C69`.
- Recommendation: presets ship with simplified symbols that stay inside the proven 12x8 matrix (e.g. `Gm6 -> Gm`, `D7b9 -> D7`, `C6 -> C`), stored with a `simplified` note in the preset description. The song builder still ACCEPTS the richer symbols (they parse and grade), but fix or extend the role gap before displaying them (small, ~1-2h with tests; details in section 3).
- Data model: plain JSON-serializable `Song` record; presets are code constants copied into a user-owned `Song` on tap (so they stay editable and preset upgrades never migrate data). Weighting: frequency-counted pool from all `active` songs, mixed ~70/30 with the general matrix inside `generateQuestion`.

---

## 1. Autumn Leaves changes (verified)

Form: 32 bars, AABC (A repeated, then an 8-bar B and an 8-bar C that carries the famous descending passing-chord line). Verified bar-by-bar against a published G-minor lead sheet (birka.fhsk.se PDF, matches the Real Book changes) and cross-checked with jazz-education sources. The same source site publishes the E-minor transposition; the E-minor chords below are the exact minor-third transposition and match the standard "guitar-friendly" key cited across sources.

Charts disagree on two details; presets are a starting point the user edits to match their arrangement:

- The tonic chord is written `Gm7`, `Gm6`, or plain `Gm` depending on the chart (`Em7`/`Em6`/`Em` in E minor). Preset uses the plain triad tier below; the user can retype it.
- The V chord is often decorated `D7b9` (`B7b9`). Preset uses plain `D7`/`B7`.

### G minor (concert, Real Book key)

Ordered progression (one symbol per bar; two symbols = two chords in the bar):

```
A  (x2): Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7 | Gm | Gm
B      : Am7b5 | D7 | Gm | Gm | Cm7 | F7 | Bbmaj7 | Ebmaj7
C      : Am7b5 | D7 | Gm7 C7 | Fm7 Bb7 | Ebmaj7 | Am7b5 D7 | Gm | Gm
```

Unique chords (10, counting the tonic once as `Gm`; the source chart writes it `Gm7`): `Cm7, F7, Bbmaj7, Ebmaj7, Am7b5, D7, Gm, C7, Fm7, Bb7`.

All 10 are inside the engine's proven 12-root x 8-quality matrix. A `Gm6` tonic variant is the only flagged symbol (section 3).

Core-loop starter (if a shorter preset tier is wanted): `Cm7, F7, Bbmaj7, Ebmaj7, Am7b5, D7, Gm` (the A section is one lap of this cycle).

### E minor (common combo/guitar key)

```
A  (x2): Am7 | D7 | Gmaj7 | Cmaj7 | F#m7b5 | B7 | Em | Em
B      : F#m7b5 | B7 | Em | Em | Am7 | D7 | Gmaj7 | Cmaj7
C      : F#m7b5 | B7 | Em7 A7 | Dm7 G7 | Cmaj7 | F#m7b5 B7 | Em | Em
```

Unique chords (10): `Am7, D7, Gmaj7, Cmaj7, F#m7b5, B7, Em, A7, Dm7, G7`. All inside the supported matrix. `F#ø7` input normalizes to `F#m7b5` (verified, chord.ts `normalizeSymbol`).

Both presets should ship. The user is playing an Autumn Leaves arrangement now; their chart may be either key (or another one entirely), so the preset card copy should invite editing rather than imply authority.

---

## 2. Preset library: 5 more beginner standards (verified)

Selection criteria: heavy ii-V-I content, few unique chords, keys whose roots all sit in the engine's `ROOTS` list, and overlap with the theory the drills already teach. Chord progressions are uncopyrightable facts; no lyrics or melodies are reproduced anywhere in this feature.

Simplifications applied uniformly (see section 3): extensions stripped to the base quality (`G9/G7b9 -> G7`, `E7b9 -> E7`, `Cmaj9 -> Cmaj7`), slash bass dropped (`G7/F -> G7`), 6th chords reduced (`C6 -> C`, `Fm6 -> Fm`).

### Fly Me to the Moon (C major / A minor relative) — verified against a published lead sheet PDF

```
Bars 1-8  : Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7 | Am7 A7
Bars 9-16 : Dm7 | G7 | Cmaj7 Am7 | Dm7 | G7 | Fdim7 Cmaj7 | Bm7 E7
Bars 17-24: (repeat 1-8)
Bars 25-32: Dm7 | G7 | Em7b5 A7 | Dm7 | G7 | C | Bm7 E7
```

Unique (simplified, 12): `Am7, Dm7, G7, Cmaj7, Fmaj7, Bm7b5, E7, A7, Fdim7, Bm7, Em7b5, C`. All in the supported matrix (note `Fdim7` and the plain-`Bm7` turnaround are real chart features, not typos). Source chart decorations stripped: `E7b9, A7b9, G9, G7b9, Cmaj9, G7/F, C6, C69`.

### Blue Bossa (C minor, 16 bars) — verified across jazz-education sources

```
Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7 | Cm7 | Cm7
Ebm7 | Ab7 | Dbmaj7 | Dbmaj7 | Dm7b5 | G7 | Cm7 | Cm7
```

Unique (7): `Cm7, Fm7, Dm7b5, G7, Ebm7, Ab7, Dbmaj7`. All supported; zero simplification needed. Smallest preset, ideal first song. The Db-major modulation drills the flat roots the user sees least.

### All of Me (C major, 32 bars ABAC) — verified against harmonic-analysis sources

```
Bars 1-16 : C | C | E7 | E7 | A7 | A7 | Dm7 | Dm7
            E7 | E7 | Am7 | Am7 | D7 | D7 | Dm7 | G7
Bars 17-24: (repeat 1-8)
Bars 25-32: F | Fm | C Em7 | A7 | Dm7 | G7 | C | C
```

Unique (simplified, 10): `C, E7, A7, Dm7, Am7, D7, G7, F, Fm, Em7`. All supported. Charts vary in bars 25-27 (`F6/Fmaj7`, `Fm6/Fm7`, `Em7b5 A7`); the preset uses plain triads there. The E7-A7-D7 secondary-dominant cascade is the textbook payoff of this tune.

### Summertime (A minor, 16 bars) — verified against learnjazzstandards.com bar chart

```
Am7 | Bm7b5 E7 | Am7 | A7 | Dm7 | F7 | Bm7b5 E7 | Am7
Am7 | Bm7b5 E7 | Am7 | D7 G7 | Cmaj7 | Am7 | Am7 | Bm7b5 E7
```

Unique (9): `Am7, Bm7b5, E7, A7, Dm7, F7, D7, G7, Cmaj7`. All supported; the only stripping was `E7(b13) -> E7`, `A7b9 -> A7`. (Gershwin's original toggles m6 chords; the jazz-session version above is the practical preset.)

### Take the A Train (C major, 32 bars AABA) — verified across sources

```
A (x2): C | C | D7 | D7 | Dm7 | G7 | C | C
B     : Fmaj7 | Fmaj7 | Fmaj7 | Fmaj7 | D7 | D7 | Dm7 | G7
A     : (repeat)
```

Unique (simplified, 5): `C, D7, Dm7, G7, Fmaj7`. Optionally add `C7` (the last bar before the bridge is often `C6 C7`). Chart decorations stripped: `C6 -> C`, `D7#11 -> D7`. Smallest chord vocabulary of all; the D7#11 color is worth restoring once the engine handles extensions.

### Preset overlap summary

Across all 7 presets the combined unique-symbol universe (simplified) is 31 symbols, every one inside the proven 12x8 matrix. Heavy overlap (`Dm7, G7, Cmaj7, Am7, E7, A7, D7` recur in 4+ songs) means activating several songs naturally concentrates drilling on the ii-V-I core.

---

## 3. Symbol compatibility with the theory engine (verified by execution)

Method: ran the exact `normalizeSymbol` + `Chord.get` pipeline from src/lib/theory/chord.ts against the repo's installed tonal@6.4.3 (script: scratchpad/check-symbols.cjs) for every symbol in sections 1-2 plus the decorated variants.

### Result: nothing fails to parse

All tested symbols return `recognized: true` with correct notes, including `Gm6, C6, F6, Fm6, Am6, Em6, D7b9, B7b9, E7b9, D7#11, C69` and both `ø` glyph forms. tonal's dictionary is far wider than the v1 matrix.

### But there are three real gaps for symbols outside the 12x8 matrix

**Gap 1 (display bug, the important one): `roleForDegree` fallback.** chord.ts:76 maps interval degrees 1/3/5/7 to roles and silently returns `'root'` for anything else. Verified consequences per symbol:

| Symbol | tonal notes | Mistagged degrees | Visible effect |
|---|---|---|---|
| `Gm6` / `Em6` / `Am6` / `Fm6` / `C6` / `F6` | correct (e.g. G Bb D E) | 6th -> role `'root'` | `formulaFor` labels the 6th "R"; IntervalChip paints it root-vermilion. Two "R" chips per chord. |
| `D7b9` / `B7b9` / `E7b9` / `A7b9` / `G9` | correct 5-note | 9th -> `'root'` | Same double-"R" bug, plus 5-note chords have never been drilled/rendered (keyboard fit untested). |
| `D7#11` | correct 5-note | #11 -> `'root'` | Same. |
| `C69` | correct 5-note | 6th AND 9th -> `'root'` | Three "R" chips. |

**Gap 2: grading is safe, distractors degrade.** `matchChord` grades by chroma set (src/lib/drills/matchChord.ts), so even a `Gm6` drill question would be graded on the right notes. But `pickDistractors` (src/lib/drills/generateQuestion.ts) derives `correctQuality` by slicing off a known root and comparing against the 8 matrix suffixes, so out-of-matrix qualities lose the "same quality, different root" near-miss class (falls back to same-root-only near misses). Works, just less pedagogically sharp.

**Gap 3: `didYouMean` cannot suggest out-of-matrix symbols.** Its candidate space is exactly `ROOTS x QUALITY_SUFFIXES` (didYouMean.ts:1). A user typo like `Gm66` or `C99` gets no suggestion (also note `Gb`, `Db` vs `C#` etc.: only the 12 spellings in `ROOTS` are suggestible, though `spellChord` parses other spellings fine).

### Per-flagged-symbol fallback table (nearest supported simplification)

| Flagged | Fallback | Rationale |
|---|---|---|
| `Gm6`, `Em6`, `Am6`, `Fm6` | `Gm`, `Em`, `Am`, `Fm` | m6 = minor triad + 6; the triad is the strict subset. (NOT m7: the 7th changes the sound and the left-hand shape.) |
| `C6`, `F6` | `C`, `F` | Same logic: 6 = major triad + 6. (`Cmaj7` is the jazzier substitute but adds a note the chart didn't ask for.) |
| `D7b9`, `B7b9`, `E7b9`, `A7b9`, `G9`, `G7b9` | `D7`, `B7`, `E7`, `A7`, `G7`, `G7` | Extensions decorate the same dominant function. |
| `D7#11` | `D7` | Same. |
| `C69` | `C` | Triad subset. |
| `G7/F` (slash bass) | `G7` | Engine has no slash-chord concept; the upper structure is the drill target. |

### Recommendation and effort notes

1. **Ship presets in simplified form now** (as written in sections 1-2). Zero engine work; everything stays inside the tested matrix; `reference-chords.test.ts` guarantees hold.
2. **Let the song builder accept the richer symbols** (they parse and grade). Mark any symbol outside the matrix with a small mono `SIMPLIFIED AVAILABLE` or, inversely, an `EXTENDED` tag so the display bug is not a silent surprise, OR gate the builder to matrix symbols in this run and show: `6th and 9th chords are coming. Saved as Gm for now.`
3. **Engine extension (recommended follow-up, ~1-2h with tests):** add an `'extension'` member to `IntervalRole` (types.ts), map degrees 2/4/6/9/11/13 to it in `roleForDegree`, add a neutral-ink IntervalChip variant, and delete the stale "v1 qualities never produce other degrees" comment. `formulaFor` needs no logic change (its non-root labels already come from `Interval.distance`, which handles 6ths/9ths correctly; verified `M6` label derivation). Extend `didYouMean`'s `QUALITY_SUFFIXES` only if the quality tier plan (levels track) wants 6/9 chords drillable; otherwise leave the drill matrix as is and let songs be the only door to extended symbols.

---

## 4. Data model

Persistence backend is R1's call (the codebase currently has BOTH patterns: bearer-token API client in src/lib/api/client.ts with a server/ Fastify-style backend, and localStorage offline-queue in src/lib/api/progress.ts). The model below is deliberately storage-agnostic: flat, JSON-serializable, no Dates, no classes.

```ts
/** src/lib/songs/types.ts */

export type SongSource = 'preset' | 'custom';

export interface Song {
	/** crypto.randomUUID() for custom songs; presets get a copy with a fresh id when added. */
	id: string;
	/** User-facing name, e.g. "Autumn Leaves (my arrangement)". */
	name: string;
	/**
	 * The ORDERED progression as validated symbols (ASCII accidentals, the
	 * form spellChord echoes). Duplicates allowed and meaningful: frequency
	 * in the tune drives drill weight, and order enables a future
	 * play-through mode.
	 */
	chordSymbols: string[];
	/** ISO 8601. String, not Date: survives JSON round-trips in either store. */
	createdAt: string;
	/** 'preset' if created from a preset card (still fully editable); 'custom' if typed from scratch. */
	source: SongSource;
	/** Active songs feed the drill weighting pool. */
	active: boolean;
	/** Back-reference to the preset it was copied from, e.g. 'autumn-leaves-gm'. Optional. */
	presetId?: string;
}

/** Presets are code constants, NEVER persisted directly. Adding one copies it into a Song. */
export interface SongPreset {
	presetId: string; // stable slug: 'autumn-leaves-gm', 'blue-bossa-cm', ...
	name: string; // "Autumn Leaves (G minor)"
	chordSymbols: readonly string[];
	/** e.g. "Real Book key. Simplified: D7b9 saved as D7." Shown on the preset card. */
	note?: string;
}
```

Why copy-on-add for presets: the user edits the copy freely to match their arrangement (the locked requirement), preset improvements in later app versions never need a data migration, and deleting a song never touches the preset shelf.

### Drill weighting: combining multiple active songs

```ts
/** src/lib/songs/weighting.ts — pure, storage-agnostic */

/** Frequency-counted pool across all active songs. */
export function songChordPool(songs: Song[]): Map<string, number> {
	const pool = new Map<string, number>();
	for (const song of songs) {
		if (!song.active) continue;
		for (const symbol of song.chordSymbols) {
			pool.set(symbol, (pool.get(symbol) ?? 0) + 1);
		}
	}
	return pool;
}
```

Integration point: `generateQuestion()` (src/lib/drills/generateQuestion.ts) currently calls `randomChord()` directly. Give it an optional pool:

- With a non-empty pool, draw the question symbol from the song pool with probability ~0.7 (weighted by frequency count, so a chord appearing in two songs or eight bars gets proportionally more reps), else fall back to `randomChord()`. Empty pool = exactly today's behavior; every existing test passes unchanged.
- A chord recurring across several active songs is naturally weighted up: frequencies sum across songs. No dedupe, no per-song normalization needed for v1 (a 32-bar song legitimately outweighs a 16-bar one).
- Distractors keep coming from the proven matrix (`pickDistractors` unchanged); only the TARGET is song-weighted. This sidesteps Gap 2 above.
- 70/30 rather than 100/0 keeps general fluency alive and prevents a 7-chord song from turning the drill into rote memory. Constant, not a setting, for v1.

Later (not this run): intersect the pool with the server's `needsPractice` stats so weak song chords float up further.

---

## 5. UX sketch: /songs page (Print Shop minimal)

Fits the locked identity: paper/ink, zero radius, mono status register, no new color language. One route, no modals needed beyond a delete confirm.

### List (default state)

- Route `/songs`, nav entry `Songs` alongside Drills/Progress.
- Each song is a full-width row: name in body type, a mono register line under it (`10 CHORDS · PRESET` or `8 CHORDS · CUSTOM`), and an activate checkbox on the right, styled as the existing ink-stamp checkbox (zero radius). Toggling is instant, no save button.
- Tapping the row (not the checkbox) opens edit.
- Below the user's songs: the preset shelf, a stack of one-tap cards: `Autumn Leaves (G minor)`, `Autumn Leaves (E minor)`, `Blue Bossa`, `Take the A Train`, `Summertime`, `All of Me`, `Fly Me to the Moon`. Tapping adds an active copy to the list and scrolls to it. Card sub-line shows the preset `note`.
- Empty state copy: `No songs yet. Type one in from your sheet music, or start from a preset below.`
- Drills page gets one mono register line when any song is active: `PRACTICING: AUTUMN LEAVES +1 MORE`, linking to /songs.

### Create / edit (same form)

- Fields: name input, then a chord entry input with a chip list.
- Typing a symbol and hitting space/enter/comma validates it through `spellChord`:
  - Recognized: appended as a stamped chip showing the canonical symbol, with a small ✕ to remove. Duplicates allowed (they carry weight).
  - Unrecognized: input border goes ink-heavy, inline line shows `Not a chord symbol we recognize.` and, when `didYouMean` returns a candidate, appends `Did you mean Gm7?` where the suggestion is a tappable stamp that accepts it. When `didYouMean` returns null, show the existing rotating hints instead. (Both functions are total; no error handling gymnastics needed.)
- Paste-a-line support: on paste, split on whitespace, commas, and `|`, validate each token, add the valid ones as chips, and report failures in one line: `2 symbols not recognized: Cmm7, Xmaj7.` This is the fast path for copying a whole chart.
- Save enabled once name is non-empty and at least one chip exists. Editing a preset-sourced song keeps `source: 'preset'` and its `presetId` (provenance, not protection).
- Delete lives at the bottom of edit, mono, with a one-step confirm: `Delete this song? Its practice history stays.`

### Copy rules

All strings above follow the project rule: no em dashes anywhere in app copy; periods, colons, and commas only. Mono register lines are uppercase per the existing status-register pattern.

---

## Sources

- Autumn Leaves G minor lead sheet (bar-by-bar verification, incl. `Gm7 C7 | Fm7 Bb7` passing bars): https://birka.fhsk.se/wp-content/uploads/2017/02/Autumn-Leaves-Gm.pdf (E minor companion chart at Autumn-Leaves-in-Em.pdf, same site)
- Autumn Leaves analysis (Bb/G minor ii-V-i structure, Gm6 tonic note): https://jazzpianoschool.com/wp-content/uploads/2016/05/Step-8-Autumn-Leaves-Analysis.pdf and https://www.uvm.edu/~tgcleary/jazz%20piano%20lesson%20tune%20pdfs/standards/autumn%20leaves%20w.shells.pdf
- Autumn Leaves E minor form discussion: https://spytunes.com/autumn-leaves-chords/ and https://www.jazzguitar.be/blog/autumn-leaves-jazz-guitar-chords/
- Fly Me to the Moon full lead sheet (bar-by-bar verification): https://www.uvm.edu/~tgcleary/MU%20104%20charts%20&%20scores/fly%20me%20to%20the%20moon%20c%20major.pdf ; A-section analysis: https://www.jazzguitar.be/blog/fly-me-to-the-moon-chords/
- Blue Bossa form and modulation: https://www.learnjazzstandards.com/blog/blue-bossa-chords/ and https://jazz-circle.com/standards/blue-bossa
- All of Me harmonic analysis (dominant cascade, Fm modal interchange, C6 ending): https://pianowalk.com/harmonic-analysis-all-of-me-iconic-jazz-standard/ and https://www.jazzguitar.be/blog/all-of-me/
- Summertime 16-bar chart in A minor: https://www.learnjazzstandards.com/blog/summertime-chords/
- Take the A Train changes (C, AABA, D7#11, bridge on Fmaj7): https://antonjazz.com/2019/01/take-the-a-train-chord-changes/ and https://www.jazzguitar.be/blog/take-the-a-train/
- Symbol compatibility: executed against this repo's tonal@6.4.3 via scratchpad/check-symbols.cjs (replicates src/lib/theory/chord.ts normalizeSymbol + Chord.get + roleForDegree), 2026-07-14. Code facts: src/lib/theory/chord.ts, src/lib/theory/randomChord.ts, src/lib/theory/didYouMean.ts, src/lib/drills/matchChord.ts, src/lib/drills/generateQuestion.ts, src/lib/lookup/chordPresentation.ts, src/lib/api/progress.ts.
