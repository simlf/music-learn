import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
import { setCompSongSeed } from '$lib/practice/compSongSeed';
import type { CompLoopHandle, CompLoopOptions } from '$lib/audio/audio';

/**
 * The comping loop component: a play-along companion, not a drill.
 *
 * Three groups of promises are locked here.
 *
 * 1. It is not a drill. No grade, no score, no card, no answer event, nothing
 *    persisted. The copy says so and the behaviour matches: starting and
 *    stopping a loop writes nothing anywhere.
 * 2. It stops cleanly. Stop stops it, unmounting stops it, and unmounting
 *    while the piano is still loading stops the loop the moment it arrives.
 * 3. Three controls and no more: form, key, tempo, plus the two default-off
 *    toggles (hold, scale) that each add exactly one chip.
 */

let handleStops = 0;
let handleTempos: number[] = [];
let startCalls: CompLoopOptions[] = [];
/** When set, startCompLoop hands its resolver over instead of resolving at once. */
let pendingResolve: ((handle: CompLoopHandle | null) => void) | null = null;
let soundOn = true;
let studyOn = false;

function makeHandle(): CompLoopHandle {
	let running = true;
	return {
		stop() {
			running = false;
			handleStops += 1;
		},
		setTempo(bpm: number) {
			handleTempos.push(bpm);
		},
		isRunning() {
			return running;
		}
	};
}

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playChord: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => soundOn,
	studyModeEnabled: () => studyOn,
	startCompLoop: (opts: CompLoopOptions) => {
		startCalls.push(opts);
		if (!soundOn) return Promise.resolve(null);
		return new Promise<CompLoopHandle | null>((resolve) => {
			pendingResolve = resolve;
			if (!holdStart) {
				pendingResolve = null;
				resolve(makeHandle());
			}
		});
	}
}));

/** Set before a start to keep startCompLoop unresolved (the slow-sample-load case). */
let holdStart = false;

let strudelRuns: string[] = [];
let strudelStops = 0;
const fakePattern = { queryArc: () => [] };
const fakeNow = () => 0;
let strudelRunResult: {
	ok: boolean;
	unavailable?: boolean;
	pattern?: unknown;
	now?: () => number;
} = { ok: true, pattern: fakePattern, now: fakeNow };
let strudelErrorCallback: ((message: string) => void) | null = null;

vi.mock('$lib/audio/strudel', () => ({
	runStrudelPattern: async (code: string) => {
		strudelRuns.push(code);
		return strudelRunResult;
	},
	stopStrudelPattern: () => {
		strudelStops += 1;
	},
	onStrudelError: (callback: (message: string) => void) => {
		strudelErrorCallback = callback;
		return () => {
			strudelErrorCallback = null;
		};
	}
}));

/** What the pianoroll was asked to draw, per play; see the "live code pianoroll" suite below. */
let pianorollStarts: Array<{ pattern: unknown; now: () => number }> = [];
let pianorollStops = 0;
let pianorollResult: { ok: boolean } = { ok: true };
let pianorollErrorCallback: (() => void) | null = null;

vi.mock('$lib/audio/strudelPianoroll', () => ({
	startPianoroll: async (pattern: unknown, now: () => number) => {
		pianorollStarts.push({ pattern, now });
		return pianorollResult;
	},
	stopPianoroll: () => {
		pianorollStops += 1;
	},
	onPianorollError: (callback: () => void) => {
		pianorollErrorCallback = callback;
		return () => {
			pianorollErrorCallback = null;
		};
	}
}));

const { default: CompingLoop } = await import('./CompingLoop.svelte');

function lastStart(): CompLoopOptions {
	return startCalls[startCalls.length - 1];
}

async function clickStart(): Promise<void> {
	await fireEvent.click(screen.getByRole('button', { name: 'Start the loop' }));
}

function barChips(): HTMLElement[] {
	return within(screen.getByTestId('comping-bar-strip')).getAllByTestId('comping-bar-chip');
}

function currentChip(): HTMLElement {
	const chip = barChips().find((element) => element.dataset.current === 'true');
	expect(chip).toBeDefined();
	return chip as HTMLElement;
}

beforeEach(() => {
	localStorage.clear();
	handleStops = 0;
	handleTempos = [];
	startCalls = [];
	pendingResolve = null;
	holdStart = false;
	soundOn = true;
	studyOn = false;
	strudelRuns = [];
	strudelStops = 0;
	strudelRunResult = { ok: true, pattern: fakePattern, now: fakeNow };
	strudelErrorCallback = null;
	pianorollStarts = [];
	pianorollErrorCallback = null;
	pianorollStops = 0;
	pianorollResult = { ok: true };
	/**
	 * jsdom does not implement a real 2d canvas context (no native `canvas`
	 * package installed): without this, CompingLoop's own `getContext('2d')`
	 * call returns null and every play would look like a pianoroll failure.
	 */
	HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
		clearRect: vi.fn()
	})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('it reads as a companion, not an exercise', () => {
	it('says plainly that nothing here is graded, scored, or queued', () => {
		render(CompingLoop);

		expect(screen.getByRole('heading', { name: 'Comping loop' })).toBeInTheDocument();
		const intro = screen.getByText(/The app comps the changes on repeat/);
		expect(intro).toHaveTextContent('Nothing here is graded, scored, or added to your practice queue');
		expect(intro).toHaveTextContent('There is no right answer');
	});

	it('renders no em or en dashes', () => {
		render(CompingLoop);
		expect(document.body.textContent).not.toMatch(/—|–/);
	});

	it('persists nothing at all across a whole start and stop cycle', async () => {
		render(CompingLoop);
		await clickStart();
		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

		expect(localStorage.length).toBe(0);
	});

	it('persists nothing at all with "loop this bar" engaged either', async () => {
		render(CompingLoop);
		await fireEvent.click(screen.getByRole('button', { name: 'Loop this bar' }));
		await clickStart();
		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

		expect(localStorage.length).toBe(0);
	});
});

describe('three controls: form, key, tempo', () => {
	it('offers exactly the three progression forms, labelled by their roman shape', () => {
		render(CompingLoop);
		const forms = within(screen.getByTestId('comping-form-row')).getAllByRole('button');

		expect(forms.map((button) => button.textContent?.trim())).toEqual([
			'ii V I',
			'I vi ii V',
			'iiø V i'
		]);
		expect(forms[0]).toHaveAttribute('aria-pressed', 'true');
	});

	it('offers the 12 keys and starts on C', () => {
		render(CompingLoop);
		const keys = within(screen.getByTestId('comping-key-row')).getAllByRole('button');

		expect(keys).toHaveLength(12);
		expect(keys[0]).toHaveTextContent('C');
		expect(keys[0]).toHaveAttribute('aria-pressed', 'true');
	});

	it('defaults to 70 BPM and steps in both directions without wrapping past the ends', async () => {
		render(CompingLoop);
		expect(screen.getByTestId('comping-tempo-value')).toHaveTextContent('70 BPM');

		await fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
		expect(screen.getByTestId('comping-tempo-value')).toHaveTextContent('75 BPM');

		await fireEvent.click(screen.getByRole('button', { name: 'Slower' }));
		expect(screen.getByTestId('comping-tempo-value')).toHaveTextContent('70 BPM');

		for (let i = 0; i < 30; i++) {
			await fireEvent.click(screen.getByRole('button', { name: 'Slower' }));
		}
		expect(screen.getByTestId('comping-tempo-value')).toHaveTextContent('50 BPM');

		for (let i = 0; i < 40; i++) {
			await fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
		}
		expect(screen.getByTestId('comping-tempo-value')).toHaveTextContent('120 BPM');
	});

	it('shows no other option: the only buttons are the forms, the keys, the tempo pair, hold, scale, live code, and start', () => {
		render(CompingLoop);
		const all = screen.getAllByRole('button');
		// forms(3) + keys(12) + tempo(2) + hold(1) + scale(1) + live code chip(1) + start(1).
		// The live-code panel itself (play/stop/reset) is closed by default and adds no buttons yet.
		expect(all).toHaveLength(3 + 12 + 2 + 1 + 1 + 1 + 1);
	});
});

describe('what the loop shows before it even starts', () => {
	it('shows the first bar of the chosen form, in key, with its numeral strip', () => {
		render(CompingLoop);

		expect(screen.getByTestId('comping-position')).toHaveTextContent('KEY: C MAJOR');
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 1 / 3');
		expect(barChips().map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
			'ii Dm7',
			'V G7',
			'I Cmaj7'
		]);
		expect(currentChip()).toHaveTextContent('Dm7');
	});

	it('lights only the notes the loop actually comps: the root and the guide tones, never the plain fifth', () => {
		render(CompingLoop);

		// Dm7: D (root), F (3rd), C (7th). A, the plain fifth, is not comped.
		const keyboard = document.querySelector('.piano-keyboard') as HTMLElement;
		expect(keyboard).not.toBeNull();
		const lit = keyboard.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--seventh'
		);
		expect(lit).toHaveLength(3);
		expect(
			Array.from(lit).map((key) => key.querySelector('.note-label__letter')?.textContent)
		).toEqual(['D', 'F', 'C']);
		expect(keyboard.querySelectorAll('.piano-keyboard__key--fifth')).toHaveLength(0);
	});

	it('explains the voicing without claiming the ♭5 is dropped', () => {
		render(CompingLoop);

		expect(screen.getByText(/The loop plays the root low/)).toHaveTextContent(
			'the 3rd, which says major or minor, and the 7th, which says which seventh'
		);
		expect(screen.queryByTestId('comping-flat5-caption')).not.toBeInTheDocument();
	});

	it('adds the ♭5 exception line on a ♭5 bar, where the fifth IS the chord', async () => {
		render(CompingLoop);
		await fireEvent.click(screen.getByRole('button', { name: 'iiø V i' }));

		expect(currentChip()).toHaveTextContent('Dm7b5');
		expect(screen.getByTestId('comping-flat5-caption')).toHaveTextContent(
			'On this bar the ♭5 stays in too'
		);
		expect(screen.getByTestId('comping-position')).toHaveTextContent('KEY: C MINOR');
		// Four comped notes now: root, 3rd, ♭5, 7th.
		expect(
			document.querySelectorAll(
				'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
			)
		).toHaveLength(4);
	});
});

describe('song mode (proposal 2: Play over it)', () => {
	it('plays the song’s own chords instead of a template, with no roman numeral', () => {
		setCompSongSeed('Blue Bossa', ['Cm7', 'Fm7', 'Bb7']);
		render(CompingLoop);

		expect(screen.getByTestId('comping-song-mode-name')).toHaveTextContent('Blue Bossa');
		expect(screen.getByTestId('comping-position')).toHaveTextContent('Blue Bossa');
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 1 / 3');
		expect(currentChip()).toHaveTextContent('Cm7');
		expect(barChips().map((chip) => chip.textContent?.trim())).toEqual(['Cm7', 'Fm7', 'Bb7']);
		// No roman numeral - a song's chords are not steps of a fixed template.
		expect(screen.queryByTestId('comping-form-row')).not.toBeInTheDocument();
		expect(screen.queryByTestId('comping-key-row')).not.toBeInTheDocument();
	});

	it('keeps repeats intact, in order (PLAY-02’s own rule, mirrored here)', () => {
		setCompSongSeed('Song', ['Dm7', 'G7', 'Dm7', 'G7']);
		render(CompingLoop);

		expect(barChips().map((chip) => chip.textContent?.trim())).toEqual(['Dm7', 'G7', 'Dm7', 'G7']);
	});

	it('leaves song mode back to the template pickers, stopping the loop first', async () => {
		setCompSongSeed('Blue Bossa', ['Cm7', 'Fm7']);
		render(CompingLoop);
		await clickStart();
		expect(handleStops).toBe(0);

		await fireEvent.click(screen.getByRole('button', { name: 'Back to progressions' }));

		expect(handleStops).toBe(1);
		expect(screen.getByTestId('comping-form-row')).toBeInTheDocument();
		expect(screen.getByTestId('comping-key-row')).toBeInTheDocument();
		expect(screen.queryByTestId('comping-song-mode-name')).not.toBeInTheDocument();
	});

	it('consumes the seed one-shot: nothing persists, and a later mount with no seed is a plain template loop', () => {
		setCompSongSeed('Blue Bossa', ['Cm7']);
		render(CompingLoop);
		expect(screen.getByTestId('comping-song-mode-name')).toBeInTheDocument();
		cleanup();

		render(CompingLoop);
		expect(screen.queryByTestId('comping-song-mode-name')).not.toBeInTheDocument();
		expect(screen.getByTestId('comping-form-row')).toBeInTheDocument();
	});

	it('never crashes when none of the song’s chords can be voiced, and says so', () => {
		setCompSongSeed('Modern chart', ['NotAChord', 'AlsoNot']);
		expect(() => render(CompingLoop)).not.toThrow();

		expect(screen.getByTestId('comping-song-mode-empty')).toHaveTextContent('Modern chart');
		// Falls back to the ordinary template pickers rather than a dead loop.
		expect(screen.getByTestId('comping-form-row')).toBeInTheDocument();
	});
});

describe('starting, following, and stopping', () => {
	it('starts the transport loop with the chosen form voiced for comping', async () => {
		render(CompingLoop);
		await clickStart();

		expect(startCalls).toHaveLength(1);
		expect(lastStart().bpm).toBe(70);
		expect(lastStart().roll).toBe(false);
		expect(lastStart().bars.map((bar) => bar.pitches)).toEqual([
			['D3', 'F4', 'C5'],
			['G3', 'B4', 'F5'],
			['C3', 'E4', 'B4']
		]);
		expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
	});

	it('follows the form: the reported bar moves the symbol, the strip, and the keys', async () => {
		render(CompingLoop);
		await clickStart();

		flushSync(() => lastStart().onBar?.(1));
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 2 / 3');
		expect(currentChip()).toHaveTextContent('G7');

		flushSync(() => lastStart().onBar?.(2));
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 3 / 3');
		expect(currentChip()).toHaveTextContent('Cmaj7');

		flushSync(() => lastStart().onBar?.(0));
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 1 / 3');
	});

	it('stops the loop and returns to the top of the form', async () => {
		render(CompingLoop);
		await clickStart();
		flushSync(() => lastStart().onBar?.(2));

		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

		expect(handleStops).toBe(1);
		expect(screen.getByRole('button', { name: 'Start the loop' })).toBeInTheDocument();
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 1 / 3');
	});

	it('passes a live tempo change to the running loop instead of restarting it', async () => {
		render(CompingLoop);
		await clickStart();

		await fireEvent.click(screen.getByRole('button', { name: 'Faster' }));

		expect(handleTempos).toEqual([75]);
		expect(startCalls).toHaveLength(1);
		expect(handleStops).toBe(0);
	});

	it('restarts on a key change while playing, with the new key’s chords', async () => {
		render(CompingLoop);
		await clickStart();

		await fireEvent.click(screen.getByRole('button', { name: 'F' }));

		expect(handleStops).toBe(1);
		expect(startCalls).toHaveLength(2);
		expect(barChips().map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
			'ii Gm7',
			'V C7',
			'I Fmaj7'
		]);
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 1 / 3');
	});

	it('restarts on a form change while playing, and the 4-bar turnaround loops over 4 bars', async () => {
		render(CompingLoop);
		await clickStart();

		await fireEvent.click(screen.getByRole('button', { name: 'I vi ii V' }));

		expect(startCalls).toHaveLength(2);
		expect(lastStart().bars).toHaveLength(4);
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 1 / 4');
	});

	it('does not start a loop when the user only browses the forms', async () => {
		render(CompingLoop);

		await fireEvent.click(screen.getByRole('button', { name: 'iiø V i' }));
		await fireEvent.click(screen.getByRole('button', { name: 'E♭' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Faster' }));

		expect(startCalls).toEqual([]);
		expect(screen.getByRole('button', { name: 'Start the loop' })).toBeInTheDocument();
	});
});

/**
 * "Loop this bar" (improvisation.md's one recommended comping-loop
 * extension, section 3.4/4.3.1): repeats whichever bar is on screen instead
 * of advancing through the form, so a single change (e.g. unit 11's G7
 * resolution) can be drilled on repeat. No engine change: `startCompLoop`
 * already takes any `CompLoopBar[]`, so holding just sends a one-bar slice
 * and stops advancing `barIndex`.
 */
describe('loop this bar (hold)', () => {
	function holdButton(): HTMLElement {
		return screen.getByRole('button', { name: 'Loop this bar' });
	}

	it('is off by default', () => {
		render(CompingLoop);
		expect(holdButton()).toHaveAttribute('aria-pressed', 'false');
		expect(screen.queryByTestId('comping-hold-note')).not.toBeInTheDocument();
	});

	it('starting while held sends only the current bar, repeated, and never advances barIndex', async () => {
		render(CompingLoop);
		await fireEvent.click(holdButton());
		expect(holdButton()).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('comping-hold-note')).toBeInTheDocument();

		await clickStart();

		expect(lastStart().bars.map((bar) => bar.pitches)).toEqual([['D3', 'F4', 'C5']]);
		expect(lastStart().onBar).toBeUndefined();
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 1 / 3');
	});

	it('toggling hold on while running pins the bar that was just sounding, not bar 1', async () => {
		render(CompingLoop);
		await clickStart();
		flushSync(() => lastStart().onBar?.(1));
		expect(currentChip()).toHaveTextContent('G7');

		await fireEvent.click(holdButton());

		expect(startCalls).toHaveLength(2);
		expect(lastStart().bars.map((bar) => bar.pitches)).toEqual([['G3', 'B4', 'F5']]);
		expect(currentChip()).toHaveTextContent('G7');
		expect(screen.getByTestId('comping-position')).toHaveTextContent('BAR 2 / 3');

		// It stays there: a fake onBar(0) from a stray late callback would be
		// wrong anyway, but held mode does not even wire one up.
		expect(lastStart().onBar).toBeUndefined();
	});

	it('toggling hold off while running resumes the full form from the bar that was held', async () => {
		render(CompingLoop);
		await fireEvent.click(holdButton());
		await clickStart();

		await fireEvent.click(holdButton());

		expect(startCalls).toHaveLength(2);
		expect(lastStart().bars).toHaveLength(3);
		expect(currentChip()).toHaveTextContent('Dm7');
		flushSync(() => lastStart().onBar?.(1));
		expect(currentChip()).toHaveTextContent('G7');
	});

	it('does not restart anything when toggled while stopped', async () => {
		render(CompingLoop);
		await fireEvent.click(holdButton());

		expect(startCalls).toEqual([]);
		expect(screen.getByRole('button', { name: 'Start the loop' })).toBeInTheDocument();
	});
});

/**
 * The chord-scale overlay (design doc `.planning/design/improvisation.md`
 * 4.3.2 and 5.2): the loop shows what can be played over the bar it is
 * already playing. Default off, so the plain comp is untouched for anyone not
 * improvising, and it stays an INSTRUMENT (section 6): it reads, it never
 * grades, and it never touches the audio path.
 */
describe('scale overlay', () => {
	function scaleButton(): HTMLElement {
		return screen.getByRole('button', { name: 'Show the scale' });
	}

	const ROLE_CLASSES = [
		'root',
		'second',
		'third',
		'fourth',
		'fifth',
		'sixth',
		'seventh'
	].map((role) => `piano-keyboard__key--${role}`);

	/**
	 * Every key that actually RENDERS as a hatch, in board order (whites then
	 * blacks). The ghost class is what the hatch and the marker hang off, so a
	 * key the comp is already interval-filling is absent from this list even
	 * though the overlay offered it a ghost entry.
	 */
	function ghosts(): { marker: string | null; tone: string | null }[] {
		return Array.from(document.querySelectorAll('.piano-keyboard__key--ghost')).map((key) => ({
			marker: key.getAttribute('data-ghost'),
			tone: key.getAttribute('data-ghost-tone')
		}));
	}

	const WHITE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

	/** The white key for `letter` in `octave`, by board position (the board starts at C4). */
	function whiteKey(letter: string, octave: number): Element {
		const keys = Array.from(document.querySelectorAll('.piano-keyboard__key--white'));
		const index = (octave - 4) * 7 + WHITE_LETTERS.indexOf(letter);
		const key = keys[index];
		expect(key, `the board should render ${letter}${octave} at white index ${index}`).toBeDefined();
		return key;
	}

	function isGhosted(key: Element): boolean {
		return key.classList.contains('piano-keyboard__key--ghost');
	}

	function isRoleFilled(key: Element): boolean {
		return ROLE_CLASSES.some((role) => key.classList.contains(role));
	}

	it('is off by default, and off draws nothing extra at all', () => {
		render(CompingLoop);

		expect(scaleButton()).toHaveAttribute('aria-pressed', 'false');
		expect(screen.queryByTestId('comping-scale-line')).not.toBeInTheDocument();
		expect(screen.queryByTestId('comping-scale-caption')).not.toBeInTheDocument();
		expect(ghosts()).toEqual([]);
	});

	it('names the current bar’s scale and hatches its non-chord tones', async () => {
		render(CompingLoop);
		await fireEvent.click(scaleButton());

		expect(scaleButton()).toHaveAttribute('aria-pressed', 'true');
		// Bar 1 of the ii V I in C is Dm7: D dorian.
		expect(screen.getByTestId('comping-scale-line')).toHaveTextContent('Bar 1: D dorian');
		// The comp strikes D4/F4/C5 and those three keys keep their interval
		// fills; every other key of D dorian in the overlay's two octaves
		// hatches, the fifth (A) and the octave twins included, and dorian has
		// nothing to be careful about.
		expect(ghosts().map((ghost) => ghost.marker)).toEqual([
			'm7',
			'9',
			'11',
			'P5',
			'13',
			'R',
			'9',
			'm3',
			'11',
			'P5',
			'13',
			'm7'
		]);
		expect(ghosts().every((ghost) => ghost.tone === null)).toBe(true);
	});

	it('hatches the octave twin of a comped note, which the comp itself never reaches', async () => {
		render(CompingLoop);
		await fireEvent.click(scaleButton());

		// Dm7 comps D4/F4/C5, so those three keys are filled...
		for (const [letter, octave] of [
			['D', 4],
			['F', 4],
			['C', 5]
		] as const) {
			const key = whiteKey(letter, octave);
			expect(isRoleFilled(key), `${letter}${octave} should carry its interval fill`).toBe(true);
			expect(isGhosted(key), `${letter}${octave} is filled, so it must not hatch too`).toBe(false);
		}

		// ...while D5, F5 and C4 are the same scale notes one octave over, and a
		// note that belongs to the scale must never read as outside it.
		for (const [letter, octave] of [
			['D', 5],
			['F', 5],
			['C', 4]
		] as const) {
			expect(isGhosted(whiteKey(letter, octave)), `${letter}${octave} should hatch`).toBe(true);
		}
	});

	it('hatches the board’s trailing key too, on every bar of the form', async () => {
		render(CompingLoop);
		await fireEvent.click(scaleButton());
		await clickStart();

		// D dorian, G mixolydian and C ionian all contain C, and the two-octave
		// board's last key is C6: an octave the spans themselves do not cover.
		for (const [bar, scaleName] of [
			[0, 'D dorian'],
			[1, 'G mixolydian'],
			[2, 'C major (ionian)']
		] as const) {
			flushSync(() => lastStart().onBar?.(bar));
			expect(screen.getByTestId('comping-scale-line')).toHaveTextContent(scaleName);
			expect(isGhosted(whiteKey('C', 6)), `C6 over ${scaleName}`).toBe(true);
		}
	});

	it('never draws a hatch on a key the comp is already interval-filling', async () => {
		render(CompingLoop);
		await fireEvent.click(scaleButton());

		const doubled = Array.from(document.querySelectorAll('.piano-keyboard__key')).filter(
			(key) => isRoleFilled(key) && isGhosted(key)
		);
		expect(doubled).toEqual([]);
	});

	it('follows the changes: the scale is re-read for every bar the loop reports', async () => {
		render(CompingLoop);
		await fireEvent.click(scaleButton());
		await clickStart();

		flushSync(() => lastStart().onBar?.(1));
		expect(screen.getByTestId('comping-scale-line')).toHaveTextContent('Bar 2: G mixolydian');
		// G7's 11 (C) rubs the major 3rd, so it earns the vermilion bar.
		expect([
			...new Set(
				ghosts()
					.filter((ghost) => ghost.tone === 'careful')
					.map((ghost) => ghost.marker)
			)
		]).toEqual(['11']);

		flushSync(() => lastStart().onBar?.(2));
		expect(screen.getByTestId('comping-scale-line')).toHaveTextContent('Bar 3: C major (ionian)');
	});

	it('is display only: turning it on never touches the running loop', async () => {
		render(CompingLoop);
		await clickStart();
		expect(startCalls).toHaveLength(1);

		await fireEvent.click(scaleButton());
		await fireEvent.click(scaleButton());

		// No restart, no stop, no second audio call of any kind.
		expect(startCalls).toHaveLength(1);
		expect(handleStops).toBe(0);
		expect(handleTempos).toEqual([]);
	});

	it('grades nothing and persists nothing while it is on', async () => {
		render(CompingLoop);
		await fireEvent.click(scaleButton());
		await clickStart();
		flushSync(() => lastStart().onBar?.(1));
		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

		expect(localStorage.length).toBe(0);
		// No verdict, no tally: the overlay adds a reading and nothing else.
		expect(document.body.textContent).not.toMatch(/correct|try again|not quite|streak/i);
	});

	it('reads the minor iiø bar too, so no bar of any form is left without an answer', async () => {
		render(CompingLoop);
		await fireEvent.click(screen.getByRole('button', { name: 'iiø V i' }));
		await fireEvent.click(scaleButton());

		expect(screen.getByTestId('comping-scale-line')).toHaveTextContent('Bar 1: D locrian');
	});
});

/**
 * The "open in live code" escape hatch (inspired by the Strudel live-coding
 * environment): the current bars, rendered as an editable pattern the player
 * can change and hear on a second, separate engine ($lib/audio/strudel).
 * Same discipline as the rest of this companion: no grading, and the two
 * engines never sound at once.
 */
describe('live code escape hatch', () => {
	function liveCodeButton(): HTMLElement {
		return screen.getByRole('button', { name: 'Open in live code' });
	}

	/** The live-code editor is a real CodeMirror 6 EditorView: its editable surface is `.cm-content`, not a `<textarea>`. */
	function input(): HTMLElement {
		return screen.getByTestId('comping-livecode-input');
	}

	/**
	 * CodeMirror renders each line as its own `.cm-line` block element, so a
	 * plain `.textContent` read on the editor loses the newlines between
	 * them (block elements insert no text of their own). Joining the lines
	 * back with '\n' recovers the seeded pattern's actual two-line text.
	 */
	function editorText(): string {
		return Array.from(input().querySelectorAll('.cm-line'))
			.map((line) => line.textContent ?? '')
			.join('\n');
	}

	/** CodeMirror's own DOM observer reads the mutated `.cm-content`, not a synthetic `.value` (see StrudelEditor's own test for why). */
	async function typeInEditor(text: string): Promise<void> {
		const el = input();
		el.textContent = text;
		await fireEvent.input(el);
	}

	it('is closed by default and adds exactly one chip', () => {
		render(CompingLoop);

		expect(liveCodeButton()).toHaveAttribute('aria-pressed', 'false');
		expect(screen.queryByTestId('comping-livecode-panel')).not.toBeInTheDocument();
	});

	it('opens to a pattern seeded from the current form, key and tempo', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await screen.findByTestId('comping-livecode-input');

		expect(liveCodeButton()).toHaveAttribute('aria-pressed', 'true');
		expect(editorText()).toBe('setcpm(17.5)\nchord("<Dm7 G7 Cmaj7>").voicing().s("sawtooth")');
	});

	it('never clobbers an edit when the key changes elsewhere on the page: reset is the only way back', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await screen.findByTestId('comping-livecode-input');
		await typeInEditor('note("c e g")');

		await fireEvent.click(screen.getByRole('button', { name: 'F' }));
		expect(editorText()).toBe('note("c e g")');

		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
		expect(editorText()).toBe('setcpm(17.5)\nchord("<Gm7 C7 Fmaj7>").voicing().s("sawtooth")');
	});

	it('lets the player edit the seeded text', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await screen.findByTestId('comping-livecode-input');

		await typeInEditor('note("c e g").s("triangle")');

		expect(editorText()).toBe('note("c e g").s("triangle")');
	});

	it('plays the edited pattern, stopping the main loop first', async () => {
		render(CompingLoop);
		await clickStart();
		await fireEvent.click(liveCodeButton());
		await screen.findByTestId('comping-livecode-input');
		await typeInEditor('note("c e g")');

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(handleStops).toBe(1);
		expect(strudelRuns).toEqual(['note("c e g")']);
	});

	it('stops the live pattern before starting the main loop', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		await clickStart();

		expect(strudelStops).toBe(1);
		expect(startCalls).toHaveLength(1);
	});

	it('stops the pattern with its own stop button', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		await fireEvent.click(screen.getByRole('button', { name: 'Stop the pattern' }));

		expect(strudelStops).toBe(1);
	});

	it('resets the edited text back to the current seeded pattern', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await screen.findByTestId('comping-livecode-input');
		await typeInEditor('garbage');

		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

		expect(editorText()).toBe('setcpm(17.5)\nchord("<Dm7 G7 Cmaj7>").voicing().s("sawtooth")');
	});

	it('shows the engine’s own error when the pattern fails, and clears it on the next play', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		strudelErrorCallback?.('[eval] error: unexpected token');
		await Promise.resolve();

		expect(screen.getByTestId('comping-livecode-error')).toHaveTextContent(
			'That pattern has a problem: [eval] error: unexpected token'
		);

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));
		expect(screen.queryByTestId('comping-livecode-error')).not.toBeInTheDocument();
	});

	it('shows an honest unavailable message when the engine fails to load, never a silent no-op', async () => {
		strudelRunResult = { ok: false, unavailable: true };
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(screen.getByTestId('comping-livecode-unavailable')).toBeInTheDocument();
	});

	it('disables play, like the main start button, when sound is off', async () => {
		soundOn = false;
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());

		expect(screen.getByRole('button', { name: 'Play the pattern' })).toBeDisabled();
	});

	it('stops a running pattern when the panel is closed', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		await fireEvent.click(liveCodeButton());

		expect(strudelStops).toBe(1);
	});

	it('persists nothing at all across an open, play and stop cycle', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Stop the pattern' }));

		expect(localStorage.length).toBe(0);
	});
});

/**
 * The pianoroll: so the player SEES the pattern they hear, not just a
 * sound. Drawing lives entirely in `$lib/audio/strudelPianoroll` (mocked
 * here, exactly like `$lib/audio/strudel`) - this only locks CompingLoop's
 * own contract with it: what gets started, and that it is always stopped
 * wherever the pattern itself is stopped.
 */
describe('live code pianoroll', () => {
	function liveCodeButton(): HTMLElement {
		return screen.getByRole('button', { name: 'Open in live code' });
	}

	it('draws a canvas inside the panel', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());

		expect(screen.getByTestId('comping-livecode-pianoroll').tagName).toBe('CANVAS');
	});

	it('starts a pianoroll for the evaluated pattern and clock on play', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(pianorollStarts).toEqual([{ pattern: fakePattern, now: fakeNow }]);
	});

	it('stops the pianoroll with the pattern’s own stop button', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		await fireEvent.click(screen.getByRole('button', { name: 'Stop the pattern' }));

		expect(pianorollStops).toBe(1);
	});

	it('stops the pianoroll before starting the main loop', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		await clickStart();

		expect(pianorollStops).toBe(1);
	});

	it('stops the pianoroll when the panel is closed', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		await fireEvent.click(liveCodeButton());

		expect(pianorollStops).toBe(1);
	});

	it('shows an honest message when the pianoroll fails to draw, without hiding that the pattern is still playing', async () => {
		pianorollResult = { ok: false };
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(screen.getByTestId('comping-livecode-visual-unavailable')).toBeInTheDocument();
		expect(screen.queryByTestId('comping-livecode-unavailable')).not.toBeInTheDocument();
	});

	it('shows an honest message when a later, asynchronous pianoroll draw fails mid-playback', async () => {
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(screen.queryByTestId('comping-livecode-visual-unavailable')).not.toBeInTheDocument();
		pianorollErrorCallback?.();
		await Promise.resolve();

		expect(screen.getByTestId('comping-livecode-visual-unavailable')).toBeInTheDocument();
	});

	it('never starts a pianoroll when the engine itself is unavailable', async () => {
		strudelRunResult = { ok: false, unavailable: true };
		render(CompingLoop);
		await fireEvent.click(liveCodeButton());

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(pianorollStarts).toHaveLength(0);
	});
});

describe('clean teardown', () => {
	it('stops the loop when the page is left', async () => {
		const { unmount } = render(CompingLoop);
		await clickStart();

		unmount();

		expect(handleStops).toBe(1);
	});

	it('stops a running live-code pattern when the page is left', async () => {
		const { unmount } = render(CompingLoop);
		await fireEvent.click(screen.getByRole('button', { name: 'Open in live code' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		unmount();

		expect(strudelStops).toBe(1);
	});

	it('stops a loop whose piano finished loading only AFTER the page was left', async () => {
		holdStart = true;
		const { unmount } = render(CompingLoop);
		await clickStart();
		expect(handleStops).toBe(0);

		unmount();
		// The samples arrive late and the engine hands back a running loop.
		const resolve = pendingResolve;
		expect(resolve).not.toBeNull();
		resolve?.(makeHandle());
		await Promise.resolve();
		await Promise.resolve();

		expect(handleStops).toBe(1);
	});

	it('shows a starting state while the piano loads, and never stacks two loops on a double tap', async () => {
		holdStart = true;
		render(CompingLoop);
		await clickStart();

		expect(screen.getByRole('button', { name: 'Starting' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Start the loop' })).not.toBeInTheDocument();
	});
});

describe('respecting the audio preferences', () => {
	it('refuses to pretend when sound is off: it says so and offers no start', () => {
		soundOn = false;
		render(CompingLoop);

		expect(screen.getByTestId('comping-sound-off')).toHaveTextContent(
			'Sound is off, so the loop has nothing to play'
		);
		expect(screen.getByRole('button', { name: 'Start the loop' })).toBeDisabled();
		expect(startCalls).toEqual([]);
	});

	it('rolls each bar in study mode, and says why', async () => {
		studyOn = true;
		render(CompingLoop);

		expect(screen.getByTestId('comping-study-note')).toHaveTextContent(
			'each bar rolls one note at a time'
		);
		await clickStart();
		expect(lastStart().roll).toBe(true);
	});

	it('lands the bar as a block when study mode is off', async () => {
		render(CompingLoop);
		expect(screen.queryByTestId('comping-study-note')).not.toBeInTheDocument();

		await clickStart();
		expect(lastStart().roll).toBe(false);
	});
});

describe('French parity (I18N-02)', () => {
	it('renders the whole companion in French, keeping symbols and numerals immune', () => {
		setLocale('fr');
		render(CompingLoop);

		expect(screen.getByRole('heading', { name: "Boucle d'accompagnement" })).toBeInTheDocument();
		expect(screen.getByText(/tu improvises dessus/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Lancer la boucle' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Plus vite' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Boucler cette mesure' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Afficher la gamme' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Ouvrir en live code' })).toBeInTheDocument();
		expect(screen.getByTestId('comping-position')).toHaveTextContent('TON: C MAJEUR');
		expect(screen.getByTestId('comping-position')).toHaveTextContent('MESURE 1 / 3');
		// Immune: the roman shapes and the chord symbols never translate.
		expect(screen.getByRole('button', { name: 'ii V I' })).toBeInTheDocument();
		expect(currentChip()).toHaveTextContent('Dm7');
		expect(document.body.textContent).not.toMatch(/—|–/);
	});

	it('names the bar’s scale in French, keeping the tonic letter immune', async () => {
		setLocale('fr');
		render(CompingLoop);
		await fireEvent.click(screen.getByRole('button', { name: 'Afficher la gamme' }));

		expect(screen.getByTestId('comping-scale-line')).toHaveTextContent('Mesure 1 : D dorien');
		expect(screen.getByTestId('comping-scale-caption')).toHaveTextContent(
			'Les touches hachurées sont toute la gamme jouable sur cette mesure'
		);
	});
});
