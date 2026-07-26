import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShellVoicingDrill from './ShellVoicingDrill.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Embed-seam tests for ShellVoicingDrill (Phase 27 Plan 02, T-27-02-01):
 * mirrors BuildSession's embedFact/onComplete precedent. Proves (a) an
 * embedded round is driven for exactly the supplied `embedSymbol` and fires
 * `onComplete` once at round end without drawing a fresh chord, and (b) with
 * no embed props the standalone /voicings flow is unchanged (REG-01).
 */

// The embedded PianoKeyboard's interactive/inspectable keys sound their own
// key-touch note through PianoKeyboard's own choke point (G1 UAT fix), and a
// correct Check plays the revealed voicing as a chord (UAT V4); mock the
// audio module so no consumer test ever triggers a real AudioContext/tone
// import in jsdom (ARCHITECTURE-CONTRACTS.md consumer rule).
vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playChord: vi.fn(),
	ensureAudioReady: vi.fn()
}));

const now0 = new Date('2026-07-25T00:00:00.000Z');

function makeCard(factId: string, state: State): CardRecord {
	return {
		...newCard(now0),
		factId,
		factKind: 'chord-formula',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0,
		state
	};
}

const getAllCardsMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		getAllCards: (...args: unknown[]) => getAllCardsMock(...args)
	};
});

/** First occurrence of a natural-letter key by its accessible name (mirrors shellVoicingDrill.test.ts's clickKey convention). */
function clickKey(letter: string) {
	const keys = screen.getAllByRole('button', { name: `${letter} key` });
	fireEvent.click(keys[0]);
}

beforeEach(() => {
	localStorage.clear();
	getAllCardsMock.mockReset();
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('ShellVoicingDrill: embed seam (27-02)', () => {
	it('embedded round drives the supplied symbol and fires onComplete once at round end without drawing a new chord', async () => {
		getAllCardsMock.mockResolvedValue([makeCard('chord-formula:Cmaj7', State.Review)]);
		// If drawSymbol() were ever invoked, this Math.random() would draw a
		// DIFFERENT seventh-chord symbol than the embedded Cmaj7 (Cmaj7 is
		// seventhChordSymbols()[0], drawn only by a 0 return per the existing
		// shellVoicingDrill.test.ts convention) - so any drift off Cmaj7 after
		// "Next" would be caught by this test.
		vi.spyOn(Math, 'random').mockReturnValue(0.999);

		const onComplete = vi.fn();
		render(ShellVoicingDrill, { props: { embedSymbol: 'Cmaj7', onComplete } });

		await waitFor(() => screen.getByTestId('stage-drill'));
		await fireEvent.click(screen.getByRole('button', { name: 'SHELL' }));

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('reveal')).toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		// No fresh chord was drawn: the just-earned Cmaj7 reveal still stands
		// (a fresh draw would have reset back to an unanswered question).
		expect(screen.getByTestId('reveal')).toBeInTheDocument();
	});

	it('with no embed props, the standalone flow still draws a fresh chord on Next (REG-01)', async () => {
		getAllCardsMock.mockResolvedValue([]);
		vi.spyOn(Math, 'random').mockReturnValue(0);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
		await fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
		await waitFor(() => screen.getByTestId('stage-subtract'));

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('reveal')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		// Fresh draw: back to an unanswered question, no reveal.
		expect(screen.queryByTestId('reveal')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
	});
});
