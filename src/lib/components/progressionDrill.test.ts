import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressionDrill from './ProgressionDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { saveSong, type Song } from '$lib/practice/songs';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * Component test for ProgressionDrill (Phase 25 Plan 05, sketch-017
 * synthesis, SK-017): mocks Math.random, which drives BOTH the pure 25-01
 * progression engine's random draw (randomProgression) and its Fisher-Yates
 * nameChoices shuffle - a constant 0 return deterministically draws
 * PROGRESSION_TEMPLATES[0] ('major-ii-V-I') keyed to PROGRESSION_KEYS[0]
 * ('C'), producing bars Dm7 (ii, subdominant) / G7 (V, dominant) / Cmaj7 (I,
 * tonic), with nameChoices' shuffle output worked out by hand below so the
 * exact chip text is assertable without any component-side seam. Also mocks
 * $lib/audio/audio: the embedded PianoKeyboard's interactive keys now sound
 * their own key-touch note through its own choke point (G1 UAT fix), so no
 * consumer test may let a real AudioContext/tone import happen in jsdom
 * (ARCHITECTURE-CONTRACTS.md consumer rule).
 *
 * Phase 34 Plan 01 (SCAF-02): also mocks $lib/srs/deck's getAllCards (there
 * is no global fake-indexeddb in this project's jsdom setup), mirroring
 * shellVoicingDrill.test.ts's deck-mock shape - the new per-bar maturity
 * read would otherwise fail in every test.
 */

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
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

const now0 = new Date('2026-07-20T00:00:00.000Z');

/** Bar 0's symbol in the deterministic draw is Dm7 (ii, major-ii-V-I in C). */
function makeCard(state: State): CardRecord {
	return {
		...newCard(now0),
		factId: 'chord-formula:Dm7',
		factKind: 'chord-formula',
		mode: 'formula',
		lastRating: null,
		masteryDayCount: 0,
		state
	};
}

function song(overrides: Partial<Song> = {}): Song {
	return {
		id: 'song-1',
		name: 'Autumn Leaves (my chart)',
		chordSymbols: ['Dm7'],
		createdAt: '2026-07-20T00:00:00.000Z',
		source: 'custom',
		active: true,
		...overrides
	};
}

/** First occurrence of a natural-letter key by its accessible name (mirrors the codebase's existing PianoKeyboard test convention). */
function clickKey(letter: string) {
	const keys = screen.getAllByRole('button', { name: `${letter} key` });
	fireEvent.click(keys[0]);
}

/** Names the current bar (step 1) by tapping its correct chord chip. */
async function nameBar(symbol: string) {
	await fireEvent.click(screen.getByText(symbol));
}

/** Plays the given chord's letters (step 2) then hits Check. */
async function playBar(letters: string[]) {
	for (const letter of letters) {
		clickKey(letter);
	}
	await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

/** Clicks the hint ladder's single reveal control (SCAF-01, Phase 34 Plan 02). */
async function revealHint() {
	const cta = screen.getByTestId('progression-hint-cta');
	const button = cta.querySelector('button');
	if (!button) throw new Error('progression-hint-cta has no button');
	await fireEvent.click(button);
}

beforeEach(() => {
	localStorage.clear();
	getAllCardsMock.mockReset();
	getAllCardsMock.mockResolvedValue([]);
	vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('ProgressionDrill: lead-sheet grid, roman-always/symbol-hidden', () => {
	it('renders a measure grid with roman numerals visible and every symbol hidden as "?" before earning', () => {
		render(ProgressionDrill);

		expect(screen.getByTestId('measures')).toBeInTheDocument();
		expect(screen.getByTestId('roman-0')).toHaveTextContent('ii');
		expect(screen.getByTestId('roman-1')).toHaveTextContent('V');
		expect(screen.getByTestId('roman-2')).toHaveTextContent('I');
		expect(screen.getByTestId('symbol-0')).toHaveTextContent('?');
		expect(screen.getByTestId('symbol-1')).toHaveTextContent('?');
		expect(screen.getByTestId('symbol-2')).toHaveTextContent('?');
	});

	it('renders the KEY banner above the prompt', () => {
		render(ProgressionDrill);

		expect(screen.getByTestId('key-banner')).toHaveTextContent('KEY:');
		expect(screen.getByTestId('key-banner')).toHaveTextContent('C');
		expect(screen.getByTestId('key-banner')).toHaveTextContent('MAJOR');
	});
});

describe('ProgressionDrill: derive-then-play two-step earning', () => {
	it('naming correctly advances to the play step, and the correct play earns the symbol (verdigris + ChordGlyph) and reveals its function', async () => {
		render(ProgressionDrill);

		expect(screen.getByTestId('step-register')).toHaveTextContent('STEP 1');
		await nameBar('Dm7');
		expect(screen.getByTestId('step-register')).toHaveTextContent('STEP 2');

		await playBar(['D', 'F', 'A', 'C']);

		expect(screen.getByTestId('symbol-0')).not.toHaveTextContent('?');
		expect(screen.getByTestId('symbol-0').querySelector('.chord-glyph')).toBeInTheDocument();
		expect(screen.getByTestId('measure-0')).toHaveClass('measure--played');
		expect(screen.getByTestId('function-reveal')).toHaveTextContent('SUBDOMINANT');

		// The cursor advanced to bar 1 (V/G7), back at step 1.
		expect(screen.getByTestId('step-register')).toHaveTextContent('STEP 1');
	});

	it('a wrong name pick never gates: it stays on step 1 with a gentle retry', async () => {
		render(ProgressionDrill);

		await fireEvent.click(screen.getByText('Em7'));

		expect(screen.getByTestId('name-retry')).toBeInTheDocument();
		expect(screen.getByTestId('step-register')).toHaveTextContent('STEP 1');
		expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
	});

	it('a wrong play never gates: it stays on step 2 with a gentle retry, symbol still hidden', async () => {
		render(ProgressionDrill);

		await nameBar('Dm7');
		clickKey('C');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('play-retry')).toBeInTheDocument();
		expect(screen.getByTestId('symbol-0')).toHaveTextContent('?');
		expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
	});

	it("shows a SongMark provenance mark on an earned bar's symbol present in an active song", async () => {
		saveSong(song());
		render(ProgressionDrill);

		await nameBar('Dm7');
		await playBar(['D', 'F', 'A', 'C']);

		const symbolBlock = screen.getByTestId('symbol-0');
		expect(symbolBlock.querySelector('[data-testid="song-mark"]')).toHaveTextContent(
			'Autumn Leaves (my chart)'
		);
	});
});

describe('ProgressionDrill: completion', () => {
	it('earning every bar shows a done state with a fresh-progression "Again" control', async () => {
		render(ProgressionDrill);

		await nameBar('Dm7');
		await playBar(['D', 'F', 'A', 'C']);
		await nameBar('G7');
		await playBar(['G', 'B', 'D', 'F']);
		await nameBar('Cmaj7');
		await playBar(['C', 'E', 'G', 'B']);

		expect(screen.getByTestId('progression-complete')).toBeInTheDocument();
		const again = screen.getByRole('button', { name: 'Again' });

		await fireEvent.click(again);

		expect(screen.queryByTestId('progression-complete')).not.toBeInTheDocument();
		expect(screen.getByTestId('symbol-0')).toHaveTextContent('?');
		expect(screen.getByTestId('step-register')).toHaveTextContent('STEP 1');
	});
});

describe('ProgressionDrill: beginner keyboard span from per-bar card maturity (SCAF-02)', () => {
	it('an empty deck resolves to one octave with the beginner caption shown', async () => {
		render(ProgressionDrill);

		await nameBar('Dm7');

		await waitFor(() => {
			expect(screen.getByRole('img', { name: 'Piano keyboard, one octave' })).toBeInTheDocument();
		});
		expect(screen.getByTestId('beginner-caption')).toBeInTheDocument();
	});

	it('a State.Review card for the current bar resolves to two octaves with no beginner caption', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);
		render(ProgressionDrill);

		await nameBar('Dm7');

		await waitFor(() => {
			expect(screen.getByRole('img', { name: 'Piano keyboard, two octaves' })).toBeInTheDocument();
		});
		expect(screen.queryByTestId('beginner-caption')).not.toBeInTheDocument();
	});

	it('a State.Learning card for the current bar resolves to one octave with the beginner caption shown', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);
		render(ProgressionDrill);

		await nameBar('Dm7');

		await waitFor(() => {
			expect(screen.getByRole('img', { name: 'Piano keyboard, one octave' })).toBeInTheDocument();
		});
		expect(screen.getByTestId('beginner-caption')).toBeInTheDocument();
	});
});

describe('ProgressionDrill: escalating hint ladder (SCAF-01)', () => {
	it('reveals degree -> count -> ghost one rung at a time, then shows the closing note with the control gone', async () => {
		render(ProgressionDrill);

		await nameBar('Dm7');
		await waitFor(() => {
			expect(screen.getByTestId('progression-hint-cta')).toBeInTheDocument();
		});
		expect(screen.queryByTestId('progression-hint-layer')).not.toBeInTheDocument();

		await revealHint();
		let layers = screen.getAllByTestId('progression-hint-layer');
		expect(layers).toHaveLength(1);
		expect(layers[0]).toHaveAttribute('data-layer', 'degree');

		await revealHint();
		layers = screen.getAllByTestId('progression-hint-layer');
		expect(layers).toHaveLength(2);
		expect(layers[1]).toHaveAttribute('data-layer', 'count');
		expect(layers[1].querySelector('[data-testid="counting-chip-row"]')).toBeInTheDocument();

		await revealHint();
		layers = screen.getAllByTestId('progression-hint-layer');
		expect(layers).toHaveLength(3);
		expect(layers[2]).toHaveAttribute('data-layer', 'ghost');

		// All 3 rungs offered at 'meet' stage are now revealed: the control is
		// gone and the closing note shows, with already-revealed rungs intact.
		expect(screen.queryByTestId('progression-hint-cta')).not.toBeInTheDocument();
		expect(screen.getByTestId('progression-hint-closing-line')).toBeInTheDocument();
		expect(screen.getAllByTestId('progression-hint-layer')).toHaveLength(3);
	});

	it('never renders the current bar\'s chord symbol inside the ladder at any depth', async () => {
		render(ProgressionDrill);

		await nameBar('Dm7');
		await waitFor(() => {
			expect(screen.getByTestId('progression-hint-cta')).toBeInTheDocument();
		});

		await revealHint();
		await revealHint();
		await revealHint();

		const ladder = screen.getByTestId('progression-hint-ladder');
		expect(ladder.textContent).not.toContain('Dm7');
	});

	it('a subtract-stage card (State.Learning) offers only 2 rungs (count, ghost), tags renumbered from 1', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);
		render(ProgressionDrill);

		await nameBar('Dm7');
		await waitFor(() => {
			expect(screen.getByTestId('progression-hint-cta')).toBeInTheDocument();
		});

		await revealHint();
		let layers = screen.getAllByTestId('progression-hint-layer');
		expect(layers).toHaveLength(1);
		expect(layers[0]).toHaveAttribute('data-layer', 'count');
		expect(layers[0].querySelector('p')).toHaveTextContent('1');

		await revealHint();
		layers = screen.getAllByTestId('progression-hint-layer');
		expect(layers).toHaveLength(2);
		expect(layers[1]).toHaveAttribute('data-layer', 'ghost');
		expect(layers[1].querySelector('p')).toHaveTextContent('2');

		expect(screen.queryByTestId('progression-hint-cta')).not.toBeInTheDocument();
		expect(screen.getByTestId('progression-hint-closing-line')).toBeInTheDocument();
	});

	it('a drill-stage card (State.Review) renders no hint ladder at all', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);
		render(ProgressionDrill);

		await nameBar('Dm7');
		await waitFor(() => {
			expect(screen.getByRole('img', { name: 'Piano keyboard, two octaves' })).toBeInTheDocument();
		});
		expect(screen.queryByTestId('progression-hint-ladder')).not.toBeInTheDocument();
	});

	it('resets the ladder to closed when the cursor advances to the next bar', async () => {
		render(ProgressionDrill);

		await nameBar('Dm7');
		await waitFor(() => {
			expect(screen.getByTestId('progression-hint-cta')).toBeInTheDocument();
		});
		await revealHint();
		expect(screen.getAllByTestId('progression-hint-layer')).toHaveLength(1);

		await playBar(['D', 'F', 'A', 'C']);
		await nameBar('G7');

		await waitFor(() => {
			expect(screen.getByTestId('progression-hint-cta')).toBeInTheDocument();
		});
		expect(screen.queryByTestId('progression-hint-layer')).not.toBeInTheDocument();
	});

	it('preserves already-revealed rungs across a wrong Check within the same bar', async () => {
		render(ProgressionDrill);

		await nameBar('Dm7');
		await waitFor(() => {
			expect(screen.getByTestId('progression-hint-cta')).toBeInTheDocument();
		});
		await revealHint();
		expect(screen.getAllByTestId('progression-hint-layer')).toHaveLength(1);

		clickKey('C');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('play-retry')).toBeInTheDocument();
		expect(screen.getAllByTestId('progression-hint-layer')).toHaveLength(1);
	});

	it('populates ghost keys on the keyboard only after the ghost rung is revealed', async () => {
		const { container } = render(ProgressionDrill);

		await nameBar('Dm7');
		await waitFor(() => {
			expect(screen.getByTestId('progression-hint-cta')).toBeInTheDocument();
		});
		expect(container.querySelectorAll('.piano-keyboard__key--ghost')).toHaveLength(0);

		await revealHint(); // degree
		expect(container.querySelectorAll('.piano-keyboard__key--ghost')).toHaveLength(0);

		await revealHint(); // count
		expect(container.querySelectorAll('.piano-keyboard__key--ghost')).toHaveLength(0);

		await revealHint(); // ghost
		const ghostKeys = container.querySelectorAll('.piano-keyboard__key--ghost');
		expect(ghostKeys.length).toBeGreaterThan(0);
		const markers = [...ghostKeys].map((key) => key.getAttribute('data-ghost')).sort();
		expect(markers).toEqual(['3', '5', '7', 'R']);
	});
});
