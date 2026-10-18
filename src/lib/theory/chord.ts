import { Chord } from 'tonal';
import { letterToSolfege } from './solfege';
import type { ChordResult, IntervalRole, SpelledNote } from './types';

/**
 * The display form of a spelled chord: its glyph root (B♭) plus the quality
 * as `symbol` carries it (`symbol` itself is ASCII-normalized, "Bbmaj7").
 * The same root + slice idiom the chord glyphs already render with.
 */
export function chordLabel(chord: ChordResult): string {
	return chord.root + chord.symbol.slice(chord.root.length);
}

/**
 * Spells a jazz chord symbol into a fully typed ChordResult: enharmonically
 * correct notes (one letter per scale degree), tagged with interval role,
 * and dual-named with French solfège.
 *
 * Normalizes input accidentals (ASCII #/b and glyphs ♯/♭) and the half-diminished
 * glyph (ø) into a form tonal's Chord.get can parse, then reads tonal's spelled
 * notes directly - tonal is the vetted chord-symbol parser (per CLAUDE.md:
 * never hand-roll regex parsing as the primary path).
 *
 * Pure function: no DOM, no audio, no Svelte imports, so later phases can
 * reuse it freely.
 */
export function spellChord(symbol: string): ChordResult {
	const normalized = normalizeSymbol(symbol);
	const chord = Chord.get(normalized);

	/*
	 * A chord is only recognized when tonal gave us BOTH a root and notes.
	 * `chord.empty` alone is not enough: a rootless quality-only token
	 * ("m7", "ø", "maj7", "dim7", "sus4", "Δ", "°7", "69", "add9", "-7",
	 * "h7", "aug", ...) is not empty - tonal resolves the QUALITY and returns
	 * `{ empty: false, tonic: '', notes: [] }`. Without this guard such a
	 * token became a "recognized" chord with zero notes, which rendered as a
	 * chord result with no notes and no formula (and skipped the did-you-mean
	 * fallback entirely), got stamped as a song chord chip, and - worst -
	 * handed the drill graders an EMPTY target chroma set, which
	 * `matchChord` scored as correct for an empty played set.
	 *
	 * Routing these through the same unrecognized path as garbage input puts
	 * them back on the did-you-mean hint flow, where "m7" reads as the typo
	 * it is (a missing root), not as a chord.
	 */
	if (chord.empty || chord.tonic === null || chord.tonic === '' || chord.notes.length === 0) {
		return {
			input: symbol,
			symbol: '',
			root: '',
			quality: '',
			recognized: false,
			aliases: [],
			notes: [],
			bass: undefined
		};
	}

	/*
	 * DECISION: a slash chord is accepted ONLY when tonal can model the bass
	 * as an inversion over a base chord factor (root fills, root === bass);
	 * everything else is REJECTED via the unrecognized path. This is broader
	 * than just non-chord-tone basses: tonal expresses an inversion as a
	 * rootDegree over the base triad/seventh, so it recognizes C/E, Cmaj7/G,
	 * G7/F, Am7/G (root:"E"/"G"/"F"/"G") but leaves root:"" for
	 *   - non-chord-tone basses (C/D), AND
	 *   - basses on an extension or enharmonic respelling tonal cannot map to
	 *     a rootDegree (C9/D, Cmaj9/D, Cadd9/D, C13/A, Cdim7/A).
	 * In every root:"" case tonal emits a negative bass interval ("-7m" for
	 * C/D) plus, for the extension cases, a duplicate note - either of which
	 * would collapse to roleForDegree's DoS-safe 'root' fallback, collide with
	 * the actual root, and corrupt the re-sort below. This guard (chord.bass
	 * non-empty AND chord.root empty) cleanly routes all of them through the
	 * existing did-you-mean/hint path instead of displaying a mis-modeled note
	 * set. Verified against tonal 6.4.3.
	 */
	if (chord.bass !== '' && chord.root === '') {
		return {
			input: symbol,
			symbol: '',
			root: '',
			quality: '',
			recognized: false,
			aliases: [],
			notes: [],
			bass: undefined
		};
	}

	const notes: SpelledNote[] = chord.notes.map((note, index) => {
		const letter = toAccidentalGlyphs(note);
		return {
			letter,
			solfege: letterToSolfege(letter),
			role: roleForDegree(chord.intervals[index])
		};
	});

	// A genuine slash-chord inversion (chord.bass non-empty): tonal orders
	// `notes` starting from the bass note upward, not in root-position order.
	// Re-sort into root-position role order (root, second, third...) so the
	// lookup/drills always see a canonical root-first spelling; the bass
	// note itself is recorded separately for the explanatory line.
	const isInversion = chord.bass !== '';
	if (isInversion) {
		notes.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
	}

	return {
		input: symbol,
		symbol: chord.symbol,
		root: toAccidentalGlyphs(chord.tonic ?? ''),
		quality: chord.type,
		recognized: true,
		aliases: chord.aliases,
		notes,
		bass: isInversion ? toAccidentalGlyphs(chord.bass) : undefined
	};
}

/**
 * Normalizes chord-symbol accidentals and the half-diminished glyph into the
 * ASCII form tonal's Chord.get accepts. tonal accepts ASCII #/b and the °
 * glyph directly, but not ♯/♭ glyphs or ø - so those are converted here.
 *
 * BUG PIN (chart-vocabulary sweep): three families of PRINTED notation were
 * rejected outright, with no did-you-mean fallback (didYouMean draws only from
 * the 8 QUALITY_SUFFIXES, so it returns null for all of them). Measured
 * against tonal 6.4.3:
 *
 *   C7(b9)  Cm7(b5)  C7(#11)  C7(b5)  C7(#9)  C7(b13)  C(add9)  C7(alt)
 *                                            all UNRECOGNIZED
 *   Cm(maj7)  Cmi(maj7)  Cmin(maj7)  Cmmaj7  C-M7  CmΔ7      all UNRECOGNIZED
 *   C∆  C∆7  CΔ7                                             all UNRECOGNIZED
 *
 * The parenthesised alteration is how a fake book actually prints an altered
 * dominant, and `m(maj7)` is the standard minor ii-V-i tonic the tier-4 blurb
 * advertises, so this was the app's core value failing on its core input.
 *
 * Fixed by mapping printed spellings onto tonal's OWN alias vocabulary and
 * letting tonal do every note computation (per CLAUDE.md: never hand-roll a
 * chord parser). Nothing here derives a pitch. Verified: no chord type in
 * tonal's dictionary has an alias containing "(", ")" or ",", so stripping
 * them cannot shadow a symbol that already worked; and QUALITY_REWRITES
 * applied to tonal's whole alias set rewrites only the six minor-major
 * aliases it already recognizes (mM7, mMaj7, -Δ7, mΔ, -^7, -maj7), each onto
 * the same 1P 3m 5P 7M chord, so every rewrite is idempotent.
 */
function normalizeSymbol(symbol: string): string {
	const ascii = symbol
		.replace(/♯/g, '#')
		.replace(/♭/g, 'b')
		// U+2206 INCREMENT vs U+0394 GREEK CAPITAL DELTA: visually identical,
		// and ∆ is what most keyboards and many engravings emit. tonal only
		// knows the Greek one (Δ, Δ9, Δ#11, -Δ7, mΔ).
		.replace(/∆/g, 'Δ')
		// Printed alteration grouping: C7(b9), Cm7(b5), C7(b9,b13), C(add9).
		.replace(/[(),\s]/g, '')
		.replace(/ø7?/g, 'm7b5');
	return canonicalizeQuality(ascii);
}

/**
 * Splits a chord symbol into root + quality + optional slash bass. The bass
 * group deliberately requires a NOTE after the final slash ([A-G] plus
 * accidentals), so tonal's own slash-bearing quality aliases stay in the
 * quality group: "Cm/ma7" parses as root C + quality "m/ma7" (no bass), and
 * "C6/9" as root C + quality "6/9", while "Cmaj7/G" parses as root C +
 * quality "maj7" + bass "/G".
 */
const SYMBOL_SHAPE = /^([A-Ga-g][#b]{0,2})(.*?)(\/[A-Ga-g][#b]{0,2})?$/;

/**
 * Printed quality spellings rewritten onto the equivalent tonal alias. Each
 * pattern is anchored to the WHOLE quality token, so a rewrite can never fire
 * on a fragment of a longer symbol.
 */
const QUALITY_REWRITES: [RegExp, string][] = [
	// Minor-major seventh: tonal knows mMaj7 / mM7 / mΔ / -Δ7 / -^7 / -maj7,
	// but a chart also prints m(maj7) (-> mmaj7 once the parens are stripped),
	// mi(maj7), min(maj7), -M7 and mΔ7.
	[/^(?:m|mi|min|-)(?:maj|Maj|MAJ|ma|Ma|M)7$/, 'mMaj7'],
	[/^(?:m|mi|min|-)(?:Δ|\^)7?$/, 'mMaj7'],
	// Major seventh written with the delta AND an explicit 7: tonal has Δ, Δ9
	// and Δ#11 but not Δ7.
	[/^Δ7$/, 'Δ'],
	// Sixth-ninth in the minor family: tonal has 6/9 and m69, but not m6/9.
	[/^(?:m|mi|min|-)6\/9$/, 'm69']
];

/**
 * Rewrites the quality token of a chord symbol onto tonal's canonical alias
 * when it is a printed spelling tonal does not list. Root and slash bass are
 * passed through byte-identical, and a symbol whose shape does not match (or
 * whose quality matches no rewrite) is returned unchanged, so this is a no-op
 * for every symbol that already parsed.
 */
function canonicalizeQuality(symbol: string): string {
	const shape = SYMBOL_SHAPE.exec(symbol);
	if (shape === null) return symbol;
	const [, root, quality, bass = ''] = shape;
	for (const [pattern, replacement] of QUALITY_REWRITES) {
		if (pattern.test(quality)) return `${root}${replacement}${bass}`;
	}
	return symbol;
}

/** Converts tonal's ASCII accidentals back to display glyphs (♯ ♭). */
function toAccidentalGlyphs(note: string): string {
	return note.replace(/#/g, '♯').replace(/b/g, '♭');
}

/** Degree-class role per simple scale degree (1..7). */
const ROLE_BY_SIMPLE_DEGREE: Record<number, IntervalRole> = {
	1: 'root',
	2: 'second',
	3: 'third',
	4: 'fourth',
	5: 'fifth',
	6: 'sixth',
	7: 'seventh'
};

/**
 * Canonical root-position ordering for IntervalRole, used to re-sort a slash
 * chord's bass-first note order (tonal's default) back into root-position
 * order (root, second, third, fourth, fifth, sixth, seventh).
 */
const ROLE_ORDER: Record<IntervalRole, number> = {
	root: 1,
	second: 2,
	third: 3,
	fourth: 4,
	fifth: 5,
	sixth: 6,
	seventh: 7
};

/**
 * Derives the interval role from tonal's interval string, e.g. "1P" -> root,
 * "3m" -> third, "5d" -> fifth, "7m" -> seventh, "4P" -> fourth. Compound
 * extensions map down to their simple degree class (9 -> second,
 * 11 -> fourth, 13 -> sixth), so extended/suspended chords and scale degrees
 * all render through the same seven-color pipeline. The scale-degree number
 * is always the leading digit(s) of the string.
 */
function roleForDegree(interval: string): IntervalRole {
	const degree = parseInt(interval, 10);
	if (Number.isNaN(degree) || degree < 1) {
		// Unparseable degree: fall back to root rather than throwing, keeping
		// spellChord total per the DoS threat mitigation (recognized:false
		// path, never crash).
		return 'root';
	}
	const simple = ((degree - 1) % 7) + 1;
	return ROLE_BY_SIMPLE_DEGREE[simple] ?? 'root';
}
