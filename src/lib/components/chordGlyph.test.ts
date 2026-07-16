import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { default: ChordGlyph } = await import('./ChordGlyph.svelte');

afterEach(() => {
	vi.useRealTimers();
});

describe('ChordGlyph (stamped / pulseToken)', () => {
	it('renders the current markup unchanged when no new props are passed', () => {
		const { container, getByTestId } = render(ChordGlyph, { root: 'C', quality: 'm7' });

		const glyph = container.querySelector('.chord-glyph');
		expect(glyph).not.toBeNull();
		expect(glyph?.className).not.toContain('chord-glyph--stamped');
		expect(glyph?.className).not.toContain('pulse-once');

		const shadow = getByTestId('chord-glyph-shadow');
		expect(shadow.getAttribute('aria-hidden')).toBe('true');

		const text = container.querySelector('.chord-glyph__text');
		expect(text).not.toBeNull();
		expect(text?.textContent).toContain('C');
		expect(text?.querySelector('sup')?.textContent).toBe('m7');
	});

	it('adds chord-glyph--stamped when stamped is passed', () => {
		const { container } = render(ChordGlyph, { root: 'C', quality: 'm7', stamped: true });

		const glyph = container.querySelector('.chord-glyph');
		expect(glyph?.className).toContain('chord-glyph--stamped');
	});

	it('applies pulse-once when pulseToken is set, and re-applies it on a new bump while mounted', async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(ChordGlyph, { root: 'C', quality: 'm7', pulseToken: 1 });
		await vi.advanceTimersByTimeAsync(0);

		let glyph = container.querySelector('.chord-glyph');
		expect(glyph?.className).toContain('pulse-once');

		// Let the first pulse cycle fully clear.
		await vi.advanceTimersByTimeAsync(200);
		glyph = container.querySelector('.chord-glyph');
		expect(glyph?.className).not.toContain('pulse-once');

		await rerender({ root: 'C', quality: 'm7', pulseToken: 2 });
		await vi.advanceTimersByTimeAsync(0);

		glyph = container.querySelector('.chord-glyph');
		expect(glyph?.className).toContain('pulse-once');
	});
});
