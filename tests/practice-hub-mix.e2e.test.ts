import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from '../src/routes/practice/+page.svelte';
import { newCard, Rating, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { writeSongFilter } from '$lib/practice/songFilterPref';
import { saveSong } from '$lib/practice/songs';

/**
 * REG-02 end-to-end coverage for the merged five-family Practice session
 * (Phase 27 Plan 05). Reuses the Plan 04 mock harness (deck, introBudget,
 * telemetry, audio, songFilterPref/songProvenance/songs REAL) and adds one
 * targeted override: `$lib/practice/practiceQueue`'s syntheticProgressionItems
 * is stubbed for determinism (drawing from PROGRESSION_TEMPLATES x
 * PROGRESSION_KEYS with real Math.random shuffling would make the exact
 * template+key drawn unpredictable to assert against) while every other
 * export - composePracticeQueue, cardsToQueueItems, syntheticVoicingItems,
 * filterVoicingsBySong, advanceHybridQueue, familiesInQueue - runs REAL, so
 * the actual weave/gate/filter logic under test is genuinely exercised.
 *
 * Proves the four REG-02 behaviors named in 27-CONTEXT:
 * 1. Five-family interleaving (PRAC-02) with no family running 3-in-a-row.
 * 2. The single-type-due gate (PRAC-05): an interval-only due set yields an
 *    intervals-only session, no synthetics ever attempted.
 * 3. The song filter (PRAC-04) steering BOTH halves of the merged queue.
 * 4. The grade-commit split: carded items commit an FSRS grade via
 *    deck.recordGrade; synthetic (voicing/progression) items never do.
 *
 * Phase 35 (INV-03) note: syntheticInversionItems is ALSO stubbed to `[]`
 * here, deliberately - this file's scope is the pre-existing FIVE-family
 * REG-02 guarantee (unaffected, additive-only, by the new inversion family),
 * mirroring the same isolation the syntheticProgressionItems stub already
 * provides. The sixth-family guarantee (inversions woven in for REAL,
 * alongside proof that these five stay byte-unchanged) is covered by
 * src/routes/practiceInversionsReg.test.ts (35-06).
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

const syntheticProgressionItemsMock = vi.fn();
vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		syntheticProgressionItems: (...args: unknown[]) => syntheticProgressionItemsMock(...args),
		syntheticInversionItems: () => [],
		// ml-modes-practice: a 7th synthetic family outside this file's scope
		// (the pre-existing five-family PRAC-02 mix) - stubbed to [] for the
		// same isolation reason syntheticInversionItems already is.
		syntheticChordScaleItems: () => []
	};
});

const NOW = new Date('2026-07-25T12:00:00Z');

function makeCard(
	factId: string,
	factKind: CardRecord['factKind'],
	mode: CardRecord['mode'],
	state: State = State.New
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

/** First occurrence of a natural-letter key by its accessible name (mirrors shellVoicingDrill.test.ts's clickKey convention). */
function clickKey(letter: string) {
	return fireEvent.click(screen.getAllByRole('button', { name: `${letter} key` })[0]);
}

async function completeCardedChord(symbol: string): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: `Answer: ${symbol}` }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

async function completeInterval(short: string): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: `Answer: ${short}` }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Drives an embedded BuildSession round via the exact key-tap sequence proven by 27-04's mixed-family test. */
async function completeBuildIt(letters: string[]): Promise<void> {
	for (const letter of letters) {
		await clickKey(letter);
		await new Promise((resolve) => setTimeout(resolve, 700));
	}
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Drives an embedded ShellVoicingDrill round: the chord's card is pre-seeded to State.Review (getAllCardsMock), so the drill mounts straight into 'drill' stage on the shell (the default, VOICE-01) - no style click, no meet/subtract steps needed. */
async function completeVoicing(shellLetters: [string, string]): Promise<void> {
	await waitFor(() => screen.getByTestId('stage-drill'));
	await clickKey(shellLetters[0]);
	await clickKey(shellLetters[1]);
	await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Drives an embedded ProgressionDrill round bar-by-bar (name then play), mirroring ProgressionDrill.embed.test.ts's nameBar/playBar helpers. */
async function completeProgression(bars: { symbol: string; letters: string[] }[]): Promise<void> {
	for (const bar of bars) {
		await fireEvent.click(screen.getByText(bar.symbol));
		for (const letter of bar.letters) {
			await clickKey(letter);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	}
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** seventhChordSymbols() catalog order (ROOTS x QUALITY_SUFFIXES) puts Cm7 before Dm7 before G7 - composePracticeQueue preserves each family's within-family arrival order, so this is also the order voicing items for these three symbols will be dequeued in, regardless of their interleaved position. */
const VOICING_SHELL_LETTERS: Record<string, [string, string]> = {
	Cm7: ['D♯', 'A♯'], // third (Eb) + seventh (Bb)
	Dm7: ['F', 'C'], // third (F) + seventh (C)
	G7: ['B', 'F'] // third (B) + seventh (F)
};

/** The 'major-ii-V-I' template in key 'C' (Dm7-G7-Cmaj7), matching ProgressionDrill.embed.test.ts's proven bars. */
const MAJOR_II_V_I_IN_C_BARS = [
	{ symbol: 'Dm7', letters: ['D', 'F', 'A', 'C'] },
	{ symbol: 'G7', letters: ['G', 'B', 'D', 'F'] },
	{ symbol: 'Cmaj7', letters: ['C', 'E', 'G', 'B'] }
];

const MAJOR_II_V_I_IN_C_ITEM = {
	id: 'prog:major-ii-V-I:C',
	family: 'progression' as const,
	templateId: 'major-ii-V-I',
	key: 'C'
};

/** Detects the current queue item's rendered family branch by its component test id, or undefined if none is mounted. */
function currentFamilyTestId(): string | undefined {
	const ids = [
		'practice-chord-drill',
		'practice-interval-drill',
		'build-session',
		'shell-voicing-drill',
		'progression-drill'
	];
	return ids.find((id) => screen.queryByTestId(id) !== null);
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset().mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: Rating) => ({
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
	syntheticProgressionItemsMock.mockReset().mockReturnValue([]);
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('five-family interleaving (PRAC-02)', () => {
	it('interleaves all five families in one session with no family running three-in-a-row', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		const buildCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		const nameCard = makeCard('chord-formula:Dm7', 'chord-formula', 'formula');
		const intervalCard = makeCard('interval-size:m3', 'interval-size', 'formula');
		getDueCardsMock.mockResolvedValue([buildCard, nameCard, intervalCard]);
		getCardMock.mockImplementation(async (factId: string, mode: string) =>
			factId === 'chord-formula:Cm7' && mode === 'formula-build' ? buildCard : undefined
		);
		// Both due chords are seventh chords, so both earn a voicing synthetic;
		// pre-seeded to State.Review so ShellVoicingDrill mounts straight into
		// 'drill' stage for each.
		getAllCardsMock.mockResolvedValue([
			makeCard('chord-formula:Cm7', 'chord-formula', 'formula', State.Review),
			makeCard('chord-formula:Dm7', 'chord-formula', 'formula', State.Review)
		]);
		syntheticProgressionItemsMock.mockReturnValue([MAJOR_II_V_I_IN_C_ITEM]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		// 3 carded (build/name/interval) + 2 voicing (Cm7, Dm7) + 1 progression = 6.
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('6 CARDS DUE TODAY');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		const familiesSeen: string[] = [];
		let voicingsCompleted = 0;
		const voicingOrder = ['Cm7', 'Dm7'];

		for (let i = 0; i < 6; i++) {
			familiesSeen.push(screen.getByTestId('question-source-tag').textContent?.trim() ?? '');

			const family = currentFamilyTestId();
			if (family === 'practice-chord-drill') {
				await completeCardedChord('Dm7');
			} else if (family === 'practice-interval-drill') {
				await completeInterval('m3');
			} else if (family === 'build-session') {
				await completeBuildIt(['D♯', 'G', 'A♯']);
			} else if (family === 'shell-voicing-drill') {
				const symbol = voicingOrder[voicingsCompleted];
				voicingsCompleted += 1;
				await completeVoicing(VOICING_SHELL_LETTERS[symbol]);
			} else if (family === 'progression-drill') {
				await completeProgression(MAJOR_II_V_I_IN_C_BARS);
			} else {
				throw new Error('No drill component rendered for the current queue item');
			}
		}

		expect(new Set(familiesSeen)).toEqual(
			new Set(['NAME IT', 'BUILD IT', 'INTERVAL', 'VOICING', 'PROGRESSION'])
		);
		for (let i = 0; i + 2 < familiesSeen.length; i++) {
			const threeInARow =
				familiesSeen[i] === familiesSeen[i + 1] && familiesSeen[i + 1] === familiesSeen[i + 2];
			expect(threeInARow).toBe(false);
		}

		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
	});
});

describe('single-type-due gate (PRAC-05)', () => {
	it('an interval-only due set yields an intervals-only session - no other family ever appears', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		getDueCardsMock.mockResolvedValue([
			makeCard('interval-size:m2', 'interval-size', 'formula'),
			makeCard('interval-size:M2', 'interval-size', 'formula'),
			makeCard('interval-size:m3', 'interval-size', 'formula')
		]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		// No chord card is due at all, so no synthetic is ever attempted -
		// exactly the 3 interval cards, no padding from any other family.
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('3 CARDS DUE TODAY');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		for (let i = 0; i < 3; i++) {
			expect(screen.getByTestId('question-source-tag')).toHaveTextContent('INTERVAL');
			expect(screen.queryByTestId('practice-chord-drill')).not.toBeInTheDocument();
			expect(screen.queryByTestId('build-session')).not.toBeInTheDocument();
			expect(screen.queryByTestId('shell-voicing-drill')).not.toBeInTheDocument();
			expect(screen.queryByTestId('progression-drill')).not.toBeInTheDocument();

			// With Math.random fixed at 0.1, generateIntervalQuestion's final
			// choices shuffle deterministically places the correct answer
			// LAST in the 4-choice array (proven by hand: Fisher-Yates over
			// [target, d1, d2, d3] with j=floor(0.1*(i+1)) at every step
			// collapses to [d1, d2, d3, target]) - clicking the last choice
			// always answers correctly, so the item is never re-enqueued.
			const choices = screen.getAllByRole('button', { name: /^Answer: / });
			await fireEvent.click(choices[choices.length - 1]);
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		}

		expect(syntheticProgressionItemsMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
	});
});

describe('song filter steers the merged queue (PRAC-04)', () => {
	it('restricts both the carded half and the voicing synthetics to the one provenance chord, and omits progressions entirely', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);
		writeSongFilter(true);
		saveSong({
			id: 'test-song',
			name: 'Test Song',
			chordSymbols: ['G7'],
			createdAt: new Date().toISOString(),
			source: 'custom',
			active: true
		});

		// Cm7 has no provenance (only G7 does) - applySongFilter drops it from
		// the due set before it can ever reach the carded half or the
		// due-chord-symbol gate that seeds voicing synthetics.
		getDueCardsMock.mockResolvedValue([
			makeCard('chord-formula:G7', 'chord-formula', 'formula'),
			makeCard('chord-formula:Cm7', 'chord-formula', 'formula')
		]);
		getAllCardsMock.mockResolvedValue([
			makeCard('chord-formula:G7', 'chord-formula', 'formula', State.Review)
		]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		// Only G7's name-it item + G7's voicing item - Cm7 contributes
		// nothing, and progressions are omitted entirely under the filter.
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('2 CARDS DUE TODAY');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		const familiesSeen: string[] = [];
		for (let i = 0; i < 2; i++) {
			familiesSeen.push(screen.getByTestId('question-source-tag').textContent?.trim() ?? '');
			const family = currentFamilyTestId();
			if (family === 'practice-chord-drill') {
				await completeCardedChord('G7');
			} else if (family === 'shell-voicing-drill') {
				await completeVoicing(VOICING_SHELL_LETTERS.G7);
			} else {
				throw new Error('Only name-it/voicing for G7 are expected in this filtered session');
			}
		}

		expect(new Set(familiesSeen)).toEqual(new Set(['NAME IT', 'VOICING']));
		expect(syntheticProgressionItemsMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
	});
});

describe('grade-commit split (REG-02)', () => {
	it('commits an FSRS grade for the carded item but never for the synthetic voicing/progression items', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		const nameCard = makeCard('chord-formula:Dm7', 'chord-formula', 'formula');
		getDueCardsMock.mockResolvedValue([nameCard]);
		getAllCardsMock.mockResolvedValue([
			makeCard('chord-formula:Dm7', 'chord-formula', 'formula', State.Review)
		]);
		syntheticProgressionItemsMock.mockReturnValue([MAJOR_II_V_I_IN_C_ITEM]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		// Dm7 name-it + Dm7 voicing + 1 progression = 3.
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('3 CARDS DUE TODAY');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		for (let i = 0; i < 3; i++) {
			const family = currentFamilyTestId();
			if (family === 'practice-chord-drill') {
				await completeCardedChord('Dm7');
			} else if (family === 'shell-voicing-drill') {
				await completeVoicing(VOICING_SHELL_LETTERS.Dm7);
			} else if (family === 'progression-drill') {
				await completeProgression(MAJOR_II_V_I_IN_C_BARS);
			} else {
				throw new Error('No drill component rendered for the current queue item');
			}
		}

		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
		// Exactly one FSRS grade committed, for the carded name-it item's own
		// card - the voicing and progression completions never called
		// recordGrade at all (T-27-05-01).
		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock).toHaveBeenCalledWith(nameCard, Rating.Good);
	});
});
