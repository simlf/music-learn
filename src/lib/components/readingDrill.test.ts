import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReadingExercise } from '$lib/homework/data/readingData';
import { setLocale } from '$lib/i18n/locale.svelte';

const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...a: unknown[]) => playNoteMock(...a),
	playClick: vi.fn(),
	ensureAudioReady: vi.fn(async () => {}),
	soundEnabled: () => true
}));

let midi: { kind: string; deviceName?: string; deviceId?: string } = { kind: 'idle' };
let noteHandler: ((e: { midi: number; velocity: number }) => void) | null = null;
const stopListening = vi.fn();
const connectMidiMock = vi.fn();
vi.mock('$lib/midi/midi.svelte', () => ({
	midiState: () => midi,
	connectMidi: (...a: unknown[]) => connectMidiMock(...a)
}));
vi.mock('$lib/midi/noteStream', () => ({
	listenNotes: (h: (e: { midi: number; velocity: number }) => void) => {
		noteHandler = h;
		return stopListening;
	}
}));

const { default: ReadingDrill } = await import('./ReadingDrill.svelte');

const exercise: ReadingExercise = {
	book: 'manuel-pratique',
	page: 5,
	number: 1,
	clef: 'treble',
	hint: 'test',
	staves: ['C4h G4h', 'C5q E4q']
};

function name(letter: string) {
	return fireEvent.click(screen.getByTestId(`answer-${letter}`));
}

beforeEach(() => {
	midi = { kind: 'idle' };
	noteHandler = null;
	playNoteMock.mockClear();
	stopListening.mockClear();
	connectMidiMock.mockClear();
	localStorage.clear();
});
afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('ReadingDrill: showing the exercise', () => {
	it('engraves every note, with the first one current', () => {
		render(ReadingDrill, { exercise });
		expect(screen.getByTestId('reading-staff')).toHaveAttribute('data-clef', 'treble');
		for (let i = 0; i < 4; i++) expect(screen.getByTestId(`reading-note-${i}`)).toBeInTheDocument();
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'current');
		expect(screen.getByTestId('reading-note-1')).toHaveAttribute('data-state', 'pending');
		expect(screen.getByTestId('reading-progress')).toHaveTextContent('Note 1 of 4');
	});

	it('draws one staff per printed line', () => {
		render(ReadingDrill, { exercise });
		expect(screen.getByTestId('reading-line-0')).toBeInTheDocument();
		expect(screen.getByTestId('reading-line-1')).toBeInTheDocument();
	});

	it('draws the bass clef when the exercise is in bass', () => {
		render(ReadingDrill, { exercise: { ...exercise, clef: 'bass', staves: ['F3h C3h'] } });
		expect(screen.getByTestId('reading-staff')).toHaveAttribute('data-clef', 'bass');
	});

	it('offers all seven note names with solfege', () => {
		render(ReadingDrill, { exercise });
		for (const l of 'CDEFGAB') expect(screen.getByTestId(`answer-${l}`)).toBeInTheDocument();
		expect(screen.getByTestId('answer-C')).toHaveTextContent('Do');
	});
});

describe('ReadingDrill: answering by name', () => {
	it('advances on a correct answer, says so and plays the note', async () => {
		render(ReadingDrill, { exercise });
		await name('C');
		expect(screen.getByTestId('reading-feedback')).toHaveTextContent('Yes, C.');
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'correct');
		expect(screen.getByTestId('reading-note-1')).toHaveAttribute('data-state', 'current');
		expect(playNoteMock).toHaveBeenCalledWith('C4');
	});

	it('marks a wrong answer, names the real note and still moves on', async () => {
		render(ReadingDrill, { exercise });
		await name('D');
		expect(screen.getByTestId('reading-feedback')).toHaveTextContent('Not D: that note is C.');
		expect(screen.getByTestId('reading-feedback')).toHaveAttribute('data-verdict', 'wrong');
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'wrong');
		expect(screen.getByTestId('reading-note-1')).toHaveAttribute('data-state', 'current');
	});

	it('answers from the A to G keys, any case', async () => {
		render(ReadingDrill, { exercise });
		await fireEvent.keyDown(window, { key: 'c' });
		await fireEvent.keyDown(window, { key: 'G' });
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'correct');
		expect(screen.getByTestId('reading-note-1')).toHaveAttribute('data-state', 'correct');
	});

	it('ignores other keys, modified keys and held-down repeats', async () => {
		render(ReadingDrill, { exercise });
		await fireEvent.keyDown(window, { key: 'h' });
		await fireEvent.keyDown(window, { key: '1' });
		await fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
		await fireEvent.keyDown(window, { key: 'c', metaKey: true });
		await fireEvent.keyDown(window, { key: 'c', repeat: true });
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'current');
	});

	it('does not steal letters typed into a text field', async () => {
		render(ReadingDrill, { exercise });
		const input = document.createElement('input');
		document.body.appendChild(input);
		await fireEvent.keyDown(input, { key: 'c' });
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'current');
		input.remove();
	});
});

describe('ReadingDrill: finishing', () => {
	async function finishWith(letters: string[]) {
		for (const l of letters) await name(l);
	}

	it('shows accuracy, speed and the mistakes after the last note', async () => {
		render(ReadingDrill, { exercise });
		await finishWith(['C', 'G', 'D', 'E']);
		expect(screen.getByTestId('reading-summary')).toBeInTheDocument();
		expect(screen.getByTestId('reading-accuracy')).toHaveTextContent('75%');
		expect(screen.getByTestId('reading-accuracy')).toHaveTextContent('3 of 4 correct');
		expect(screen.getByTestId('reading-speed')).toHaveTextContent('s per note');
		expect(screen.getByTestId('reading-mistakes')).toHaveTextContent('Note 3: C5, you answered D');
	});

	it('shows no mistakes list for a perfect run', async () => {
		render(ReadingDrill, { exercise });
		await finishWith(['C', 'G', 'C', 'E']);
		expect(screen.getByTestId('reading-accuracy')).toHaveTextContent('100%');
		expect(screen.queryByTestId('reading-mistakes')).toBeNull();
	});

	it('disables the answer buttons once done and ignores further keys', async () => {
		render(ReadingDrill, { exercise });
		await finishWith(['C', 'G', 'C', 'E']);
		expect(screen.getByTestId('answer-C')).toBeDisabled();
		await fireEvent.keyDown(window, { key: 'c' });
		expect(screen.getByTestId('reading-accuracy')).toHaveTextContent('100%');
	});

	it('remembers the attempt and counts them', async () => {
		render(ReadingDrill, { exercise });
		await finishWith(['C', 'G', 'D', 'E']);
		expect(screen.getByTestId('reading-record')).toHaveTextContent('Best 75%, attempts: 1');
		const stored = JSON.parse(localStorage.getItem('music-learn:homework-log') ?? '{}');
		expect(stored['reading:5:1']).toMatchObject({ attempts: 1, best: 75 });
	});

	it('starts over on "Read it again" with a clean staff and keeps the best score', async () => {
		render(ReadingDrill, { exercise });
		await finishWith(['C', 'G', 'D', 'E']);
		await fireEvent.click(screen.getByTestId('reading-again'));
		expect(screen.queryByTestId('reading-summary')).toBeNull();
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'current');
		expect(screen.getByTestId('reading-note-2')).toHaveAttribute('data-state', 'pending');
		await finishWith(['C', 'G', 'C', 'E']);
		expect(screen.getByTestId('reading-record')).toHaveTextContent('Best 100%, attempts: 2');
	});
});

describe('ReadingDrill: MIDI', () => {
	it('answers from the connected piano and does not play a note back', async () => {
		midi = { kind: 'connected', deviceId: 'p', deviceName: 'Roland FP-30' };
		render(ReadingDrill, { exercise });
		expect(screen.getByTestId('reading-midi')).toHaveTextContent('Roland FP-30');
		expect(noteHandler).not.toBeNull();
		noteHandler!({ midi: 60, velocity: 0.7 });
		await Promise.resolve();
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'correct');
		expect(playNoteMock).not.toHaveBeenCalled();
	});

	it('requires the right octave and says so', async () => {
		midi = { kind: 'connected', deviceId: 'p', deviceName: 'Piano' };
		render(ReadingDrill, { exercise });
		noteHandler!({ midi: 72, velocity: 0.7 }); // C5 for a C4
		await Promise.resolve();
		expect(screen.getByTestId('reading-feedback')).toHaveAttribute('data-verdict', 'wrong-octave');
		expect(screen.getByTestId('reading-feedback')).toHaveTextContent(
			'Right letter, wrong octave: you played C5, the note is C4.'
		);
		expect(screen.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'wrong-octave');
	});

	it('grades a wrong key as wrong', async () => {
		midi = { kind: 'connected', deviceId: 'p', deviceName: 'Piano' };
		render(ReadingDrill, { exercise });
		noteHandler!({ midi: 62, velocity: 0.7 });
		await Promise.resolve();
		expect(screen.getByTestId('reading-feedback')).toHaveAttribute('data-verdict', 'wrong');
	});

	it('stops listening when the drill goes away', () => {
		midi = { kind: 'connected', deviceId: 'p', deviceName: 'Piano' };
		render(ReadingDrill, { exercise });
		cleanup();
		expect(stopListening).toHaveBeenCalled();
	});

	it('does not listen without a connected piano', () => {
		render(ReadingDrill, { exercise });
		expect(noteHandler).toBeNull();
	});

	it('offers to connect MIDI when none is connected, and says so when the browser cannot', async () => {
		render(ReadingDrill, { exercise });
		await fireEvent.click(screen.getByTestId('reading-connect-midi'));
		expect(connectMidiMock).toHaveBeenCalledTimes(1);
		cleanup();
		midi = { kind: 'unsupported' };
		render(ReadingDrill, { exercise });
		expect(screen.getByTestId('reading-midi')).toHaveTextContent('no MIDI');
		expect(screen.queryByTestId('reading-connect-midi')).toBeNull();
	});
});

describe('ReadingDrill: French', () => {
	it('speaks French', async () => {
		setLocale('fr');
		render(ReadingDrill, { exercise });
		await name('D');
		expect(screen.getByTestId('reading-feedback')).toHaveTextContent('Pas D : cette note est C.');
	});
});
