import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PianoKeyboard from './PianoKeyboard.svelte';
import IntervalChip from './IntervalChip.svelte';
import InspectRegister from './InspectRegister.svelte';
import RecentChipRow from './RecentChipRow.svelte';
import { spellChord } from '$lib/theory/chord';
import { setLocale } from '$lib/i18n/locale.svelte';

// Interactive-mode taps now sound their own key-touch note through
// PianoKeyboard's own activation choke point (G1 UAT fix), so every test
// module rendering an interactive/constructable/inspectable keyboard mocks
// this module - never a real AudioContext/tone import in jsdom
// (ARCHITECTURE-CONTRACTS.md consumer rule).
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args)
}));

beforeEach(() => {
	playNoteMock.mockClear();
	ensureAudioReadyMock.mockClear();
});

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

		// Dual naming: solfège present alongside letters, carrying the accidental
		// (Cm7 = C, E♭, G, B♭ → Do, Mi♭, Sol, Si♭)
		expect(screen.getByText('Do')).toBeInTheDocument();
		expect(screen.getByText('Mi♭')).toBeInTheDocument();
		expect(screen.getByText('Sol')).toBeInTheDocument();
		expect(screen.getByText('Si♭')).toBeInTheDocument();

		// Exactly four highlighted keys (root/third/fifth/seventh classes)
		const highlighted = document.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
	});

	it('showIntervalBadges: each highlighted key shows its interval from the root (sketch 003)', () => {
		const { notes } = spellChord('Cm7');

		render(PianoKeyboard, { notes, showIntervalBadges: true });

		const badges = document.querySelectorAll('.piano-keyboard__ivbadge');
		const labels = [...badges].map((b) => b.textContent?.trim());
		// Root reads R; the other three read their interval from C.
		expect(labels).toContain('R');
		expect(labels).toContain('m3');
		expect(labels).toContain('P5');
		expect(labels).toContain('m7');
		expect(badges).toHaveLength(4);
	});

	it('non-regression: omitting showIntervalBadges renders no interval badges', () => {
		const { notes } = spellChord('Cm7');
		render(PianoKeyboard, { notes });
		expect(document.querySelectorAll('.piano-keyboard__ivbadge')).toHaveLength(0);
	});

	it('showIntervalTicks: one labelled gap per consecutive pair, with semitone ticks (sketch 2b)', () => {
		const { notes } = spellChord('Cm7');

		render(PianoKeyboard, { notes, showIntervalTicks: true });

		// C E♭ G B♭ → three gaps: m3, M3, m3.
		const labels = [...document.querySelectorAll('.piano-keyboard__gap-label')].map((el) =>
			el.textContent?.trim()
		);
		expect(labels).toEqual(['m3 · 3', 'M3 · 4', 'm3 · 3']);

		// Ticks mark every intervening semitone: (3-1) + (4-1) + (3-1) = 7.
		expect(document.querySelectorAll('.piano-keyboard__gap-tick')).toHaveLength(7);

		// Every gap here IS a third, so all three lines carry a quality color.
		expect(
			document.querySelectorAll('.piano-keyboard__gap--minor.piano-keyboard__gap-line')
		).toHaveLength(2);
		expect(
			document.querySelectorAll('.piano-keyboard__gap--major.piano-keyboard__gap-line')
		).toHaveLength(1);
		expect(document.querySelectorAll('.piano-keyboard__gap--other')).toHaveLength(0);
	});

	it('showIntervalTicks: a black-key endpoint draws to the black key own center, not a white key', () => {
		const { notes } = spellChord('Cm7');

		render(PianoKeyboard, { notes, showIntervalTicks: true });

		// Two octaves = 15 white keys = 6.667% each. C's center is half a white
		// key in (3.333%); E♭ is the black key after white index 1, whose center
		// is exactly (1 + 1) * 6.667% = 13.333% - a white-key assumption would
		// have put it at 10% (D's center) or 16.667% (E's).
		const line = document.querySelector('.piano-keyboard__gap-line') as HTMLElement;
		expect(parseFloat(line.style.left)).toBeCloseTo(3.333, 2);
		expect(parseFloat(line.style.width)).toBeCloseTo(10, 2);
	});

	it('showIntervalTicks: a non-third gap goes dashed/neutral, never an M-or-m quality color', () => {
		// C7sus4 = C F G B♭: a P4, a M2 (one white key apart), and a m3 ending
		// on a black key - the handoff's own stress-test chord.
		const { notes } = spellChord('C7sus4');

		render(PianoKeyboard, { notes, showIntervalTicks: true });

		const labels = [...document.querySelectorAll('.piano-keyboard__gap-label')];
		const byText = (text: string) => labels.find((el) => el.textContent?.trim() === text);

		expect(byText('P4 · 5')).toHaveClass('piano-keyboard__gap--other');
		expect(byText('M2 · 2')).toHaveClass('piano-keyboard__gap--other');
		expect(byText('m3 · 3')).toHaveClass('piano-keyboard__gap--minor');

		// The narrow M2 (one white key apart, ~44px at the 660px board floor)
		// drops its label a size; the wide P4 does not.
		expect(byText('M2 · 2')).toHaveClass('piano-keyboard__gap-label--narrow');
		expect(byText('P4 · 5')).not.toHaveClass('piano-keyboard__gap-label--narrow');
	});

	it('showIntervalTicks: the whole rail is pointer-events-free so it never eats a key tap', () => {
		const { notes } = spellChord('Cm7');

		const { container } = render(PianoKeyboard, {
			notes,
			showIntervalTicks: true,
			inspectable: true
		});

		const rail = container.querySelector('.piano-keyboard__rail');
		expect(rail).not.toBeNull();
		expect(rail).toHaveAttribute('aria-hidden', 'true');
		// The rail sits ABOVE the board in the DOM, as a sibling of it.
		expect(rail?.nextElementSibling).toHaveClass('piano-keyboard__board');
	});

	it('showIntervalTicks: fewer than two highlighted notes draws no rail', () => {
		const { notes } = spellChord('Cm7');

		render(PianoKeyboard, {
			notes: notes.slice(0, 1),
			showIntervalTicks: true
		});

		expect(document.querySelector('.piano-keyboard__rail')).toBeNull();
	});

	it('non-regression: omitting showIntervalTicks renders no tick rail', () => {
		const { notes } = spellChord('Cm7');
		render(PianoKeyboard, { notes });
		expect(document.querySelector('.piano-keyboard__rail')).toBeNull();
		expect(document.querySelectorAll('.piano-keyboard__gap-line')).toHaveLength(0);
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

		it('pointerdown fires onPress with the key letter and octave (Track A key-touch sound hook)', async () => {
			const onPress = vi.fn();
			render(PianoKeyboard, {
				notes: [],
				interactive: true,
				selected: new Set<string>(),
				onToggle: () => {},
				onPress,
				octaves: 2
			});

			// White keys: C appears at white indices 0, 7, 14 -> octaves 4, 5, 6.
			const cKeys = screen.getAllByRole('button', { name: 'C key' });
			expect(cKeys).toHaveLength(3);
			await fireEvent.pointerDown(cKeys[0]);
			expect(onPress).toHaveBeenLastCalledWith('C', 4);
			await fireEvent.pointerDown(cKeys[1]);
			expect(onPress).toHaveBeenLastCalledWith('C', 5);
			await fireEvent.pointerDown(cKeys[2]);
			expect(onPress).toHaveBeenLastCalledWith('C', 6);

			// Black keys report their sharp letter; second-octave instance is octave 5.
			const cSharpKeys = screen.getAllByRole('button', { name: 'C♯ key' });
			await fireEvent.pointerDown(cSharpKeys[0]);
			expect(onPress).toHaveBeenLastCalledWith('C♯', 4);
			await fireEvent.pointerDown(cSharpKeys[1]);
			expect(onPress).toHaveBeenLastCalledWith('C♯', 5);
		});

		it('never fires onPress in display mode (handlers stay gated by interactive)', async () => {
			const onPress = vi.fn();
			render(PianoKeyboard, { notes: [], onPress });

			const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
			const key = keyboard.querySelector('.piano-keyboard__key--white') as HTMLElement;
			await fireEvent.pointerDown(key);

			expect(onPress).not.toHaveBeenCalled();
		});

		describe('key-touch sound (G1 UAT fix)', () => {
			it('clicking an interactive key sounds it exactly once through the shared audio contract', async () => {
				render(PianoKeyboard, {
					notes: [],
					interactive: true,
					selected: new Set<string>(),
					onToggle: () => {}
				});

				const [cKey] = screen.getAllByRole('button', { name: 'C key' });
				await fireEvent.click(cKey);

				expect(ensureAudioReadyMock).toHaveBeenCalled();
				expect(playNoteMock).toHaveBeenCalledTimes(1);
				expect(playNoteMock).toHaveBeenCalledWith('C4');
			});

			it('does not double-play when a caller also wires onPress on the same key', async () => {
				const onPress = vi.fn();
				render(PianoKeyboard, {
					notes: [],
					interactive: true,
					selected: new Set<string>(),
					onToggle: () => {},
					onPress
				});

				const [cKey] = screen.getAllByRole('button', { name: 'C key' });
				await fireEvent.pointerDown(cKey);
				await fireEvent.click(cKey);

				// onPress fires from BOTH the pointerdown moment and the activation
				// choke point (WR-01): a pointer tap therefore reports the octave
				// twice (idempotent, same letter+octave), and keyboard/AT activation -
				// which never fires pointerdown - still reports it once via the choke
				// point. The key-touch SOUND, however, only ever plays once from the
				// choke point - onPress carries no audio of its own (G1: callers no
				// longer wire audio-only onPress handlers).
				expect(onPress).toHaveBeenCalledTimes(2);
				expect(onPress).toHaveBeenCalledWith('C', 4);
				expect(playNoteMock).toHaveBeenCalledTimes(1);
			});

			it('Enter/Space also sounds the key (mirrors click, the other activation path)', async () => {
				render(PianoKeyboard, {
					notes: [],
					interactive: true,
					selected: new Set<string>(),
					onToggle: () => {}
				});

				const [cKey] = screen.getAllByRole('button', { name: 'C key' });
				await fireEvent.keyDown(cKey, { key: 'Enter' });

				expect(playNoteMock).toHaveBeenCalledTimes(1);
				expect(playNoteMock).toHaveBeenCalledWith('C4');
			});

			it('a construct-mode tap also sounds its own key, mirroring interactive mode', async () => {
				const { notes } = spellChord('Cm7');
				render(PianoKeyboard, {
					notes: notes.slice(0, 1),
					constructable: true,
					onConstructTap: () => {}
				});

				const [dKey] = screen.getAllByRole('button', { name: 'D key' });
				await fireEvent.click(dKey);

				expect(ensureAudioReadyMock).toHaveBeenCalled();
				expect(playNoteMock).toHaveBeenCalledWith('D4');
			});
		});

		it('renders byte-identical markup whether onPress is passed or omitted', () => {
			const { notes } = spellChord('Cm7');
			const withoutProp = render(PianoKeyboard, {
				notes,
				interactive: true,
				selected: new Set(['C']),
				onToggle: () => {},
				octaves: 2
			});
			const withoutHtml = withoutProp.container.innerHTML;
			withoutProp.unmount();

			const withProp = render(PianoKeyboard, {
				notes,
				interactive: true,
				selected: new Set(['C']),
				onToggle: () => {},
				onPress: () => {},
				octaves: 2
			});

			expect(withProp.container.innerHTML).toBe(withoutHtml);
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

describe('degree-class color extension (second/fourth/sixth)', () => {
	it('PianoKeyboard fills a sus4 chord tone with the fourth-class key color', () => {
		const { notes } = spellChord('Csus4');
		const { container } = render(PianoKeyboard, { notes });

		expect(container.querySelector('.piano-keyboard__key--fourth')).not.toBeNull();
	});

	it('PianoKeyboard fills a sixth chord tone with the sixth-class key color', () => {
		const { notes } = spellChord('C6');
		const { container } = render(PianoKeyboard, { notes });

		expect(container.querySelector('.piano-keyboard__key--sixth')).not.toBeNull();
	});

	it('PianoKeyboard fills a ninth chord tone with the second-class key color', () => {
		const { notes } = spellChord('C9');
		const { container } = render(PianoKeyboard, { notes });

		expect(container.querySelector('.piano-keyboard__key--second')).not.toBeNull();
	});

	it('IntervalChip renders a modifier class for every degree-class role', () => {
		const roles = ['root', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'] as const;
		for (const role of roles) {
			const { container, unmount } = render(IntervalChip, { role, label: 'x' });
			expect(container.querySelector(`.interval-chip--${role}`)).not.toBeNull();
			unmount();
		}
	});
});

describe('IntervalChip longName tooltip (Track C)', () => {
	it('adds title and aria-label when longName is provided', () => {
		const { container } = render(IntervalChip, { role: 'third', label: 'm3', longName: 'tierce mineure' });

		const chip = container.querySelector('.interval-chip');
		expect(chip).toHaveAttribute('title', 'tierce mineure');
		expect(chip).toHaveAttribute('aria-label', 'm3: tierce mineure');
	});

	it('omitting longName keeps the chip free of title and aria-label (byte-identical contract)', () => {
		const { container } = render(IntervalChip, { role: 'third', label: 'm3' });

		const chip = container.querySelector('.interval-chip');
		expect(chip).not.toHaveAttribute('title');
		expect(chip).not.toHaveAttribute('aria-label');
	});
});

describe('InspectRegister', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('shows the idle invitation when no payload is set (en default)', () => {
		render(InspectRegister, { payload: null });

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('Tap a key to inspect it.');
	});

	it('shows the French idle invitation under the fr locale (I18N-02)', () => {
		setLocale('fr');
		render(InspectRegister, { payload: null });

		expect(screen.getByTestId('inspect-register')).toHaveTextContent(
			"Touche une note pour l'inspecter."
		);
	});

	it('renders the one-line register in English by default: letter, solfege, short, English long name, semitone count', () => {
		render(InspectRegister, {
			payload: {
				letter: 'E♭',
				solfege: 'Mi♭',
				octave: 4,
				inChord: true,
				info: {
					short: 'm3',
					long: 'minor 3rd',
					longFr: 'tierce mineure',
					degree: 3,
					quality: 'm',
					semitones: 3,
					role: 'third',
					tonalName: '3m'
				}
			}
		});

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('E♭ · Mi♭ · m3 · minor 3rd · 3 semitones');
	});

	it('switches to the French long name and semitone word under the fr locale (I18N-02)', () => {
		setLocale('fr');
		render(InspectRegister, {
			payload: {
				letter: 'E♭',
				solfege: 'Mi♭',
				octave: 4,
				inChord: true,
				info: {
					short: 'm3',
					long: 'minor 3rd',
					longFr: 'tierce mineure',
					degree: 3,
					quality: 'm',
					semitones: 3,
					role: 'third',
					tonalName: '3m'
				}
			}
		});

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('E♭ · Mi♭ · m3 · tierce mineure · 3 demi-tons');
	});

	it('uses the singular semitone word for one semitone (en default)', () => {
		render(InspectRegister, {
			payload: {
				letter: 'D♭',
				solfege: 'Ré',
				octave: 4,
				inChord: false,
				info: {
					short: 'm2',
					long: 'minor 2nd',
					longFr: 'seconde mineure',
					degree: 2,
					quality: 'm',
					semitones: 1,
					role: 'second',
					tonalName: '2m'
				}
			}
		});

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('1 semitone');
		expect(screen.getByTestId('inspect-register')).not.toHaveTextContent('1 semitones');
	});

	it('uses the singular demi-ton for one semitone under fr', () => {
		setLocale('fr');
		render(InspectRegister, {
			payload: {
				letter: 'D♭',
				solfege: 'Ré',
				octave: 4,
				inChord: false,
				info: {
					short: 'm2',
					long: 'minor 2nd',
					longFr: 'seconde mineure',
					degree: 2,
					quality: 'm',
					semitones: 1,
					role: 'second',
					tonalName: '2m'
				}
			}
		});

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('1 demi-ton');
		expect(screen.getByTestId('inspect-register')).not.toHaveTextContent('demi-tons');
	});

	it('falls back to letter and solfege alone when there is no interval info', () => {
		render(InspectRegister, {
			payload: { letter: 'D', solfege: 'Ré', octave: 4, inChord: false, info: null }
		});

		expect(screen.getByTestId('inspect-register')).toHaveTextContent('D · Ré');
		expect(screen.getByTestId('inspect-register')).not.toHaveTextContent('demi-ton');
	});
});
