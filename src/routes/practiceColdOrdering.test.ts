import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import type { HybridQueueItem, ComposeOptions } from '$lib/practice/practiceQueue';
import { t } from '$lib/i18n/locale.svelte';

/**
 * QUEUE-01 (Phase 36 Plan 02): complements Plan 01's composer unit tests
 * (practiceQueue.test.ts's "cold-session first-item ordering" block, which
 * prove the never-leads-with-scaffold-heavy guarantee GIVEN the signal).
 * This file proves the /practice HOST computes and passes that signal
 * correctly: a cold (all-New chord cards) session's carded half yields
 * composePracticeQueue's 4th argument as `{ lowMastery: true }`, a warm
 * (majority State.Review) session yields `{ lowMastery: false }`, and a
 * cold session's first rendered family cue is never the progression or
 * inversion (scaffold-heavy) family - the end-to-end guarantee.
 *
 * Reuses the Phase 27/35 mock harness (practiceInversionsReg.test.ts):
 * deck/introBudget/telemetry/audio mocked, songFilterPref/songProvenance
 * REAL (song filter stays OFF/default so every synthetic family - voicing,
 * progression, inversion - is woven in). `$lib/practice/practiceQueue` is
 * mocked ONLY for composePracticeQueue, via importOriginal: the spy
 * captures every call's arguments and then delegates to the REAL
 * implementation, so isLowMasterySession/syntheticVoicingItems/
 * syntheticProgressionItems/syntheticInversionItems all stay real and the
 * actual weave is genuinely exercised, not stubbed away.
 */

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();
const getCardMock = vi.fn();

vi.mock('$lib/srs/deck', () => ({
	introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
	getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
	getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
	recordGrade: (...args: unknown[]) => recordGradeMock(...args),
	getCard: (...args: unknown[]) => getCardMock(...args)
}));

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

type ComposeArgs = [HybridQueueItem[], HybridQueueItem[], () => number, ComposeOptions?];
let composeCalls: ComposeArgs[] = [];

vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		composePracticeQueue: (...args: ComposeArgs) => {
			composeCalls.push(args);
			return actual.composePracticeQueue(...args);
		}
	};
});

const NOW = new Date('2026-07-27T12:00:00Z');

function makeCard(
	factId: string,
	factKind: CardRecord['factKind'],
	mode: CardRecord['mode'],
	state: State
): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode,
		state,
		lastRating: null,
		masteryDayCount: 0
	};
}

/**
 * Three seventh-chord due cards, all State.New (matches
 * practiceInversionsReg.test.ts's VOICING_SHELL_LETTERS catalog: Cm7/Dm7/G7
 * all have voicing shell letters and non-zero inversion counts, so this
 * fixture reliably earns voicing, progression, AND inversion synthetics).
 * All-New => isLowMasterySession returns true (0 mature of 3).
 */
function coldChordCards(): CardRecord[] {
	return [
		makeCard('chord-formula:Cm7', 'chord-formula', 'see-play', State.New),
		makeCard('chord-formula:Dm7', 'chord-formula', 'see-play', State.New),
		makeCard('chord-formula:G7', 'chord-formula', 'see-play', State.New)
	];
}

/**
 * Same three symbols, but 2-of-3 State.Review (majority mature) - warm per
 * isLowMasterySession's own exact boundary (2-of-3 mature is NOT
 * low-mastery; matureCount * 2 < cards.length is false for 2*2 < 3).
 */
function warmChordCards(): CardRecord[] {
	return [
		makeCard('chord-formula:Cm7', 'chord-formula', 'see-play', State.Review),
		makeCard('chord-formula:Dm7', 'chord-formula', 'see-play', State.Review),
		makeCard('chord-formula:G7', 'chord-formula', 'see-play', State.New)
	];
}

beforeEach(() => {
	localStorage.clear();
	composeCalls = [];
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset().mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: unknown) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);
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

describe('QUEUE-01: /practice host computes and passes the low-mastery signal', () => {
	it('a cold (all-New) chord session passes lowMastery: true to composePracticeQueue', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		getDueCardsMock.mockResolvedValue(coldChordCards());

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		expect(composeCalls).toHaveLength(1);
		expect(composeCalls[0][3]).toEqual({ lowMastery: true });
	});

	it('a warm (majority State.Review) chord session passes lowMastery: false to composePracticeQueue', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		getDueCardsMock.mockResolvedValue(warmChordCards());

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');

		expect(composeCalls).toHaveLength(1);
		expect(composeCalls[0][3]).toEqual({ lowMastery: false });
	});
});

describe('QUEUE-01: a cold session never leads with a scaffold-heavy family', () => {
	it('with song filter OFF and every synthetic woven, the first rendered family cue is never progression or inversion', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		getDueCardsMock.mockResolvedValue(coldChordCards());

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		const firstCue = screen.getByTestId('question-source-tag').textContent?.trim();
		expect(firstCue).not.toBe(t('practice.cue.progression'));
		expect(firstCue).not.toBe(t('practice.cue.inversion'));
	});
});
