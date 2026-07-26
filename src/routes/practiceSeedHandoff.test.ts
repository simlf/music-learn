import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { setDrillSeeds } from '$lib/practice/drillSeeds';

/**
 * REG-01 regression coverage for the /practice seed handoff (30-02): a
 * pending drill-seed (Progress "Drill these" / danger-cards / per-symbol, or
 * Lookup "Drill it") must still surface exactly the seeded chord symbol as a
 * prioritized name-it question, and the session must start even when
 * nothing is FSRS-due. Mirrors the mock harness from
 * tests/practice-hub.e2e.test.ts (deck/introBudget/telemetry/audio mocked;
 * practiceQueue's synthetic builders stubbed to `[]` so this stays focused
 * on the carded/seed half).
 */

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
	getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args)
}));

vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		syntheticVoicingItems: () => [],
		syntheticProgressionItems: () => []
	};
});

const remainingIntroBudgetMock = vi.fn();
const consumeIntroBudgetMock = vi.fn();
vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: (...args: unknown[]) => remainingIntroBudgetMock(...args),
	consumeIntroBudget: (...args: unknown[]) => consumeIntroBudgetMock(...args)
}));

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
}));

const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
}));

const NOW = new Date('2026-07-25T12:00:00Z');

/** An unrelated, never-due card: keeps the deck non-empty (`empty-none-due`, not `empty-no-deck`). */
function makeUnrelatedCard(): CardRecord {
	return {
		...newCard(NOW),
		factId: 'interval-size:m2',
		factKind: 'interval-size',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0
	};
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset().mockResolvedValue([]);
	getAllCardsMock.mockReset().mockResolvedValue([makeUnrelatedCard()]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: number) => ({
		...card,
		lastRating: rating
	}));
	remainingIntroBudgetMock.mockReset().mockReturnValue(0);
	consumeIntroBudgetMock.mockReset();
	recordPracticeAnswerMock.mockReset();
	playChordMock.mockReset();
	playNoteMock.mockReset();
	ensureAudioReadyMock.mockReset();
	ensureAudioReadyMock.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('practice seed handoff (REG-01)', () => {
	it('a pending drill seed starts a session even with nothing due, and drills the seeded chord first as a name-it question', async () => {
		setDrillSeeds(['Cm7']);
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		const preStart = await screen.findByTestId('practice-pre-start');
		expect(within(preStart).getByRole('button', { name: 'Start practice' })).toBeInTheDocument();
		expect(screen.queryByTestId('practice-empty-none-due')).not.toBeInTheDocument();

		await fireEvent.click(within(preStart).getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('NAME IT');
		expect(screen.getByTestId('practice-chord-drill')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Answer: Cm7' })).toBeInTheDocument();
	});

	it('consumes the seed one-shot: a later render with no seeds and the same empty deck lands on empty-none-due', async () => {
		// No setDrillSeeds call here - proves the previous render's seed
		// consumption did not leak into this one.
		const { default: PracticePage } = await import('./practice/+page.svelte');

		render(PracticePage);

		await screen.findByTestId('practice-empty-none-due');
	});
});
