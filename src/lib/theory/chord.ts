import { Chord } from 'tonal';
import { letterToSolfege } from './solfege';
import type { ChordResult, IntervalRole, SpelledNote } from './types';

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

	if (chord.empty) {
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
 */
function normalizeSymbol(symbol: string): string {
	return symbol
		.replace(/♯/g, '#')
		.replace(/♭/g, 'b')
		.replace(/ø7?/g, 'm7b5');
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
