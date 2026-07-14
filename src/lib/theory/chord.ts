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
			notes: []
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

	return {
		input: symbol,
		symbol: chord.symbol,
		root: toAccidentalGlyphs(chord.tonic ?? ''),
		quality: chord.type,
		recognized: true,
		aliases: chord.aliases,
		notes
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
