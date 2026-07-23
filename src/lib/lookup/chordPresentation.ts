import {
	intervalBetween,
	intervalFromShort,
	toAsciiAccidentals,
	toGlyphAccidentals
} from '$lib/theory/interval';
import type { ChordResult, IntervalRole } from '$lib/theory/types';
import { currentLocale } from '$lib/i18n/locale.svelte';

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

/**
 * Full glyph-form display symbol for a resolved chord. tonal echoes
 * `chord.symbol` in ASCII accidental form ("Abmaj7", "Abmaj7/Eb") while
 * `chord.root` is glyph-converted ("A♭"). Rebuild the symbol on the glyph
 * root (root-aware, so quality suffixes like "b5" stay untouched) and, for a
 * slash chord, glyph-convert the bass segment after the final "/" (quality
 * suffixes always precede the slash, so lastIndexOf is safe). Use this for
 * every display surface (the ChordGlyph quality suffix, the slash-explain
 * base symbol); keep `chord.symbol` itself ASCII for drill seeds,
 * recent-lookups, and spellChord round-trips.
 */
export function displaySymbol(chord: ChordResult): string {
	const asciiRoot = toAsciiAccidentals(chord.root);
	const glyphBody = chord.symbol.startsWith(asciiRoot)
		? chord.root + chord.symbol.slice(asciiRoot.length)
		: chord.symbol;
	const slashIndex = glyphBody.lastIndexOf('/');
	if (slashIndex === -1) return glyphBody;
	return `${glyphBody.slice(0, slashIndex)}/${toGlyphAccidentals(glyphBody.slice(slashIndex + 1))}`;
}

/**
 * Layer 2's generated (never hardcoded) plain-English formula sentence:
 * "From the root, stack a minor 3rd, then a diminished 5th." Built from
 * formulaFor's entries beyond the root, each rendered through the shared
 * intervalFromShort(...).long vocabulary (the same diction BuildSession's
 * construction steps use, BUILD-03), joined by one general template so a
 * triad (2 tones) and a seventh chord (3 tones) both fall out of the same
 * join with no per-count branching or per-chord literals. Total: an
 * unrecognized chord (empty notes) yields "", never throws.
 *
 * Locale-aware (Phase 17 copy translated for full i18n consistency): the
 * French variant uses each interval's `longFr` name and the feminine
 * "une ... , puis une ..." template (tierce/quinte/septième are all feminine),
 * mirroring the diction BuildSession's French construction steps use. Interval
 * shorthand / chord symbols stay immune; only the connective prose changes.
 */
export function formulaSentence(chord: ChordResult): string {
	const isFr = currentLocale() === 'fr';
	const longs = formulaFor(chord)
		.filter((entry) => entry.role !== 'root')
		.map((entry) => {
			const info = intervalFromShort(entry.label);
			return isFr ? info.longFr : info.long;
		});
	if (longs.length === 0) return '';
	if (isFr) {
		return `À partir de la fondamentale, empile une ${longs.join(', puis une ')}.`;
	}
	return `From the root, stack a ${longs.join(', then a ')}.`;
}
