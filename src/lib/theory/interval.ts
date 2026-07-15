import { Interval, Note } from 'tonal';
import type { IntervalRole } from './types';

/**
 * Pure interval naming and arithmetic for every surface that talks about
 * intervals: the lookup formula row, the drills feedback, the keyboard's
 * inspect mode, the interval recognition drill, and the /scales explorer.
 *
 * Same purity rules as the rest of src/lib/theory: no DOM, no audio, no
 * Svelte imports. Built on tonal's Interval/Note, with the app's naming
 * conventions on top: quality-first shorthand primary ("m3", "P5", "A4"),
 * gender-correct French long name secondary ("tierce mineure").
 */

/** One interval, fully named for every UI surface. */
export interface IntervalInfo {
	/** Quality-first shorthand, the app's primary label: "m3", "P5", "A4". Unison reads "R". */
	short: string;
	/** English long name: "minor 3rd". Unison reads "root". */
	long: string;
	/** French long name, the secondary label: "tierce mineure". Gender agreement baked in. */
	longFr: string;
	/** Interval degree number as tonal reports it (compounds keep their compound number, e.g. 9). */
	degree: number;
	/** Tonal quality letter(s): P | M | m | A | d (dd/AA possible for exotic spellings). */
	quality: string;
	/** Semitone count: 0..12 for the v1 simple-interval space. -1 in the empty (unparseable) info. */
	semitones: number;
	/** Degree-class color key, mapping straight onto IntervalChip / keyboard fills. 9 maps to second, 11 to fourth, 13 to sixth. */
	role: IntervalRole;
	/** Tonal's native name ("3m"), kept for round-tripping into Note.transpose. */
	tonalName: string;
}

/**
 * Shared glyph-to-ASCII accidental normalization (♯ -> #, ♭ -> b), exported
 * here to retire the private copies previously duplicated across
 * chordPresentation, matchChord, keyboardLayout, and the drills page.
 */
export function toAsciiAccidentals(letter: string): string {
	return letter.replace(/♯/g, '#').replace(/♭/g, 'b');
}

/** Converts tonal's ASCII accidentals back to display glyphs (♯ ♭). */
function toGlyphAccidentals(note: string): string {
	return note.replace(/#/g, '♯').replace(/b/g, '♭');
}

/** The recognizable "unparseable input" value: total functions return this instead of throwing. */
const EMPTY_INTERVAL: IntervalInfo = {
	short: '',
	long: '',
	longFr: '',
	degree: 0,
	quality: '',
	semitones: -1,
	role: 'root',
	tonalName: ''
};

/**
 * French degree nouns. All feminine (seconde, tierce, quarte, quinte, sixte,
 * septième, octave, neuvième...), so the feminine quality adjectives below
 * agree without string surgery. The unison slot uses the chord-context name
 * "fondamentale" (also feminine), matching the "R" shorthand.
 */
const FRENCH_DEGREE_NOUNS: Record<number, string> = {
	1: 'fondamentale',
	2: 'seconde',
	3: 'tierce',
	4: 'quarte',
	5: 'quinte',
	6: 'sixte',
	7: 'septième',
	8: 'octave',
	9: 'neuvième',
	10: 'dixième',
	11: 'onzième',
	12: 'douzième',
	13: 'treizième'
};

/** Feminine French quality adjectives, agreeing with the feminine nouns above. */
const FRENCH_QUALITIES: Record<string, string> = {
	P: 'juste',
	M: 'majeure',
	m: 'mineure',
	A: 'augmentée',
	d: 'diminuée',
	AA: 'doublement augmentée',
	dd: 'doublement diminuée'
};

const ENGLISH_QUALITIES: Record<string, string> = {
	P: 'perfect',
	M: 'major',
	m: 'minor',
	A: 'augmented',
	d: 'diminished',
	AA: 'doubly augmented',
	dd: 'doubly diminished'
};

const ENGLISH_ORDINALS: Record<number, string> = {
	2: '2nd',
	3: '3rd',
	4: '4th',
	5: '5th',
	6: '6th',
	7: '7th',
	8: 'octave',
	9: '9th',
	10: '10th',
	11: '11th',
	12: '12th',
	13: '13th'
};

/**
 * The v1 interval-drill pool (R4): the chord-tone intervals plus their
 * neighbors. Every entry has a unique semitone count, so multiple-choice
 * options can never collide enharmonically (A4/d5 style).
 */
export const DRILL_INTERVALS: readonly string[] = [
	'm2',
	'M2',
	'm3',
	'M3',
	'P4',
	'A4',
	'P5',
	'm6',
	'M6',
	'm7',
	'M7',
	'P8'
] as const;

/** Degree-class role: 1/8 -> root, 2/9 -> second, ... via simple-degree arithmetic. */
function roleForDegree(degree: number): IntervalRole {
	const ROLE_BY_SIMPLE: Record<number, IntervalRole> = {
		1: 'root',
		2: 'second',
		3: 'third',
		4: 'fourth',
		5: 'fifth',
		6: 'sixth',
		7: 'seventh'
	};
	const simple = ((degree - 1) % 7) + 1;
	return ROLE_BY_SIMPLE[simple] ?? 'root';
}

/** Builds the full IntervalInfo from tonal's Interval.get shape; null-ish fields yield the empty info. */
function infoFromTonal(interval: ReturnType<typeof Interval.get>): IntervalInfo {
	if (interval.empty || interval.num === null || interval.semitones === null) {
		return EMPTY_INTERVAL;
	}
	const degree = Math.abs(interval.num);
	const quality = interval.q;
	const isUnison = degree === 1 && quality === 'P';
	const noun = FRENCH_DEGREE_NOUNS[degree] ?? `${degree}`;
	const frQuality = FRENCH_QUALITIES[quality] ?? quality;
	const enQuality = ENGLISH_QUALITIES[quality] ?? quality;
	const ordinal = ENGLISH_ORDINALS[degree] ?? `${degree}th`;
	return {
		short: isUnison ? 'R' : `${quality}${degree}`,
		long: isUnison ? 'root' : `${enQuality} ${ordinal}`,
		longFr: isUnison ? noun : `${noun} ${frQuality}`,
		degree,
		quality,
		semitones: Math.abs(interval.semitones),
		role: roleForDegree(degree),
		tonalName: interval.name
	};
}

/**
 * Ascending interval from noteA to noteB, pitch-class based (octave-agnostic,
 * matching matchChord's chroma semantics). Accepts display glyphs or ASCII.
 * Total: unparseable input returns a recognizable empty IntervalInfo rather
 * than throwing.
 */
export function intervalBetween(noteA: string, noteB: string): IntervalInfo {
	const distance = Interval.distance(toAsciiAccidentals(noteA), toAsciiAccidentals(noteB));
	return infoFromTonal(Interval.get(distance));
}

/**
 * Preference score for the enharmonic pick below: plain qualities (P/M/m)
 * beat altered ones (A/d), which beat exotic ones (dd/AA); then a smaller
 * alteration wins. Lower is better.
 */
function enharmonicScore(info: IntervalInfo): number {
	if (info.short === '') return Number.POSITIVE_INFINITY;
	const rank = ['P', 'M', 'm'].includes(info.quality)
		? 0
		: ['A', 'd'].includes(info.quality)
			? 1
			: 2;
	const alt = Math.abs(Interval.get(info.tonalName).alt ?? 0);
	return rank * 10 + alt;
}

/**
 * Interval from a root to a keyboard key. Strings resolve like
 * intervalBetween; a black-key pair picks whichever enharmonic spelling
 * yields the simpler quality from this root (prefer P/M/m over A/d, then the
 * smaller alteration, then the sharp spelling on a full tie), so tapping the
 * F♯/G♭ key over a C root reads "A4, quarte augmentée" rather than an
 * arbitrarily chosen d5. Feeds PianoKeyboard's inspect mode.
 */
export function intervalFromRoot(
	root: string,
	key: string | { sharpLetter: string; flatLetter: string }
): IntervalInfo {
	if (typeof key === 'string') {
		return intervalBetween(root, key);
	}
	const sharpInfo = intervalBetween(root, key.sharpLetter);
	const flatInfo = intervalBetween(root, key.flatLetter);
	return enharmonicScore(flatInfo) < enharmonicScore(sharpInfo) ? flatInfo : sharpInfo;
}

/** Converts the app's quality-first shorthand ("m3", "P8", "R") to tonal's native name ("3m", "8P", "1P"). */
function shortToTonalName(short: string): string | null {
	if (short === 'R') return '1P';
	const match = short.match(/^([PMmAd]{1,2})(\d{1,2})$/);
	if (!match) return null;
	return `${match[2]}${match[1]}`;
}

/**
 * Spelled target for drill generation: transposeFrom("C", "m3") returns "E♭"
 * (display glyphs). Total: an unparseable root or short name returns "".
 */
export function transposeFrom(root: string, short: string): string {
	const tonalName = shortToTonalName(short);
	if (tonalName === null) return '';
	const target = Note.transpose(toAsciiAccidentals(root), tonalName);
	return toGlyphAccidentals(target);
}

/**
 * Full IntervalInfo for a quality-first short name ("m3", "P8"): what the
 * interval drill generator uses to turn a DRILL_INTERVALS draw into a
 * question payload. Total: junk input returns the empty IntervalInfo.
 */
export function intervalFromShort(short: string): IntervalInfo {
	const tonalName = shortToTonalName(short);
	if (tonalName === null) return EMPTY_INTERVAL;
	return infoFromTonal(Interval.get(tonalName));
}

/**
 * Plain-English phrasing for a CONSECUTIVE-note interval (Phase 12 D-03):
 * "stack a minor 3rd", "step a whole step". Delegates to intervalFromShort's
 * `.long` field for every case except scale-step seconds, which
 * `opts.asScaleStep` overrides to the scale-degree vocabulary ("whole step" /
 * "half step") rather than "major 2nd" / "minor 2nd" — every other degree
 * (thirds, fourths, etc.) is unaffected by asScaleStep. Total: unparseable
 * input returns the empty string (matching EMPTY_INTERVAL.long), never
 * throws.
 */
export function phraseStep(short: string, opts?: { asScaleStep?: boolean }): string {
	const info = intervalFromShort(short);
	if (opts?.asScaleStep && info.degree === 2) {
		if (info.quality === 'M') return 'whole step';
		if (info.quality === 'm') return 'half step';
	}
	return info.long;
}
