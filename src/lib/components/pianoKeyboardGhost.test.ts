import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';

// Display-mode only: no audio should ever be involved in ghost-hatch
// rendering, but PianoKeyboard imports playNote at module scope, so mock it
// per the project's consumer rule (ARCHITECTURE-CONTRACTS.md: never construct
// a real AudioContext in tests).
vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn()
}));

const { default: PianoKeyboard } = await import('./PianoKeyboard.svelte');

afterEach(() => {
	cleanup();
});

describe('PianoKeyboard ghost-hatch (ghostKeys, sketch 019 synthesis)', () => {
	it('a ghostKeys entry matching a role-less key gets the ghost class and a data-ghost marker', () => {
		const { container } = render(PianoKeyboard, {
			notes: [],
			octaves: 2,
			ghostKeys: [{ letter: 'C', octave: 4, marker: 'R' }]
		});

		const ghostKey = container.querySelector('.piano-keyboard__key--ghost');
		expect(ghostKey).not.toBeNull();
		expect(ghostKey?.getAttribute('data-ghost')).toBe('R');
	});

	it('omitting ghostKeys renders no element with the ghost class or a data-ghost attribute (byte-identical additive default)', () => {
		const notes = spellChord('Cm7').notes;
		const { container } = render(PianoKeyboard, { notes, octaves: 2 });

		expect(container.querySelectorAll('.piano-keyboard__key--ghost')).toHaveLength(0);
		expect(container.querySelector('[data-ghost]')).toBeNull();
	});

	it('a ghostKeys entry matching a key that also carries an interval role never receives the ghost class (role wins)', () => {
		const notes = spellChord('Cm7').notes;
		const rootLetter = notes.find((note) => note.role === 'root')?.letter;
		expect(rootLetter).toBeDefined();

		const { container } = render(PianoKeyboard, {
			notes,
			octaves: 2,
			// Root of a display-mode (octaves:2) Cm7 keyboard renders at the
			// keyboard's BASE_OCTAVE (4).
			ghostKeys: [{ letter: rootLetter as string, octave: 4, marker: 'R' }]
		});

		const rootKey = container.querySelector('.piano-keyboard__key--root');
		expect(rootKey).not.toBeNull();
		expect(rootKey?.className).not.toContain('piano-keyboard__key--ghost');
		expect(container.querySelectorAll('.piano-keyboard__key--ghost')).toHaveLength(0);
	});

	it('a flat-spelled ghost entry (E♭) lands on the sharp-labeled black key (chroma matching, never letter strings)', () => {
		const { container } = render(PianoKeyboard, {
			notes: [],
			octaves: 2,
			// An unassigned black key only offers its generic sharpLetter (D♯);
			// the entry carries spellChord's own flat spelling (E♭). Chroma
			// comparison must make the two meet on the same physical key.
			ghostKeys: [{ letter: 'E♭', octave: 4, marker: 'R' }]
		});

		const ghostKey = container.querySelector('.piano-keyboard__key--ghost');
		expect(ghostKey).not.toBeNull();
		expect(ghostKey?.className).toContain('piano-keyboard__key--black');
		expect(ghostKey?.getAttribute('data-ghost')).toBe('R');
	});

	it('a same-letter key at a different octave than the ghostKeys entry stays plain (octave-specific)', () => {
		const { container } = render(PianoKeyboard, {
			notes: [],
			octaves: 2,
			// Two-octave board spans C4..C6, so 'C' appears at octaves 4, 5, and
			// 6; only the octave-5 entry should light up.
			ghostKeys: [{ letter: 'C', octave: 5, marker: 'R' }]
		});

		const ghostKeys = container.querySelectorAll('.piano-keyboard__key--ghost');
		expect(ghostKeys).toHaveLength(1);
		expect(ghostKeys[0].getAttribute('data-ghost')).toBe('R');
	});

	it('UAT bug B regression: the ghost rule never overrides position (would drop the key out of the absolute keyboard layer)', () => {
		// jsdom does not compute cascaded stylesheet layout, so this asserts at
		// the source level: `.piano-keyboard__key--ghost` must inherit the base
		// key's `position: absolute` rather than reassert `position: relative`,
		// which previously pulled ghost keys out of the absolutely-positioned
		// key layer and dropped them into normal flow below the keyboard row.
		const source = readFileSync(join(process.cwd(), 'src/lib/components/PianoKeyboard.svelte'), {
			encoding: 'utf-8'
		});
		const ghostRuleMatch = source.match(/\.piano-keyboard__key--ghost\s*\{([^}]*)\}/);
		expect(ghostRuleMatch).not.toBeNull();
		expect(ghostRuleMatch?.[1]).not.toMatch(/position\s*:/);
	});
});
