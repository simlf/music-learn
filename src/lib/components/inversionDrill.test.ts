import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InversionDrill from './InversionDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { newCard, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * Component tests for InversionDrill (Phase 35 Plan 05, INV-01/INV-02).
 * Mirrors ProgressionDrill.embed.test.ts's harness: mocks $lib/audio/audio
 * (the embedded PianoKeyboard's interactive keys sound their own key-touch
 * note through its own choke point - no consumer test may let a real
 * AudioContext import happen in jsdom) and mocks $lib/srs/deck's
 * getAllCards (there is no global fake-indexeddb in this project's jsdom
 * setup).
 *
 * Drills Dm7 (D/F/A/C, all-natural-letter notes - avoids black-key
 * flat/sharp spelling ambiguity in test key lookups) at inversionIndex 2
 * (2nd inversion: the fifth, A, in the bass). Dm7's 2nd-inversion ascending
 * voicing (bass lowest) is A4 (fifth), C5 (seventh), D5 (root), F5 (third).
 */

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playChord: vi.fn(),
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

const now0 = new Date('2026-07-27T00:00:00.000Z');

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

/** Presses the letter's key at the given octave slot (0 = lower/base octave, 1 = the second octave), firing pointerdown (feeds onPress's octave) then click (toggles selection) - mirrors PianoKeyboard's real pointerdown-then-click interaction order. */
function pressKeyAtOctave(letter: string, octaveIndex: 0 | 1): void {
	const keys = screen.getAllByRole('button', { name: `${letter} key` });
	const key = keys[octaveIndex];
	fireEvent.pointerDown(key);
	fireEvent.click(key);
}

/** Plays Dm7's correct 2nd-inversion voicing: A (bass, lower octave), C/D/F stacked above. */
async function playCorrectInversion(): Promise<void> {
	pressKeyAtOctave('A', 0);
	pressKeyAtOctave('C', 1);
	pressKeyAtOctave('D', 1);
	pressKeyAtOctave('F', 1);
	await fireEvent.click(screen.getByTestId('inversion-check'));
}

/** Activates the letter's key at the given octave slot via keyboard ONLY (Enter), with no pointerdown - the AT/keyboard-user path that must still record the pressed octave (WR-01). */
function activateKeyViaKeyboard(letter: string, octaveIndex: 0 | 1): void {
	const keys = screen.getAllByRole('button', { name: `${letter} key` });
	const key = keys[octaveIndex];
	fireEvent.keyDown(key, { key: 'Enter' });
}

/** Plays Dm7's correct 2nd-inversion voicing using keyboard activation only (Enter), never pointerdown - the bass A is NOT the minimum-chroma tone, so this can only pass if the octave is recorded on the keyboard path too. */
async function playCorrectInversionViaKeyboard(): Promise<void> {
	activateKeyViaKeyboard('A', 0);
	activateKeyViaKeyboard('C', 1);
	activateKeyViaKeyboard('D', 1);
	activateKeyViaKeyboard('F', 1);
	await fireEvent.click(screen.getByTestId('inversion-check'));
}

/** Plays the right 4 notes but with F (the third) in the bass instead of A (the fifth) - chordCorrect true, bassCorrect false. */
async function playRightNotesWrongBass(): Promise<void> {
	pressKeyAtOctave('F', 0);
	pressKeyAtOctave('A', 1);
	pressKeyAtOctave('C', 1);
	pressKeyAtOctave('D', 1);
	await fireEvent.click(screen.getByTestId('inversion-check'));
}

/** Plays an incomplete/wrong note set (missing F). */
async function playWrongNotes(): Promise<void> {
	pressKeyAtOctave('A', 0);
	pressKeyAtOctave('C', 1);
	pressKeyAtOctave('D', 1);
	await fireEvent.click(screen.getByTestId('inversion-check'));
}

/** Clicks the hint ladder's single reveal control. */
async function revealHint(): Promise<void> {
	const cta = screen.getByTestId('inversion-hint-cta');
	const button = cta.querySelector('button');
	if (!button) throw new Error('inversion-hint-cta has no button');
	await fireEvent.click(button);
}

beforeEach(() => {
	getAllCardsMock.mockReset();
	getAllCardsMock.mockResolvedValue([]);
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('InversionDrill: symbol, prompt, passive strip', () => {
	it('renders the symbol glyph, the inversion prompt, and a passive 4-cell strip with the target cell marked and non-interactive', () => {
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		const root = screen.getByTestId('inversion-drill');
		expect(root.querySelector('.chord-glyph')).toBeInTheDocument();

		const prompt = screen.getByTestId('inversion-prompt');
		expect(prompt).toHaveTextContent('2nd inversion');
		expect(prompt).toHaveTextContent('fifth');
		expect(prompt).toHaveTextContent('in the bass');

		const strip = screen.getByTestId('inversion-strip');
		const cells = strip.querySelectorAll('.strip-cell');
		expect(cells).toHaveLength(4);
		expect(cells[2]).toHaveClass('strip-cell--active');
		cells.forEach((cell) => {
			expect(cell).not.toHaveAttribute('role');
			expect(cell).not.toHaveAttribute('tabindex');
		});
	});
});

describe('InversionDrill: grading (chroma + bass)', () => {
	it('a correct voicing (bass lowest) reaches the reveal line, and Next fires onComplete exactly once', async () => {
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		await playCorrectInversion();

		expect(screen.getByTestId('inversion-reveal')).toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('a keyboard-only (Enter) correct voicing wins - the octave is recorded on the keyboard path, so a bass that is not the min-chroma tone is still detected (WR-01)', async () => {
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		// Dm7's 2nd-inversion bass is A (chroma 9), NOT the lowest chroma among
		// the selected letters (C is chroma 0). Before the fix, keyboard
		// activation never recorded an octave, so the drill degenerated to
		// "lowest chroma wins" and this voicing looped forever on wrong-bass.
		await playCorrectInversionViaKeyboard();

		expect(screen.getByTestId('inversion-reveal')).toBeInTheDocument();
		expect(screen.queryByTestId('inversion-retry-bass')).not.toBeInTheDocument();
	});

	it('right notes but the wrong bass shows the distinguishing retry line and does not complete', async () => {
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		await playRightNotesWrongBass();

		expect(screen.getByTestId('inversion-retry-bass')).toHaveTextContent('fifth');
		expect(screen.queryByTestId('inversion-retry-notes')).not.toBeInTheDocument();
		expect(screen.queryByTestId('inversion-reveal')).not.toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();
	});

	it('wrong notes shows the generic wrong-notes retry line (distinct from the wrong-bass line) and does not complete', async () => {
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		await playWrongNotes();

		expect(screen.getByTestId('inversion-retry-notes')).toBeInTheDocument();
		expect(screen.queryByTestId('inversion-retry-bass')).not.toBeInTheDocument();
		expect(screen.queryByTestId('inversion-reveal')).not.toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();
	});
});

describe('InversionDrill: hint ladder fades by maturity (INV-02)', () => {
	it('an empty deck (meet stage) offers all 3 rungs; revealing stack shows a rotated CountingChipRow, revealing ghost lights ghost keys on the keyboard', async () => {
		const onComplete = vi.fn();
		const { container } = render(InversionDrill, {
			props: { symbol: 'Dm7', inversionIndex: 2, onComplete }
		});

		await waitFor(() => {
			expect(screen.getByTestId('inversion-hint-cta')).toBeInTheDocument();
		});
		expect(screen.queryByTestId('inversion-hint-layer')).not.toBeInTheDocument();

		await revealHint();
		let layers = screen.getAllByTestId('inversion-hint-layer');
		expect(layers).toHaveLength(1);
		expect(layers[0]).toHaveAttribute('data-layer', 'bass');

		await revealHint();
		layers = screen.getAllByTestId('inversion-hint-layer');
		expect(layers).toHaveLength(2);
		expect(layers[1]).toHaveAttribute('data-layer', 'stack');
		expect(layers[1].querySelector('[data-testid="counting-chip-row"]')).toBeInTheDocument();
		expect(container.querySelectorAll('.piano-keyboard__key--ghost')).toHaveLength(0);

		await revealHint();
		layers = screen.getAllByTestId('inversion-hint-layer');
		expect(layers).toHaveLength(3);
		expect(layers[2]).toHaveAttribute('data-layer', 'ghost');

		const ghostKeys = container.querySelectorAll('.piano-keyboard__key--ghost');
		expect(ghostKeys.length).toBeGreaterThan(0);

		expect(screen.queryByTestId('inversion-hint-cta')).not.toBeInTheDocument();
		expect(screen.getByTestId('inversion-hint-closing-line')).toBeInTheDocument();
	});

	it('the bass ring (bassHint) is absent before the ghost rung is revealed and present only after (CR-01: never spoils the graded bass)', async () => {
		const onComplete = vi.fn();
		const { container } = render(InversionDrill, {
			props: { symbol: 'Dm7', inversionIndex: 2, onComplete }
		});

		// Before any hint: a blank keyboard must not pre-reveal the bass.
		await waitFor(() => {
			expect(screen.getByTestId('inversion-hint-cta')).toBeInTheDocument();
		});
		expect(container.querySelectorAll('.piano-keyboard__key--bass-ring')).toHaveLength(0);
		expect(container.querySelector('[data-bass]')).toBeNull();

		// Rung 1 (bass copy) revealed - still no ring: the ghost rung is what gates it.
		await revealHint();
		expect(container.querySelectorAll('.piano-keyboard__key--bass-ring')).toHaveLength(0);

		// Rung 2 (stack) revealed - still no ring.
		await revealHint();
		expect(container.querySelectorAll('.piano-keyboard__key--bass-ring')).toHaveLength(0);

		// Rung 3 (ghost) revealed - now, and only now, the bass ring/badge appears.
		await revealHint();
		const bassKeys = container.querySelectorAll('.piano-keyboard__key--bass-ring');
		expect(bassKeys).toHaveLength(1);
		expect(bassKeys[0].getAttribute('data-bass')).toBe('B');
	});

	it('a drill-stage (matured) card never shows the bass ring - the maturity fade is not bypassed (CR-01)', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);
		const onComplete = vi.fn();
		const { container } = render(InversionDrill, {
			props: { symbol: 'Dm7', inversionIndex: 2, onComplete }
		});

		await waitFor(() => {
			expect(getAllCardsMock).toHaveBeenCalled();
		});
		expect(container.querySelectorAll('.piano-keyboard__key--bass-ring')).toHaveLength(0);
		expect(container.querySelector('[data-bass]')).toBeNull();
	});

	it('a subtract-stage card offers only 2 rungs (stack, ghost) - the bass rung is dropped', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Learning)]);
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		await waitFor(() => {
			expect(screen.getByTestId('inversion-hint-cta')).toBeInTheDocument();
		});

		await revealHint();
		let layers = screen.getAllByTestId('inversion-hint-layer');
		expect(layers).toHaveLength(1);
		expect(layers[0]).toHaveAttribute('data-layer', 'stack');

		await revealHint();
		layers = screen.getAllByTestId('inversion-hint-layer');
		expect(layers).toHaveLength(2);
		expect(layers[1]).toHaveAttribute('data-layer', 'ghost');
	});

	it('a drill-stage card (State.Review) renders no hint ladder at all', async () => {
		getAllCardsMock.mockResolvedValue([makeCard(State.Review)]);
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		await waitFor(() => {
			expect(getAllCardsMock).toHaveBeenCalled();
		});
		expect(screen.queryByTestId('inversion-hint-ladder')).not.toBeInTheDocument();
	});

	it('a wrong Check does not collapse an already-revealed rung', async () => {
		const onComplete = vi.fn();
		render(InversionDrill, { props: { symbol: 'Dm7', inversionIndex: 2, onComplete } });

		await waitFor(() => {
			expect(screen.getByTestId('inversion-hint-cta')).toBeInTheDocument();
		});
		await revealHint();
		expect(screen.getAllByTestId('inversion-hint-layer')).toHaveLength(1);

		await playWrongNotes();

		expect(screen.getByTestId('inversion-retry-notes')).toBeInTheDocument();
		expect(screen.getAllByTestId('inversion-hint-layer')).toHaveLength(1);
	});
});
