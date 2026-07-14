import { intervalBetween, toAsciiAccidentals } from '$lib/theory/interval';
import type { ChordResult, IntervalRole } from '$lib/theory/types';

/**
 * A single entry in a chord's interval-formula readout: the root is always
 * labeled "R"; other tones get a quality-first label ("m3", "P5", "m7")
 * derived from the shared interval module. Pure presentation shape - not a
 * theory-engine responsibility (types.ts owns ChordResult's contract).
 */
export interface FormulaEntry {
	role: IntervalRole;
	label: string;
	/** French long name for tooltips/aria ("tierce mineure"; "fondamentale" for the root). */
	longFr: string;
	letter: string;
	solfege: string;
}

/**
 * Interval-formula readout: root shown as "R", other tones as quality-first
 * labels ("m3", "P5", "m7"). Naming now comes from the shared
 * $lib/theory/interval module (one naming source for the lookup formula,
 * drill feedback, inspect register, and interval drill); the note's own
 * role tag from spellChord is kept as the color key.
 */
export function formulaFor(chord: ChordResult): FormulaEntry[] {
	return chord.notes.map((note) => {
		const info = intervalBetween(chord.root, note.letter);
		return {
			role: note.role,
			label: info.short,
			longFr: info.longFr,
			letter: note.letter,
			solfege: note.solfege
		};
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
