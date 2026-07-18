import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ChordGlyph from '../components/ChordGlyph.svelte';
import { setLocale } from './locale.svelte';

/**
 * Locks the chord-symbol/ChordGlyph immunity boundary (T-20-02, 20-UI-SPEC
 * "Chord Glyph & Symbol Immunity"): root/quality are rendered verbatim from
 * the theory engine's own spelling, with zero copy-layer/t() involvement, so
 * a chord symbol renders byte-identically regardless of the active locale.
 */
afterEach(() => {
	cleanup();
	setLocale('en');
});

function renderedText(container: HTMLElement): string | null | undefined {
	return container.querySelector('.chord-glyph__text')?.textContent;
}

describe('ChordGlyph locale immunity', () => {
	it('renders Cm7 identically in en and fr', () => {
		setLocale('en');
		const { container: enContainer } = render(ChordGlyph, { root: 'C', quality: 'm7' });
		const enText = renderedText(enContainer);
		cleanup();

		setLocale('fr');
		const { container: frContainer } = render(ChordGlyph, { root: 'C', quality: 'm7' });
		const frText = renderedText(frContainer);

		expect(frText).toBe(enText);
		expect(frText).toBe('Cm7');
	});

	it('renders the half-diminished glyph F♯ø7 identically in en and fr', () => {
		setLocale('en');
		const { container: enContainer } = render(ChordGlyph, { root: 'F♯', quality: 'ø7' });
		const enText = renderedText(enContainer);
		cleanup();

		setLocale('fr');
		const { container: frContainer } = render(ChordGlyph, { root: 'F♯', quality: 'ø7' });
		const frText = renderedText(frContainer);

		expect(frText).toBe(enText);
		expect(frText).toBe('F♯ø7');
	});
});
