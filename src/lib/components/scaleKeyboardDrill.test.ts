import { render, screen, fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScaleKeyboardDrill from './ScaleKeyboardDrill.svelte';
import { majorScaleNotes } from '$lib/theory/scale';
import { placeAscendingScaleKeys, type ScaleKeyPlacement } from '$lib/practice/scaleKeyboardDrill';
import { whiteLettersForOctaves, blackKeysForOctaves } from '$lib/components/keyboardLayout';

const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const whiteLetters = whiteLettersForOctaves(2);
const blackKeyPatterns = blackKeysForOctaves(2);

/** Board-geometry aria-label for a placement's key: always the raw board letter
 * (natural for white, sharp spelling for black), never the scale's own
 * enharmonic spelling, matching the component's tap targets exactly. */
function ariaLabelFor(kind: 'white' | 'black', keyIndex: number): string {
	if (kind === 'white') {
		const octave = 4 + Math.floor(keyIndex / 7);
		return `${whiteLetters[keyIndex]}${octave} key`;
	}
	const pattern = blackKeyPatterns[keyIndex];
	const octave = 4 + Math.floor(pattern.afterWhiteIndex / 7);
	return `${pattern.sharpLetter}${octave} key`;
}

function tapButtonFor(placement: ScaleKeyPlacement): HTMLElement {
	return screen.getByRole('button', { name: ariaLabelFor(placement.kind, placement.keyIndex) });
}

async function tapAscending(placements: ScaleKeyPlacement[]) {
	for (const placement of placements) {
		await fireEvent.click(tapButtonFor(placement));
	}
}

async function tapDescending(placements: ScaleKeyPlacement[]) {
	// Degrees 7 down to 1 re-tap the same 7 keys used for degrees 1-7 ascending.
	for (let degree = 7; degree >= 1; degree -= 1) {
		await fireEvent.click(tapButtonFor(placements[degree - 1]));
	}
}

beforeEach(() => {
	playNoteMock.mockClear();
});

describe('ScaleKeyboardDrill (tonic-anchored 2-octave keyboard, SCALE-04)', () => {
	it('renders with no key filled and the correct instruction/register on mount (C major)', () => {
		render(ScaleKeyboardDrill, { notes: majorScaleNotes('C'), tonic: 'C' });

		expect(screen.getByText('Play C major ascending, then descending.')).toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
	});

	it('tapping the tonic first fills the leftmost key and plays it; no key left of it is filled', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		render(ScaleKeyboardDrill, { notes, tonic: 'C' });

		await fireEvent.click(tapButtonFor(placements[0]));

		expect(tapButtonFor(placements[0])).toHaveClass('key--root');
		expect(playNoteMock).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 2 OF 8 · ASCENDING');
	});

	it('fills all 8 ascending degrees with role colors and ends on a key distinct from the tonic', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		render(ScaleKeyboardDrill, { notes, tonic: 'C' });

		await tapAscending(placements);

		const roleClasses = [
			'key--root',
			'key--second',
			'key--third',
			'key--fourth',
			'key--fifth',
			'key--sixth',
			'key--seventh',
			'key--root'
		];
		placements.forEach((placement, index) => {
			expect(tapButtonFor(placement)).toHaveClass(roleClasses[index]);
		});
		// The octave (degree 8) must land on a distinct key from the tonic.
		expect(placements[7].keyIndex).toBe(7);
		expect(placements[7].kind).toBe('white');
		expect(placements[0].keyIndex).not.toBe(placements[7].keyIndex);
		expect(playNoteMock).toHaveBeenCalledTimes(8);
	});

	it('advances the register through the ascending leg then flips to descending 7 down to 1', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		render(ScaleKeyboardDrill, { notes, tonic: 'C' });

		for (let degree = 1; degree <= 8; degree += 1) {
			await fireEvent.click(tapButtonFor(placements[degree - 1]));
			if (degree < 8) {
				expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent(
					`DEGREE ${degree + 1} OF 8 · ASCENDING`
				);
			}
		}
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 7 OF 8 · DESCENDING');

		await fireEvent.click(tapButtonFor(placements[6]));
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 6 OF 8 · DESCENDING');
	});

	it('a wrong pitch-class tap flashes gray, does not advance or play, and clears after ~320ms', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		render(ScaleKeyboardDrill, { notes, tonic: 'C' });

		// Degree 1 (tonic) is expected first; tap degree 3's key instead.
		const wrongButton = tapButtonFor(placements[2]);
		await fireEvent.click(wrongButton);

		expect(wrongButton).toHaveClass('key--wrong');
		expect(playNoteMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
		expect(wrongButton).not.toHaveClass('key--root');

		await new Promise((resolve) => setTimeout(resolve, 400));
		expect(wrongButton).not.toHaveClass('key--wrong');
	});

	it('completing all 15 taps shows the completion card and Run it again resets to degree 1 ascending', async () => {
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		render(ScaleKeyboardDrill, { notes, tonic: 'C' });

		await tapAscending(placements);
		await tapDescending(placements);

		expect(screen.getByTestId('scale-keyboard-complete')).toBeInTheDocument();
		expect(screen.getByText('Voila. C major, up and down, clean.')).toBeInTheDocument();
		expect(playNoteMock).toHaveBeenCalledTimes(15);

		await fireEvent.click(screen.getByRole('button', { name: 'Run it again' }));

		expect(screen.queryByTestId('scale-keyboard-complete')).not.toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
		expect(tapButtonFor(placements[0])).not.toHaveClass('key--root');
	});

	it('resets to degree 1 ascending and updates the instruction when the tonic/notes change', async () => {
		const cNotes = majorScaleNotes('C');
		const cPlacements = placeAscendingScaleKeys(cNotes);
		const { rerender } = render(ScaleKeyboardDrill, { notes: cNotes, tonic: 'C' });

		await fireEvent.click(tapButtonFor(cPlacements[0]));
		expect(tapButtonFor(cPlacements[0])).toHaveClass('key--root');

		const gNotes = majorScaleNotes('G');
		await rerender({ notes: gNotes, tonic: 'G' });

		expect(screen.getByText('Play G major ascending, then descending.')).toBeInTheDocument();
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 1 OF 8 · ASCENDING');
		const gPlacements = placeAscendingScaleKeys(gNotes);
		expect(tapButtonFor(gPlacements[0])).not.toHaveClass('key--root');
	});

	it('accepts F♯ major degree 7 (E♯) on the white F key and labels it E♯ (enharmonic acceptance by chroma)', async () => {
		const notes = majorScaleNotes('F♯');
		const placements = placeAscendingScaleKeys(notes);
		render(ScaleKeyboardDrill, { notes, tonic: 'F♯' });

		// Degree 7 (E♯, chroma 5) is placed on the white F key per 10-01's
		// placeAscendingScaleKeys (proven under test there); confirm the fixture
		// still holds before relying on it, then walk degrees 1-6 ascending.
		expect(placements[6].kind).toBe('white');
		expect(placements[6].letter).toBe('E♯');

		for (let degree = 1; degree <= 6; degree += 1) {
			await fireEvent.click(tapButtonFor(placements[degree - 1]));
		}
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 7 OF 8 · ASCENDING');

		const degree7Button = tapButtonFor(placements[6]);
		await fireEvent.click(degree7Button);

		expect(degree7Button).toHaveClass('key--seventh');
		expect(screen.getByTestId('scale-keyboard-register')).toHaveTextContent('DEGREE 8 OF 8 · ASCENDING');
		expect(degree7Button.textContent).toContain('E♯');
	});
});
