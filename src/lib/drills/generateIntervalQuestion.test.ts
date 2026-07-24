import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	describeTappedInterval,
	generateIntervalQuestion,
	gradeIntervalTap,
	intervalQuestionNotes,
	pickIntervalDistractors
} from './generateIntervalQuestion';
import { DRILL_INTERVALS, intervalFromShort } from '$lib/theory/interval';
import { ROOTS } from '$lib/theory/randomChord';

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * generateIntervalQuestion draws, in order: (1) root index over ROOTS,
 * (2) interval index over DRILL_INTERVALS, (3) direction index over
 * ['identification', 'construction'], then (4+) distractor shuffle draws
 * for identification questions. Mirrors the drills e2e suite's
 * call-indexed draw-script pattern.
 */
function forceDraws(draws: number[]) {
	let call = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

describe('generateIntervalQuestion', () => {
	it('draws its root from ROOTS (as display glyphs) and its interval from DRILL_INTERVALS', () => {
		for (let i = 0; i < 30; i++) {
			const question = generateIntervalQuestion();
			expect(question.kind).toBe('interval');
			const asciiRoot = question.root.replace(/♯/g, '#').replace(/♭/g, 'b');
			expect(ROOTS).toContain(asciiRoot);
			expect(DRILL_INTERVALS).toContain(question.interval.short);
		}
	});

	it('identification questions carry 4 unique choices including the correct short name', () => {
		forceDraws([0, 2 / DRILL_INTERVALS.length, 0]); // C, m3, identification
		const question = generateIntervalQuestion();

		expect(question.direction).toBe('identification');
		expect(question.root).toBe('C');
		expect(question.interval.short).toBe('m3');
		expect(question.choices).toHaveLength(4);
		expect(question.choices).toContain('m3');
		expect(new Set(question.choices).size).toBe(4);
	});

	it('construction questions have no choices', () => {
		forceDraws([0, 2 / DRILL_INTERVALS.length, 0.99]); // C, m3, construction
		const question = generateIntervalQuestion();

		expect(question.direction).toBe('construction');
		expect(question.choices).toBeUndefined();
	});

	it('glyph roots come out spelled for display (F# draws as F♯)', () => {
		forceDraws([ROOTS.indexOf('F#') / ROOTS.length, 0, 0.99]);
		const question = generateIntervalQuestion();
		expect(question.root).toBe('F♯');
	});
});

describe('pickIntervalDistractors', () => {
	it('returns 3 pool members, never the correct answer', () => {
		const distractors = pickIntervalDistractors('m3');
		expect(distractors).toHaveLength(3);
		expect(distractors).not.toContain('m3');
		for (const d of distractors) expect(DRILL_INTERVALS).toContain(d);
	});

	it('never offers an enharmonic equivalent of the answer (same semitone count)', () => {
		for (const short of DRILL_INTERVALS) {
			const correctSemis = intervalFromShort(short).semitones;
			const distractors = pickIntervalDistractors(short);
			for (const d of distractors) {
				expect(intervalFromShort(d).semitones).not.toBe(correctSemis);
			}
		}
	});

	it('prefers near-misses: the same-degree other quality always appears for m3', () => {
		// m3's strongest confusion is M3 (same degree, other quality); the
		// near-miss-first policy must always surface it in the 3 picks.
		for (let i = 0; i < 20; i++) {
			expect(pickIntervalDistractors('m3')).toContain('M3');
		}
	});
});

describe('intervalQuestionNotes', () => {
	it('returns the root (role root) and the spelled target (its degree-class role)', () => {
		forceDraws([0, 2 / DRILL_INTERVALS.length, 0.99]); // C, m3, construction
		const question = generateIntervalQuestion();
		const notes = intervalQuestionNotes(question);

		expect(notes).toHaveLength(2);
		expect(notes[0]).toEqual({ letter: 'C', solfege: 'Do', role: 'root' });
		expect(notes[1]).toEqual({ letter: 'E♭', solfege: 'Mi♭', role: 'third' });
	});

	it('spells the target relative to a flat root', () => {
		forceDraws([ROOTS.indexOf('Eb') / ROOTS.length, DRILL_INTERVALS.indexOf('P4') / DRILL_INTERVALS.length, 0.99]);
		const question = generateIntervalQuestion();
		const notes = intervalQuestionNotes(question);

		expect(notes[0].letter).toBe('E♭');
		expect(notes[1].letter).toBe('A♭');
		expect(notes[1].role).toBe('fourth');
	});
});

describe('gradeIntervalTap', () => {
	it('accepts the exact spelled target', () => {
		expect(gradeIntervalTap('C', 'E♭', 3)).toBe(true);
	});

	it('accepts the enharmonic spelling of the target (chroma-level grading)', () => {
		expect(gradeIntervalTap('C', 'D♯', 3)).toBe(true);
	});

	it('rejects a wrong chroma', () => {
		expect(gradeIntervalTap('C', 'E', 3)).toBe(false);
	});

	it('accepts any octave duplicate for a P8 target (semitones taken mod 12)', () => {
		expect(gradeIntervalTap('C', 'C', 12)).toBe(true);
	});

	it('is total: unparseable letters grade false, never throw', () => {
		expect(gradeIntervalTap('C', '??', 3)).toBe(false);
		expect(gradeIntervalTap('??', 'C', 3)).toBe(false);
	});
});

describe('describeTappedInterval', () => {
	it('reads a tapped black key with the simpler enharmonic from the root', () => {
		// The keyboard reports black keys by sharp letter; over C, a tapped
		// D♯ key reads as m3 (E♭), not A2.
		const readout = describeTappedInterval('C', 'D♯');
		expect(readout.info.short).toBe('m3');
		expect(readout.letter).toBe('E♭');
	});

	it('reads a tapped white key directly', () => {
		const readout = describeTappedInterval('C', 'E');
		expect(readout.info.short).toBe('M3');
		expect(readout.letter).toBe('E');
	});
});

describe('generateIntervalQuestion forced short (session-sourced retries)', () => {
	it('keeps the forced interval and skips its draw: root, then direction', () => {
		forceDraws([ROOTS.indexOf('G') / ROOTS.length, 0.99]); // root G, direction construction
		const question = generateIntervalQuestion({ short: 'M6' });

		expect(question.interval.short).toBe('M6');
		expect(question.root).toBe('G');
		expect(question.direction).toBe('construction');
	});

	it('still builds identification choices around the forced interval', () => {
		forceDraws([0, 0]); // root C, direction identification
		const question = generateIntervalQuestion({ short: 'P5' });

		expect(question.interval.short).toBe('P5');
		expect(question.choices).toContain('P5');
		expect(question.choices).toHaveLength(4);
	});
});
