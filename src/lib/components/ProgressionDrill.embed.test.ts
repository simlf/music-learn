import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressionDrill from './ProgressionDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Embed-seam tests for ProgressionDrill (Phase 27 Plan 02, T-27-02-01):
 * mirrors BuildSession's embedFact/onComplete precedent. Proves (a) an
 * embedded progression is driven for exactly the supplied
 * embedTemplateId + embedKey and fires onComplete once at completion without
 * drawing a new random progression, and (b) with no embed props the
 * standalone /progressions completion "Again" fresh-draw is unchanged
 * (REG-01).
 */

// The embedded PianoKeyboard's interactive keys sound their own key-touch
// note through its own choke point (G1 UAT fix); mock the audio module so no
// consumer test ever triggers a real AudioContext/tone import in jsdom
// (ARCHITECTURE-CONTRACTS.md consumer rule).
vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	ensureAudioReady: vi.fn()
}));

/** First occurrence of a natural-letter key by its accessible name (mirrors progressionDrill.test.ts's clickKey convention). */
function clickKey(letter: string) {
	const keys = screen.getAllByRole('button', { name: `${letter} key` });
	fireEvent.click(keys[0]);
}

/** Names the current bar (step 1) by tapping its correct chord chip. */
async function nameBar(symbol: string) {
	await fireEvent.click(screen.getByText(symbol));
}

/** Plays the given chord's letters (step 2) then hits Check. */
async function playBar(letters: string[]) {
	for (const letter of letters) {
		clickKey(letter);
	}
	await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

beforeEach(() => {
	localStorage.clear();
	// Set high so, if randomProgression() were ever invoked, it would draw a
	// DIFFERENT template/key than the embedded 'major-ii-V-I' in 'C' (drawn
	// only by a 0 return per the existing progressionDrill.test.ts
	// convention) - any drift off the embedded progression would be caught.
	vi.spyOn(Math, 'random').mockReturnValue(0.999);
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('ProgressionDrill: embed seam (27-02)', () => {
	it('embedded progression drives the supplied template+key and fires onComplete once at completion without drawing a new progression', async () => {
		const onComplete = vi.fn();
		render(ProgressionDrill, {
			props: { embedTemplateId: 'major-ii-V-I', embedKey: 'C', onComplete }
		});

		expect(screen.getByTestId('key-banner')).toHaveTextContent('C');
		expect(screen.getByTestId('roman-0')).toHaveTextContent('ii');

		await nameBar('Dm7');
		await playBar(['D', 'F', 'A', 'C']);
		await nameBar('G7');
		await playBar(['G', 'B', 'D', 'F']);
		await nameBar('Cmaj7');
		await playBar(['C', 'E', 'G', 'B']);

		expect(screen.getByTestId('progression-complete')).toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();
		expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		// No fresh progression was drawn: the completion card (and its earned
		// Dm7/G7/Cmaj7 bars) persists rather than resetting to a new draw.
		expect(screen.getByTestId('progression-complete')).toBeInTheDocument();
		expect(screen.getByTestId('roman-0')).toHaveTextContent('ii');
	});

	it('with no embed props, the standalone completion still shows the fresh-draw "Again" control (REG-01)', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		render(ProgressionDrill);

		await nameBar('Dm7');
		await playBar(['D', 'F', 'A', 'C']);
		await nameBar('G7');
		await playBar(['G', 'B', 'D', 'F']);
		await nameBar('Cmaj7');
		await playBar(['C', 'E', 'G', 'B']);

		expect(screen.getByTestId('progression-complete')).toBeInTheDocument();
		const again = screen.getByRole('button', { name: 'Again' });
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

		await fireEvent.click(again);

		expect(screen.queryByTestId('progression-complete')).not.toBeInTheDocument();
		expect(screen.getByTestId('symbol-0')).toHaveTextContent('?');
		expect(screen.getByTestId('step-register')).toHaveTextContent('STEP 1');
	});
});
