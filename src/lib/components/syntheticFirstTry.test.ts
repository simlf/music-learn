import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShellVoicingDrill from './ShellVoicingDrill.svelte';
import ProgressionDrill from './ProgressionDrill.svelte';
import InversionDrill from './InversionDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * B3: the three synthetic families report whether the item was earned on the
 * FIRST attempt.
 *
 * These drills never gate on a wrong answer (a wrong play retries, gently, by
 * design), so "onComplete fired" says nothing about whether the user was
 * right. The practice host used to finish every synthetic item as correct for
 * exactly that reason, which made voicing, progression and inversion free
 * points and the end card's accuracy dishonest upward by construction.
 *
 * What must hold: `firstTry` is true only for a clean earn, false after ANY
 * wrong attempt anywhere in the item, and the retry pedagogy is unchanged
 * (a wrong attempt still never gates and still completes eventually).
 *
 * Harness mirrors each component's own existing test file (audio mocked,
 * getAllCards mocked, Math.random pinned high so no fresh draw could ever be
 * mistaken for the embedded item).
 */

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playChord: vi.fn(),
	ensureAudioReady: vi.fn()
}));

const getAllCardsMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		getAllCards: (...args: unknown[]) => getAllCardsMock(...args)
	};
});

const now0 = new Date('2026-07-27T00:00:00.000Z');

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

/** First occurrence of a natural-letter key by its accessible name. */
function clickKey(letter: string): void {
	fireEvent.click(screen.getAllByRole('button', { name: `${letter} key` })[0]);
}

/** Presses the letter's key in the given octave slot (pointerdown then click), as InversionDrill's bass detection requires. */
function pressKeyAtOctave(letter: string, octaveIndex: 0 | 1): void {
	const key = screen.getAllByRole('button', { name: `${letter} key` })[octaveIndex];
	fireEvent.pointerDown(key);
	fireEvent.click(key);
}

beforeEach(() => {
	localStorage.clear();
	getAllCardsMock.mockReset().mockResolvedValue([]);
	vi.spyOn(Math, 'random').mockReturnValue(0.999);
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('ShellVoicingDrill reports first-try honestly (B3)', () => {
	/** Cmaj7's shell is the third (E) and the seventh (B); the card is mature so the drill opens on the drill stage. */
	async function renderMatureCmaj7(onComplete: (firstTry: boolean) => void): Promise<void> {
		getAllCardsMock.mockResolvedValue([makeCard('chord-formula:Cmaj7', State.Review)]);
		render(ShellVoicingDrill, { props: { embedSymbol: 'Cmaj7', onComplete } });
		await waitFor(() => screen.getByTestId('stage-drill'));
	}

	it('true when the shell is played correctly first time', async () => {
		const onComplete = vi.fn();
		await renderMatureCmaj7(onComplete);

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('false after a wrong Check, even though the retry still completes the item', async () => {
		const onComplete = vi.fn();
		await renderMatureCmaj7(onComplete);

		clickKey('D');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		// The wrong play never gates: the retry line shows and the drill stays open.
		expect(screen.getByTestId('retry')).toBeInTheDocument();
		expect(screen.queryByTestId('reveal')).not.toBeInTheDocument();

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		expect(screen.getByTestId('reveal')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(false);
	});
});

describe('ProgressionDrill reports first-try honestly (B3)', () => {
	const BARS = [
		{ symbol: 'Dm7', letters: ['D', 'F', 'A', 'C'] },
		{ symbol: 'G7', letters: ['G', 'B', 'D', 'F'] },
		{ symbol: 'Cmaj7', letters: ['C', 'E', 'G', 'B'] }
	];

	async function playBar(bar: { symbol: string; letters: string[] }): Promise<void> {
		await fireEvent.click(screen.getByText(bar.symbol));
		for (const letter of bar.letters) clickKey(letter);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	}

	function renderEmbedded(onComplete: (firstTry: boolean) => void): void {
		render(ProgressionDrill, {
			props: { embedTemplateId: 'major-ii-V-I', embedKey: 'C', onComplete }
		});
	}

	it('true when every bar is earned clean', async () => {
		const onComplete = vi.fn();
		renderEmbedded(onComplete);

		for (const bar of BARS) await playBar(bar);
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('false after a wrong NAME pick anywhere in the grid', async () => {
		const onComplete = vi.fn();
		renderEmbedded(onComplete);

		// Bar 1 is Dm7: pick whichever offered chip is NOT Dm7 first.
		const choices = screen.getAllByRole('button', { name: /^Name choice: / });
		const wrong = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Name choice: Dm7'
		);
		expect(wrong).toBeDefined();
		await fireEvent.click(wrong!);
		expect(screen.getByTestId('name-retry')).toBeInTheDocument();

		for (const bar of BARS) await playBar(bar);
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(false);
	});

	it('false after a wrong PLAY on the last bar', async () => {
		const onComplete = vi.fn();
		renderEmbedded(onComplete);

		await playBar(BARS[0]);
		await playBar(BARS[1]);

		await fireEvent.click(screen.getByText('Cmaj7'));
		clickKey('C');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		expect(screen.getByTestId('play-retry')).toBeInTheDocument();

		for (const letter of BARS[2].letters) clickKey(letter);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(false);
	});
});

describe('InversionDrill reports first-try honestly (B3)', () => {
	/** Dm7 2nd inversion: A (fifth) in the bass, then C/D/F above. */
	async function playCorrect(): Promise<void> {
		pressKeyAtOctave('A', 0);
		pressKeyAtOctave('C', 1);
		pressKeyAtOctave('D', 1);
		pressKeyAtOctave('F', 1);
		await fireEvent.click(screen.getByTestId('inversion-check'));
	}

	function renderDm7(onComplete: (firstTry: boolean) => void): void {
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });
	}

	it('true when the inversion is played correctly first time', async () => {
		const onComplete = vi.fn();
		renderDm7(onComplete);

		await playCorrect();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('false after wrong NOTES, even though the retry completes the item', async () => {
		const onComplete = vi.fn();
		renderDm7(onComplete);

		pressKeyAtOctave('A', 0);
		pressKeyAtOctave('C', 1);
		await fireEvent.click(screen.getByTestId('inversion-check'));

		await playCorrect();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(false);
	});

	it('false after the right notes with the wrong BASS', async () => {
		const onComplete = vi.fn();
		renderDm7(onComplete);

		pressKeyAtOctave('F', 0);
		pressKeyAtOctave('A', 1);
		pressKeyAtOctave('C', 1);
		pressKeyAtOctave('D', 1);
		await fireEvent.click(screen.getByTestId('inversion-check'));

		await playCorrect();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledWith(false);
	});
});
