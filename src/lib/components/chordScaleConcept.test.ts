import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * The chord-tones-vs-scale-tones concept lesson (PR #80 follow-up 2): reads
 * as an instrument-flavoured reference, never a drill, and its editable
 * pattern runs on the SAME Strudel engine the comping loop's live-code hatch
 * uses. Mirrors compingLoop.test.ts's live-code suite conventions.
 *
 * Three groups of promises locked here.
 *
 * 1. It teaches by showing and hearing: the keyboard highlights the chord
 *    tones, the caption names both groups from the SAME data the pattern is
 *    built from, and nothing here is graded, scored, or persisted.
 * 2. The pattern is editable and playable/stoppable on Strudel, with the
 *    same offline/error honesty the comping loop's own escape hatch has.
 * 3. It tears down cleanly: unmounting stops a running pattern.
 */

let soundOn = true;
vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => soundOn
}));

let strudelRuns: string[] = [];
let strudelStops = 0;
let strudelRunResult: { ok: boolean; unavailable?: boolean } = { ok: true };
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

const { default: ChordScaleConcept } = await import('./ChordScaleConcept.svelte');

const SEEDED_PATTERN =
	'setcpm(10)\nstack(\n  chord("<Cmaj7>").voicing().s("sawtooth"),\n  note("c5 e5 g5 b5 d5 f5 a5").s("sawtooth sawtooth sawtooth sawtooth triangle triangle triangle")\n)';

function input(): HTMLTextAreaElement {
	return screen.getByTestId('chord-scale-pattern-input') as HTMLTextAreaElement;
}

beforeEach(() => {
	localStorage.clear();
	soundOn = true;
	strudelRuns = [];
	strudelStops = 0;
	strudelRunResult = { ok: true };
	strudelErrorCallback = null;
});

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('reads as reference, not a drill', () => {
	it('names both groups from the same split the pattern uses, and grades nothing', () => {
		render(ChordScaleConcept);

		expect(screen.getByTestId('chord-scale-chord-tones')).toHaveTextContent('C, E, G, B');
		expect(screen.getByTestId('chord-scale-scale-tones')).toHaveTextContent('D, F, A');
	});

	it('seeds the pattern from the fixed Cmaj7/C ionian demo', () => {
		render(ChordScaleConcept);

		expect(input().value).toBe(SEEDED_PATTERN);
	});
});

describe('the editable pattern', () => {
	it('lets the player edit the seeded text', async () => {
		render(ChordScaleConcept);

		await fireEvent.input(input(), { target: { value: 'note("c5 fs5 g5")' } });

		expect(input().value).toBe('note("c5 fs5 g5")');
	});

	it('plays the edited pattern on the Strudel engine', async () => {
		render(ChordScaleConcept);
		await fireEvent.input(input(), { target: { value: 'note("c5 fs5 g5")' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(strudelRuns).toEqual(['note("c5 fs5 g5")']);
	});

	it('stops the pattern with its own stop button', async () => {
		render(ChordScaleConcept);
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

		expect(strudelStops).toBe(1);
	});

	it('resets an edit back to the seeded pattern', async () => {
		render(ChordScaleConcept);
		await fireEvent.input(input(), { target: { value: 'garbage' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

		expect(input().value).toBe(SEEDED_PATTERN);
	});

	it('shows the engine’s own error when the pattern fails, and clears it on the next play', async () => {
		render(ChordScaleConcept);
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		strudelErrorCallback?.('[eval] error: unexpected token');
		await Promise.resolve();

		expect(screen.getByTestId('chord-scale-error')).toHaveTextContent(
			'That pattern has a problem: [eval] error: unexpected token'
		);

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));
		expect(screen.queryByTestId('chord-scale-error')).not.toBeInTheDocument();
	});

	it('shows an honest unavailable message when the engine fails to load, never a silent no-op', async () => {
		strudelRunResult = { ok: false, unavailable: true };
		render(ChordScaleConcept);

		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		expect(screen.getByTestId('chord-scale-unavailable')).toBeInTheDocument();
	});

	it('disables play when sound is off, and says why', () => {
		soundOn = false;
		render(ChordScaleConcept);

		expect(screen.getByRole('button', { name: 'Play the pattern' })).toBeDisabled();
		expect(screen.getByTestId('chord-scale-sound-off')).toBeInTheDocument();
	});

	it('persists nothing at all across a play and stop cycle', async () => {
		render(ChordScaleConcept);
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

		expect(localStorage.length).toBe(0);
	});
});

describe('clean teardown', () => {
	it('stops a running pattern when the page is left', async () => {
		const { unmount } = render(ChordScaleConcept);
		await fireEvent.click(screen.getByRole('button', { name: 'Play the pattern' }));

		unmount();

		expect(strudelStops).toBe(1);
	});

	it('does not stop anything on unmount when nothing was playing', () => {
		const { unmount } = render(ChordScaleConcept);

		unmount();

		expect(strudelStops).toBe(0);
	});
});

describe('French parity', () => {
	it('renders the caption labels and controls in French', () => {
		setLocale('fr');
		render(ChordScaleConcept);

		expect(screen.getByText(/Deux rôles, une gamme/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Jouer le motif' })).toBeInTheDocument();
	});
});
