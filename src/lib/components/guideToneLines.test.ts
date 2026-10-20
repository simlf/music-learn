import { render, screen, cleanup, fireEvent, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
import { GUIDE_TONE_CYCLE_KEYS, guideTonePattern } from '$lib/practice/guideToneCycle';

/**
 * Chapter 11's heard concept: the guide-tone lines as an editable Strudel
 * pattern. Both Strudel engines are mocked (the real ones are covered in
 * their own module tests); this suite proves what the component asks them
 * to play, that a key change reseeds and stops, that the editor is lazy, and
 * that nothing here grades, counts or persists.
 */

let soundOn = true;
vi.mock('$lib/audio/audio', () => ({
	soundEnabled: () => soundOn
}));

let strudelRuns: string[] = [];
let strudelStops = 0;
let strudelResult: { ok: boolean; unavailable?: boolean; pattern?: unknown; now?: () => number } = {
	ok: true,
	pattern: { id: 'pattern' },
	now: () => 0
};
let strudelErrorCallback: ((message: string) => void) | null = null;

vi.mock('$lib/audio/strudel', () => ({
	runStrudelPattern: async (code: string) => {
		strudelRuns.push(code);
		return strudelResult;
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

let pianorollStarts = 0;
let pianorollStops = 0;
vi.mock('$lib/audio/strudelPianoroll', () => ({
	startPianoroll: async () => {
		pianorollStarts += 1;
		return { ok: true };
	},
	stopPianoroll: () => {
		pianorollStops += 1;
	},
	onPianorollError: () => () => {}
}));

const { default: GuideToneLines } = await import('./GuideToneLines.svelte');

const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');

beforeEach(() => {
	setLocale('en');
	soundOn = true;
	strudelRuns = [];
	strudelStops = 0;
	strudelResult = { ok: true, pattern: { id: 'pattern' }, now: () => 0 };
	strudelErrorCallback = null;
	pianorollStarts = 0;
	pianorollStops = 0;
	localStorage.clear();
	// jsdom has no 2d canvas; the pianoroll only needs a context to hand on.
	getContextSpy.mockReturnValue({} as CanvasRenderingContext2D);
});

afterEach(() => {
	cleanup();
});

const playButton = () => screen.getByRole('button', { name: 'Play the lines' });

describe('GuideToneLines', () => {
	it('starts on C, reading the two lines and the chords from the engine', () => {
		render(GuideToneLines);
		const chips = within(screen.getByTestId('guide-lines-key-row')).getAllByRole('button');
		expect(chips.map((chip) => chip.textContent?.trim())).toEqual([...GUIDE_TONE_CYCLE_KEYS]);
		expect(chips[0].getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByTestId('guide-lines-symbols').textContent).toBe('Dm7 G7 Cmaj7');
		expect(screen.getByTestId('guide-lines-upper').textContent).toBe('Top line: C → B → B');
		expect(screen.getByTestId('guide-lines-lower').textContent).toBe('Bottom line: F → F → E');
	});

	it('Play runs the seeded pattern for the key and draws its pianoroll', async () => {
		render(GuideToneLines);
		await fireEvent.click(playButton());
		expect(strudelRuns).toEqual([guideTonePattern('C')]);
		expect(pianorollStarts).toBe(1);
		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
		expect(strudelStops).toBe(1);
		expect(pianorollStops).toBe(1);
	});

	it('picking a key stops what was playing and reseeds the pattern for that key', async () => {
		render(GuideToneLines);
		await fireEvent.click(playButton());
		await fireEvent.click(within(screen.getByTestId('guide-lines-key-row')).getByRole('button', { name: 'B♭' }));
		expect(strudelStops).toBe(1);
		expect(screen.getByTestId('guide-lines-symbols').textContent).toBe('Cm7 F7 B♭maj7');
		await fireEvent.click(playButton());
		expect(strudelRuns[1]).toBe(guideTonePattern('B♭'));
	});

	it('loads the editor only when asked, and plays the edited pattern', async () => {
		render(GuideToneLines);
		expect(screen.queryByTestId('guide-lines-editor')).toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: 'Edit the pattern' }));
		const input = await screen.findByTestId('guide-lines-input');
		const editorLines = () =>
			[...screen.getByTestId('guide-lines-editor').querySelectorAll('.cm-line')].map((line) => line.textContent).join('\n');
		expect(editorLines()).toBe(guideTonePattern('C'));
		// Delete the roots line, the edit the chapter asks for.
		const roots = [...input.querySelectorAll('.cm-line')].find((line) => line.textContent?.includes('.s("sine")'))!;
		roots.textContent = '';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 0));
		await fireEvent.click(playButton());
		expect(strudelRuns[0]).not.toContain('.s("sine")');
		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
		await fireEvent.click(playButton());
		expect(strudelRuns[1]).toBe(guideTonePattern('C'));
	});

	it('says so when the engine is unavailable, and shows a pattern error as it arrives', async () => {
		strudelResult = { ok: false, unavailable: true };
		render(GuideToneLines);
		await fireEvent.click(playButton());
		expect(screen.getByTestId('guide-lines-unavailable')).toBeInTheDocument();
		strudelErrorCallback?.('unknown sound');
		await Promise.resolve();
		expect((await screen.findByTestId('guide-lines-error')).textContent).toContain('unknown sound');
	});

	it('with sound off, Play is disabled and the page says why', () => {
		soundOn = false;
		render(GuideToneLines);
		expect(playButton()).toBeDisabled();
		expect(screen.getByTestId('guide-lines-sound-off')).toBeInTheDocument();
	});

	it('stops on unmount and writes nothing to storage', async () => {
		const { unmount } = render(GuideToneLines);
		await fireEvent.click(playButton());
		unmount();
		expect(strudelStops).toBe(1);
		expect(localStorage.length).toBe(0);
	});
});
