import { describe, expect, it } from 'vitest';
import {
	CHORD_SCALE_CONCEPT_SYMBOL,
	chordScaleConceptLetters,
	chordScaleConceptPattern
} from './chordScalePattern';

/**
 * The Learn hub's chord-tones-vs-scale-tones concept lesson, tested as a pure
 * function. Locks two promises:
 *
 * 1. The chord/scale-tone split comes from the SAME engine the Lookup board
 *    and the comping loop's overlay use (chordScale.ts via compBarScale), so
 *    this can never disagree with either about which notes are chord tones.
 * 2. Cmaj7 stays the fixed demo, so the pattern text is exact and stable.
 */
describe('chordScaleConceptLetters', () => {
	it('splits C ionian over Cmaj7 into its chord tones and the rest of the scale', () => {
		expect(chordScaleConceptLetters()).toEqual({
			chordTones: ['C', 'E', 'G', 'B'],
			scaleTones: ['D', 'F', 'A']
		});
	});
});

describe('chordScaleConceptPattern', () => {
	it('renders the held chord stacked with chord tones then scale tones, each on their own waveform', () => {
		expect(chordScaleConceptPattern()).toBe(
			[
				'setcpm(10)',
				'stack(',
				'  chord("<Cmaj7>").voicing().s("triangle"),',
				'  note("c5 e5 g5 b5 d5 f5 a5").s("triangle triangle triangle triangle sine sine sine")',
				')'
			].join('\n')
		);
	});

	it('never contains an accidental glyph, since C ionian is all natural letters', () => {
		expect(chordScaleConceptPattern()).not.toMatch(/[♭♯]/);
	});

	it('is fixed to Cmaj7, the app-wide reference-case demo chord', () => {
		expect(CHORD_SCALE_CONCEPT_SYMBOL).toBe('Cmaj7');
	});
});
