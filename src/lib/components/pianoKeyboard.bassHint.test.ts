import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';

// Display-mode only: no audio should ever be involved in bass-hint rendering,
// but PianoKeyboard imports playNote at module scope, so mock it per the
// project's consumer rule (ARCHITECTURE-CONTRACTS.md: never construct a real
// AudioContext in tests).
vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn()
}));

const { default: PianoKeyboard } = await import('./PianoKeyboard.svelte');

afterEach(() => {
	cleanup();
});

describe('PianoKeyboard bass emphasis (bassHint, Phase 35 INV-01)', () => {
	it('omitting bassHint renders no element with the bass-ring class or a data-bass attribute (byte-identical additive default)', () => {
		const notes = spellChord('Cm7').notes;
		const { container } = render(PianoKeyboard, { notes, octaves: 2 });

		expect(container.querySelectorAll('.piano-keyboard__key--bass-ring')).toHaveLength(0);
		expect(container.querySelector('[data-bass]')).toBeNull();
	});

	it('bassHint on a key that ALSO carries an interval-role fill layers the ring on top (NOT gated on !role, unlike ghostKeys)', () => {
		const notes = spellChord('Cm7').notes;
		const fifthLetter = notes.find((note) => note.role === 'fifth')?.letter;
		expect(fifthLetter).toBeDefined();

		const { container } = render(PianoKeyboard, {
			notes,
			octaves: 2,
			// Notes render at the keyboard's BASE_OCTAVE (4) in display mode.
			bassHint: { letter: fifthLetter as string, octave: 4 }
		});

		const fifthKey = container.querySelector('.piano-keyboard__key--fifth');
		expect(fifthKey).not.toBeNull();
		expect(fifthKey?.className).toContain('piano-keyboard__key--bass-ring');
		expect(fifthKey?.getAttribute('data-bass')).toBe('B');
	});

	it('a flat-spelled bassHint (E♭) lands on the sharp-labeled black key (chroma matching, never letter strings)', () => {
		const { container } = render(PianoKeyboard, {
			notes: [],
			octaves: 2,
			// An unassigned black key only offers its generic sharpLetter (D♯);
			// bassHint carries spellChord's own flat spelling (E♭). Chroma
			// comparison must make the two meet on the same physical key.
			bassHint: { letter: 'E♭', octave: 4 }
		});

		const bassKey = container.querySelector('.piano-keyboard__key--bass-ring');
		expect(bassKey).not.toBeNull();
		expect(bassKey?.className).toContain('piano-keyboard__key--black');
		expect(bassKey?.getAttribute('data-bass')).toBe('B');
	});

	it('a same-letter key at a different octave than bassHint stays plain (octave-specific)', () => {
		const { container } = render(PianoKeyboard, {
			notes: [],
			octaves: 2,
			// Two-octave board spans C4..C6, so 'C' appears at octaves 4, 5, and
			// 6; only the octave-5 entry should light up.
			bassHint: { letter: 'C', octave: 5 }
		});

		const bassKeys = container.querySelectorAll('.piano-keyboard__key--bass-ring');
		expect(bassKeys).toHaveLength(1);
		expect(bassKeys[0].getAttribute('data-bass')).toBe('B');
	});

	it('bassHint on a plain (no-role, unanswered) keyboard still renders the ring/badge', () => {
		const { container } = render(PianoKeyboard, {
			notes: [],
			octaves: 2,
			bassHint: { letter: 'G', octave: 4 }
		});

		const bassKeys = container.querySelectorAll('.piano-keyboard__key--bass-ring');
		expect(bassKeys).toHaveLength(1);
		expect(bassKeys[0].getAttribute('data-bass')).toBe('B');
	});

	it('bassHint set to null renders identically to omitted (no ring anywhere)', () => {
		const notes = spellChord('Cm7').notes;
		const { container } = render(PianoKeyboard, { notes, octaves: 2, bassHint: null });

		expect(container.querySelectorAll('.piano-keyboard__key--bass-ring')).toHaveLength(0);
		expect(container.querySelector('[data-bass]')).toBeNull();
	});
});
