import { spellChord } from '$lib/theory/chord';
import { allFacts } from '$lib/srs/facts';
import {
	improvGuideFor,
	verdictForLetter,
	type ChordScaleOption,
	type ImprovGuide
} from '$lib/theory/chordScale';
import type { ChordResult } from '$lib/theory/types';

/**
 * Pure question generator and grader for the CHORD-SCALE practice family
 * (design doc `.planning/design/improvisation.md` §5.4, scout report
 * `ml-modes-practice`): given a chord symbol, tap the one key that is NOT in
 * the scale that fits it.
 *
 * WHY THIS EXISTS. `improvGuideFor` (chordScale.ts) already answers "what
 * fits over this chord" for the Lookup board and the comping loop's SCALE
 * overlay, both reference-only. Nothing ever asked the player to prove they
 * know it. This module is the pure half of a real drill over that same
 * engine — no new theory, no mode curriculum: the mode name never appears
 * here, only chord-tone/color/careful/outside classification.
 *
 * GRADING, NOT A FIXED TARGET. A diatonic 7-note scale leaves 5 of the 12
 * pitch classes outside it, and every one of them is an equally correct tap
 * for "not in the scale" — picking one in advance and rejecting the other 4
 * would penalize a musically correct answer. So grading is STRUCTURAL,
 * reusing `verdictForLetter` (already built for exactly this
 * classification): a tap outside the offered scale (kind 'outside' or
 * 'blue') is correct; a tap on a 'careful' note — in the scale, but the one
 * that rubs on a held beat — is the classic near miss, graded 'close'; any
 * other in-scale tap (a chord tone or a plain color tone) is a plain miss.
 *
 * Pure module: no DOM, no Svelte, no audio, no Dexie. Every function total.
 */

export interface ChordScaleQuestion {
	kind: 'chord-scale';
	/** The chord symbol this question drills, e.g. "Dm7". */
	symbol: string;
	/** The decoded chord. Notes empty when `symbol` is unrecognized. */
	chord: ChordResult;
	/** The improvisation guide for `chord`, or null when the family has no honest answer. */
	guide: ImprovGuide | null;
	/** The scale this question asks against: `guide.scales[0]`, the family default. Null when `guide` is null or offers no scale (the diminished family). */
	scale: ChordScaleOption | null;
}

/** Builds one chord-scale question for a chord symbol. Total: an unrecognized symbol or a guide-less family yields a question with `scale: null`, which `isChordScaleQuestionAnswerable` rejects. */
export function generateChordScaleQuestion(symbol: string): ChordScaleQuestion {
	const chord = spellChord(symbol);
	const guide = improvGuideFor(chord);
	const scale = guide !== null && guide.scales.length > 0 ? guide.scales[0] : null;
	return { kind: 'chord-scale', symbol, chord, guide, scale };
}

/** True when the question resolved to a real, gradable scale. False only for an unrecognized symbol or a family the guide has no scale for (diminished, augmented...). */
export function isChordScaleQuestionAnswerable(question: ChordScaleQuestion): boolean {
	return question.guide !== null && question.scale !== null;
}

/** How a tap grades against the question's offered scale. */
export type ChordScaleVerdict = 'correct' | 'close' | 'wrong';

/**
 * Grades one keyboard tap by PITCH CLASS via `verdictForLetter`, never by
 * letter string — the same chroma-based discipline every other drill in this
 * module family holds to. A tap outside the offered scale (genuinely not in
 * it, or the major family's blue ♭7) is 'correct'; a 'careful' in-scale tap
 * (rubs on a held beat, the classic near miss) is 'close'; every other
 * in-scale tap is 'wrong'.
 *
 * Total: an unanswerable question, or a tap `verdictForLetter` cannot place,
 * grades 'wrong' rather than throwing.
 */
export function gradeChordScaleTap(
	question: ChordScaleQuestion,
	tappedLetter: string
): ChordScaleVerdict {
	if (question.guide === null || question.scale === null) return 'wrong';
	const verdict = verdictForLetter(question.chord, question.guide, question.scale, tappedLetter);
	if (verdict === null) return 'wrong';
	if (verdict.kind === 'outside' || verdict.kind === 'blue') return 'correct';
	if (verdict.kind === 'careful') return 'close';
	return 'wrong';
}

/**
 * Every catalog chord-formula symbol whose `improvGuideFor` offers a real
 * scale to drill against — the drill's candidate pool. Mirrors
 * `shellVoicing.ts`'s `seventhChordSymbols()` enumeration idiom: reads the
 * shared fact catalog rather than hardcoding a root/quality list, so the
 * drill's candidates never drift from the catalog the rest of the app
 * teaches. Excludes the diminished/augmented/sus-adjacent families the
 * guide has no honest scale answer for (same families `improvGuideFor`
 * itself declines).
 */
export function chordScaleSymbols(): string[] {
	const symbols: string[] = [];
	for (const fact of allFacts()) {
		if (fact.factKind !== 'chord-formula') continue;
		const question = generateChordScaleQuestion(fact.symbol);
		if (isChordScaleQuestionAnswerable(question)) symbols.push(fact.symbol);
	}
	return symbols;
}
