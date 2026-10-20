import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';

// Display-mode only: no audio should ever be involved in row-stacking
// rendering, but PianoKeyboard imports playNote at module scope, so mock it
// per the project's consumer rule (ARCHITECTURE-CONTRACTS.md: never construct
// a real AudioContext in tests).
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: vi.fn(),
	playNote: vi.fn()
}));

const { default: PianoKeyboard } = await import('./PianoKeyboard.svelte');

/**
 * PianoKeyboard measures its container width via ResizeObserver and derives
 * `effectiveOctaves`/`stacked` from it whenever the `octaves` prop is
 * omitted. jsdom has no real ResizeObserver, so this test-only stub invokes
 * its callback synchronously on `observe()` with a fixed `contentRect.width`,
 * driving the exact code path the component uses in a real browser without
 * needing an actual layout engine.
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
});

describe('PianoKeyboard one-octave span never wraps to two rows (260730-q3f)', () => {
	beforeEach(() => {
		// Narrower than the 1-octave unstacked floor (352px) and inside the old
		// 308-352px band where a one-octave span used to stack. It no longer
		// does at any width: the only legal split seam leaves a single lone C on
		// row 2, which reads as a broken second keyboard.
		stubResizeObserverWidth(320);
	});

	it('renders one board with the full 8 white / 5 black one-octave span, and no rows wrapper', async () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		// Allow the $effect (ResizeObserver registration) and subsequent
		// $derived recompute to flush.
		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.piano-keyboard__rows')).toBeNull();

		const boards = container.querySelectorAll('.piano-keyboard__board');
		expect(boards).toHaveLength(1);
		expect(boards[0].querySelectorAll('.piano-keyboard__key--white')).toHaveLength(8);
		expect(boards[0].querySelectorAll('.piano-keyboard__key--black')).toHaveLength(5);
	});

	it('carries the one-octave board floor (8 * 40px = 320px), not the 44px-per-key floor', async () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		await Promise.resolve();
		await Promise.resolve();

		const board = container.querySelector('.piano-keyboard__board') as HTMLElement;
		expect(board.style.minWidth).toBe('320px');
	});

	it('preserves chord-tone highlight coloring (Cm7 root/third/fifth/seventh)', async () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		await Promise.resolve();
		await Promise.resolve();

		// Root (C, white index 0) lands in row 1; the exact same interval-role
		// classes the single-row render already uses must still appear.
		const rootKey = container.querySelector('.piano-keyboard__key--root');
		expect(rootKey).not.toBeNull();

		const thirdKey = container.querySelector('.piano-keyboard__key--third');
		expect(thirdKey).not.toBeNull();

		const fifthKey = container.querySelector('.piano-keyboard__key--fifth');
		expect(fifthKey).not.toBeNull();

		const seventhKey = container.querySelector('.piano-keyboard__key--seventh');
		expect(seventhKey).not.toBeNull();
	});
});

describe('PianoKeyboard unstacked (byte-identical) when width fits or is unmeasurable', () => {
	it('renders exactly one .piano-keyboard__board and no .piano-keyboard__rows wrapper when the octaves prop is passed explicitly (existing jsdom test seam, no ResizeObserver)', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 2 });

		expect(container.querySelector('.piano-keyboard__rows')).toBeNull();
		expect(container.querySelectorAll('.piano-keyboard__board')).toHaveLength(1);

		const whites = container.querySelectorAll('.piano-keyboard__key--white');
		const blacks = container.querySelectorAll('.piano-keyboard__key--black');
		expect(whites).toHaveLength(15);
		expect(blacks).toHaveLength(10);
	});

	it('renders exactly one board when the measured width clears the two-octave floor (660px)', async () => {
		stubResizeObserverWidth(700);
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.piano-keyboard__rows')).toBeNull();
		expect(container.querySelectorAll('.piano-keyboard__board')).toHaveLength(1);
	});
});

describe('PianoKeyboard measurement is not gated by an explicit octaves prop (regression, live-browser bug found post-merge)', () => {
	/**
	 * REGRESSION CONTEXT: every real call site that needs a fixed span (every
	 * construction/voicing/drill keyboard) passes `octaves={2}` explicitly.
	 * The component's `$effect` used to read `if (octaves !== undefined)
	 * return;` as its very first line, which skipped ResizeObserver
	 * registration entirely whenever `octaves` was passed - so `measuredWidth`
	 * stayed permanently `undefined` for every one of those call sites, and
	 * `stacked` (which requires `measuredWidth !== undefined`) could never
	 * become true. All prior tests in this file either omitted `octaves`
	 * entirely (letting self-measurement run) or passed `octaves: 2` WITHOUT
	 * also stubbing ResizeObserver (so they never observed a narrow width in
	 * the first place) - neither combination could have caught this, which is
	 * exactly why the bug shipped past a fully green test suite and was only
	 * caught by a live browser check. This test exercises the actual failing
	 * combination: explicit `octaves` (the span-pinning prop every real
	 * drill/voicing card uses) PLUS a narrow measured width (the real
	 * container size on a phone).
	 */
	it('still stacks into two rows when octaves is explicitly passed AND the measured width is below that span\'s floor', async () => {
		stubResizeObserverWidth(358); // real 375px-viewport container measurement
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 2 });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.piano-keyboard__rows')).not.toBeNull();
		expect(container.querySelectorAll('.piano-keyboard__board')).toHaveLength(2);
	});

	it('stays a single unstacked board when octaves is explicitly passed AND the measured width clears that span\'s floor', async () => {
		stubResizeObserverWidth(700);
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 2 });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.piano-keyboard__rows')).toBeNull();
		expect(container.querySelectorAll('.piano-keyboard__board')).toHaveLength(1);
	});
});

describe('PianoKeyboard never stacks when stacking would not clear the fingertip floor (regression, live-browser check)', () => {
	/**
	 * REGRESSION CONTEXT: `shouldStackRows` originally triggered stacking
	 * whenever the single unstacked row could not fit
	 * (`!fitsWithoutScrolling`), with no check that the STACKED rows
	 * themselves would actually clear the 44px floor. For a one-octave span,
	 * row 1 (7 white keys) only clears the floor at 308px - so a real 304px
	 * container (measured live in Chromium at a 320px viewport via the Lookup
	 * page) "stacked" into two rows where row 1's keys still rendered under
	 * 44px (measured: 43.42px), achieving nothing. `keyboardLayout.ts`'s
	 * `shouldStackRows` now requires the wider row to independently clear the
	 * floor before stacking; this exercises that guarantee at the component
	 * level, at the exact width that exposed the defect.
	 */
	it('at a 304px measured width (below the 1-octave row-1 floor), a one-octave span stays unstacked rather than stacking into rows that still miss the floor', async () => {
		stubResizeObserverWidth(304);
		const { notes } = spellChord('Bm7'); // one-octave-friendly chord (see assignNotesToKeys tests)
		const { container } = render(PianoKeyboard, { notes, octaves: 1 });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.piano-keyboard__rows')).toBeNull();
		expect(container.querySelectorAll('.piano-keyboard__board')).toHaveLength(1);
	});

	it('at a 308px measured width (the old 1-octave stacking trigger), a one-octave span stays a single 8-key row', async () => {
		stubResizeObserverWidth(308);
		const { notes } = spellChord('Bm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 1 });

		await Promise.resolve();
		await Promise.resolve();

		expect(container.querySelector('.piano-keyboard__rows')).toBeNull();
		const boards = container.querySelectorAll('.piano-keyboard__board');
		expect(boards).toHaveLength(1);
		expect(boards[0].querySelectorAll('.piano-keyboard__key--white')).toHaveLength(8);
	});
});

describe('PianoKeyboard stacked row 2 black keys report the board-absolute octave (regression, phone misgrade)', () => {
	/**
	 * REGRESSION CONTEXT: each stacked row built its black keys with a
	 * row-relative `position`, and every black-key octave is derived from
	 * `position`, so every row-2 black key reported octave 4 instead of 5.
	 * Only octave-graded surfaces noticed: chapter 15's shell cycle marked a
	 * correct F7 (F on row 1, A + E♭ on row 2) wrong, and Show me painted a
	 * ghost on BOTH E♭ keys. White keys always used the absolute index.
	 */
	beforeEach(() => {
		stubResizeObserverWidth(358);
	});

	async function stackedBoards(container: HTMLElement): Promise<NodeListOf<Element>> {
		await Promise.resolve();
		await Promise.resolve();
		const boards = container.querySelectorAll('.piano-keyboard__board');
		expect(boards).toHaveLength(2);
		return boards;
	}

	function blackKeyIn(board: Element, name: string): HTMLElement {
		const key = Array.from(board.querySelectorAll('.piano-keyboard__key--black')).find(
			(el) => el.getAttribute('aria-label') === name
		);
		expect(key).toBeDefined();
		return key as HTMLElement;
	}

	it('interactive: a row-1 D♯ press reports octave 4 and a row-2 D♯ press reports octave 5', async () => {
		const onPress = vi.fn();
		const { container } = render(PianoKeyboard, {
			notes: [],
			interactive: true,
			octaves: 2,
			selected: new Set<string>(),
			onToggle: () => {},
			onPress
		});
		const [row1, row2] = await stackedBoards(container);

		await fireEvent.click(blackKeyIn(row1, 'D♯ key'));
		expect(onPress).toHaveBeenLastCalledWith('D♯', 4);

		await fireEvent.click(blackKeyIn(row2, 'D♯ key'));
		expect(onPress).toHaveBeenLastCalledWith('D♯', 5);
	});

	it('ghostKeys: an E♭4 ghost lands on exactly one black key, in row 1', async () => {
		const { container } = render(PianoKeyboard, {
			notes: [],
			octaves: 2,
			ghostKeys: [{ letter: 'E♭', octave: 4, marker: '3' }]
		});
		const [row1, row2] = await stackedBoards(container);

		expect(container.querySelectorAll('.piano-keyboard__key--black.piano-keyboard__key--ghost')).toHaveLength(1);
		expect(row1.querySelectorAll('.piano-keyboard__key--black.piano-keyboard__key--ghost')).toHaveLength(1);
		expect(row2.querySelectorAll('.piano-keyboard__key--ghost')).toHaveLength(0);
	});

	it('constructable: a row-2 black-key tap reports octave 5', async () => {
		const onConstructTap = vi.fn();
		const { container } = render(PianoKeyboard, {
			notes: spellChord('C').notes,
			octaves: 2,
			constructable: true,
			onConstructTap
		});
		const [, row2] = await stackedBoards(container);

		await fireEvent.click(blackKeyIn(row2, 'A♯ key'));
		expect(onConstructTap).toHaveBeenLastCalledWith('A♯', 5);
	});
});
