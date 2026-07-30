import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShellVoicingDrill from './ShellVoicingDrill.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { hasVoicingMet } from '$lib/practice/voicingMet';
import { hasDrillableShell, seventhChordSymbols } from '$lib/practice/shellVoicing';
import { spellChord } from '$lib/theory/chord';
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

/**
 * Mirrors ShellVoicingDrill.svelte's own drawSymbol(): seventhChordSymbols()
 * filtered to hasDrillableShell (n1-tier-unlock added 7sus4 to the seventh
 * matrix, but its shell is a single note - see shellVoicing.test.ts). Any
 * test that forces a draw by mocking Math.random must index into THIS array
 * and normalize against ITS length, not the raw seventhChordSymbols() pool,
 * since the two now differ in size.
 */
function drillablePool(): string[] {
	return seventhChordSymbols().filter((symbol) => hasDrillableShell(spellChord(symbol)));
}

/** Mirrors PracticeIntervalDrill.test.ts's audio-module mock convention (no real AudioContext/tone import in jsdom). */
const playNoteMock = vi.fn();
const playChordMock = vi.fn();
const ensureAudioReadyMock = vi.fn(async () => {});
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
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
	playChordMock.mockReset();
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
		expect(screen.queryByTestId('voicing-nudges')).not.toBeInTheDocument();
	});

	it('ghost-hatches the root + fifth of a FLAT-rooted chord (Ebmaj7): chroma matching, never letter strings', async () => {
		// Force the draw onto 'Ebmaj7' (flat root E♭, flat fifth B♭): its ghost
		// entries carry spellChord's flat spellings, which must land on the
		// keyboard's sharp-labeled black keys (D♯/A♯) via chroma comparison.
		//
		// n1-tier-unlock: drawSymbol() indexes into the HAS-DRILLABLE-SHELL
		// FILTERED pool (seventhChordSymbols() minus the 12 7sus4 entries,
		// which now also carry a seventh role but have no third to shell), not
		// the raw seventhChordSymbols() array - so the mocked Math.random
		// fraction must be normalized against that same filtered array's
		// length, or it silently draws the wrong chord once the two arrays'
		// lengths diverge (they were always equal pre-n1-tier-unlock).
		const symbols = drillablePool();
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
		const symbols = drillablePool();
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
		expect(screen.getByTestId('voicing-nudges')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add the root' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove the bass' })).toBeInTheDocument();
		expect(screen.queryByTestId('teach-panel')).not.toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: meet (Voir) stage shows the target symbol and tap-to-hear keys (UAT G3)', () => {
	it('renders the target chord symbol above the compare keyboards', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
		const glyph = screen.getByTestId('meet-glyph');
		expect(glyph.textContent).toContain('C');
	});

	it('makes both compare keyboards tap-to-hear: tapping a note sounds it via the shared audio contract', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));

		// Inspect-mode taps play through emitInspect (PianoKeyboard's own
		// pre-existing inspect path), which calls playNote directly - unlike
		// interactive/construct mode's playKeyTouch, it doesn't call
		// ensureAudioReady itself.
		const knowBoard = screen.getByTestId('compare-know');
		const cKey = within(knowBoard).getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.click(cKey);

		expect(playNoteMock).toHaveBeenCalledWith('C4');
	});

	it('the compare keyboards stay display-only for grading: tapping never toggles selection or affects Got it', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));

		const useBoard = screen.getByTestId('compare-use');
		const eKey = within(useBoard).getAllByRole('button', { name: 'E key' })[0];
		await fireEvent.click(eKey);

		// Inspect-mode taps carry no aria-pressed toggle state (unlike
		// interactive mode's selection), and Got it is still present/untouched.
		expect(eKey).not.toHaveAttribute('aria-pressed');
		expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: drill (Exo) stage instruction names the selected style (UAT G5)', () => {
	it('starts on the shell, then switches wording per nudge tap (VOICE-01)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		expect(screen.getByText('Play the shell: just the guide tones.')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Add the root' }));
		expect(
			screen.getByText('Play the full voicing: root, third, fifth, seventh.')
		).toBeInTheDocument();
		expect(screen.getByTestId('current-voicing')).toHaveTextContent('Full');

		await fireEvent.click(screen.getByRole('button', { name: 'Remove the bass' }));
		expect(
			screen.getByText('Play it rootless: no root, just third, fifth, seventh.')
		).toBeInTheDocument();
		expect(screen.getByTestId('current-voicing')).toHaveTextContent('Rootless');
	});

	it('the subtract stage keeps its own fixed shell-only prompt regardless of style (no nudges there)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		expect(screen.getByText('Play the shell: just the guide tones.')).toBeInTheDocument();
		expect(screen.queryByTestId('voicing-nudges')).not.toBeInTheDocument();
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

		clickKey('C');
		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('retry')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('grades the drill stage against the selected voicing style (shell = 2 notes, the default)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: step tabs are freely user-navigable (UAT V1)', () => {
	it('clicking "2 SUBTRACT" while the real stage is meet actually shows the Retirer content, not stuck on Voir', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
		await fireEvent.click(screen.getByTestId('step-subtract'));

		expect(screen.getByTestId('stage-subtract')).toBeInTheDocument();
		expect(screen.getByTestId('teach-panel')).toBeInTheDocument();
		expect(screen.queryByTestId('stage-meet')).not.toBeInTheDocument();
		expect(screen.getByTestId('step-subtract')).toHaveClass('step--active');
	});

	it('clicking "3 DRILL" while the real stage is meet shows the Exo nudge controls', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-meet'));
		await fireEvent.click(screen.getByTestId('step-drill'));

		expect(screen.getByTestId('stage-drill')).toBeInTheDocument();
		expect(screen.getByTestId('voicing-nudges')).toBeInTheDocument();
	});

	it('clicking "1 MEET" while the real stage is subtract shows the compare reference, with Got it still available', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		await fireEvent.click(screen.getByTestId('step-meet'));

		expect(screen.getByTestId('stage-meet')).toBeInTheDocument();
		expect(screen.getByTestId('compare-know')).toBeInTheDocument();
		expect(screen.getByTestId('compare-use')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
	});

	it('clicking the real stage\'s own tab returns to it from an override', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		await fireEvent.click(screen.getByTestId('step-meet'));
		expect(screen.getByTestId('stage-meet')).toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('step-subtract'));

		expect(screen.getByTestId('stage-subtract')).toBeInTheDocument();
		expect(screen.queryByTestId('stage-meet')).not.toBeInTheDocument();
	});

	it('navigating away and back never corrupts grading: Check still grades whichever stage is currently shown (drill)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		await fireEvent.click(screen.getByTestId('step-meet'));
		expect(screen.getByTestId('stage-meet')).toBeInTheDocument();
		await fireEvent.click(screen.getByTestId('step-drill'));
		expect(screen.getByTestId('stage-drill')).toBeInTheDocument();

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});

	it('a fresh chord (Next) resets any stage override back to the newly-derived stage', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));
		await fireEvent.click(screen.getByTestId('step-drill'));
		expect(screen.getByTestId('stage-drill')).toBeInTheDocument();

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		// The next chord's stage is derived fresh (same Learning cards): back
		// to subtract, not still pinned to the previous chord's drill override.
		await waitFor(() => screen.getByTestId('stage-subtract'));
	});
});

describe('ShellVoicingDrill: drill/subtract stages show the target chord symbol before answering (UAT V2)', () => {
	it('renders the target chord symbol above the voicing selector on the drill stage, before any answer', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
		expect(screen.getByTestId('target-glyph').textContent).toContain('C');
	});

	it('renders the target chord symbol above the teach panel on the subtract stage', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		expect(screen.getByTestId('target-glyph').textContent).toContain('C');
	});
});

describe('ShellVoicingDrill: style switch preserves tapped notes (UAT V3)', () => {
	it('tapping a nudge keeps the already-tapped keys selected', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		clickKey('E');
		clickKey('B');
		await waitFor(() =>
			expect(screen.getAllByRole('button', { name: 'E key, selected' })[0]).toBeInTheDocument()
		);
		expect(screen.getAllByRole('button', { name: 'B key, selected' })[0]).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Add the root' }));

		expect(screen.getAllByRole('button', { name: 'E key, selected' })[0]).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: 'B key, selected' })[0]).toBeInTheDocument();
	});
});

describe('ShellVoicingDrill: a correct check plays the revealed voicing (UAT V4)', () => {
	it('plays the target voicing notes as a chord once the answer is correct', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(ensureAudioReadyMock).toHaveBeenCalled();
		expect(playChordMock).toHaveBeenCalledWith(['E', 'B']);
	});

	it('does not play anything on a wrong check', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		clickKey('C');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(playChordMock).not.toHaveBeenCalled();
	});
});

describe('ShellVoicingDrill: key-touch sound (UAT bug A)', () => {
	it('sounds a note when an interactive voicing key is pressed', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-subtract'));

		// Sound is now intrinsic to PianoKeyboard's activation choke point (G1
		// UAT fix), fired on click/Enter/Space (the tap that actually selects
		// the key), not on pointerdown.
		const eKey = screen.getAllByRole('button', { name: 'E key' })[0];
		await fireEvent.click(eKey);

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

describe('ShellVoicingDrill: lean nudge flow replaces the 3-way selector (VOICE-01)', () => {
	it('starts on the shell: neither nudge pressed, current voicing reads Shell, and the shell grades correct with no nudge tapped', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		expect(screen.getByRole('button', { name: 'Add the root' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(screen.getByRole('button', { name: 'Remove the bass' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(screen.getByTestId('current-voicing')).toHaveTextContent('Shell');

		clickKey('E');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});

	it('"Add the root" reaches the full voicing', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));
		await fireEvent.click(screen.getByRole('button', { name: 'Add the root' }));

		expect(screen.getByRole('button', { name: 'Add the root' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByTestId('current-voicing')).toHaveTextContent('Full');

		clickKey('C');
		clickKey('E');
		clickKey('G');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});

	it('"Remove the bass" reaches the rootless voicing', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));
		await fireEvent.click(screen.getByRole('button', { name: 'Remove the bass' }));

		expect(screen.getByRole('button', { name: 'Remove the bass' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByTestId('current-voicing')).toHaveTextContent('Rootless');

		clickKey('E');
		clickKey('G');
		clickKey('B');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});

	it('the old 3-way selector is gone from the drill stage', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		expect(screen.queryByTestId('voicing-selector')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'ROOT' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'ROOTLESS' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'SHELL' })).not.toBeInTheDocument();
	});

	it('reads the nudge labels and current-voicing line in French', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);
		setLocale('fr');

		render(ShellVoicingDrill);

		await waitFor(() => screen.getByTestId('stage-drill'));

		expect(screen.getByRole('button', { name: 'Poser la fondamentale' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Retirer la basse' })).toBeInTheDocument();
		expect(screen.getByTestId('current-voicing')).toHaveTextContent('Voicing actuel :');

		await fireEvent.click(screen.getByRole('button', { name: 'Poser la fondamentale' }));
		expect(screen.getByTestId('current-voicing')).toHaveTextContent('Complet');
	});
});

/**
 * BUG PIN (pedagogy audit, shell-voicing rationale). The subtract stage used
 * to render ONE line for all five seventh families:
 *
 *   'Drop what the symbol already tells you: root is named, fifth adds no
 *    color; keep the 3rd + 7th tritone.'
 *
 * The 3rd-to-7th interval is a tritone only in dom7 and dim7 (it is a perfect
 * fifth in maj7, m7 and m7b5), and on m7b5 / dim7 the ♭5 is the chord's
 * identity rather than colorless filler. shellVoicing.test.ts pins the
 * musical facts; this pins what the learner actually READS, per quality, plus
 * the ♭5 grading that now matches the words.
 */
describe('ShellVoicingDrill: quality-aware shell rationale (pedagogy audit bug pin)', () => {
	const PERFECT_FIFTH_FAMILIES = ['Cmaj7', 'Cm7', 'C7'];
	const FLAT5_FAMILIES = ['Cm7b5', 'Cdim7'];

	async function renderSubtract(symbol: string) {
		getAllCardsMock.mockResolvedValue([
			{ ...makeCard(State.Learning), factId: `chord-formula:${symbol}` }
		]);
		const rendered = render(ShellVoicingDrill, { props: { embedSymbol: symbol } });
		await waitFor(() => screen.getByTestId('stage-subtract'));
		return rendered;
	}

	it('never claims a tritone on any of the five seventh families', async () => {
		for (const symbol of [...PERFECT_FIFTH_FAMILIES, ...FLAT5_FAMILIES]) {
			const { unmount } = await renderSubtract(symbol);
			const text = screen.getByTestId('teach-panel').textContent ?? '';
			expect(text.toLowerCase(), symbol).not.toContain('tritone');
			unmount();
		}
	});

	it('perfect-fifth families read the guide-tone rationale (3rd says major/minor, 7th says which seventh)', async () => {
		for (const symbol of PERFECT_FIFTH_FAMILIES) {
			const { unmount } = await renderSubtract(symbol);
			const panel = screen.getByTestId('teach-panel');
			expect(panel, symbol).toHaveTextContent('Keep the two guide tones');
			expect(panel, symbol).toHaveTextContent('the 3rd says major or minor');
			expect(panel, symbol).toHaveTextContent('the 7th says which seventh');
			expect(panel, symbol).toHaveTextContent('a plain 5th adds no color');
			expect(panel.textContent, symbol).not.toContain('♭5');
			unmount();
		}
	});

	it('♭5 families read the exception instead: the ♭5 is the identity and stays in the shell', async () => {
		for (const symbol of FLAT5_FAMILIES) {
			const { unmount } = await renderSubtract(symbol);
			const panel = screen.getByTestId('teach-panel');
			expect(panel, symbol).toHaveTextContent('The ♭5 stays.');
			expect(panel, symbol).toHaveTextContent('the fifth is the chord identity, not filler');
			expect(panel, symbol).toHaveTextContent('the shell keeps the 3rd, the ♭5 and the 7th');
			// The generic "adds no color" claim never reaches a ♭5 chord.
			expect(panel.textContent, symbol).not.toContain('adds no color');
			unmount();
		}
	});

	it('the play prompt names the ♭5 only where the shell actually carries one', async () => {
		const { unmount } = await renderSubtract('Cm7');
		expect(screen.getByText('Play the shell: just the guide tones.')).toBeInTheDocument();
		unmount();

		await renderSubtract('Cm7b5');
		expect(screen.getByText('Play the shell: the guide tones plus the ♭5.')).toBeInTheDocument();
	});

	it('the meet-stage "what players use" caption names the ♭5 shell as three notes', async () => {
		getAllCardsMock.mockResolvedValue([]);
		const { unmount } = render(ShellVoicingDrill, { props: { embedSymbol: 'Cm7b5' } });
		await waitFor(() => screen.getByTestId('stage-meet'));
		expect(screen.getByTestId('compare-use')).toHaveTextContent('The shell. Third, ♭5, and seventh.');
		unmount();

		getAllCardsMock.mockResolvedValue([]);
		render(ShellVoicingDrill, { props: { embedSymbol: 'Cm7' } });
		await waitFor(() => screen.getByTestId('stage-meet'));
		expect(screen.getByTestId('compare-use')).toHaveTextContent(
			'The shell. Just the third and seventh.'
		);
	});

	it('Cm7b5 now grades the ♭5 as required: the bare 3rd + 7th (the Cm7 shell) retries', async () => {
		await renderSubtract('Cm7b5');

		// E♭ + B♭ = the Cm7 shell, chroma-identical to what this drill used to
		// accept for Cm7b5. It must no longer be a complete answer.
		clickKey('D♯');
		clickKey('A♯');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('retry')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('Cm7b5 grades correct with the ♭5 in place (3rd + ♭5 + 7th)', async () => {
		await renderSubtract('Cm7b5');

		clickKey('D♯');
		clickKey('F♯');
		clickKey('A♯');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
		expect(screen.queryByTestId('retry')).not.toBeInTheDocument();
	});

	it('a ♭5 chord ghost-hatches the root only, so the keyboard never offers the ♭5 as droppable', async () => {
		const { container } = await renderSubtract('Cm7b5');

		expect(container.querySelectorAll('[data-ghost="R"]')).toHaveLength(1);
		expect(container.querySelectorAll('[data-ghost="5"]')).toHaveLength(0);
	});

	it('FR: both rationale variants read correctly and neither mentions a triton', async () => {
		setLocale('fr');

		const { unmount } = await renderSubtract('Cm7');
		let panel = screen.getByTestId('teach-panel');
		expect(panel).toHaveTextContent('Garde les deux tons de guidage');
		expect(panel).toHaveTextContent('la tierce dit majeur ou mineur');
		expect(panel.textContent?.toLowerCase()).not.toContain('triton');
		unmount();

		await renderSubtract('Cm7b5');
		panel = screen.getByTestId('teach-panel');
		expect(panel).toHaveTextContent('Mais la ♭5 reste.');
		expect(panel).toHaveTextContent("la quinte fait l'identité de l'accord");
		expect(panel.textContent?.toLowerCase()).not.toContain('triton');
		expect(screen.getByText('Joue le shell : les tons de guidage plus la ♭5.')).toBeInTheDocument();
	});
});

/**
 * BUG PIN (music-theory audit, Bug E): a chord whose shell has fewer than two
 * notes has no answerable "play the guide tones" question. shellNotes(C6) is
 * a single note [E] and shellNotes(Csus4) is empty, and with an empty target
 * matchChord rejects EVERY play, so Check could never be satisfied and the
 * learner would be stuck in a retry loop with nothing required (optionalMarkers
 * meanwhile marked both remaining notes droppable). Unreachable from the
 * standalone draw today (the 12x5 seventh matrix is all drillable) but reachable
 * right now via embedSymbol, and it blocks the queued chart-vocabulary
 * expansion to 6 / m6 / sus4 / add9 / 9 / 13 / m(maj7).
 */
describe('ShellVoicingDrill: undrillable shell guard (music-theory audit Bug E)', () => {
	async function renderEmbedded(symbol: string) {
		getAllCardsMock.mockResolvedValue([
			{ ...makeCard(State.Learning), factId: `chord-formula:${symbol}` }
		]);
		return render(ShellVoicingDrill, { props: { embedSymbol: symbol } });
	}

	it('C6 renders the no-shell notice instead of an unanswerable drill', async () => {
		await renderEmbedded('C6');
		await waitFor(() => screen.getByTestId('shell-unavailable'));

		expect(screen.getByTestId('shell-unavailable')).toHaveTextContent(
			'No shell to drill on this symbol'
		);
		expect(screen.getByTestId('shell-unavailable')).toHaveTextContent(
			'a shell keeps the third and the seventh'
		);
		// No unwinnable question is offered: no stage UI, no Check.
		expect(screen.queryByTestId('step-indicator')).not.toBeInTheDocument();
		expect(screen.queryByTestId('stage-subtract')).not.toBeInTheDocument();
		expect(screen.queryByTestId('stage-drill')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
		expect(screen.queryByTestId('retry')).not.toBeInTheDocument();
	});

	it('Csus4 (empty shell, the retry-loop case) is guarded the same way', async () => {
		await renderEmbedded('Csus4');
		await waitFor(() => screen.getByTestId('shell-unavailable'));

		expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
		expect(screen.getByTestId('target-glyph')).toBeInTheDocument();
	});

	it('the notice still names the chord and offers a way onward', async () => {
		const onComplete = vi.fn();
		getAllCardsMock.mockResolvedValue([]);
		render(ShellVoicingDrill, { props: { embedSymbol: 'C69', onComplete } });
		await waitFor(() => screen.getByTestId('shell-unavailable'));

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('FR: the notice reads in French', async () => {
		setLocale('fr');
		await renderEmbedded('C6');
		await waitFor(() => screen.getByTestId('shell-unavailable'));

		expect(screen.getByTestId('shell-unavailable')).toHaveTextContent(
			'Pas de shell à travailler sur ce symbole'
		);
	});

	it('every drillable chord is untouched: the seventh families still render their stages', async () => {
		for (const symbol of ['Cmaj7', 'Cm7', 'C7', 'Cm7b5', 'Cdim7']) {
			const { unmount } = await renderEmbedded(symbol);
			await waitFor(() => screen.getByTestId('step-indicator'));
			expect(screen.queryByTestId('shell-unavailable'), symbol).not.toBeInTheDocument();
			unmount();
		}
	});

	it('the meet stage of an extended chord shows the FULL stack, extensions included', async () => {
		getAllCardsMock.mockResolvedValue([]);
		render(ShellVoicingDrill, { props: { embedSymbol: 'C13' } });
		await waitFor(() => screen.getByTestId('stage-meet'));

		// C13 spells C E G B♭ D A. Before Bug E's fix the "what you know" card
		// (fullStackNotes) highlighted only C E G B♭: the 9th and the 13th were
		// dropped from the chord's OWN full stack.
		const know = screen.getByTestId('compare-know');
		const highlighted = [
			...know.querySelectorAll('.note-label--highlighted .note-label__letter')
		].map((letter) => letter.textContent);
		expect(highlighted).toContain('D');
		expect(highlighted).toContain('A');
		expect(new Set(highlighted)).toEqual(new Set(['C', 'E', 'G', 'B♭', 'D', 'A']));
	});
});
