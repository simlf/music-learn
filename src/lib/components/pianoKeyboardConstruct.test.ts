import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';

// Construction taps sound their own key-touch note through PianoKeyboard's
// activation choke point (G1 UAT fix) - the SAME path interactive mode uses -
// while the caller (BuildSession/InteractiveLesson) still owns correct/wrong
// VISUAL feedback. Tests never construct a real AudioContext
// (ARCHITECTURE-CONTRACTS.md consumer rule).
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

describe('PianoKeyboard construct mode (constructable + onConstructTap + flashWrongKey)', () => {
	it('gives every key button semantics, including keys not in notes (parity with interactive/inspectable)', () => {
		// Partial "earned so far" fixture: just the root of Cm7, matching
		// construction mode's mid-session highlight shape.
		const notes = spellChord('Cm7').notes.slice(0, 1);
		render(PianoKeyboard, { notes, constructable: true, onConstructTap: () => {} });

		// The root itself (already earned) and a key nowhere in notes both get
		// button semantics - every key is tappable, not just earned ones.
		expect(screen.getAllByRole('button', { name: 'C key' }).length).toBeGreaterThan(0);
		expect(screen.getAllByRole('button', { name: 'D key' }).length).toBeGreaterThan(0);
	});

	it('clicking a white key not in notes fires onConstructTap with its letter and key-position octave, and sounds its own key-touch note (G1)', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const onConstructTap = vi.fn();
		render(PianoKeyboard, { notes, constructable: true, onConstructTap });

		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);

		expect(onConstructTap).toHaveBeenCalledTimes(1);
		expect(onConstructTap).toHaveBeenCalledWith('D', 4);
		expect(ensureAudioReadyMock).toHaveBeenCalled();
		expect(playNoteMock).toHaveBeenCalledWith('D4');
	});

	it('clicking a black key fires onConstructTap with its sharp-letter spelling and correct octave, and sounds it too', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const onConstructTap = vi.fn();
		render(PianoKeyboard, { notes, constructable: true, onConstructTap });

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		expect(onConstructTap).toHaveBeenCalledWith('D♯', 4);
		expect(playNoteMock).toHaveBeenCalledWith('D#4');
	});

	it('Enter and Space both activate a key in constructable mode, mirroring interactive/inspectable', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const onConstructTap = vi.fn();
		render(PianoKeyboard, { notes, constructable: true, onConstructTap });

		const key = screen.getAllByRole('button', { name: 'G key' })[0];
		await fireEvent.keyDown(key, { key: 'Enter' });
		await fireEvent.keyDown(key, { key: ' ' });

		expect(onConstructTap).toHaveBeenCalledTimes(2);
		expect(onConstructTap).toHaveBeenCalledWith('G', 4);
	});

	it('is mutually exclusive with interactive: interactive wins when both are passed', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const onToggle = vi.fn();
		const onConstructTap = vi.fn();
		render(PianoKeyboard, {
			notes,
			interactive: true,
			constructable: true,
			onToggle,
			onConstructTap,
			selected: new Set<string>()
		});

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		expect(onToggle).toHaveBeenCalledWith('C');
		expect(onConstructTap).not.toHaveBeenCalled();
	});

	it('is mutually exclusive with inspectable: constructable wins when both are passed without interactive', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const onInspect = vi.fn();
		const onConstructTap = vi.fn();
		render(PianoKeyboard, {
			notes,
			constructable: true,
			inspectable: true,
			onConstructTap,
			onInspect
		});

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		expect(onConstructTap).toHaveBeenCalledWith('C', 4);
		expect(onInspect).not.toHaveBeenCalled();
		// Construct mode's own choke-point sound still fires (G1); it's
		// emitInspect specifically that never runs here, since inspect loses to
		// construct.
		expect(playNoteMock).toHaveBeenCalledWith('C4');
	});

	it('flashWrongKey paints the wrong-fill class on the exact octave-specific white key only', () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		render(PianoKeyboard, {
			notes,
			constructable: true,
			onConstructTap: () => {},
			flashWrongKey: { letter: 'C', octave: 5 }
		});

		const cKeys = screen.getAllByRole('button', { name: 'C key' });
		expect(cKeys[0].className).not.toContain('piano-keyboard__key--wrong');
		expect(cKeys[1].className).toContain('piano-keyboard__key--wrong');
	});

	it('flashWrongKey applies to a black key too, discriminating by octave', () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		render(PianoKeyboard, {
			notes,
			constructable: true,
			onConstructTap: () => {},
			flashWrongKey: { letter: 'F♯', octave: 4 }
		});

		const fSharpKeys = screen.getAllByRole('button', { name: 'F♯ key' });
		expect(fSharpKeys[0].className).toContain('piano-keyboard__key--wrong');
		expect(fSharpKeys[1].className).not.toContain('piano-keyboard__key--wrong');
	});

	it('IN-01: pointerdown\'s transient pressed cue is keyed by letter AND octave, so a same-letter duplicate key at the other octave never presses too', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		render(PianoKeyboard, { notes, constructable: true, octaves: 2, onConstructTap: () => {} });

		const cKeys = screen.getAllByRole('button', { name: 'C key' });
		await fireEvent.pointerDown(cKeys[0]);

		expect(cKeys[0].className).toContain('piano-keyboard__key--pressed');
		expect(cKeys[1].className).not.toContain('piano-keyboard__key--pressed');
	});

	it('IN-01: the pressed cue applies to a black key too, discriminating by octave', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		render(PianoKeyboard, { notes, constructable: true, octaves: 2, onConstructTap: () => {} });

		const fSharpKeys = screen.getAllByRole('button', { name: 'F♯ key' });
		await fireEvent.pointerDown(fSharpKeys[1]);

		expect(fSharpKeys[0].className).not.toContain('piano-keyboard__key--pressed');
		expect(fSharpKeys[1].className).toContain('piano-keyboard__key--pressed');
	});

	it('flashWrongKey omitted or null leaves every key free of the wrong-fill class', () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const { container } = render(PianoKeyboard, {
			notes,
			constructable: true,
			onConstructTap: () => {},
			flashWrongKey: null
		});

		expect(container.querySelectorAll('.piano-keyboard__key--wrong')).toHaveLength(0);
	});

	it('omitting constructable/onConstructTap/flashWrongKey renders the same display-only markup: zero buttons, zero wrong-fill classes, silent on click', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const { container } = render(PianoKeyboard, { notes });

		expect(screen.queryAllByRole('button')).toHaveLength(0);
		expect(container.querySelectorAll('.piano-keyboard__key--wrong')).toHaveLength(0);

		const key = container.querySelector('.piano-keyboard__key');
		await fireEvent.click(key!);
		expect(playNoteMock).not.toHaveBeenCalled();
	});
});
