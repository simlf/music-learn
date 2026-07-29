import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScaleKeyboardDrill from './ScaleKeyboardDrill.svelte';
import { majorScaleNotes } from '$lib/theory/scale';
import { placeAscendingScaleKeys, type ScaleKeyPlacement } from '$lib/practice/scaleKeyboardDrill';

const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

/**
 * ScaleKeyboardDrill measures its key-strip container width via ResizeObserver
 * (added alongside PianoKeyboard's own two-row stacking, quick task
 * 260729-ert). jsdom has no real ResizeObserver, so this test-only stub
 * invokes its callback synchronously on `observe()` with a fixed
 * `contentRect.width`, driving the exact code path the component uses in a
 * real browser without needing an actual layout engine.
 */
function stubResizeObserverWidth(width: number): void {
	class FakeResizeObserver {
		private callback: ResizeObserverCallback;
		constructor(callback: ResizeObserverCallback) {
			this.callback = callback;
		}
		observe(target: Element) {
			this.callback(
				[{ target, contentRect: { width } } as unknown as ResizeObserverEntry],
				this as unknown as ResizeObserver
			);
		}
		unobserve() {}
		disconnect() {}
	}
	vi.stubGlobal('ResizeObserver', FakeResizeObserver);
}

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	playNoteMock.mockClear();
});

describe('ScaleKeyboardDrill two-row stacking (mirrors PianoKeyboard, quick task 260729-ert)', () => {
	it('renders two stacked key-rows when the measured width is below the fixed 2-octave floor (660px)', async () => {
		stubResizeObserverWidth(358); // real 375px-viewport container measurement
		const notes = majorScaleNotes('C');
		const { container } = render(ScaleKeyboardDrill, { props: { notes, tonic: 'C' } });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.rows')).not.toBeNull();
		expect(container.querySelectorAll('.keys')).toHaveLength(2);
	});

	it('renders a single unstacked key board at/above the 660px floor', async () => {
		stubResizeObserverWidth(700);
		const notes = majorScaleNotes('C');
		const { container } = render(ScaleKeyboardDrill, { props: { notes, tonic: 'C' } });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.rows')).toBeNull();
		expect(container.querySelectorAll('.keys')).toHaveLength(1);
	});

	it('renders a single unstacked key board when ResizeObserver is unavailable (jsdom default, byte-identical to before)', () => {
		const notes = majorScaleNotes('C');
		const { container } = render(ScaleKeyboardDrill, { props: { notes, tonic: 'C' } });

		expect(container.querySelector('.rows')).toBeNull();
		expect(container.querySelectorAll('.keys')).toHaveLength(1);
	});

	it('still grades taps correctly and fills the tapped key when stacked across two rows', async () => {
		stubResizeObserverWidth(358);
		const notes = majorScaleNotes('C');
		const placements = placeAscendingScaleKeys(notes);
		const { container } = render(ScaleKeyboardDrill, { props: { notes, tonic: 'C' } });

		await Promise.resolve();
		await Promise.resolve();

		function findButton(placement: ScaleKeyPlacement): HTMLElement {
			const buttons = Array.from(container.querySelectorAll('[role="button"]')) as HTMLElement[];
			const found = buttons.find((button) => {
				const label = button.getAttribute('aria-label') ?? '';
				return label.includes(`scale degree ${placement.degree}`);
			});
			if (!found) throw new Error(`No button found for degree ${placement.degree}`);
			return found;
		}

		const tonicButton = findButton(placements[0]);
		await fireEvent.click(tonicButton);

		expect(tonicButton).toHaveClass('key--root');
		expect(playNoteMock).toHaveBeenCalledTimes(1);
	});

	it('the total white+black key count across both rows equals the full 2-octave board (15 white, 10 black)', async () => {
		stubResizeObserverWidth(358);
		const notes = majorScaleNotes('C');
		const { container } = render(ScaleKeyboardDrill, { props: { notes, tonic: 'C' } });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelectorAll('.key--white')).toHaveLength(15);
		expect(container.querySelectorAll('.key--black')).toHaveLength(10);
	});
});
