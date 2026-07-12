import { Interval } from 'tonal';
import type { ChordResult, IntervalRole } from '$lib/theory/types';

/**
 * A single entry in a chord's interval-formula readout: the root is always
 * labeled "R"; other tones get a quality-first label ("m3", "P5", "m7")
 * derived from tonal's Interval.distance between the chord's root and each
 * spelled note. Pure presentation shape - not a theory-engine responsibility
 * (types.ts owns ChordResult's contract).
 */
export interface FormulaEntry {
	role: IntervalRole;
	label: string;
	letter: string;
	solfege: string;
}

/** tonal's Interval.distance only understands ASCII accidentals (#/b), not display glyphs (♯/♭). */
function toAsciiAccidentals(letter: string): string {
	return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
}

/**
 * Interval-formula readout: root shown as "R", other tones as quality-first
 * labels ("m3", "P5", "m7") derived from tonal's Interval.distance between
 * the chord's root and each spelled note. Extracted from the showcase page
 * (Phase 1) so the lookup page and Phase 3 drills can share it - a pure
 * presentation concern, not a theory-engine responsibility.
 */
export function formulaFor(chord: ChordResult): FormulaEntry[] {
	const rootAscii = toAsciiAccidentals(chord.root);
	return chord.notes.map((note) => {
		if (note.role === 'root') {
			return { role: note.role, label: 'R', letter: note.letter, solfege: note.solfege };
		}
		const raw = Interval.distance(rootAscii, toAsciiAccidentals(note.letter));
		const match = raw.match(/^(\d+)([A-Za-z]+)$/);
		const label = match ? `${match[2]}${match[1]}` : raw;
		return { role: note.role, label, letter: note.letter, solfege: note.solfege };
	});
}

/**
 * Alias-equivalence line: tonal's ChordResult.aliases are quality suffixes
 * only (e.g. "m7", "min7", "-7"), not full symbols - so each is prefixed
 * with the chord's root here. Includes the resolved symbol itself first,
 * deduplicated, to always read as "Cm7 = C-7 = Cmin7" regardless of which
 * alias the user typed. Returns just the symbol (no trailing " = ") when
 * there are no aliases.
 */
export function aliasLine(chord: ChordResult): string {
	// tonal echoes `symbol` in ASCII accidental form ("Bbmaj7", "F#m7b5")
	// while `root` is glyph-converted ("B♭", "F♯"). Rebuild the symbol on the
	// glyph root (root-aware, so quality suffixes like "b5" stay untouched)
	// or the Set dedupe below never collapses "Bbmaj7" against "B♭maj7".
	const asciiRoot = toAsciiAccidentals(chord.root);
	const glyphSymbol = chord.symbol.startsWith(asciiRoot)
		? chord.root + chord.symbol.slice(asciiRoot.length)
		: chord.symbol;
	const forms = [glyphSymbol, ...chord.aliases.map((alias) => chord.root + alias)];
	return [...new Set(forms)].join(' = ');
}
