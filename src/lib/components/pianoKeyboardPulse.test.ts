import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';

// Display-mode only: no audio should ever be involved in pulse/pending
// rendering, but PianoKeyboard imports playNote at module scope, so mock it
// per the project's consumer rule (ARCHITECTURE-CONTRACTS.md: never construct
// a real AudioContext in tests).
vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn()
}));

const { default: PianoKeyboard } = await import('./PianoKeyboard.svelte');

const ROLE_SELECTOR =
	'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh';
const NON_ROLE_SELECTOR =
	'.piano-keyboard__key:not(.piano-keyboard__key--root):not(.piano-keyboard__key--third):not(.piano-keyboard__key--fifth):not(.piano-keyboard__key--seventh)';

afterEach(() => {
	vi.useRealTimers();
});

describe('PianoKeyboard pulse (pulseToken)', () => {
	it('rendering with notes and no pulseToken applies no .pulse-once to any key', () => {
		const notes = spellChord('Cm7').notes;
		const { container } = render(PianoKeyboard, { notes });

		expect(container.querySelectorAll('.pulse-once')).toHaveLength(0);
	});

	it('after pulseToken is set to a number, every role-lit key carries .pulse-once; keys with no role never do', async () => {
		vi.useFakeTimers();
		const notes = spellChord('Cm7').notes;
		const { container } = render(PianoKeyboard, { notes, pulseToken: 1 });
		await vi.advanceTimersByTimeAsync(0);

		const roleKeys = container.querySelectorAll(ROLE_SELECTOR);
		expect(roleKeys.length).toBeGreaterThan(0);
		roleKeys.forEach((key) => expect(key.className).toContain('pulse-once'));

		const nonRoleKeys = container.querySelectorAll(NON_ROLE_SELECTOR);
		expect(nonRoleKeys.length).toBeGreaterThan(0);
		nonRoleKeys.forEach((key) => expect(key.className).not.toContain('pulse-once'));
	});

	it('re-bumping pulseToken to a new value while mounted re-applies .pulse-once', async () => {
		vi.useFakeTimers();
		const notes = spellChord('Cm7').notes;
		const { container, rerender } = render(PianoKeyboard, { notes, pulseToken: 1 });
		await vi.advanceTimersByTimeAsync(0);
		// Let the first pulse cycle fully clear (pulsing flag resets to false).
		await vi.advanceTimersByTimeAsync(200);

		let roleKeys = container.querySelectorAll(ROLE_SELECTOR);
		expect(roleKeys.length).toBeGreaterThan(0);
		roleKeys.forEach((key) => expect(key.className).not.toContain('pulse-once'));

		await rerender({ notes, pulseToken: 2 });
		await vi.advanceTimersByTimeAsync(0);

		roleKeys = container.querySelectorAll(ROLE_SELECTOR);
		expect(roleKeys.length).toBeGreaterThan(0);
		roleKeys.forEach((key) => expect(key.className).toContain('pulse-once'));
	});
});

describe('PianoKeyboard pending (pendingKeys)', () => {
	afterEach(() => {
		cleanup();
	});

	it('pendingKeys dims only an already-role-lit key matching the letter+octave', () => {
		const notes = spellChord('Cm7').notes;
		const rootLetter = notes.find((note) => note.role === 'root')?.letter;
		expect(rootLetter).toBeDefined();

		const { container } = render(PianoKeyboard, {
			notes,
			// Root of a display-mode (octaves-unset -> 2 octave) Cm7 keyboard
			// renders at the keyboard's BASE_OCTAVE (4).
			pendingKeys: [{ letter: rootLetter as string, octave: 4 }]
		});

		const rootKey = container.querySelector('.piano-keyboard__key--root');
		expect(rootKey?.className).toContain('piano-keyboard__key--pending');
		expect(container.querySelectorAll('.piano-keyboard__key--pending')).toHaveLength(1);
	});

	it('a letter with no role in notes gets no --pending even when listed in pendingKeys', () => {
		const notes = spellChord('Cm7').notes;
		// 'D' is not part of Cm7 (C, E♭, G, B♭), so it never carries a role.
		const { container } = render(PianoKeyboard, {
			notes,
			pendingKeys: [{ letter: 'D', octave: 4 }]
		});

		expect(container.querySelectorAll('.piano-keyboard__key--pending')).toHaveLength(0);
	});

	it('wrong/selected keys are unaffected: a wrong-marked key never gets --pending even when its letter is listed', () => {
		const notes = spellChord('Cm7').notes.slice(0, 1);
		const wrongLetters = new Set(['D']);

		const { container } = render(PianoKeyboard, {
			notes,
			wrongLetters,
			pendingKeys: [{ letter: 'D', octave: 4 }]
		});

		const wrongKey = container.querySelector('.piano-keyboard__key--wrong');
		expect(wrongKey).not.toBeNull();
		expect(wrongKey?.className).not.toContain('piano-keyboard__key--pending');
	});

	it('octave-discrimination (gap 3 / WR-03): the SAME letter with a role at two octaves only dims the octave whose { letter, octave } is listed', () => {
		// A scale-like note list: the tonic 'C' at both the low root (octave 4,
		// the keyboard's BASE_OCTAVE) and the octave-up close (assigned to the
		// second C on a 2-octave keyboard, octave 5) - mirrors createScaleConstruction's
		// duplicate-tonic earnedNotes shape.
		const notes = [
			{ letter: 'C', solfege: 'Do', role: 'root' as const },
			{ letter: 'D', solfege: 'Ré', role: 'second' as const },
			{ letter: 'C', solfege: 'Do', role: 'root' as const }
		];

		const { container } = render(PianoKeyboard, {
			notes,
			octaves: 2,
			pendingKeys: [{ letter: 'C', octave: 5 }]
		});

		const pendingKeysInDom = container.querySelectorAll('.piano-keyboard__key--pending');
		expect(pendingKeysInDom).toHaveLength(1);

		const rootKeys = container.querySelectorAll('.piano-keyboard__key--root');
		expect(rootKeys).toHaveLength(2);
		const [octave4TonicKey, octave5TonicKey] = rootKeys;
		expect(octave4TonicKey.className).not.toContain('piano-keyboard__key--pending');
		expect(octave5TonicKey.className).toContain('piano-keyboard__key--pending');
	});
});
