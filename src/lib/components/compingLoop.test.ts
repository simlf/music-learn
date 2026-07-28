import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
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
 * 3. Three controls and no more: form, key, tempo.
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

	it('shows no other option: the only buttons are the forms, the keys, the tempo pair, and start', () => {
		render(CompingLoop);
		const all = screen.getAllByRole('button');
		expect(all).toHaveLength(3 + 12 + 2 + 1);
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

describe('clean teardown', () => {
	it('stops the loop when the page is left', async () => {
		const { unmount } = render(CompingLoop);
		await clickStart();

		unmount();

		expect(handleStops).toBe(1);
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
		expect(screen.getByTestId('comping-position')).toHaveTextContent('TON: C MAJEUR');
		expect(screen.getByTestId('comping-position')).toHaveTextContent('MESURE 1 / 3');
		// Immune: the roman shapes and the chord symbols never translate.
		expect(screen.getByRole('button', { name: 'ii V I' })).toBeInTheDocument();
		expect(currentChip()).toHaveTextContent('Dm7');
		expect(document.body.textContent).not.toMatch(/—|–/);
	});
});
