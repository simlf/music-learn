import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CircleOfFifthsDrill from './CircleOfFifthsDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { chromaOf } from '$lib/theory/interval';
import { HOPS_PER_ROUND, ROUNDS_PER_LAP, cycleRound, nextInCycle, stepsFrom } from '$lib/practice/circleOfFifths';

/**
 * Component tests for chapter 16's circle exercise. Mocks the audio engine
 * (the embedded keyboard sounds its own key taps) and drives the real
 * PianoKeyboard for the "play it" answers.
 */

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playChord: vi.fn(),
	ensureAudioReady: vi.fn()
}));

const feedback = () => screen.getByTestId('circle-feedback');
const prompt = () => screen.getByTestId('circle-prompt').textContent;
const measures = () =>
	[0, 1, 2, 3].map((i) => screen.getByTestId(`circle-measure-${i}`).querySelector('.msym')?.textContent);

async function tapChoice(letter: string): Promise<void> {
	await fireEvent.click(within(screen.getByTestId('circle-choices')).getByRole('button', { name: letter }));
}

/** Clicks the first keyboard key sounding `letter`'s pitch class. */
async function playKey(letter: string): Promise<void> {
	const key = screen
		.getAllByRole('button', { name: / key(, selected)?$/ })
		.find((el) => chromaOf((el.getAttribute('aria-label') ?? '').replace(/ key(, selected)?$/, '')) === chromaOf(letter));
	if (!key) throw new Error(`no key for ${letter}`);
	await fireEvent.click(key);
}

/** Answers every stop of the current lap right, pressing Next round between rounds. */
async function runLap(start: string, direction: 'down' | 'up'): Promise<void> {
	for (let round = 0; round < ROUNDS_PER_LAP; round++) {
		const stops = cycleRound(stepsFrom(start, round * HOPS_PER_ROUND, direction)!, direction);
		for (const stop of stops.slice(1)) await tapChoice(stop);
		if (round < ROUNDS_PER_LAP - 1) await fireEvent.click(screen.getByTestId('circle-next-round'));
	}
}

beforeEach(() => {
	setLocale('en');
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('CircleOfFifthsDrill: next stop', () => {
	it('starts on C going down a fifth, with the start shown and three stops to earn', () => {
		render(CircleOfFifthsDrill);
		expect(screen.getByTestId('circle-banner').textContent).toContain('Round 1 of 4');
		expect(measures()).toEqual(['C', '?', '?', '?']);
		expect(prompt()).toBe('Down a fifth from C is?');
		const choices = within(screen.getByTestId('circle-choices')).getAllByRole('button');
		expect(choices.map((choice) => choice.textContent?.trim()).sort()).toEqual(['B♭', 'D', 'F', 'G']);
	});

	it('a right name earns the stop and asks the next one', async () => {
		render(CircleOfFifthsDrill);
		await tapChoice('F');
		expect(measures()).toEqual(['C', 'F', '?', '?']);
		expect(feedback().textContent).toContain('Right: F.');
		expect(prompt()).toBe('Down a fifth from F is?');
	});

	it('a wrong name retries in place with a hint, never gating', async () => {
		render(CircleOfFifthsDrill);
		await tapChoice('G');
		expect(feedback().dataset.kind).toBe('retry');
		expect(feedback().classList.contains('retry')).toBe(true);
		expect(feedback().textContent).toContain('Not G. Hear C as a V: where does C7 resolve?');
		expect(measures()).toEqual(['C', '?', '?', '?']);
		await tapChoice('F');
		expect(measures()).toEqual(['C', 'F', '?', '?']);
	});

	it('playing the root on the keyboard answers too, graded by pitch class', async () => {
		render(CircleOfFifthsDrill);
		await fireEvent.click(within(screen.getByTestId('circle-start-row')).getByRole('button', { name: 'D♭' }));
		expect(prompt()).toBe('Down a fifth from D♭ is?');
		// The board spells the black key F♯: same pitch class as G♭, so right.
		await playKey('F♯');
		expect(measures()).toEqual(['D♭', 'G♭', '?', '?']);
		await playKey('C');
		expect(feedback().dataset.kind).toBe('retry');
	});

	it('chains rounds from where the last stopped and comes home after a lap', async () => {
		render(CircleOfFifthsDrill);
		for (const stop of ['F', 'B♭', 'E♭']) await tapChoice(stop);
		expect(feedback().textContent).toBe('C, F, B♭, E♭: three fifths down. The next round starts on E♭.');
		expect(screen.queryByTestId('circle-choices')).toBeNull();
		await fireEvent.click(screen.getByTestId('circle-next-round'));
		expect(screen.getByTestId('circle-banner').textContent).toContain('Round 2 of 4');
		expect(measures()).toEqual(['E♭', '?', '?', '?']);
	});

	it('a clean lap fires onLapClean once with its direction', async () => {
		const onLapClean = vi.fn();
		render(CircleOfFifthsDrill, { onLapClean });
		await runLap('C', 'down');
		expect(onLapClean).toHaveBeenCalledExactlyOnceWith('down');
		expect(feedback().textContent).toContain('every stop right the first time');
	});

	it('a lap with one miss does not fire onLapClean', async () => {
		const onLapClean = vi.fn();
		render(CircleOfFifthsDrill, { onLapClean });
		await tapChoice('G');
		await runLap('C', 'down');
		expect(onLapClean).not.toHaveBeenCalled();
		expect(feedback().textContent).toContain('Go again for a lap');
	});

	it('going up walks the sharp side and fires its own lap', async () => {
		const onLapClean = vi.fn();
		render(CircleOfFifthsDrill, { onLapClean });
		await fireEvent.click(screen.getByRole('button', { name: 'Up a fifth' }));
		expect(prompt()).toBe('Up a fifth from C is?');
		expect(nextInCycle('C', 'up')).toBe('G');
		await runLap('C', 'up');
		expect(onLapClean).toHaveBeenCalledExactlyOnceWith('up');
	});
});

describe('CircleOfFifthsDrill: how far apart', () => {
	/** Math.random 0 makes distanceQuestion ask C to B♭: two fifths down. */
	function renderDistance(props: Record<string, unknown> = {}) {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		render(CircleOfFifthsDrill, props);
		return fireEvent.click(screen.getByRole('button', { name: 'How far apart' }));
	}

	const distanceFeedback = () => screen.getByTestId('circle-distance-feedback');

	async function answer(count: string, way: 'Down' | 'Up'): Promise<void> {
		await fireEvent.click(within(screen.getByTestId('circle-count-row')).getByRole('button', { name: count }));
		await fireEvent.click(within(screen.getByTestId('circle-way-row')).getByRole('button', { name: way }));
		await fireEvent.click(screen.getByTestId('circle-distance-check'));
	}

	it('asks for a count and a direction before checking', async () => {
		await renderDistance();
		expect(screen.getByTestId('circle-distance-question').textContent).toBe('From C to B♭');
		await fireEvent.click(screen.getByTestId('circle-distance-check'));
		expect(distanceFeedback().dataset.kind).toBe('pick');
	});

	it('says which half is wrong, then draws the path once right', async () => {
		await renderDistance();
		await answer('2', 'Up');
		expect(distanceFeedback().dataset.kind).toBe('way');
		await answer('3', 'Down');
		expect(distanceFeedback().dataset.kind).toBe('count');
		expect(screen.queryByTestId('circle-distance-path')).toBeNull();
		await answer('2', 'Down');
		expect(distanceFeedback().textContent).toBe('Right: 2 fifths down, C, F, B♭.');
		expect(screen.getByTestId('circle-distance-path').textContent).toContain('F');
		expect(screen.getByTestId('circle-next-pair')).toBeInTheDocument();
	});

	it('five first-try pairs in a row fire onDistanceStreak once', async () => {
		const onDistanceStreak = vi.fn();
		await renderDistance({ onDistanceStreak });
		for (let i = 0; i < 6; i++) {
			await answer('2', 'Down');
			await fireEvent.click(screen.getByTestId('circle-next-pair'));
		}
		expect(onDistanceStreak).toHaveBeenCalledOnce();
	});

	it('a miss resets the streak', async () => {
		const onDistanceStreak = vi.fn();
		await renderDistance({ onDistanceStreak });
		for (let i = 0; i < 4; i++) {
			await answer('2', 'Down');
			await fireEvent.click(screen.getByTestId('circle-next-pair'));
		}
		await answer('3', 'Down');
		await answer('2', 'Down');
		await fireEvent.click(screen.getByTestId('circle-next-pair'));
		await answer('2', 'Down');
		expect(onDistanceStreak).not.toHaveBeenCalled();
	});
});

describe('CircleOfFifthsDrill: copy', () => {
	it('renders in French with no em or en dashes in either locale', async () => {
		for (const locale of ['en', 'fr'] as const) {
			setLocale(locale);
			const { container } = render(CircleOfFifthsDrill);
			if (locale === 'fr') expect(prompt()).toBe("Une quinte sous C, c'est ?");
			await tapChoice('G');
			expect(container.textContent).not.toMatch(/[–—]/);
			cleanup();
		}
	});
});
