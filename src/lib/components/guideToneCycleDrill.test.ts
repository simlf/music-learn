import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GuideToneCycleDrill from './GuideToneCycleDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import { GUIDE_TONE_CYCLE_KEYS, guideToneCycleBars, voiceGuideTones } from '$lib/practice/guideToneCycle';

/**
 * Component tests for chapter 11's guide-tone key cycle. Mocks the audio
 * engine (the embedded keyboard sounds its own key taps) and drives the real
 * PianoKeyboard: pointerdown records the pressed octave, click toggles the
 * key, exactly the order the keyboard itself uses.
 */

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playChord: vi.fn(),
	ensureAudioReady: vi.fn()
}));

const { playChord } = await import('$lib/audio/audio');

/** Every key of the board whose accessible name resolves to `chroma`, left to right. */
function keysForChroma(chroma: number): HTMLElement[] {
	return screen
		.getAllByRole('button', { name: / key(, selected)?$/ })
		.filter((key) => chromaOf((key.getAttribute('aria-label') ?? '').replace(/ key(, selected)?$/, '')) === chroma);
}

/** Presses the key for `letter` in board octave `octave` (4 = the lower octave). */
function press(letter: string, octave: number): void {
	const key = keysForChroma(chromaOf(letter)!)[octave - 4];
	if (!key) throw new Error(`no ${letter} key in octave ${octave}`);
	fireEvent.pointerDown(key);
	fireEvent.click(key);
}

async function check(): Promise<void> {
	await fireEvent.click(screen.getByTestId('guide-cycle-check'));
}

/** Plays a whole key the way Show me chains it, checking each chord. */
async function playKey(key: string): Promise<void> {
	let previous: number[] | null = null;
	for (const [index, bar] of guideToneCycleBars(key).entries()) {
		const voiced = voiceGuideTones(spellChord(bar.symbol), index, previous);
		for (const note of voiced) press(note.letter, note.octave);
		previous = voiced.map((note) => note.pitch);
		await check();
	}
}

const feedback = () => screen.getByTestId('guide-cycle-feedback');

beforeEach(() => {
	setLocale('en');
	vi.mocked(playChord).mockClear();
});

afterEach(() => {
	cleanup();
});

describe('GuideToneCycleDrill', () => {
	it('starts on the C major ii with the guide-tone prompt and the 12 keys of the cycle', () => {
		render(GuideToneCycleDrill);
		expect(screen.getByTestId('guide-cycle-chord').textContent).toContain('D');
		expect(screen.getByTestId('guide-cycle-prompt').textContent).toBe(
			'The 3rd and the 7th only, no root. Either one at the bottom.'
		);
		const chips = [...screen.getByTestId('guide-cycle-key-row').querySelectorAll('button')];
		expect(chips.map((chip) => chip.textContent?.trim())).toEqual([...GUIDE_TONE_CYCLE_KEYS]);
		expect(chips[0].getAttribute('aria-pressed')).toBe('true');
		expect(screen.queryByTestId('guide-cycle-motion')).toBeNull();
	});

	it('accepts the ii with the 7th low too, then names the move into the V', async () => {
		render(GuideToneCycleDrill);
		press('C', 4);
		press('F', 4);
		await check();
		expect(feedback().textContent).toContain('Right: Dm7.');
		expect(screen.getByTestId('guide-cycle-motion').textContent).toBe('Keep F. Move C down to B.');
	});

	it('refuses the root, naming what is missing and what is extra', async () => {
		render(GuideToneCycleDrill);
		press('D', 4);
		press('F', 4);
		await check();
		expect(feedback().dataset.kind).toBe('notes');
		expect(feedback().textContent).toContain('Missing: C.');
		expect(feedback().textContent).toContain('Not a guide tone here: D.');
	});

	it('retries right notes played with a jump, then accepts the smooth move', async () => {
		render(GuideToneCycleDrill);
		press('F', 4);
		press('C', 5);
		await check();
		// G7's notes, but B jumps up past F instead of C falling to B.
		press('B', 4);
		press('F', 5);
		await check();
		expect(feedback().dataset.kind).toBe('jump');
		expect(feedback().textContent).toBe(
			'Right notes, but the hand jumped. Keep F on the key it was on and move C down a half step.'
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
		press('F', 4);
		press('B', 4);
		await check();
		expect(feedback().textContent).toContain('Right: G7.');
	});

	it('Show me ghosts the move from the pair just played, and Hear it plays that pair', async () => {
		render(GuideToneCycleDrill);
		press('F', 4);
		press('C', 5);
		await check();
		await fireEvent.click(screen.getByTestId('guide-cycle-show'));
		expect(feedback().textContent).toBe('Shown moving on from the pair you just played. Play it, then Check.');
		await fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));
		expect(playChord).toHaveBeenCalledWith(['F', 'B']);
	});

	it('moves to the next key in the cycle after the I', async () => {
		render(GuideToneCycleDrill);
		await playKey('C');
		expect(feedback().textContent).toBe('C done. Next key: F.');
		expect(screen.getByTestId('guide-cycle-chord').textContent).toContain('G');
		expect(screen.queryByTestId('guide-cycle-motion')).toBeNull();
	});

	it('fires onClean once all 12 keys are clean, and not before', async () => {
		const onClean = vi.fn();
		render(GuideToneCycleDrill, { onClean });
		for (const key of GUIDE_TONE_CYCLE_KEYS.slice(0, -1)) await playKey(key);
		expect(onClean).not.toHaveBeenCalled();
		await playKey(GUIDE_TONE_CYCLE_KEYS[GUIDE_TONE_CYCLE_KEYS.length - 1]);
		expect(onClean).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('guide-cycle-done').textContent).toContain('All 12 keys, every one clean.');
	});

	it('a Show me leaves the key unclean, so the cycle ends listing it', async () => {
		const onClean = vi.fn();
		render(GuideToneCycleDrill, { onClean });
		await fireEvent.click(screen.getByTestId('guide-cycle-show'));
		for (const key of GUIDE_TONE_CYCLE_KEYS) await playKey(key);
		expect(onClean).not.toHaveBeenCalled();
		expect(screen.getByTestId('guide-cycle-done').textContent).toContain('Still to play clean');
		expect(screen.getByTestId('guide-cycle-done').textContent).toContain(': C.');
	});
});
