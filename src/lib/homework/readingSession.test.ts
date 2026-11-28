import { describe, expect, it } from 'vitest';
import { parseNote } from './notation';
import type { ReadingExercise } from './data/readingData';
import { createReadingSession, gradeAnswer, letterOf, midiName } from './readingSession';

const exercise: ReadingExercise = {
	book: 'manuel-pratique',
	page: 5,
	number: 1,
	clef: 'treble',
	hint: 'test',
	staves: ['C4h G4h', 'C5q']
};

function clockFrom(times: number[]) {
	let i = 0;
	return () => times[Math.min(i++, times.length - 1)];
}

describe('letterOf', () => {
	it.each([
		['d', 'D'],
		[' D ', 'D'],
		['D4', 'D'],
		['g#', 'G']
	])('reads %j as %s', (raw, letter) => expect(letterOf(raw)).toBe(letter));
	it.each(['', ' ', 'H', '4', '#'])('reads %j as nothing', (raw) =>
		expect(letterOf(raw)).toBeNull()
	);
});

describe('gradeAnswer', () => {
	const g4 = parseNote('G4q');
	it('accepts a name by letter alone, any case', () => {
		expect(gradeAnswer(g4, { kind: 'name', letter: 'G' })).toBe('correct');
		expect(gradeAnswer(g4, { kind: 'name', letter: 'g' })).toBe('correct');
		expect(gradeAnswer(g4, { kind: 'name', letter: 'A' })).toBe('wrong');
		expect(gradeAnswer(g4, { kind: 'name', letter: '' })).toBe('wrong');
	});
	it('requires the exact key from a MIDI piano', () => {
		expect(gradeAnswer(g4, { kind: 'midi', midi: 67 })).toBe('correct');
		expect(gradeAnswer(g4, { kind: 'midi', midi: 69 })).toBe('wrong');
	});
	it('tells right letter, wrong octave apart from a wrong note', () => {
		expect(gradeAnswer(g4, { kind: 'midi', midi: 55 })).toBe('wrong-octave');
		expect(gradeAnswer(g4, { kind: 'midi', midi: 79 })).toBe('wrong-octave');
		expect(gradeAnswer(g4, { kind: 'midi', midi: 56 })).toBe('wrong');
	});
});

describe('midiName', () => {
	it('names keys with flats for the black ones', () => {
		expect(midiName(60)).toBe('C4');
		expect(midiName(61)).toBe('C#4');
		expect(midiName(70)).toBe('Bb4');
		expect(midiName(41)).toBe('F2');
	});
});

describe('createReadingSession', () => {
	it('flattens the printed lines into ordered steps with line and column', () => {
		const s = createReadingSession(exercise);
		expect(s.steps.map((x) => [x.note.token, x.line, x.column])).toEqual([
			['C4h', 0, 0],
			['G4h', 0, 1],
			['C5q', 1, 0]
		]);
	});

	it('walks the notes in order and finishes', () => {
		const s = createReadingSession(exercise);
		expect(s.current()).toBe(0);
		s.answer({ kind: 'name', letter: 'C' });
		s.answer({ kind: 'name', letter: 'G' });
		expect(s.isDone()).toBe(false);
		s.answer({ kind: 'name', letter: 'C' });
		expect(s.isDone()).toBe(true);
		expect(s.answer({ kind: 'name', letter: 'C' })).toBeNull();
		expect(s.results()).toHaveLength(3);
	});

	it('moves on after a wrong answer instead of retrying in place', () => {
		const s = createReadingSession(exercise);
		const r = s.answer({ kind: 'name', letter: 'F' });
		expect(r?.verdict).toBe('wrong');
		expect(s.current()).toBe(1);
	});

	it('times each answer from when its note became current', () => {
		const s = createReadingSession(exercise, clockFrom([1000, 1800, 2000, 4500]));
		expect(s.answer({ kind: 'name', letter: 'C' })?.responseMs).toBe(800);
		expect(s.answer({ kind: 'name', letter: 'G' })?.responseMs).toBe(200);
		expect(s.answer({ kind: 'name', letter: 'C' })?.responseMs).toBe(2500);
	});

	it('summarises accuracy over ALL notes and lists the mistakes', () => {
		const s = createReadingSession(exercise, clockFrom([0, 1000, 2000, 3000]));
		s.answer({ kind: 'name', letter: 'C' });
		s.answer({ kind: 'midi', midi: 55 }); // G3: right letter, wrong octave
		s.answer({ kind: 'name', letter: 'A' });
		const sum = s.summary();
		expect(sum).toMatchObject({ total: 3, answered: 3, correct: 1, wrong: 1, wrongOctave: 1 });
		expect(sum.accuracy).toBe(33);
		expect(sum.meanResponseMs).toBe(1000);
		expect(sum.mistakes.map((m) => m.stepIndex)).toEqual([1, 2]);
		expect(sum.mistakes[0].given).toBe('G3');
	});

	it('reports 0% and no mean time before any answer', () => {
		const sum = createReadingSession(exercise).summary();
		expect(sum.accuracy).toBe(0);
		expect(sum.meanResponseMs).toBeNull();
		expect(sum.mistakes).toEqual([]);
	});

	it('scores 100 for a perfect run', () => {
		const s = createReadingSession(exercise);
		s.answer({ kind: 'midi', midi: 60 });
		s.answer({ kind: 'midi', midi: 67 });
		s.answer({ kind: 'midi', midi: 72 });
		expect(s.summary().accuracy).toBe(100);
	});

	it('handles an exercise with no notes', () => {
		const s = createReadingSession({ ...exercise, staves: [] });
		expect(s.isDone()).toBe(true);
		expect(s.summary().accuracy).toBe(0);
	});
});
