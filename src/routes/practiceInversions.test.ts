import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { spellChord } from '$lib/theory/chord';
import { bassNoteFor } from '$lib/practice/inversions';

/**
 * /practice host integration test for the new inversion family (Phase 35,
 * INV-03, 35-06). Mirrors the practice-hub-mix.e2e.test.ts harness: mocks
 * $lib/srs/deck (deterministic due-card sets, no real Dexie), $lib/audio/
 * audio, and $lib/practice/answerTelemetry - but leaves $lib/practice/
 * practiceQueue's REAL syntheticInversionItems/composePracticeQueue in
 * place so the actual weave/gate logic under test is genuinely exercised.
 * syntheticVoicingItems/syntheticProgressionItems are stubbed to `[]` so a
 * due seventh-chord card here never ALSO pulls in a voicing/progression
 * item, keeping this file focused on the inversion family alone (mirrors
 * practice-hub.e2e.test.ts's own isolation rationale).
 *
 * Covers (Task 2 acceptance criteria):
 * 1. A due chord-formula card set surfaces an inversion item; when it is
 *    the current queue item, the host renders `inversion-drill` with the
 *    INVERSION family cue.
 * 2. Completing an inversion advances the queue and never calls
 *    deck.recordGrade for that completion (T-27-05-01 extended to
 *    inversions by T-35-06-02).
 * 3. The single-type-due gate (PRAC-05): an interval-only due set surfaces
 *    no inversion item at all.
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

vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		syntheticVoicingItems: () => [],
		syntheticProgressionItems: () => [],
		syntheticChordScaleItems: () => []
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

function makeCard(
	factId: string,
	factKind: CardRecord['factKind'],
	mode: CardRecord['mode']
): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode,
		lastRating: null,
		masteryDayCount: 0
	};
}

/**
 * PianoKeyboard's black keys are ALWAYS aria-labeled by their sharp spelling
 * (PianoKeyboard.svelte's `keyAriaLabel(key.sharpLetter)`), regardless of a
 * chord's own flat spelling - spellChord's letters (e.g. Cm7's third, "E♭")
 * must be converted before querying the DOM by accessible name.
 */
const FLAT_TO_SHARP: Record<string, string> = {
	'D♭': 'C♯',
	'E♭': 'D♯',
	'G♭': 'F♯',
	'A♭': 'G♯',
	'B♭': 'A♯'
};

function keyLabelFor(letter: string): string {
	return FLAT_TO_SHARP[letter] ?? letter;
}

/** Presses the letter's key at the given octave slot (0 = lower/base octave, 1 = the second octave), mirroring inversionDrill.test.ts's own helper. */
function pressKeyAtOctave(letter: string, octaveIndex: 0 | 1): void {
	const keys = screen.getAllByRole('button', { name: `${keyLabelFor(letter)} key` });
	const key = keys[octaveIndex];
	fireEvent.pointerDown(key);
	fireEvent.click(key);
}

/** Maps the rendered inversion-prompt's leading inversion name back to its 0-3 index - generic, does not assume which inversion the queue drew. */
const INVERSION_NAME_TO_INDEX: Record<string, number> = {
	'Root position': 0,
	'1st inversion': 1,
	'2nd inversion': 2,
	'3rd inversion': 3
};

function currentInversionIndex(): number {
	const promptText = screen.getByTestId('inversion-prompt').textContent ?? '';
	const match = Object.keys(INVERSION_NAME_TO_INDEX).find((name) => promptText.startsWith(name));
	if (match === undefined) throw new Error(`Could not parse inversion index from: ${promptText}`);
	return INVERSION_NAME_TO_INDEX[match];
}

/** Plays whichever inversion is currently rendered correctly (bass lowest, rest stacked above) and taps Check then Next - generic over symbol/index, driven entirely off the rendered prompt. */
async function completeCurrentInversion(symbol: string): Promise<void> {
	const index = currentInversionIndex();
	const target = spellChord(symbol);
	const bassNote = bassNoteFor(target, index);
	if (bassNote === undefined) throw new Error(`No bass note for ${symbol} at index ${index}`);

	pressKeyAtOctave(bassNote.letter, 0);
	for (const note of target.notes) {
		if (note.role === bassNote.role) continue;
		pressKeyAtOctave(note.letter, 1);
	}

	await fireEvent.click(screen.getByTestId('inversion-check'));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

beforeEach(() => {
	localStorage.clear();
	introduceNewCardsMock.mockReset();
	getDueCardsMock.mockReset();
	getAllCardsMock.mockReset().mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: number) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset().mockResolvedValue(undefined);
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

describe('inversion family surfaces and completes without an FSRS write (INV-03)', () => {
	it('renders InversionDrill under the INVERSION family cue, and completing it advances the queue with no deck.recordGrade call for that item', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		const nameCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		getDueCardsMock.mockResolvedValue([nameCard]);
		getAllCardsMock.mockResolvedValue([nameCard]);

		const { default: PracticePage } = await import('./practice/+page.svelte');
		render(PracticePage);

		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		let sawInversion = false;
		let recordGradeCallsBeforeInversion = 0;

		// The due card (Cm7) always earns its own name-it item PLUS up to 2
		// inversion items (SYNTHETIC_INVERSION_COUNT) - at most 3 items in
		// this fixture's queue.
		for (let i = 0; i < 3 && !screen.queryByTestId('session-end-card'); i++) {
			if (screen.queryByTestId('practice-chord-drill')) {
				expect(screen.getByTestId('question-source-tag')).toHaveTextContent('NAME IT');
				await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
				await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
			} else if (screen.queryByTestId('inversion-drill')) {
				sawInversion = true;
				expect(screen.getByTestId('question-source-tag')).toHaveTextContent('INVERSION');
				recordGradeCallsBeforeInversion = recordGradeMock.mock.calls.length;
				await completeCurrentInversion('Cm7');
				// The inversion completion itself must never call recordGrade.
				expect(recordGradeMock.mock.calls.length).toBe(recordGradeCallsBeforeInversion);
			} else {
				throw new Error('No drill component rendered for the current queue item');
			}
		}

		expect(sawInversion).toBe(true);
		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
		// Exactly the one FSRS grade commit for the carded name-it item; no
		// inversion completion ever added to this count.
		expect(recordGradeMock).toHaveBeenCalledTimes(1);
		expect(recordGradeMock).toHaveBeenCalledWith(nameCard, expect.anything());
	});
});

describe('single-type-due gate (PRAC-05): interval-only due set yields no inversion item', () => {
	it('an interval-only due set never surfaces InversionDrill', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		getDueCardsMock.mockResolvedValue([
			makeCard('interval-size:m2', 'interval-size', 'formula'),
			makeCard('interval-size:M2', 'interval-size', 'formula'),
			makeCard('interval-size:m3', 'interval-size', 'formula')
		]);

		const { default: PracticePage } = await import('./practice/+page.svelte');
		render(PracticePage);

		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('3 CARDS DUE TODAY');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		// With Math.random fixed at 0.1, the same deterministic shuffle proven
		// in tests/practice-hub-mix.e2e.test.ts's single-type-due-gate case
		// places the correct answer LAST in every 4-choice array, so this
		// never re-enqueues and always terminates after exactly 3 rounds.
		for (let i = 0; i < 3; i++) {
			expect(screen.getByTestId('question-source-tag')).toHaveTextContent('INTERVAL');
			expect(screen.queryByTestId('inversion-drill')).not.toBeInTheDocument();

			const choices = screen.getAllByRole('button', { name: /^Answer: / });
			await fireEvent.click(choices[choices.length - 1]);
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		}

		expect(screen.queryByTestId('inversion-drill')).not.toBeInTheDocument();
		expect(screen.getByTestId('session-end-card')).toBeInTheDocument();
	});
});
