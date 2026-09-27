import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePage from './practice/+page.svelte';
import { newCard, Rating, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { spellChord } from '$lib/theory/chord';
import { bassNoteFor } from '$lib/practice/inversions';
import { writeSongFilter } from '$lib/practice/songFilterPref';
import { saveSong } from '$lib/practice/songs';

/**
 * REG-01 gate (35-06): the existing five families' scheduling, FSRS
 * grade-commit, telemetry, interleaving, single-type-due gate, and
 * song-filter steering must stay byte-unchanged now that the inversion
 * family is woven into the same host (INV-03). Reuses the Phase 27 Plan 05
 * mock harness (tests/practice-hub-mix.e2e.test.ts): deck/introBudget/
 * telemetry/audio mocked, songFilterPref/songProvenance/songs REAL, and
 * `$lib/practice/practiceQueue` mocked ONLY for syntheticProgressionItems
 * (determinism over its own real-shuffle draw, same rationale as Plan 05) -
 * syntheticVoicingItems AND syntheticInversionItems run REAL here, so the
 * actual six-family weave under test is genuinely exercised, not stubbed
 * away.
 *
 * Complements (does not replace) the frozen composed-queue-order case added
 * to practiceQueue.test.ts by Plan 04 - this file proves the guarantee at
 * the HOST boundary (full render, real FSRS grade commit, real telemetry).
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
		// ml-modes-practice: a 7th synthetic family that this REG test's scope
		// (the pre-existing six-family weave, INV-03) never intended to cover -
		// stubbed to [] so its real, non-deterministic draw cannot perturb this
		// file's byte-identical assertions about the other six.
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

/** First occurrence of a natural-letter key by its accessible name (mirrors tests/practice-hub-mix.e2e.test.ts's clickKey convention). */
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

/** Reads the currently-rendered voicing item's target symbol off its own target-glyph ChordGlyph shadow (mirrors currentInversionSymbol below): the voicing draw is rng-sampled (sampleVoicingItems), so which symbol renders when is not catalog-order-stable. */
function currentVoicingSymbol(): string {
	const glyph = screen.getByTestId('target-glyph');
	const shadow = glyph.querySelector('[data-testid="chord-glyph-shadow"]');
	return (shadow?.textContent ?? '').replace(/\s+/g, '');
}

/** Drives an embedded ShellVoicingDrill round for whichever symbol is rendered: the chord's card is pre-seeded to State.Review, so the drill mounts straight into 'drill' stage. */
async function completeVoicing(): Promise<void> {
	await waitFor(() => screen.getByTestId('stage-drill'));
	const symbol = currentVoicingSymbol();
	const shellLetters = VOICING_SHELL_LETTERS[symbol];
	if (shellLetters === undefined) {
		throw new Error(`No shell letters known for rendered voicing symbol: ${symbol}`);
	}
	await clickKey(shellLetters[0]);
	await clickKey(shellLetters[1]);
	await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/**
 * Drives an embedded ProgressionDrill round bar-by-bar (name then play), and
 * answers the common-tone bridge step between consecutive bars (Phase 41,
 * report §A). A bar whose own card is pre-seeded to State.Review in this
 * file's shared getAllCardsMock mounts the bridge past 'meet', so
 * recognizing the held note escalates to the harder play substep (held note
 * + falling note - the same two letters as that bar's own
 * VOICING_SHELL_LETTERS entry, since the bridge's "play" answer is literally
 * the outgoing bar's shell); this helper detects which happened and
 * finishes either way. The fixed major-ii-V-I-in-C bars held letters are F
 * (Dm7 -> G7) then B (G7 -> Cmaj7).
 */
async function completeProgression(bars: { symbol: string; letters: string[] }[]): Promise<void> {
	const bridgeHeldLetters = ['F', 'B'];
	for (const [i, bar] of bars.entries()) {
		await fireEvent.click(screen.getByText(bar.symbol));
		for (const letter of bar.letters) {
			await clickKey(letter);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		if (i < bars.length - 1) {
			await fireEvent.click(
				screen.getByRole('button', { name: `Bridge note choice: ${bridgeHeldLetters[i]}` })
			);
			if (screen.getByTestId('step-register').textContent?.includes('BRIDGE')) {
				const [heldLetter, fallingLetter] = VOICING_SHELL_LETTERS[bar.symbol];
				await clickKey(heldLetter);
				await clickKey(fallingLetter);
				await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
			}
		}
	}
	await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/**
 * PianoKeyboard's black keys are ALWAYS aria-labeled by their sharp spelling
 * (keyAriaLabel(key.sharpLetter)), regardless of a chord's own flat
 * spelling - spellChord's letters must be converted before querying the
 * DOM by accessible name (mirrors src/routes/practiceInversions.test.ts's
 * own helper).
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

function pressKeyAtOctave(letter: string, octaveIndex: 0 | 1): void {
	const keys = screen.getAllByRole('button', { name: `${keyLabelFor(letter)} key` });
	const key = keys[octaveIndex];
	fireEvent.pointerDown(key);
	fireEvent.click(key);
}

const INVERSION_NAME_TO_INDEX: Record<string, number> = {
	'Root position': 0,
	'1st inversion': 1,
	'2nd inversion': 2,
	'3rd inversion': 3
};

/** Reads the currently-rendered inversion item's target symbol straight off ChordGlyph's shadow text (e.g. "Cm7") - generic, no assumption about which symbol/index the real syntheticInversionItems drew. */
function currentInversionSymbol(): string {
	return (screen.getByTestId('chord-glyph-shadow').textContent ?? '').replace(/\s+/g, '');
}

function currentInversionIndex(): number {
	const promptText = screen.getByTestId('inversion-prompt').textContent ?? '';
	const match = Object.keys(INVERSION_NAME_TO_INDEX).find((name) => promptText.startsWith(name));
	if (match === undefined) throw new Error(`Could not parse inversion index from: ${promptText}`);
	return INVERSION_NAME_TO_INDEX[match];
}

/** Plays whichever inversion item is currently rendered correctly (bass lowest, rest stacked above) and taps Check then Next - fully generic over symbol/index. */
async function completeCurrentInversion(): Promise<void> {
	const symbol = currentInversionSymbol();
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

/** seventhChordSymbols() catalog order (ROOTS x QUALITY_SUFFIXES) puts Cm7 before Dm7 before G7. */
const VOICING_SHELL_LETTERS: Record<string, [string, string]> = {
	Cm7: ['D♯', 'A♯'], // third (Eb) + seventh (Bb)
	Dm7: ['F', 'C'], // third (F) + seventh (C)
	G7: ['B', 'F'] // third (B) + seventh (F)
};

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
		'progression-drill',
		'inversion-drill'
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

describe('REG-01: six-family interleave, carded FSRS grade-commit, and synthetic telemetry silence', () => {
	it('interleaves all six families (including inversion) with no family running three-in-a-row, commits FSRS grades ONLY for the carded three, and never records telemetry for any synthetic completion', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		const buildCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		const nameCard = makeCard('chord-formula:Dm7', 'chord-formula', 'formula');
		const intervalCard = makeCard('interval-size:m3', 'interval-size', 'formula');
		getDueCardsMock.mockResolvedValue([buildCard, nameCard, intervalCard]);
		getCardMock.mockImplementation(async (factId: string, mode: string) =>
			factId === 'chord-formula:Cm7' && mode === 'formula-build' ? buildCard : undefined
		);
		// Both due chords are seventh chords, so both earn a voicing synthetic
		// AND contribute to the shared inversion candidate pool.
		getAllCardsMock.mockResolvedValue([
			makeCard('chord-formula:Cm7', 'chord-formula', 'formula', State.Review),
			makeCard('chord-formula:Dm7', 'chord-formula', 'formula', State.Review)
		]);
		syntheticProgressionItemsMock.mockReturnValue([MAJOR_II_V_I_IN_C_ITEM]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		const familiesSeen: string[] = [];

		// 3 carded (build/name/interval) + 2 voicing (Cm7, Dm7 - both survive
		// the SYNTHETIC_VOICING_COUNT draw, rng-ordered) + 1 progression
		// + up to 2 inversion (SYNTHETIC_INVERSION_COUNT) = up to 8.
		for (let i = 0; i < 8 && !screen.queryByTestId('session-end-card'); i++) {
			familiesSeen.push(screen.getByTestId('question-source-tag').textContent?.trim() ?? '');

			const family = currentFamilyTestId();
			if (family === 'practice-chord-drill') {
				await completeCardedChord('Dm7');
			} else if (family === 'practice-interval-drill') {
				await completeInterval('m3');
			} else if (family === 'build-session') {
				await completeBuildIt(['D♯', 'G', 'A♯']);
			} else if (family === 'shell-voicing-drill') {
				await completeVoicing();
			} else if (family === 'progression-drill') {
				await completeProgression(MAJOR_II_V_I_IN_C_BARS);
			} else if (family === 'inversion-drill') {
				await completeCurrentInversion();
			} else {
				throw new Error('No drill component rendered for the current queue item');
			}
		}

		// All six families must appear, including the new INVERSION one - the
		// pre-existing five are provably unaffected by its addition.
		expect(new Set(familiesSeen)).toEqual(
			new Set(['NAME IT', 'BUILD IT', 'INTERVAL', 'VOICING', 'PROGRESSION', 'INVERSION'])
		);
		for (let i = 0; i + 2 < familiesSeen.length; i++) {
			const threeInARow =
				familiesSeen[i] === familiesSeen[i + 1] && familiesSeen[i + 1] === familiesSeen[i + 2];
			expect(threeInARow).toBe(false);
		}

		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');

		// FSRS grade commit stays exactly the pre-existing three - the
		// carded name-it/interval items commit via the host, build-it commits
		// its own internal grade (same recordGrade mock) - inversion/voicing/
		// progression completions NEVER call it (T-27-05-01, T-35-06-02).
		expect(recordGradeMock).toHaveBeenCalledTimes(3);
		expect(recordGradeMock).toHaveBeenCalledWith(nameCard, Rating.Good);
		expect(recordGradeMock).toHaveBeenCalledWith(intervalCard, Rating.Good);
		expect(recordGradeMock).toHaveBeenCalledWith(buildCard, Rating.Easy, expect.any(Date));

		// Telemetry stays exactly the pre-existing three (name-it/interval/
		// build-it) - no synthetic completion (voicing/progression/inversion)
		// ever records a practice-answer event.
		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(3);
	});
});

describe('REG-01: single-type-due gate (PRAC-05) unaffected by the inversion addition', () => {
	it('an interval-only due set yields an intervals-only session - inversion never appears alongside the other four', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		getDueCardsMock.mockResolvedValue([
			makeCard('interval-size:m2', 'interval-size', 'formula'),
			makeCard('interval-size:M2', 'interval-size', 'formula'),
			makeCard('interval-size:m3', 'interval-size', 'formula')
		]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('3 CARDS DUE TODAY');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		for (let i = 0; i < 3; i++) {
			expect(screen.getByTestId('question-source-tag')).toHaveTextContent('INTERVAL');
			expect(screen.queryByTestId('practice-chord-drill')).not.toBeInTheDocument();
			expect(screen.queryByTestId('build-session')).not.toBeInTheDocument();
			expect(screen.queryByTestId('shell-voicing-drill')).not.toBeInTheDocument();
			expect(screen.queryByTestId('progression-drill')).not.toBeInTheDocument();
			expect(screen.queryByTestId('inversion-drill')).not.toBeInTheDocument();

			const choices = screen.getAllByRole('button', { name: /^Answer: / });
			await fireEvent.click(choices[choices.length - 1]);
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		}

		expect(syntheticProgressionItemsMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
	});
});

describe('REG-01: song filter (PRAC-04) steers the carded half, voicing, AND inversion identically', () => {
	it('restricts the carded half, voicing synthetics, and inversion synthetics all to the one provenance chord, and omits progressions entirely', async () => {
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
		// the due set before it can ever reach the carded half, the voicing
		// gate, or the inversion gate (all three read the SAME post-filter
		// dueChordSymbols set).
		getDueCardsMock.mockResolvedValue([
			makeCard('chord-formula:G7', 'chord-formula', 'formula'),
			makeCard('chord-formula:Cm7', 'chord-formula', 'formula')
		]);
		getAllCardsMock.mockResolvedValue([
			makeCard('chord-formula:G7', 'chord-formula', 'formula', State.Review)
		]);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		const familiesSeen: string[] = [];
		for (let i = 0; i < 6 && !screen.queryByTestId('session-end-card'); i++) {
			familiesSeen.push(screen.getByTestId('question-source-tag').textContent?.trim() ?? '');
			const family = currentFamilyTestId();
			if (family === 'practice-chord-drill') {
				await completeCardedChord('G7');
			} else if (family === 'shell-voicing-drill') {
				await completeVoicing();
			} else if (family === 'inversion-drill') {
				// Only G7 ever surfaces here - completeCurrentInversion reads the
				// rendered symbol itself, so a Cm7 leak would fail loudly (its
				// notes would never satisfy the G7-derived play).
				expect(currentInversionSymbol()).toBe('G7');
				await completeCurrentInversion();
			} else {
				throw new Error('Only name-it/voicing/inversion for G7 are expected in this filtered session');
			}
		}

		expect(familiesSeen.length).toBeGreaterThan(0);
		expect(new Set(familiesSeen).has('PROGRESSION')).toBe(false);
		expect(syntheticProgressionItemsMock).not.toHaveBeenCalled();
		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
	});
});
