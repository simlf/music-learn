import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SprintChallenge from './SprintChallenge.svelte';
import EarDuelChallenge from './EarDuelChallenge.svelte';
import KeyClimbChallenge from './KeyClimbChallenge.svelte';
import { readBest, recordKey } from '$lib/practice/challengeRecords';
import { readPracticeDays } from '$lib/practice/practiceDays';
import { EAR_DUEL_ROUNDS } from '$lib/practice/challenges';

/**
 * The three /practice challenges (ml-practice-game), each driven the way a
 * phone user drives it: taps on chips or on the on-screen keyboard, nothing
 * else. Timers are faked so the sprint's minute and every auto-advance are
 * stepped explicitly. The deck is mocked so any FSRS write a challenge made
 * would show up on `recordGrade`; none may.
 */

const playChordMock = vi.fn();
let soundOn = true;
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: vi.fn(),
	ensureAudioReady: async () => undefined,
	soundEnabled: () => soundOn
}));

const recordGradeMock = vi.fn();
vi.mock('$lib/srs/deck', () => ({
	recordGrade: (...args: unknown[]) => recordGradeMock(...args)
}));

vi.mock('$lib/practice/challenges', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/challenges')>();
	return {
		...actual,
		// Two stops instead of twelve keep the climb's end reachable in a test.
		keyClimbStops: (quality: string) => [`C${quality}`, `F${quality}`]
	};
});

beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-10-26T12:00:00'));
	playChordMock.mockClear();
	recordGradeMock.mockClear();
	soundOn = true;
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

async function advance(ms: number): Promise<void> {
	vi.advanceTimersByTime(ms);
	await tick();
}

function wrongChoice(rightLabel: string): HTMLElement {
	return screen
		.getAllByRole('button', { name: /^Answer: / })
		.find((button) => button.getAttribute('aria-label') !== `Answer: ${rightLabel}`)!;
}

describe('SprintChallenge', () => {
	it('scores right answers with a rising combo and lets a miss cost only the combo', async () => {
		render(SprintChallenge, { props: { pool: ['C'], onAgain: vi.fn() } });
		expect(screen.getByTestId('sprint-register')).toHaveTextContent('1:00 LEFT · 0 POINTS');

		for (let i = 0; i < 4; i++) {
			await fireEvent.click(screen.getByRole('button', { name: 'Answer: C E G' }));
			await advance(350);
		}
		// x1, x1, x1, then x2: 10 + 10 + 10 + 20.
		expect(screen.getByTestId('sprint-register')).toHaveTextContent('50 POINTS');
		expect(screen.getByTestId('sprint-combo')).toHaveTextContent('COMBO ×2');
		expect(screen.getByTestId('sprint-combo')).toHaveTextContent('4 IN A ROW');
		expect(playChordMock).toHaveBeenCalledTimes(4);

		await fireEvent.click(wrongChoice('C E G'));
		expect(screen.getByTestId('challenge-choice-grid').querySelector('[data-state="shown"]')).not.toBeNull();
		await advance(900);
		expect(screen.getByTestId('sprint-register')).toHaveTextContent('50 POINTS');
		expect(screen.getByTestId('sprint-combo')).toHaveTextContent('COMBO ×1');
	});

	it('ends after sixty seconds on a NEW BEST end card and records the day, never an FSRS grade', async () => {
		render(SprintChallenge, { props: { pool: ['C'], onAgain: vi.fn() } });
		await fireEvent.click(screen.getByRole('button', { name: 'Answer: C E G' }));
		await advance(60_000);

		expect(screen.getByText("TIME'S UP")).toBeInTheDocument();
		expect(screen.getByTestId('challenge-end-result')).toHaveTextContent('10 POINTS');
		expect(screen.getByTestId('challenge-new-best')).toBeInTheDocument();
		expect(readBest('sprint')).toBe(10);
		expect(readPracticeDays()).toEqual(['2026-10-26']);
		expect(recordGradeMock).not.toHaveBeenCalled();
	});

	it('shows the standing best on its own after a run below it, never the gap', async () => {
		localStorage.setItem('music-learn:challenges', JSON.stringify({ sprint: 300 }));
		render(SprintChallenge, { props: { pool: ['C'], onAgain: vi.fn() } });
		await fireEvent.click(screen.getByRole('button', { name: 'Answer: C E G' }));
		await advance(60_000);

		expect(screen.queryByTestId('challenge-new-best')).toBeNull();
		expect(screen.getByTestId('challenge-best')).toHaveTextContent('BEST 300');
		expect(readBest('sprint')).toBe(300);
	});
});

describe('EarDuelChallenge', () => {
	it('plays each chord, moves on by itself after a right answer, and scores the duel', async () => {
		render(EarDuelChallenge, { props: { pool: ['C'], onAgain: vi.fn() } });
		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('ear-duel-register')).toHaveTextContent(`CHORD 1 OF ${EAR_DUEL_ROUNDS}`);

		for (let i = 0; i < EAR_DUEL_ROUNDS; i++) {
			await fireEvent.click(screen.getByRole('button', { name: 'Answer: C' }));
			await advance(700);
		}

		expect(screen.getByTestId('challenge-end-result')).toHaveTextContent(`10 / ${EAR_DUEL_ROUNDS}`);
		expect(screen.getByTestId('challenge-new-best')).toBeInTheDocument();
		expect(screen.getByTestId('ear-duel-best-run')).toHaveTextContent('10');
		expect(readBest('ear-duel')).toBe(10);
		expect(recordGradeMock).not.toHaveBeenCalled();
	});

	it('waits on Next after a miss, replays the chord, and resets only the streak', async () => {
		render(EarDuelChallenge, { props: { pool: ['C'], onAgain: vi.fn() } });
		await fireEvent.click(screen.getByRole('button', { name: 'Answer: C' }));
		await advance(700);
		expect(screen.getByTestId('ear-duel-register')).toHaveTextContent('1 IN A ROW');

		await fireEvent.click(wrongChoice('C'));
		await advance(5_000);
		expect(screen.getByTestId('ear-duel-register')).toHaveTextContent('CHORD 2 OF');
		expect(screen.getByTestId('ear-duel-register')).toHaveTextContent('0 IN A ROW');

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(screen.getByTestId('ear-duel-register')).toHaveTextContent('CHORD 3 OF');
	});

	it('says so when sound is off instead of failing silently', () => {
		soundOn = false;
		render(EarDuelChallenge, { props: { pool: ['C'], onAgain: vi.fn() } });
		expect(screen.getByTestId('ear-duel-sound-off')).toBeInTheDocument();
	});
});

describe('KeyClimbChallenge', () => {
	async function play(letters: string[]): Promise<void> {
		for (const letter of letters) {
			await fireEvent.click(screen.getAllByRole('button', { name: `${letter} key` })[0]);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	}

	it('climbs key by key on the on-screen keyboard and keeps the best time per quality', async () => {
		render(KeyClimbChallenge, { props: { quality: '', onAgain: vi.fn() } });
		expect(screen.getByTestId('key-climb-register')).toHaveTextContent('KEY 1 OF 2 · 0:00');

		await play(['C', 'E', 'G']);
		expect(screen.getByTestId('key-climb-right')).toBeInTheDocument();
		await advance(450);
		expect(screen.getByTestId('key-climb-register')).toHaveTextContent('KEY 2 OF 2');

		await advance(10_000);
		await play(['F', 'A', 'C']);
		await advance(450);

		expect(screen.getByTestId('challenge-end-result')).toHaveTextContent('0:10');
		expect(screen.getByTestId('challenge-new-best')).toBeInTheDocument();
		expect(readBest(recordKey('key-climb', ''))).toBeGreaterThanOrEqual(10_000);
		expect(readBest(recordKey('key-climb', 'm7'))).toBeUndefined();
		expect(recordGradeMock).not.toHaveBeenCalled();
	});

	it('marks a wrong check for fixing in place, with no penalty and no restart', async () => {
		render(KeyClimbChallenge, { props: { quality: '', onAgain: vi.fn() } });
		await play(['C', 'E', 'A']);
		expect(screen.getByTestId('key-climb-retry')).toBeInTheDocument();
		expect(screen.getByTestId('key-climb-register')).toHaveTextContent('KEY 1 OF 2');

		// Fix it: drop the A, add the G.
		await fireEvent.click(screen.getAllByRole('button', { name: 'A key, selected' })[0]);
		await play(['G']);
		expect(screen.getByTestId('key-climb-right')).toBeInTheDocument();
	});
});
