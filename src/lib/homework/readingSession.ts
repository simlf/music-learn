import { noteName, parseStaffLine, type Clef, type StaffNote } from './notation';
import type { ReadingExercise } from './data/readingData';

/**
 * The note-reading drill's state machine, free of any UI. A session walks the
 * exercise note by note; each answer is graded, recorded with its response
 * time, and the session moves on whether it was right or wrong (reading speed
 * at a steady pace is the point of the book, so a wrong note is shown and
 * counted, not retried in place).
 *
 * Two answer routes share one grader:
 *  - `midi`: the exact MIDI note number the player struck. The octave counts.
 *  - `name`: a letter typed or tapped (octave-less, since a screen button has
 *    none). The pitch class counts.
 */

export type ReadingAnswer = { kind: 'midi'; midi: number } | { kind: 'name'; letter: string };

export type ReadingVerdict = 'correct' | 'wrong' | 'wrong-octave';

export interface ReadingStep {
	note: StaffNote;
	/** Which printed staff line the note is on (0-based). */
	line: number;
	/** Position within its line (0-based). */
	column: number;
}

export interface ReadingResult {
	stepIndex: number;
	note: StaffNote;
	verdict: ReadingVerdict;
	/** What the player gave, as text for the summary ("D" or "D4"). */
	given: string;
	/** Milliseconds from the note appearing as current to the answer. */
	responseMs: number;
}

export interface ReadingSummary {
	total: number;
	answered: number;
	correct: number;
	wrong: number;
	wrongOctave: number;
	/** 0 to 100, over ALL notes in the exercise. */
	accuracy: number;
	/** Mean response time over answered notes, ms. Null before any answer. */
	meanResponseMs: number | null;
	/** Wrong or wrong-octave results, for the review list. */
	mistakes: ReadingResult[];
}

export interface ReadingSession {
	clef: Clef;
	steps: ReadingStep[];
	/** Index of the note waiting for an answer; equals steps.length when done. */
	current: () => number;
	isDone: () => boolean;
	answer: (answer: ReadingAnswer) => ReadingResult | null;
	results: () => ReadingResult[];
	summary: () => ReadingSummary;
}

/** Pitch-class letter of a typed answer: "d", " D " and "D4" all read as D. Null when unusable. */
export function letterOf(raw: string): string | null {
	const m = /^\s*([A-Ga-g])/.exec(raw);
	return m ? m[1].toUpperCase() : null;
}

/** Grades one answer against the expected note. */
export function gradeAnswer(note: StaffNote, answer: ReadingAnswer): ReadingVerdict {
	if (answer.kind === 'name') {
		return letterOf(answer.letter) === note.letter ? 'correct' : 'wrong';
	}
	if (answer.midi === note.midi) return 'correct';
	// Same pitch class in another octave: right note, wrong place on the keyboard.
	return ((answer.midi % 12) + 12) % 12 === ((note.midi % 12) + 12) % 12 ? 'wrong-octave' : 'wrong';
}

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** "D4"-style name for a MIDI number (flats for black keys), for showing what was played. */
export function midiName(midi: number): string {
	return `${PITCH_CLASS_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function createReadingSession(
	exercise: ReadingExercise,
	now: () => number = () => performance.now()
): ReadingSession {
	const steps: ReadingStep[] = exercise.staves.flatMap((line, lineIndex) =>
		parseStaffLine(line).map((note, column) => ({ note, line: lineIndex, column }))
	);
	const results: ReadingResult[] = [];
	let current = 0;
	let shownAt = now();

	function summary(): ReadingSummary {
		const correct = results.filter((r) => r.verdict === 'correct').length;
		const wrongOctave = results.filter((r) => r.verdict === 'wrong-octave').length;
		const wrong = results.filter((r) => r.verdict === 'wrong').length;
		return {
			total: steps.length,
			answered: results.length,
			correct,
			wrong,
			wrongOctave,
			accuracy: steps.length === 0 ? 0 : Math.round((correct / steps.length) * 100),
			meanResponseMs:
				results.length === 0
					? null
					: Math.round(results.reduce((a, r) => a + r.responseMs, 0) / results.length),
			mistakes: results.filter((r) => r.verdict !== 'correct')
		};
	}

	return {
		clef: exercise.clef,
		steps,
		current: () => current,
		isDone: () => current >= steps.length,
		answer(answer) {
			if (current >= steps.length) return null;
			const step = steps[current];
			const t = now();
			const result: ReadingResult = {
				stepIndex: current,
				note: step.note,
				verdict: gradeAnswer(step.note, answer),
				given: answer.kind === 'midi' ? midiName(answer.midi) : (letterOf(answer.letter) ?? '?'),
				responseMs: Math.max(0, Math.round(t - shownAt))
			};
			results.push(result);
			current += 1;
			shownAt = t;
			return result;
		},
		results: () => results,
		summary
	};
}

export { noteName };
