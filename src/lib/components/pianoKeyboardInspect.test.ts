import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import type { InspectPayload } from './PianoKeyboard.svelte';

// The inspect tap plays its note through the audio contract; tests never
// construct a real AudioContext (ARCHITECTURE-CONTRACTS.md consumer rule).
// ensureAudioReady is also mocked: since the G1 UAT fix, interactive mode's
// own activation choke point calls it too (playKeyTouch), and PianoKeyboard
// imports both from this same module.
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args)
}));

const { default: PianoKeyboard } = await import('./PianoKeyboard.svelte');

beforeEach(() => {
	playNoteMock.mockClear();
	ensureAudioReadyMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('PianoKeyboard inspect mode (inspectable + onInspect)', () => {
	it('gives keys button semantics, like interactive mode', () => {
		const { notes } = spellChord('Cm7');
		render(PianoKeyboard, { notes, inspectable: true, onInspect: () => {} });

		expect(screen.getAllByRole('button', { name: 'C key' }).length).toBeGreaterThan(0);
	});

	it('tapping a highlighted key reports its assigned spelling, role info, and inChord true', async () => {
		const { notes } = spellChord('Cm7');
		const onInspect = vi.fn();
		render(PianoKeyboard, { notes, inspectable: true, onInspect });

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		expect(onInspect).toHaveBeenCalledTimes(1);
		const payload = onInspect.mock.calls[0][0] as InspectPayload;
		expect(payload.letter).toBe('E♭');
		expect(payload.solfege).toBe('Mi♭');
		expect(payload.inChord).toBe(true);
		expect(payload.info?.short).toBe('m3');
		expect(payload.info?.longFr).toBe('tierce mineure');
	});

	it('tapping an unhighlighted white key reports its interval from the current root', async () => {
		const { notes } = spellChord('Cm7');
		const onInspect = vi.fn();
		render(PianoKeyboard, { notes, inspectable: true, onInspect });

		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);

		const payload = onInspect.mock.calls[0][0] as InspectPayload;
		expect(payload.letter).toBe('D');
		expect(payload.inChord).toBe(false);
		expect(payload.info?.short).toBe('M2');
	});

	it('an unhighlighted black key picks the simpler enharmonic: F♯/G♭ over C reads A4 as F♯', async () => {
		const { notes } = spellChord('C');
		const onInspect = vi.fn();
		render(PianoKeyboard, { notes, inspectable: true, onInspect });

		await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[0]);

		const payload = onInspect.mock.calls[0][0] as InspectPayload;
		expect(payload.info?.short).toBe('A4');
		expect(payload.letter).toBe('F♯');
	});

	it('the same key over an E♭ root reads m3 as G♭ (flat spelling wins)', async () => {
		const { notes } = spellChord('E♭');
		const onInspect = vi.fn();
		render(PianoKeyboard, { notes, inspectable: true, onInspect });

		await fireEvent.click(screen.getAllByRole('button', { name: 'F♯ key' })[0]);

		const payload = onInspect.mock.calls[0][0] as InspectPayload;
		expect(payload.info?.short).toBe('m3');
		expect(payload.letter).toBe('G♭');
	});

	it('plays the tapped note with its key-position octave through the audio contract', async () => {
		const { notes } = spellChord('Cm7');
		render(PianoKeyboard, { notes, inspectable: true, onInspect: () => {} });

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		expect(playNoteMock).toHaveBeenCalledWith('Eb4');

		const cKeys = screen.getAllByRole('button', { name: 'C key' });
		await fireEvent.click(cKeys[1]);
		expect(playNoteMock).toHaveBeenCalledWith('C5');
	});

	it('Enter and Space inspect a key, mirroring interactive keyboard support', async () => {
		const { notes } = spellChord('Cm7');
		const onInspect = vi.fn();
		render(PianoKeyboard, { notes, inspectable: true, onInspect });

		const key = screen.getAllByRole('button', { name: 'G key' })[0];
		await fireEvent.keyDown(key, { key: 'Enter' });
		await fireEvent.keyDown(key, { key: ' ' });

		expect(onInspect).toHaveBeenCalledTimes(2);
		expect((onInspect.mock.calls[0][0] as InspectPayload).info?.short).toBe('P5');
	});

	it('reports the root key itself as R (fondamentale)', async () => {
		const { notes } = spellChord('Cm7');
		const onInspect = vi.fn();
		render(PianoKeyboard, { notes, inspectable: true, onInspect });

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		const payload = onInspect.mock.calls[0][0] as InspectPayload;
		expect(payload.info?.short).toBe('R');
		expect(payload.info?.longFr).toBe('fondamentale');
		expect(payload.inChord).toBe(true);
	});

	it('is mutually exclusive with interactive: interactive wins when both are passed', async () => {
		const { notes } = spellChord('Cm7');
		const onInspect = vi.fn();
		const onToggle = vi.fn();
		render(PianoKeyboard, {
			notes,
			interactive: true,
			inspectable: true,
			onToggle,
			onInspect,
			selected: new Set<string>()
		});

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		expect(onToggle).toHaveBeenCalledWith('C');
		expect(onInspect).not.toHaveBeenCalled();
		// Interactive mode's own choke-point sound still fires (G1 UAT fix);
		// it's emitInspect specifically that never runs here, since inspect
		// loses to interactive.
		expect(playNoteMock).toHaveBeenCalledWith('C4');
	});

	it('omitting inspectable keeps the display-only render free of button semantics and silent', async () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		expect(screen.queryAllByRole('button')).toHaveLength(0);
		const key = container.querySelector('.piano-keyboard__key');
		await fireEvent.click(key!);
		expect(playNoteMock).not.toHaveBeenCalled();
	});

	it('applies the press cue on pointerdown, same as interactive mode', async () => {
		const { notes } = spellChord('Cm7');
		render(PianoKeyboard, { notes, inspectable: true, onInspect: () => {} });

		const key = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.pointerDown(key);

		expect(key.className).toContain('piano-keyboard__key--pressed');
	});
});
