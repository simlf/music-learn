import {
	intervalBetween,
	intervalFromShort,
	toAsciiAccidentals,
	toGlyphAccidentals
} from '$lib/theory/interval';
import type { ChordResult, IntervalRole } from '$lib/theory/types';
import { currentLocale, t } from '$lib/i18n/locale.svelte';

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

/** One gap between two stacked-thirds tones: the connective interval marker and its French long name for tooltip/aria. */
export interface StackedGap {
	/** Neutral connective marker between adjacent tones, e.g. "+m3". */
	label: string;
	/** French long name for tooltip/aria ("tierce mineure"). */
	longFr: string;
}

/** Stacked-thirds derivation: tones keep formulaFor's root-relative role/label; gaps name the distance between adjacent tones. */
export interface StackedThirds {
	tones: FormulaEntry[];
	gaps: StackedGap[];
}

/**
 * Rotates a chord's spelled notes so the note whose role === startRole leads
 * (wraps the tail around to the front). Falls back to the original,
 * unrotated array when no note carries that role (e.g. a triad has no
 * 'seventh'). Pure array rotation - no semitone math, no mutation.
 */
function rotateNotesToRole(notes: ChordResult['notes'], startRole: IntervalRole) {
	const startIndex = notes.findIndex((note) => note.role === startRole);
	if (startIndex <= 0) return notes;
	return [...notes.slice(startIndex), ...notes.slice(0, startIndex)];
}

/**
 * Stacked-thirds sibling of formulaFor: `tones` is formulaFor's output
 * verbatim (root-relative role/label/letter/solfege, no recompute), while
 * `gaps` name the interval between each adjacent pair of chord tones
 * (structural, not root-relative) via the same shared intervalBetween
 * WhyTheseNotes already uses - one naming path, no second interval engine.
 * Total: an unrecognized chord (empty notes) yields empty tones and gaps,
 * never throws.
 *
 * Optional `startRole` (Phase 35, INV-02) rotates the tone/gap row to start
 * at the note carrying that role instead of the canonical root-first order -
 * used by the inversion drill's "stack from the bass" hint rung. Tone
 * role/letter/solfege are preserved per note (only order changes): the
 * rotated notes are run back through formulaFor (root-relative labels stay
 * correct since chord.root is untouched) and gaps are recomputed via the
 * SAME intervalBetween loop over the rotated notes' consecutive pairs, so a
 * genuine non-third gap can appear mid-row and falls into the existing
 * 'other' neutral gap state - no hand-rolled semitone math. Omitting
 * startRole (or passing a role no note carries, e.g. 'seventh' on a triad)
 * executes the exact unrotated code path - byte-identical to before.
 */
export function stackedThirdsFor(chord: ChordResult, startRole?: IntervalRole): StackedThirds {
	const notes = startRole ? rotateNotesToRole(chord.notes, startRole) : chord.notes;
	const tones = formulaFor({ ...chord, notes });
	const gaps: StackedGap[] = notes.slice(0, -1).map((note, i) => {
		const info = intervalBetween(note.letter, notes[i + 1].letter);
		return { label: '+' + info.short, longFr: info.longFr };
	});
	return { tones, gaps };
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
/**
 * The bare letter name of a spelled note: "E♭" -> "E", "B♭♭" -> "B".
 * SpelledNote.letter is always one uppercase A..G followed by zero or more
 * accidental glyphs (never ASCII #/b, per SpelledNote's contract), so the
 * first character IS the letter name.
 */
function letterNameOf(spelled: string): string {
	return spelled.charAt(0);
}

/**
 * The lookup panel's "why is the third spelled THAT way?" sentence, generated
 * from the chord's own spelled third rather than from a worked example.
 *
 * The copy this replaced was written for the Am7 / Amaj7 duo (C vs C♯) and
 * then reused for every chord: it asserted a minor third "gives the natural
 * note, not the sharp" and a major third "gives the sharp note", which is
 * false for Cm7 (E♭ is a flat) and for Fmaj7 (A is natural). It held for only
 * 6 of 12 roots minor / 5 of 12 major.
 *
 * The true mechanism, and what this sentence now teaches for EVERY root: the
 * interval NUMBER counts letter names (a third always spans three, so from
 * {root} the answer is some kind of {letter}), and the interval QUALITY counts
 * half steps (which picks the accidental). That is why 3 semitones above C is
 * E♭ and not D♯: D♯ would span only two letter names (C, D) and be a second.
 *
 * Every number and letter in the sentence comes from the chord's own
 * intervalBetween(root, third) / spelled third, so it cannot drift from the
 * formula row or the keyboard above it. Locale-aware via the interval module's
 * own long names (`long` / `longFr`), matching formulaSentence's diction.
 *
 * Total: a chord with no third role (a sus4, an unrecognized chord) returns
 * "", never throws.
 */
export function thirdSpellingSentence(chord: ChordResult): string {
	const third = chord.notes.find((note) => note.role === 'third');
	if (!third) return '';
	const info = intervalBetween(chord.root, third.letter);
	if (info.short === '') return '';
	const qualityName = currentLocale() === 'fr' ? info.longFr : info.long;
	return t('home.why.third-step')
		.replaceAll('{QUALITY}', qualityName)
		.replaceAll('{SEMI}', String(info.semitones))
		.replaceAll('{ROOT}', chord.root)
		.replaceAll('{DEGREE}', letterNameOf(third.letter));
}

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
