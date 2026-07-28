import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	describeTappedInterval,
	generateIntervalQuestion,
	gradeIntervalTap,
	intervalQuestionNotes,
	pickIntervalDistractors
} from './generateIntervalQuestion';
import { DRILL_INTERVALS, intervalFromShort, transposeFrom } from '$lib/theory/interval';
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

	it('never issues P8 as a construction question, even when the direction draw says construction', () => {
		// The construction tap seam reports a pitch class only (both C keys on
		// the board report "C"), so an octave answer is indistinguishable from
		// re-tapping the highlighted root. Identification drills the same fact
		// gradeably.
		forceDraws([0, DRILL_INTERVALS.indexOf('P8') / DRILL_INTERVALS.length, 0.99]);
		const question = generateIntervalQuestion();

		expect(question.interval.short).toBe('P8');
		expect(question.direction).toBe('identification');
		expect(question.choices).toHaveLength(4);
		expect(question.choices).toContain('P8');
	});

	it('never issues P8 as construction when the interval is FORCED by a session retry either', () => {
		forceDraws([0, 0.99]); // root C, direction draw = construction
		const question = generateIntervalQuestion({ short: 'P8' });

		expect(question.interval.short).toBe('P8');
		expect(question.direction).toBe('identification');
	});

	it('leaves every simple interval free to draw construction (the direction draw is still honored)', () => {
		for (const short of DRILL_INTERVALS) {
			if (short === 'P8') continue;
			forceDraws([0, DRILL_INTERVALS.indexOf(short) / DRILL_INTERVALS.length, 0.99]);
			expect(generateIntervalQuestion().direction, short).toBe('construction');
		}
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

	it('accepts any octave duplicate of the target pitch class for a SIMPLE interval (REG-01)', () => {
		// Simple intervals stay octave-agnostic; a register, if supplied, is
		// ignored for them.
		expect(gradeIntervalTap('C', 'E♭', 3, { root: 4, tapped: 5 })).toBe(true);
		expect(gradeIntervalTap('C', 'E♭', 3, { root: 4, tapped: 4 })).toBe(true);
	});

	describe('P8: the unison is not an octave (false-accept regression)', () => {
		it('rejects re-tapping the root itself for a P8 target', () => {
			// The bug: 12 % 12 === 0, so the modular comparison accepted the
			// root's own pitch class and tapping the highlighted C key answered
			// "tap a P8 above C" correctly.
			expect(gradeIntervalTap('C', 'C', 12)).toBe(false);
			expect(gradeIntervalTap('C', 'C', 12, { root: 4, tapped: 4 })).toBe(false);
			expect(gradeIntervalTap('F♯', 'F♯', 12, { root: 4, tapped: 4 })).toBe(false);
		});

		it('accepts the actual octave above when the tap carries its register', () => {
			expect(gradeIntervalTap('C', 'C', 12, { root: 4, tapped: 5 })).toBe(true);
			expect(gradeIntervalTap('F♯', 'F♯', 12, { root: 4, tapped: 5 })).toBe(true);
			// An octave BELOW is not a P8 above.
			expect(gradeIntervalTap('C', 'C', 12, { root: 5, tapped: 4 })).toBe(false);
			// Two octaves up is not a P8 either.
			expect(gradeIntervalTap('C', 'C', 12, { root: 4, tapped: 6 })).toBe(false);
			// Right octave, wrong pitch class.
			expect(gradeIntervalTap('C', 'D', 12, { root: 4, tapped: 5 })).toBe(false);
		});

		it('grades false, never true, when an octave-spanning tap cannot be located in a register', () => {
			expect(gradeIntervalTap('C', 'C', 12)).toBe(false);
			expect(gradeIntervalTap('C', 'B', 12)).toBe(false);
		});
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

	it('reads a tapped white key directly when that IS the simplest reading', () => {
		const readout = describeTappedInterval('C', 'E');
		expect(readout.info.short).toBe('M3');
		expect(readout.letter).toBe('E');
	});

	it('keeps the black-key tie-break: the F♯/G♭ key over C still reads A4, never d5', () => {
		expect(describeTappedInterval('C', 'F♯').info.short).toBe('A4');
		expect(describeTappedInterval('C', 'F♯').letter).toBe('F♯');
		expect(describeTappedInterval('E♭', 'F♯').info.short).toBe('m3');
		expect(describeTappedInterval('G', 'A♯').info.short).toBe('m3');
		expect(describeTappedInterval('B', 'F♯').info.short).toBe('P5');
	});

	/**
	 * The bug: only the 5 black keys had a flat partner to score against, so a
	 * WHITE-key tap skipped enharmonic preference entirely and was named from
	 * the one spelling the keyboard reports. Over a flat/sharp root that
	 * printed qualities that are not in DRILL_INTERVALS at all, so the drill
	 * told the user an augmented unison exists.
	 */
	it('reads a white-key tap by its simplest interval from the root, not by the keyboard spelling', () => {
		const cases: [string, string, string, string][] = [
			// root, tapped key, expected short, expected respelling
			['D♭', 'D', 'm2', 'E♭♭'], // was A1  ("augmented 1th" / fondamentale augmentée)
			['D♭', 'E', 'm3', 'F♭'], // was A2
			['D♭', 'A', 'm6', 'B♭♭'], // was A5
			['D♭', 'B', 'm7', 'C♭'], // was A6
			['F♯', 'F', 'M7', 'E♯'] // was d8
		];

		for (const [root, key, short, letter] of cases) {
			const readout = describeTappedInterval(root, key);
			expect(readout.info.short, `${root}+${key}`).toBe(short);
			expect(readout.letter, `${root}+${key}`).toBe(letter);
		}
	});

	it('never names a tapped key with a unison-or-octave alteration (A1/d1/A8/d8) over any drill root', () => {
		const keys = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

		for (const rootAscii of ROOTS) {
			const root = transposeFrom(rootAscii, 'R');
			for (const key of keys) {
				const { info } = describeTappedInterval(root, key);
				// Degree 1 and degree 8 are only ever reachable as the unison
				// itself ("R"), never as an altered quality.
				if (info.degree === 1 || info.degree === 8) {
					expect(info.short, `${root}+${key}`).toBe('R');
				}
				// Every reading stays inside the interval vocabulary the drill
				// teaches, modulo the A4/d5 tritone pair the app already names
				// both ways by design (intervalBetween('C','G♭') is d5).
				expect(
					info.short === 'R' || DRILL_INTERVALS.includes(info.short) || info.short === 'd5',
					`${root}+${key} read as ${info.short}`
				).toBe(true);
			}
		}
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
