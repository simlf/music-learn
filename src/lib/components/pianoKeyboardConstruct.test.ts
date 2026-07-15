import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';

// Construction taps must never auto-play audio from inside PianoKeyboard - the
// caller (BuildSession) owns correct/wrong feedback sound. Tests never
// construct a real AudioContext (ARCHITECTURE-CONTRACTS.md consumer rule).
const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const { default: PianoKeyboard } = await import('./PianoKeyboard.svelte');

beforeEach(() => {
	playNoteMock.mockClear();
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

	it('clicking a white key not in notes fires onConstructTap with its letter and key-position octave, without playing audio', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const onConstructTap = vi.fn();
		render(PianoKeyboard, { notes, constructable: true, onConstructTap });

		await fireEvent.click(screen.getAllByRole('button', { name: 'D key' })[0]);

		expect(onConstructTap).toHaveBeenCalledTimes(1);
		expect(onConstructTap).toHaveBeenCalledWith('D', 4);
		expect(playNoteMock).not.toHaveBeenCalled();
	});

	it('clicking a black key fires onConstructTap with its sharp-letter spelling and correct octave', async () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const onConstructTap = vi.fn();
		render(PianoKeyboard, { notes, constructable: true, onConstructTap });

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		expect(onConstructTap).toHaveBeenCalledWith('D♯', 4);
		expect(playNoteMock).not.toHaveBeenCalled();
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
		expect(playNoteMock).not.toHaveBeenCalled();
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
