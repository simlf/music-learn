import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PianoKeyboard from './PianoKeyboard.svelte';
import RecentChipRow from './RecentChipRow.svelte';
import { spellChord } from '$lib/theory/chord';

describe('PianoKeyboard', () => {
	it('highlights the four Cm7 spelled notes with their interval role colors and dual naming', () => {
		const { notes } = spellChord('Cm7');

		render(PianoKeyboard, { notes });

		// Root: C
		const rootLetter = screen.getAllByText('C')[0];
		expect(rootLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--root');

		// Third: E♭
		const thirdLetter = screen.getAllByText('E♭')[0];
		expect(thirdLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--third');

		// Fifth: G
		const fifthLetter = screen.getAllByText('G')[0];
		expect(fifthLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--fifth');

		// Seventh: B♭
		const seventhLetter = screen.getAllByText('B♭')[0];
		expect(seventhLetter.closest('.piano-keyboard__key')).toHaveClass(
			'piano-keyboard__key--seventh'
		);

		// Dual naming: solfège present alongside letters (degree-based, accidental-agnostic)
		expect(screen.getByText('Do')).toBeInTheDocument();
		expect(screen.getByText('Mi')).toBeInTheDocument();
		expect(screen.getByText('Sol')).toBeInTheDocument();
		expect(screen.getByText('Si')).toBeInTheDocument();

		// Exactly four highlighted keys (root/third/fifth/seventh classes)
		const highlighted = document.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
	});

	it('renders a display-only keyboard with no click or keydown handlers', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		const keyboard = container.querySelector('.piano-keyboard');
		expect(keyboard).not.toBeNull();
		expect(keyboard?.getAttribute('onclick')).toBeNull();
		expect(keyboard?.getAttribute('onkeydown')).toBeNull();
	});

	it('non-regression: omitting interactive keeps keys free of button semantics', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		const keyboard = container.querySelector('.piano-keyboard');
		expect(keyboard).toHaveAttribute('role', 'img');
		expect(keyboard).toHaveAttribute('aria-label', 'Piano keyboard, two octaves');

		const keys = container.querySelectorAll('.piano-keyboard__key');
		expect(keys.length).toBeGreaterThan(0);
		keys.forEach((key) => {
			expect(key.getAttribute('role')).not.toBe('button');
			expect(key.getAttribute('aria-pressed')).toBeNull();
			expect(key.getAttribute('tabindex')).toBeNull();
		});

		// Highlighted key still renders its NoteLabel exactly as before.
		const rootLetter = screen.getAllByText('C')[0];
		expect(rootLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--root');
	});

	it('interactive mode: clicking a white key calls onToggle with its letter', async () => {
		const onToggle = vi.fn();
		const { container } = render(PianoKeyboard, {
			notes: [],
			interactive: true,
			selected: new Set<string>(),
			onToggle
		});

		// Two-octave keyboard repeats C three times; any instance is a valid target.
		const [cKey] = screen.getAllByRole('button', { name: 'C key' });
		await fireEvent.click(cKey);

		expect(onToggle).toHaveBeenCalledWith('C');
		expect(container).toBeTruthy();
	});

	it('interactive mode: aria-pressed and aria-label reflect selected state', () => {
		render(PianoKeyboard, {
			notes: [],
			interactive: true,
			selected: new Set(['C']),
			onToggle: () => {}
		});

		const selectedKeys = screen.getAllByRole('button', { name: 'C key, selected' });
		expect(selectedKeys.length).toBeGreaterThan(0);
		selectedKeys.forEach((key) => expect(key).toHaveAttribute('aria-pressed', 'true'));

		const unselectedKeys = screen.getAllByRole('button', { name: 'D key' });
		expect(unselectedKeys.length).toBeGreaterThan(0);
		unselectedKeys.forEach((key) => expect(key).toHaveAttribute('aria-pressed', 'false'));
	});

	it('interactive mode: Enter and Space keydown both toggle a key', async () => {
		const onToggle = vi.fn();
		render(PianoKeyboard, {
			notes: [],
			interactive: true,
			selected: new Set<string>(),
			onToggle
		});

		const [cKey] = screen.getAllByRole('button', { name: 'C key' });
		await fireEvent.keyDown(cKey, { key: 'Enter' });
		expect(onToggle).toHaveBeenCalledWith('C');

		onToggle.mockClear();
		await fireEvent.keyDown(cKey, { key: ' ' });
		expect(onToggle).toHaveBeenCalledWith('C');
	});

	it('octaves={1}: renders 8 white keys, 5 black keys, and a one-octave aria-label', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 1 });

		const keyboard = container.querySelector('.piano-keyboard');
		expect(keyboard).toHaveAttribute('aria-label', 'Piano keyboard, one octave');
		expect(container.querySelectorAll('.piano-keyboard__key--white')).toHaveLength(8);
		expect(container.querySelectorAll('.piano-keyboard__key--black')).toHaveLength(5);
	});

	it('octaves={2}: renders 15 white keys, 10 black keys, and a two-octave aria-label', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 2 });

		const keyboard = container.querySelector('.piano-keyboard');
		expect(keyboard).toHaveAttribute('aria-label', 'Piano keyboard, two octaves');
		expect(container.querySelectorAll('.piano-keyboard__key--white')).toHaveLength(15);
		expect(container.querySelectorAll('.piano-keyboard__key--black')).toHaveLength(10);
	});

	it('octaves={1}: a high-rooted chord (Bm7) still shows all four interval colors via wrapping', () => {
		const { notes } = spellChord('Bm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 1 });

		const highlighted = container.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
	});

	it('feedback mode (wrongLetters defined): the wrong extra key gets a gray ✕ fill and the reveal keys are stamped', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, {
			notes,
			wrongLetters: new Set(['A']),
			octaves: 1
		});

		const wrongKeys = container.querySelectorAll('.piano-keyboard__key--wrong');
		expect(wrongKeys).toHaveLength(1);
		expect(within(wrongKeys[0] as HTMLElement).getByText('✕')).toBeInTheDocument();
		expect(within(wrongKeys[0] as HTMLElement).getByText('extra note')).toBeInTheDocument();
		expect(wrongKeys[0]).toHaveClass('piano-keyboard__key--stamped');

		const highlighted = container.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
		highlighted.forEach((key) => expect(key).toHaveClass('piano-keyboard__key--stamped'));
	});

	it('exotic-spelling reveal (Dbm, 09-02 defect fix): root/third/fifth all highlight, including the F♭ third, plus the wrong extra', () => {
		const { notes } = spellChord('Dbm');
		const { container } = render(PianoKeyboard, {
			notes,
			wrongLetters: new Set(['B']),
			octaves: 1
		});

		// Three interval-colored keys: Dbm is a triad (root/third/fifth), no
		// seventh. Before the 09-02 fix, the F♭ third had zero letter
		// candidates and was silently dropped, leaving only two.
		const highlighted = container.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(3);

		const thirdLetter = screen.getAllByText('F♭')[0];
		expect(thirdLetter.closest('.piano-keyboard__key')).toHaveClass('piano-keyboard__key--third');

		const wrongKeys = container.querySelectorAll('.piano-keyboard__key--wrong');
		expect(wrongKeys).toHaveLength(1);
	});

	it('wrongLetters undefined (display/interactive mode unchanged): no wrong fill or stamped class appears', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes });

		expect(container.querySelectorAll('.piano-keyboard__key--wrong')).toHaveLength(0);
		expect(container.querySelectorAll('.piano-keyboard__key--stamped')).toHaveLength(0);
	});

	it('one-octave key geometry (09-02 defect fix): white/black key widths derive purely from percentages, no fixed-px floor fighting `left`', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 1 });

		// 8 white keys at one octave: each key is an equal 100/8 = 12.5% slice,
		// positioned by percentage `left` - a fixed min-width px clamp would
		// make every key the same width regardless of this percentage,
		// overlapping neighbors once the container is narrower than
		// 8 * (min-width px).
		const whiteKeys = container.querySelectorAll<HTMLElement>('.piano-keyboard__key--white');
		expect(whiteKeys).toHaveLength(8);
		whiteKeys.forEach((key, index) => {
			expect(key.style.width).toBe('12.5%');
			expect(key.style.left).toBe(`${index * 12.5}%`);
		});

		// Black keys stay 60% of white width (7.5%), preserving the visible
		// gaps between the 2-key and 3-key groups a pianist orients by.
		const blackKeys = container.querySelectorAll<HTMLElement>('.piano-keyboard__key--black');
		expect(blackKeys).toHaveLength(5);
		blackKeys.forEach((key) => {
			expect(key.style.width).toBe('7.5%');
		});
	});

	it('two-octave key geometry stays proportional (byte-identical math, different octave count)', () => {
		const { notes } = spellChord('Cm7');
		const { container } = render(PianoKeyboard, { notes, octaves: 2 });

		// 15 white keys at two octaves: 100/15 repeating decimal - assert via
		// the black-key-is-60%-of-white relationship rather than a rounded
		// literal, so this doesn't drift if floating point formatting changes.
		const whiteKeys = container.querySelectorAll<HTMLElement>('.piano-keyboard__key--white');
		const blackKeys = container.querySelectorAll<HTMLElement>('.piano-keyboard__key--black');
		expect(whiteKeys).toHaveLength(15);
		expect(blackKeys).toHaveLength(10);

		const whiteWidthPct = parseFloat(whiteKeys[0].style.width);
		const blackWidthPct = parseFloat(blackKeys[0].style.width);
		expect(whiteWidthPct).toBeCloseTo(100 / 15, 10);
		expect(blackWidthPct).toBeCloseTo(whiteWidthPct * 0.6, 10);
	});

	it('rotation continuity (D-03): selected letters stay aria-pressed true when octaves changes from 2 to 1', async () => {
		const { rerender } = render(PianoKeyboard, {
			notes: [],
			interactive: true,
			selected: new Set(['C']),
			onToggle: () => {},
			octaves: 2
		});

		let selectedKeys = screen.getAllByRole('button', { name: 'C key, selected' });
		expect(selectedKeys.length).toBeGreaterThan(0);
		selectedKeys.forEach((key) => expect(key).toHaveAttribute('aria-pressed', 'true'));

		await rerender({
			notes: [],
			interactive: true,
			selected: new Set(['C']),
			onToggle: () => {},
			octaves: 1
		});

		selectedKeys = screen.getAllByRole('button', { name: 'C key, selected' });
		expect(selectedKeys.length).toBeGreaterThan(0);
		selectedKeys.forEach((key) => expect(key).toHaveAttribute('aria-pressed', 'true'));
	});

	describe('interactive touch (D-11 press cue + haptic, D-12 gesture hygiene)', () => {
		afterEach(() => {
			// Restore jsdom's baseline (no navigator.vibrate) so each test starts
			// from the same unsupported-by-default state.
			Reflect.deleteProperty(navigator, 'vibrate');
		});

		it('pointerdown calls navigator.vibrate with a short duration when available', async () => {
			const vibrateMock = vi.fn((_pattern: VibratePattern) => true);
			Object.defineProperty(navigator, 'vibrate', {
				value: vibrateMock,
				configurable: true,
				writable: true
			});

			render(PianoKeyboard, {
				notes: [],
				interactive: true,
				selected: new Set<string>(),
				onToggle: () => {}
			});

			const [cKey] = screen.getAllByRole('button', { name: 'C key' });
			await fireEvent.pointerDown(cKey);

			expect(vibrateMock).toHaveBeenCalledTimes(1);
			const [duration] = vibrateMock.mock.calls[0];
			expect(duration).toBeGreaterThan(0);
			expect(duration).toBeLessThanOrEqual(50);
		});

		it('pointerdown does not throw when navigator.vibrate is unsupported (feature-detected no-op)', async () => {
			Object.defineProperty(navigator, 'vibrate', {
				value: undefined,
				configurable: true,
				writable: true
			});

			render(PianoKeyboard, {
				notes: [],
				interactive: true,
				selected: new Set<string>(),
				onToggle: () => {}
			});

			const [cKey] = screen.getAllByRole('button', { name: 'C key' });
			await expect(fireEvent.pointerDown(cKey)).resolves.not.toThrow();
		});

		it('pointerdown applies a transient pressed state additive to the interval-role color', async () => {
			const { notes } = spellChord('Cm7');
			render(PianoKeyboard, {
				notes,
				interactive: true,
				selected: new Set<string>(),
				onToggle: () => {},
				octaves: 1
			});

			const rootKey = screen.getAllByText('C')[0].closest('.piano-keyboard__key') as HTMLElement;
			expect(rootKey).toHaveClass('piano-keyboard__key--root');
			expect(rootKey).not.toHaveClass('piano-keyboard__key--pressed');

			await fireEvent.pointerDown(rootKey);

			expect(rootKey).toHaveClass('piano-keyboard__key--pressed');
			expect(rootKey).toHaveClass('piano-keyboard__key--root');
		});

		it('interactive keyboard surface carries touch-action styling that suppresses double-tap zoom', () => {
			const { container } = render(PianoKeyboard, {
				notes: [],
				interactive: true,
				selected: new Set<string>(),
				onToggle: () => {}
			});

			const keyboard = container.querySelector('.piano-keyboard') as HTMLElement;
			expect(keyboard.style.touchAction).toBe('manipulation');
		});
	});
});

describe('RecentChipRow', () => {
	it('shows a ghost chip per recent symbol with a re-lookup aria-label', () => {
		render(RecentChipRow, { recent: ['Cm7', 'Fmaj7'], onselect: () => {} });

		const chips = screen.getAllByTestId('recent-chip');
		expect(chips).toHaveLength(2);
		expect(screen.getByText('Cm7')).toBeInTheDocument();
		expect(screen.getByText('Fmaj7')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Look up Cm7 again' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Look up Fmaj7 again' })).toBeInTheDocument();
	});

	it('renders nothing when recent is empty', () => {
		const { container } = render(RecentChipRow, { recent: [], onselect: () => {} });

		expect(container.querySelector('[data-testid="recent-chip-row"]')).toBeNull();
		expect(container.textContent?.trim()).toBe('');
	});

	it('calls onselect with the clicked chip symbol', async () => {
		const onselect = vi.fn();
		render(RecentChipRow, { recent: ['Cm7', 'Fmaj7'], onselect });

		await fireEvent.click(screen.getByRole('button', { name: 'Look up Fmaj7 again' }));

		expect(onselect).toHaveBeenCalledWith('Fmaj7');
	});
});
