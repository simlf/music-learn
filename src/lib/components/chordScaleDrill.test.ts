import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import ChordScaleDrill from './ChordScaleDrill.svelte';

/**
 * Component tests for ChordScaleDrill (ml-modes-practice): given a chord
 * symbol, tap the one key that is NOT in the scale that fits it. Mirrors
 * PracticeDegreeDrill's own component-test shape: one graded tap, a reveal,
 * a Next.
 *
 * Drilled with Dm7 (D dorian: D E F G A B C). Its 5 outside pitch classes
 * are C♯/D♭, D♯/E♭, F♯/G♭, G♯/A♭, A♯/B♭. F♯ is a half step above the chord's
 * own F (the third), so it is the natural 'correct' probe; D (the root, a
 * chord tone) is the natural 'wrong' probe. Cmaj7 supplies the classic
 * 'careful' probe: F, a half step above the chord's own E (the third).
 */

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	ensureAudioReady: vi.fn()
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

async function tapKey(letter: string): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: `${letter} key` }));
	await tick();
}

describe('ChordScaleDrill', () => {
	it('grades a genuinely outside note correct and reveals the fitting scale', async () => {
		const onComplete = vi.fn();
		render(ChordScaleDrill, { symbol: 'Dm7', onComplete });

		await tapKey('F♯');

		expect(screen.getByTestId('chord-scale-drill-feedback')).toBeInTheDocument();
		expect(screen.getByTestId('chord-scale-verdict-line').textContent).toMatch(/outside/i);
		expect(screen.getByTestId('chord-scale-scale-label').textContent).toMatch(/dorian/i);

		await fireEvent.click(screen.getByText('Next'));
		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('grades a chord tone wrong', async () => {
		const onComplete = vi.fn();
		render(ChordScaleDrill, { symbol: 'Dm7', onComplete });

		await tapKey('D');

		expect(screen.getByTestId('chord-scale-verdict-line').textContent).toMatch(
			/part of the chord/i
		);
		await fireEvent.click(screen.getByText('Next'));
		expect(onComplete).toHaveBeenCalledWith(false);
	});

	it('grades a careful in-scale note as a distinct close miss, not correct', async () => {
		const onComplete = vi.fn();
		render(ChordScaleDrill, { symbol: 'Cmaj7', onComplete });

		await tapKey('F');

		expect(screen.getByTestId('chord-scale-verdict-line').textContent).toMatch(/close/i);
		await fireEvent.click(screen.getByText('Next'));
		expect(onComplete).toHaveBeenCalledWith(false);
	});

	it('only the first tap grades; a second tap on an already-answered board is inert', async () => {
		const onComplete = vi.fn();
		render(ChordScaleDrill, { symbol: 'Dm7', onComplete });

		await tapKey('F♯');
		const verdictLine = screen.getByTestId('chord-scale-verdict-line').textContent;
		await tapKey('D');
		expect(screen.getByTestId('chord-scale-verdict-line').textContent).toBe(verdictLine);
	});
});
