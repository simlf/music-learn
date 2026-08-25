import { Scale } from 'tonal';
import {
	chromaOf,
	intervalFromRoot,
	toAsciiAccidentals,
	toGlyphAccidentals,
	transposeFrom
} from './interval';
import { letterToSolfege } from './solfege';
import type { ChordResult, IntervalRole } from './types';

/**
 * Chord-scale mapping for the Lookup improvisation guide (design doc
 * `.planning/design/improvisation.md`, shape 3): given a decoded chord
 * symbol, answer "what can I play over this?" with the scale(s) that fit,
 * every note tagged as chord tone, color tone, or handle-with-care.
 *
 * Pure and tonal-backed like chord.ts/scale.ts: tonal's Scale.get is the
 * vetted source of mode spellings (D dorian keeps its F♯), and every
 * "careful" tag is DERIVED from one rule rather than hardcoded per scale:
 * a scale note one half step above a chord tone rubs against the chord when
 * held on a strong beat. That single rule reproduces the classic avoid
 * notes (the 4 over a major seventh, the 4 over a dominant, the ♭6 in
 * aeolian, the ♭2 in locrian) and correctly leaves dorian and the minor
 * pentatonic without any, which is exactly the pedagogy the guide teaches.
 *
 * Reference only (design doc 5.3): no FactKind, no Mode, no Dexie schema,
 * no drill. The mode name is a label on the answer, never the lesson.
 */

/** How the guide treats one scale note. */
export type ImprovKind = 'chord-tone' | 'color' | 'careful';

/** One scale note of a chord-scale answer, render-ready for PianoKeyboard. */
export interface ImprovNote {
	/** Letter name with accidental glyphs, e.g. "F♯". Never ASCII #/b. */
	letter: string;
	/** French solfège syllable for the letter. */
	solfege: string;
	/** Scale-degree class within THIS scale (degree 1 = the chord root). */
	role: IntervalRole;
	/**
	 * Jazz-facing label. Chord tones use the app's interval shorthand from
	 * the root ("R", "M3", "P5", "m7"), matching PianoKeyboard's badge
	 * vocabulary; non-chord scale tones use tension naming ("9", "11",
	 * "♯11", "13", "♭13", "♭7"), which is the vocabulary the guide teaches.
	 */
	label: string;
	/** Chord tone (skeleton), color tone (tension), or handle-with-care. */
	kind: ImprovKind;
	/**
	 * For a 'careful' note: the chord-tone letter sitting one half step
	 * BELOW it, i.e. the note it rubs against. Undefined otherwise.
	 */
	clashesWith?: string;
	/**
	 * For a 'careful' note: that chord tone's interval shorthand from the
	 * chord root ("M3", "P5", "m7", "R"), i.e. WHICH member of the chord is
	 * being rubbed. The panel names it, because "F rubs on E" only lands once
	 * the player knows E is the 3rd that makes the chord major.
	 */
	clashesWithLabel?: string;
	/**
	 * For a 'careful' note: the degree class of that chord tone, so the copy
	 * can say what is at stake (the 3rd carries the chord's identity, the root
	 * is its floor) instead of one sentence reused for every note.
	 */
	clashesWithRole?: IntervalRole;
	/**
	 * For a 'careful' note whose rub is quality-specific: a context where the
	 * same note is idiomatic rather than careful, so the panel never reads as
	 * "never play this". Only set where the engine can honestly name one:
	 * 'dominant-blues' is the 4/11 against a major 3rd (F over Cmaj7 is the
	 * classic rub, F over C7 in a blues is expected).
	 */
	fineOn?: 'dominant-blues';
}

/** The scale identities the guide can recommend. */
export type ChordScaleId =
	| 'ionian'
	| 'lydian'
	| 'mixolydian'
	| 'dorian'
	| 'aeolian'
	| 'minor-pentatonic'
	| 'locrian';

/** One recommended scale over the chord, first in the list = the default. */
export interface ChordScaleOption {
	id: ChordScaleId;
	/** The scale's tonic: always the chord root, in display glyphs. */
	tonic: string;
	/** The scale ascending from the tonic, every note tagged. */
	notes: ImprovNote[];
}

/** Chord family driving the scale choice and the explainer copy. */
export type ChordFamily =
	| 'major'
	| 'dominant'
	| 'minor'
	| 'half-diminished'
	| 'diminished'
	| 'sus';

/** The full improvisation answer for one chord symbol. */
export interface ImprovGuide {
	family: ChordFamily;
	/**
	 * Recommended scales, default first. Empty for the diminished family:
	 * the honest beginner answer there is the chord tones plus caution
	 * (design doc 5.2), not a symmetric-scale lecture.
	 */
	scales: ChordScaleOption[];
	/**
	 * For the major family only: the ♭7 of the root (B♭ over C), the note
	 * OUTSIDE the recommended scale that still sounds right because it
	 * borrows the dominant/blues color. Feeds the blue-note explainer.
	 */
	blueNote?: string;
	/**
	 * The chord tone a half step away from the blue ♭7, when the symbol holds
	 * one: the major 7th on Cmaj7 ("B"), the 6th on C6 ("A"). Whichever degree
	 * it is, the blue note then contradicts a note the left hand is sounding,
	 * so the explainer says "passing, or with that tone left out" rather than
	 * the unqualified "it works" that is only true over a plain triad.
	 */
	blueNoteRubsWith?: string;
}

/** tonal scale-type name per ChordScaleId. */
const TONAL_SCALE_NAMES: Record<ChordScaleId, string> = {
	ionian: 'ionian',
	lydian: 'lydian',
	mixolydian: 'mixolydian',
	dorian: 'dorian',
	aeolian: 'aeolian',
	'minor-pentatonic': 'minor pentatonic',
	locrian: 'locrian'
};

/** Scales offered per family, default first (design doc 5.2: one mapping, few colors). */
const SCALES_BY_FAMILY: Record<Exclude<ChordFamily, 'diminished'>, ChordScaleId[]> = {
	major: ['ionian', 'lydian'],
	dominant: ['mixolydian'],
	sus: ['mixolydian'],
	minor: ['dorian', 'aeolian', 'minor-pentatonic'],
	'half-diminished': ['locrian']
};

/**
 * Tension label per chroma distance from the root, for scale notes that are
 * NOT chord tones. 3/4 (a third) and 10/11 (a seventh) appear only when the
 * symbol itself omits that degree (triads, pentatonic subsets); they read as
 * the plain degree, not as a tension.
 */
const TENSION_LABEL_BY_CHROMA: Record<number, string> = {
	1: '♭9',
	2: '9',
	3: '♯9',
	4: '3',
	5: '11',
	6: '♯11',
	7: '5',
	8: '♭13',
	9: '13',
	10: '♭7',
	11: '7'
};

/** Degree-class role by letter steps above the tonic (0 letters = root). */
const ROLE_BY_LETTER_STEP: readonly IntervalRole[] = [
	'root',
	'second',
	'third',
	'fourth',
	'fifth',
	'sixth',
	'seventh'
] as const;

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

/**
 * Scale-degree class of `letter` in a scale on `tonic`, from the letter-name
 * distance (tonal spells modes one letter per degree, so this is exact for
 * the seven-note scales; for the pentatonic it lands each note on its parent
 * degree class, e.g. the ♭3 on 'third').
 */
function roleFromTonic(tonic: string, letter: string): IntervalRole {
	const tonicIndex = LETTERS.indexOf(tonic.charAt(0) as (typeof LETTERS)[number]);
	const letterIndex = LETTERS.indexOf(letter.charAt(0) as (typeof LETTERS)[number]);
	if (tonicIndex === -1 || letterIndex === -1) return 'root';
	return ROLE_BY_LETTER_STEP[(letterIndex - tonicIndex + 7) % 7];
}

/**
 * Classifies the chord into a scale-choosing family from its chroma set
 * relative to the root, NOT from tonal's type string: extended symbols
 * (C9, C13, C7♭9...) then classify with their plain parent (a dominant is a
 * dominant whether the chart printed the 13 or not).
 */
function familyOf(relativeChromas: Set<number>): ChordFamily | null {
	const hasMajorThird = relativeChromas.has(4);
	const hasMinorThird = relativeChromas.has(3);
	const hasFlatFive = relativeChromas.has(6);
	const hasSharpFive = relativeChromas.has(8);
	const hasMinorSeventh = relativeChromas.has(10);
	const hasMajorSeventh = relativeChromas.has(11);
	const hasDimSeventh = relativeChromas.has(9);

	if (hasMajorThird) {
		// Augmented family: the whole-tone/altered conversation is beyond a
		// beginner reference. No answer beats a wrong one.
		if (hasSharpFive && !relativeChromas.has(7)) return null;
		return hasMinorSeventh ? 'dominant' : 'major';
	}
	if (hasMinorThird) {
		if (hasFlatFive && !relativeChromas.has(7)) {
			if (hasMinorSeventh) return 'half-diminished';
			// dim7 (double-flat 7 = chroma 9) and the bare diminished triad.
			if (hasDimSeventh || !hasMajorSeventh) return 'diminished';
			return null;
		}
		// Minor/major seventh wants melodic minor: out of the v1 reference.
		if (hasMajorSeventh && !hasMinorSeventh) return null;
		return 'minor';
	}
	// No third at all: a sus chord keeps the dominant's scale; anything else
	// (power chords, clusters) gets no answer.
	if (relativeChromas.has(5)) return 'sus';
	return null;
}

/** Builds the tagged note list for one scale over the chord's chroma set. */
function scaleOption(
	id: ChordScaleId,
	root: string,
	rootChroma: number,
	chordChromaToLetter: Map<number, string>
): ChordScaleOption | null {
	const ascii = Scale.get(`${toAsciiAccidentals(root)} ${TONAL_SCALE_NAMES[id]}`).notes;
	if (ascii.length === 0) return null;

	const notes: ImprovNote[] = [];
	for (const asciiLetter of ascii) {
		const letter = toGlyphAccidentals(asciiLetter);
		const chroma = chromaOf(letter);
		if (chroma === undefined) return null;
		const relative = (chroma - rootChroma + 12) % 12;
		const chordLetter = chordChromaToLetter.get(chroma);
		const below = chordChromaToLetter.get((chroma + 11) % 12);

		let kind: ImprovKind;
		let label: string;
		if (chordLetter !== undefined) {
			kind = 'chord-tone';
			label = intervalFromRoot(root, chordLetter).short;
		} else if (below !== undefined) {
			// THE rule: a half step above a chord tone rubs on strong beats.
			kind = 'careful';
			label = TENSION_LABEL_BY_CHROMA[relative] ?? '';
		} else {
			kind = 'color';
			label = TENSION_LABEL_BY_CHROMA[relative] ?? '';
		}

		/*
		 * A careful note carries WHICH chord tone it rubs, not just that it
		 * rubs: the interval from the root identifies the victim (the 3rd that
		 * says major or minor, the root the chord stands on), which is the only
		 * way the explanation can be specific per note instead of one sentence
		 * reused everywhere.
		 */
		let clash: Partial<ImprovNote> = {};
		if (kind === 'careful' && below !== undefined) {
			const victim = intervalFromRoot(root, below);
			clash = {
				clashesWith: below,
				clashesWithLabel: victim.short,
				clashesWithRole: victim.role,
				// The 4 against a major 3rd: the classic avoid note, and the one
				// case where the same pitch is expected elsewhere (blues, sus,
				// dominant), so the copy can say so rather than sounding absolute.
				...(relative === 5 && (chroma + 11) % 12 === (rootChroma + 4) % 12
					? { fineOn: 'dominant-blues' as const }
					: {})
			};
		}

		notes.push({
			letter,
			solfege: letterToSolfege(letter),
			role: roleFromTonic(root, letter),
			label,
			kind,
			...clash
		});
	}
	return { id, tonic: root, notes };
}

/**
 * What ANY key on the board is, over this chord and this scale. Extends
 * `ImprovKind` with the two answers a scale note list cannot give: the blue
 * note (outside the scale, and the one outside note that has a name), and
 * plain outside (borrowed, and only ever a passing note).
 */
export type ImprovVerdictKind = ImprovKind | 'blue' | 'outside';

/** A tagged read of one letter over the chord, for the tap-a-key-hear-the-verdict path. */
export interface ImprovVerdict extends Omit<ImprovNote, 'kind'> {
	kind: ImprovVerdictKind;
}

/**
 * The verdict for one letter over `chord`, read against `scale` when the
 * letter is in it. This is the same single rule the scale tagging uses (a
 * half step above a held chord tone rubs), extended past the scale so a
 * player who taps a key the guide never offered still gets an honest,
 * specific answer instead of silence.
 *
 * Order matters and is the pedagogy: a chord tone is a chord tone even if the
 * scale also lists it, the blue note is named before "outside" because it is
 * the one outside note this app has a story for, and an outside note that
 * happens to sit a half step above a chord tone carries the same clash fields
 * a careful note does, because it clashes for exactly the same reason.
 *
 * Total: returns null only for a letter tonal cannot place.
 */
export function verdictForLetter(
	chord: ChordResult,
	guide: ImprovGuide,
	scale: ChordScaleOption | null,
	letter: string
): ImprovVerdict | null {
	const chroma = chromaOf(letter);
	if (chroma === undefined) return null;

	const inScale = scale?.notes.find((note) => chromaOf(note.letter) === chroma);
	if (inScale) return inScale;

	// Outside the offered scale. Spell it the way the CHORD would (the tapped
	// key only knows a generic sharp name), then apply the one rule.
	const chordChromaToLetter = new Map<number, string>();
	for (const note of chord.notes) {
		const noteChroma = chromaOf(note.letter);
		if (noteChroma !== undefined && !chordChromaToLetter.has(noteChroma)) {
			chordChromaToLetter.set(noteChroma, note.letter);
		}
	}

	const chordLetter = chordChromaToLetter.get(chroma);
	const blueLetter =
		guide.blueNote !== undefined && chromaOf(guide.blueNote) === chroma ? guide.blueNote : undefined;
	// The tapped key only offers a generic sharp name, so prefer the spelling
	// the chord (or the guide's own blue note) already uses for that pitch.
	const spelled = chordLetter ?? blueLetter ?? letter;
	const rootChroma = chromaOf(chord.root);
	const relative = rootChroma === undefined ? 0 : (chroma - rootChroma + 12) % 12;

	const base = {
		letter: spelled,
		solfege: letterToSolfege(spelled),
		role: roleFromTonic(chord.root, spelled),
		label:
			chordLetter !== undefined
				? intervalFromRoot(chord.root, chordLetter).short
				: (TENSION_LABEL_BY_CHROMA[relative] ?? '')
	};

	// A chord tone the scale left out (the ♭9 of C7♭9 under mixolydian, say)
	// is still a chord tone: the left hand is holding it.
	if (chordLetter !== undefined) return { ...base, kind: 'chord-tone' };

	/**
	 * Names the chord tone this note rubs, and the direction matters because
	 * the copy does. An 'outside' note takes only the tone a half step BELOW
	 * it, because its sentence says "sits one half step above {TONE}" and a
	 * match in the other direction would make that sentence false. The blue
	 * note takes either side ("holds its own {TONE} a half step away"), which
	 * is the case that matters over Cmaj7, where the B♭ rubs the B ABOVE it.
	 */
	const rubbing = (bothWays: boolean): Partial<ImprovNote> => {
		const victimLetter =
			chordChromaToLetter.get((chroma + 11) % 12) ??
			(bothWays ? chordChromaToLetter.get((chroma + 1) % 12) : undefined);
		if (victimLetter === undefined) return {};
		const victim = intervalFromRoot(chord.root, victimLetter);
		return {
			clashesWith: victimLetter,
			clashesWithLabel: victim.short,
			clashesWithRole: victim.role
		};
	};

	if (blueLetter !== undefined) return { ...base, kind: 'blue', ...rubbing(true) };
	return { ...base, kind: 'outside', ...rubbing(false) };
}

/**
 * The improvisation answer for a decoded chord, or null when the guide has
 * no honest beginner answer for the quality (augmented, minor/major
 * seventh, power chords...). Total: never throws on junk input.
 */
export function improvGuideFor(chord: ChordResult): ImprovGuide | null {
	if (!chord.recognized || chord.notes.length === 0) return null;
	const rootChroma = chromaOf(chord.root);
	if (rootChroma === undefined) return null;

	const chordChromaToLetter = new Map<number, string>();
	const relativeChromas = new Set<number>();
	for (const note of chord.notes) {
		const chroma = chromaOf(note.letter);
		if (chroma === undefined) return null;
		if (!chordChromaToLetter.has(chroma)) chordChromaToLetter.set(chroma, note.letter);
		relativeChromas.add((chroma - rootChroma + 12) % 12);
	}

	const family = familyOf(relativeChromas);
	if (family === null) return null;

	if (family === 'diminished') {
		return { family, scales: [] };
	}

	const options = SCALES_BY_FAMILY[family]
		.map((id) => scaleOption(id, chord.root, rootChroma, chordChromaToLetter))
		.filter((option): option is ChordScaleOption => option !== null);

	/*
	 * A recommended scale should CONTAIN the chord it decorates: over Cm6,
	 * aeolian's A♭ contradicts the chord's own A, so dorian is the answer.
	 * The minor pentatonic is exempt (a five-note subset by design), and if
	 * the filter would empty the family's list (C7♭9: no offered scale holds
	 * the ♭9) the unfiltered options stay, because their careful tags already
	 * tell the truth (mixolydian's 9 now rubs against the chord's ♭9).
	 */
	const chordChromas = [...chordChromaToLetter.keys()];
	const containing = options.filter(
		(option) =>
			option.id === 'minor-pentatonic' ||
			chordChromas.every((chroma) =>
				option.notes.some((note) => chromaOf(note.letter) === chroma)
			)
	);
	const scales = containing.length > 0 ? containing : options;
	if (scales.length === 0) return null;

	return {
		family,
		scales,
		// Over a major-family chord the ♭7 is the note outside the scale that
		// still works (B♭ over C): the dominant/blues borrowing the explainer
		// names. transposeFrom owns the enharmonic spelling (C -> B♭, F♯ -> E).
		...(family === 'major'
			? {
					blueNote: transposeFrom(chord.root, 'm7'),
					// A half step either side of the ♭7 rubs against it just as
					// hard: the major 7th above (Cmaj7's B), the 6th below (C6's
					// A). Derive both from the blue note's chroma so no quality
					// has to be enumerated, and name the 7th first when a symbol
					// somehow holds both.
					...(() => {
						const blueChroma = (rootChroma + 10) % 12;
						const rubsWith =
							chordChromaToLetter.get((blueChroma + 1) % 12) ??
							chordChromaToLetter.get((blueChroma + 11) % 12);
						return rubsWith ? { blueNoteRubsWith: rubsWith } : {};
					})()
				}
			: {})
	};
}
