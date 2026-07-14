import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChordExample from './ChordExample.svelte';

// Audio contract consumers never construct a real AudioContext in Vitest.
const playChordMock = vi.fn();
const ensureAudioReadyMock = vi.fn(() => Promise.resolve());
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	playChord: (...args: unknown[]) => playChordMock(...args)
}));

beforeEach(() => {
	playChordMock.mockClear();
	ensureAudioReadyMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ChordExample: a shape-first lesson example', () => {
	it('renders the chord name, a display keyboard with the spelled notes, and the formula chips', () => {
		render(ChordExample, { symbol: 'Cmaj7' });

		const example = screen.getByTestId('chord-example');
		expect(within(example).getAllByText('Cmaj7').length).toBeGreaterThan(0);

		const keyboard = within(example).getByRole('img', { name: /piano keyboard/i });
		expect(keyboard).toBeInTheDocument();
		// Display-only: no interactive key buttons inside the keyboard.
		expect(within(keyboard).queryAllByRole('button')).toHaveLength(0);
		// All four chord tones carry their interval-role fills.
		const highlighted = keyboard.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted.length).toBeGreaterThanOrEqual(4);

		const formula = within(example).getByTestId('example-formula');
		expect(within(formula).getByText('R')).toBeInTheDocument();
		expect(within(formula).getByText('M3')).toBeInTheDocument();
		expect(within(formula).getByText('P5')).toBeInTheDocument();
		expect(within(formula).getByText('M7')).toBeInTheDocument();
	});

	it('renders the caption when given', () => {
		render(ChordExample, { symbol: 'C7', caption: 'Major triad + ♭7. Pushes.' });

		expect(screen.getByText('Major triad + ♭7. Pushes.')).toBeInTheDocument();
	});

	it('plays the spelled letters through the audio contract on Hear it', async () => {
		render(ChordExample, { symbol: 'Cm7' });

		await fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));

		expect(ensureAudioReadyMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭', 'G', 'B♭']);
	});

	it('renders nothing for an unrecognized symbol (total component)', () => {
		render(ChordExample, { symbol: 'Xx9' });

		expect(screen.queryByTestId('chord-example')).not.toBeInTheDocument();
	});
});
