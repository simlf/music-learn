import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShellVoicingDrill from './ShellVoicingDrill.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { hasVoicingMet } from '$lib/practice/voicingMet';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Component test for ShellVoicingDrill (Phase 25 Plan 07, sketch-019
 * synthesis, SK-019): mocks the deck persistence seam (getAllCards) exactly
 * like recallSession.test.ts, and Math.random (which drives
 * seventhChordSymbols()'s draw) deterministically. A constant 0 return
 * draws seventhChordSymbols()[0], worked out by hand from the shared fact
 * catalog's deterministic root x quality build order (ROOTS x
 * QUALITY_SUFFIXES, '' then 'm' then 'dim' then 'maj7' first for root C) -
 * that first seventh-bearing symbol is 'Cmaj7' (root C, third E, fifth G,
 * seventh B; shell = E + B).
 */

const now0 = new Date('2026-07-20T00:00:00.000Z');

function makeCard(state: State): CardRecord {
	return {
		...newCard(now0),
		factId: 'chord-formula:Cmaj7',
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

/** Mirrors PracticeIntervalDrill.test.ts's audio-module mock convention (no real AudioContext/tone import in jsdom). */
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn(async () => {});
vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: () => ensureAudioReadyMock()
}));

/** First occurrence of a natural-letter key by its accessible name (mirrors progressionDrill.test.ts's clickKey convention). */
function clickKey(letter: string) {
	const keys = screen.getAllByRole('button', { name: `${letter} key` });
	fireEvent.click(keys[0]);
}

beforeEach(() => {
	localStorage.clear();
	getAllCardsMock.mockReset();
	playNoteMock.mockReset();
	ensureAudioReadyMock.mockClear();
	vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('ShellVoicingDrill: stage derived from card maturity', () => {
	it('shows the compare (meet) stage when the deck has no cards for the chord', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
		expect(screen.getByTestId('compare-know')).toBeInTheDocument();
		expect(screen.getByTestId('compare-use')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
	});

	it('shows the compare (meet) stage when every card is State.New', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.New)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
	});

	it('shows the subtract stage (with ghost-hatched root + fifth) for a Learning card', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		const { container } = render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		expect(screen.getByTestId('teach-panel')).toBeInTheDocument();
		expect(container.querySelectorAll('[data-ghost="R"]')).toHaveLength(1);
		expect(container.querySelectorAll('[data-ghost="5"]')).toHaveLength(1);
		expect(screen.queryByTestId('voicing-selector')).not.toBeInTheDocument();
	});

	it('ghost-hatches the root + fifth of a FLAT-rooted chord (Ebmaj7): chroma matching, never letter strings', async () => {
		// Force the draw onto 'Ebmaj7' (flat root E♭, flat fifth B♭): its ghost
		// entries carry spellChord's flat spellings, which must land on the
		// keyboard's sharp-labeled black keys (D♯/A♯) via chroma comparison.
		const { seventhChordSymbols } = await import('$lib/practice/shellVoicing');
		const symbols = seventhChordSymbols();
		const idx = symbols.indexOf('Ebmaj7');
		expect(idx).toBeGreaterThan(-1);
		vi.spyOn(Math, 'random').mockReturnValue((idx + 0.5) / symbols.length);
		getAllCardsMock.mockResolvedValue([
			{ ...makeCard(State.Learning), factId: 'chord-formula:Ebmaj7' }
		]);

		const { container } = render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		expect(container.querySelectorAll('[data-ghost="R"]')).toHaveLength(1);
		expect(container.querySelectorAll('[data-ghost="5"]')).toHaveLength(1);
	});

	it('ghost-hatches a fifth whose audio voicing ascends past the base octave (G7: fifth D5) by pinning markers to octave 4', async () => {
		// G7's ascending stack is G4 B4 D5 F5: pinning the ghost markers to the
		// audio octave would put the fifth on D5, a key that does not exist on
		// a one-octave (phone) keyboard. Markers must pin to the keyboard's
		// base octave 4 instead.
		const { seventhChordSymbols } = await import('$lib/practice/shellVoicing');
		const symbols = seventhChordSymbols();
		const idx = symbols.indexOf('G7');
		expect(idx).toBeGreaterThan(-1);
		vi.spyOn(Math, 'random').mockReturnValue((idx + 0.5) / symbols.length);
		getAllCardsMock.mockResolvedValue([
			{ ...makeCard(State.Learning), factId: 'chord-formula:G7' }
		]);

		const { container } = render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		expect(container.querySelectorAll('[data-ghost="R"]')).toHaveLength(1);
		expect(container.querySelectorAll('[data-ghost="5"]')).toHaveLength(1);
		// The fifth's marker must sit on the FIRST (octave-4) D key, not the
		// octave-5 duplicate that only exists on two-octave spans.
		const dKeys = screen.getAllByRole('button', { name: 'D key' });
		expect(dKeys[0].getAttribute('data-ghost')).toBe('5');
	});

	it('shows the drill stage (voicing selector, no teach panel) for any Review card', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning), makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));
		expect(screen.getByTestId('voicing-selector')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'ROOT' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'SHELL' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'ROOTLESS' })).toBeInTheDocument();
		expect(screen.queryByTestId('teach-panel')).not.toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: stage UI gated on the deck read (WR-05)', () => {
	it('suppresses the stage UI (and the meet stage Got it action) until the deck read for the current chord lands', async () => {
		let resolveLoad!: (cards: CardRecord[]) => void;
		getAllCardsMock.mockReturnValue(
			new Promise<CardRecord[]>((resolve) => {
				resolveLoad = resolve;
			})
		);

		render(ShellVoicingDrill);

		// While the read is in flight, no stage (nor Got it, whose tap would
		// write a voicingMet mark from a stage derived from stale cards) renders.
		expect(screen.queryByTestId('stage-meet')).not.toBeInTheDocument();
		expect(screen.queryByTestId('stage-subtract')).not.toBeInTheDocument();
		expect(screen.queryByTestId('stage-drill')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();

		resolveLoad([makeCard(State.Learning)]);
		await waitFor(() => screen.getByTestId('stage-subtract'));
	});
});

describe('ShellVoicingDrill: step indicator', () => {
	it('always renders the 1 Meet / 2 Subtract / 3 Drill chips, with the current stage inverted', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		expect(screen.getByTestId('step-meet')).toHaveTextContent('1 MEET');
		expect(screen.getByTestId('step-subtract')).toHaveTextContent('2 SUBTRACT');
		expect(screen.getByTestId('step-drill')).toHaveTextContent('3 DRILL');
		expect(screen.getByTestId('step-subtract')).toHaveClass('step--active');
		expect(screen.getByTestId('step-meet')).not.toHaveClass('step--active');
	});
});

describe('ShellVoicingDrill: Got it advances the meet stage', () => {
	it('marks the chord met and advances from meet to subtract', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
		await fireEvent.click(screen.getByRole('button', { name: 'Got it' }));

		expect(hasVoicingMet('Cmaj7')).toBe(true);
		expect(screen.getByTestId('stage-subtract')).toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: grading + advance', () => {
	it('a correct shell chroma play in the subtract stage advances (Next resets to a fresh unanswered question)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
	});

	it('a wrong play in the subtract stage never gates: a gentle retry, still on the same question', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		clickKey('C');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('retry')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('subtract stage: shell + a ghost-marked optional note (root) still grades correct ("allowed but not required")', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		// Cmaj7 shell = E + B; C is the ghost-hatched root the UI labels
		// "allowed but not required" - playing it must never grade wrong.
		clickKey('C');
		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
		expect(screen.queryByTestId('retry')).not.toBeInTheDocument();
	});

	it('subtract stage: shell + a NON-optional extra note still retries (only ghost-marked notes are tolerated)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		// D is neither a shell note nor a ghost-marked optional (root/fifth).
		clickKey('E');
		clickKey('B');
		clickKey('D');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('retry')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('drill stage keeps the exact-set rule: shell style + the root grades wrong (no ghost tolerance outside subtract)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));
		await fireEvent.click(screen.getByRole('button', { name: 'SHELL' }));

		clickKey('C');
		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('retry')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('grades the drill stage against the selected voicing style (shell = 2 notes)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));
		await fireEvent.click(screen.getByRole('button', { name: 'SHELL' }));

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: step tabs review navigation (UAT bug C+D)', () => {
	it('clicking "1 MEET" while the real stage is subtract shows the read-only compare reference, without a Got it action', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		await fireEvent.click(screen.getByTestId('step-meet'));

		expect(screen.getByTestId('stage-meet')).toBeInTheDocument();
		expect(screen.getByTestId('compare-know')).toBeInTheDocument();
		expect(screen.getByTestId('compare-use')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
		expect(screen.getByTestId('step-meet')).toHaveClass('step--active');
	});

	it('clicking the real stage\'s own tab returns from the reviewed reference to the real (subtract) content', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		await fireEvent.click(screen.getByTestId('step-meet'));
		expect(screen.getByTestId('stage-meet')).toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('step-subtract'));

		expect(screen.getByTestId('stage-subtract')).toBeInTheDocument();
		expect(screen.queryByTestId('stage-meet')).not.toBeInTheDocument();
	});

	it('re-clicking "1 MEET" while already viewing it toggles back to the real stage', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));
		await fireEvent.click(screen.getByTestId('step-meet'));
		expect(screen.getByTestId('stage-meet')).toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('step-meet'));

		expect(screen.getByTestId('stage-drill')).toBeInTheDocument();
	});

	it('reviewing "1 MEET" never corrupts grading: Check still grades the real (drill) stage after returning', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));
		await fireEvent.click(screen.getByRole('button', { name: 'SHELL' }));

		await fireEvent.click(screen.getByTestId('step-meet'));
		expect(screen.getByTestId('stage-meet')).toBeInTheDocument();
		await fireEvent.click(screen.getByTestId('step-drill'));
		expect(screen.getByTestId('stage-drill')).toBeInTheDocument();

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});

	it('the real meet stage keeps its Got it action untouched (no viewedStage override yet)', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
		expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: key-touch sound (UAT bug A)', () => {
	it('sounds a note when an interactive voicing key is pressed', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		const eKey = screen.getAllByRole('button', { name: 'E key' })[0];
		await fireEvent.pointerDown(eKey);

		expect(ensureAudioReadyMock).toHaveBeenCalled();
		expect(playNoteMock).toHaveBeenCalledWith('E4');
	});

	it('does not sound a note once the question is answered (keyboard is no longer interactive)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		playNoteMock.mockClear();
		ensureAudioReadyMock.mockClear();

		expect(screen.queryByRole('button', { name: 'E key' })).not.toBeInTheDocument();
		expect(playNoteMock).not.toHaveBeenCalled();
	});
});
