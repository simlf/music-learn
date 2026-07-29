import { currentLocale } from '$lib/i18n/locale.svelte';
import { chromaOf, toAsciiAccidentals } from './interval';
import { spellChord } from './chord';
import { letterToSolfege } from './solfege';
import type { ChordResult } from './types';

/**
 * Confusion-contrast feedback (Track D contract, R6 proposal #3): when the
 * user picks the wrong chord symbol, name the exact notes that separate the
 * two chords in ONE plain line, e.g. "Cm7 has E♭, C7 has E." Contrastive
 * feedback targets the boundary the learner failed to encode, which beats
 * merely showing the right answer.
 *
 * Pure function (no DOM, no audio, no Svelte) built on spellChord, so it
 * inherits tonal's alias and enharmonic handling. Total: invalid input,
 * equal/enharmonically-equal chords, or a diff too wide for one line all
 * return null rather than throwing or emitting mush.
 */

/** A chord's pitch-class set, from its spelled glyph letters. */
function chromaSet(chord: ChordResult): Set<number> {
	const chromas = chord.notes
		.map((note) => chromaOf(note.letter))
		.filter((chroma): chroma is number => chroma !== undefined);
	return new Set(chromas);
}

/**
 * Display form of a chord symbol: glyph-accidental root + untouched ASCII
 * quality suffix (the "b" in "m7b5" is quality spelling, not an accidental).
 * Mirrors aliasLine's glyphSymbol rebuild in chordPresentation.ts.
 */
function displaySymbol(chord: ChordResult): string {
	const asciiRoot = toAsciiAccidentals(chord.root);
	return chord.symbol.startsWith(asciiRoot)
		? chord.root + chord.symbol.slice(asciiRoot.length)
		: chord.symbol;
}

/** The spelled letters of `chord` whose pitch class is absent from `other`. */
function notesMissingFrom(chord: ChordResult, other: Set<number>): string[] {
	return chord.notes
		.filter((note) => {
			const chroma = chromaOf(note.letter);
			return chroma !== undefined && !other.has(chroma);
		})
		.map((note) => note.letter);
}

/**
 * Joins 1-2 note letters for prose: "E♭" or "G and B♭" (EN) / "G et B♭" (FR).
 * The note letters themselves stay immune (glyph accidentals preserved); only
 * the connective word is localized.
 */
function joinNotes(letters: string[]): string {
	const connective = currentLocale() === 'fr' ? ' et ' : ' and ';
	return letters.join(connective);
}

/** At most this many differing notes per side still reads as one line. */
const MAX_NOTES_PER_SIDE = 2;

/**
 * One-line contrast between the correct chord and the chord the user gave.
 *
 * Same root: names the differing note(s) plainly ("Cm7 has E♭, C7 has E.";
 * "C7 has B♭, C does not."). Different roots: contrasts the roots with
 * solfege for the French reader ("Cm7 is built on C (Do), Dm7 on D (Ré).").
 * Returns null when either symbol is invalid, the chords are the same set of
 * pitches (including enharmonic respellings), or the diff needs more than
 * one line to say cleanly.
 *
 * Locale-aware (I18N-02, mirroring $lib/copy/mnemonics): the connective prose
 * ("has"/"a", "is built on"/"est bâti sur", "does not"/"non", "and"/"et")
 * follows `currentLocale()`; chord symbols, note letters, and solfège
 * syllables stay immune and are interpolated verbatim in both locales.
 */
export function contrastLine(correctSymbol: string, givenSymbol: string): string | null {
	const correct = spellChord(correctSymbol);
	const given = spellChord(givenSymbol);
	if (!correct.recognized || !given.recognized) return null;

	const correctChromas = chromaSet(correct);
	const givenChromas = chromaSet(given);
	if (correctChromas.size === 0 || givenChromas.size === 0) return null;

	const sameSet =
		correctChromas.size === givenChromas.size &&
		[...correctChromas].every((chroma) => givenChromas.has(chroma));
	if (sameSet) return null;

	const correctName = displaySymbol(correct);
	const givenName = displaySymbol(given);

	const correctRootChroma = chromaOf(correct.root);
	const givenRootChroma = chromaOf(given.root);
	if (correctRootChroma === undefined || givenRootChroma === undefined) return null;

	const fr = currentLocale() === 'fr';

	if (correctRootChroma !== givenRootChroma) {
		const correctRoot = `${correct.root} (${letterToSolfege(correct.root)})`;
		const givenRoot = `${given.root} (${letterToSolfege(given.root)})`;
		// "Cm7 est bâti sur C (Do), Dm7 sur D (Ré)." - chord names, root letters
		// and solfège syllables stay immune; only the connective prose is French.
		return fr
			? `${correctName} est bâti sur ${correctRoot}, ${givenName} sur ${givenRoot}.`
			: `${correctName} is built on ${correctRoot}, ${givenName} on ${givenRoot}.`;
	}

	const onlyCorrect = notesMissingFrom(correct, givenChromas);
	const onlyGiven = notesMissingFrom(given, correctChromas);
	if (onlyCorrect.length > MAX_NOTES_PER_SIDE || onlyGiven.length > MAX_NOTES_PER_SIDE) {
		return null;
	}

	if (onlyCorrect.length > 0 && onlyGiven.length > 0) {
		return fr
			? `${correctName} a ${joinNotes(onlyCorrect)}, ${givenName} a ${joinNotes(onlyGiven)}.`
			: `${correctName} has ${joinNotes(onlyCorrect)}, ${givenName} has ${joinNotes(onlyGiven)}.`;
	}
	if (onlyCorrect.length > 0) {
		return fr
			? `${correctName} a ${joinNotes(onlyCorrect)}, ${givenName} non.`
			: `${correctName} has ${joinNotes(onlyCorrect)}, ${givenName} does not.`;
	}
	if (onlyGiven.length > 0) {
		return fr
			? `${givenName} a ${joinNotes(onlyGiven)}, ${correctName} non.`
			: `${givenName} has ${joinNotes(onlyGiven)}, ${correctName} does not.`;
	}
	return null;
}
