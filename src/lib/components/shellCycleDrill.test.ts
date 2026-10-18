import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShellCycleDrill from './ShellCycleDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { spellChord } from '$lib/theory/chord';
import { chromaOf } from '$lib/theory/interval';
import {
	SHELL_CYCLE_KEYS,
	positionForBar,
	shellCycleBars,
	voiceRootedShell,
	type ShellForm
} from '$lib/practice/shellCycle';

/**
 * Component tests for chapter 15's key-cycle exercise. Mocks the audio
 * engine (the embedded keyboard sounds its own key taps) and drives the real
 * PianoKeyboard: pointerdown records the pressed octave, click toggles the
 * key, exactly the order the keyboard itself uses.
 */

vi.mock('$lib/audio/audio', () => ({
	playNote: vi.fn(),
	playChord: vi.fn(),
	ensureAudioReady: vi.fn()
}));

/** Every key of the board whose accessible name resolves to `chroma`, left to right. */
function keysForChroma(chroma: number): HTMLElement[] {
	return screen
		.getAllByRole('button', { name: / key(, selected)?$/ })
		.filter((key) => chromaOf((key.getAttribute('aria-label') ?? '').replace(/ key(, selected)?$/, '')) === chroma);
}

/** Presses the key for `letter` in board octave `octave` (4 = the lower octave). */
function press(letter: string, octave: number): void {
	const key = keysForChroma(chromaOf(letter)!)[octave - 4];
	if (!key) throw new Error(`no ${letter} key in octave ${octave}`);
	fireEvent.pointerDown(key);
	fireEvent.click(key);
}

async function check(): Promise<void> {
	await fireEvent.click(screen.getByTestId('shell-cycle-check'));
}

/** Plays the current chord the way Show me voices it, then checks. */
async function playChord(form: ShellForm, key: string, barIndex: number): Promise<void> {
	const bar = shellCycleBars(form, key)[barIndex];
	for (const note of voiceRootedShell(spellChord(bar.symbol), positionForBar(barIndex)).notes) {
		press(note.letter, note.octave);
	}
	await check();
}

const feedback = () => screen.getByTestId('shell-cycle-feedback');

beforeEach(() => {
	setLocale('en');
});

afterEach(() => {
	cleanup();
});

describe('ShellCycleDrill', () => {
	it('starts on the C major ii with the rooted-shell prompt', () => {
		render(ShellCycleDrill);
		expect(screen.getByTestId('shell-cycle-chord').textContent).toContain('D');
		expect(screen.getByTestId('shell-cycle-prompt').textContent).toBe(
			'Root at the bottom, then the 3rd and the 7th.'
		);
		const chips = [...screen.getByTestId('shell-cycle-key-row').querySelectorAll('button')];
		expect(chips.map((chip) => chip.textContent?.trim())).toEqual([...SHELL_CYCLE_KEYS.major]);
		expect(chips[0].getAttribute('aria-pressed')).toBe('true');
		expect(screen.queryByTestId('shell-cycle-motion')).toBeNull();
	});

	it('accepts either order above the root and moves to the V with its guide-tone move named', async () => {
		render(ShellCycleDrill);
		press('D', 4);
		press('C', 5);
		press('F', 5);
		await check();
		expect(feedback().textContent).toContain('Right: Dm7.');
		expect(screen.getByTestId('shell-cycle-motion').textContent).toBe('Keep F. Move C down to B.');
	});

	it('names the missing and the extra notes, and greys the extra in place', async () => {
		render(ShellCycleDrill);
		press('D', 4);
		press('F', 4);
		press('E', 4);
		await check();
		expect(feedback().dataset.kind).toBe('notes');
		expect(feedback().textContent).toContain('Missing: C.');
		expect(feedback().textContent).toContain('Not in this shell: E.');
		// Still on the ii: a wrong check never advances.
		expect(screen.getByTestId('shell-cycle-prompt')).toBeTruthy();
		expect(screen.queryByTestId('shell-cycle-motion')).toBeNull();
	});

	it('right notes over the wrong bass asks for the root at the bottom', async () => {
		render(ShellCycleDrill);
		press('F', 4);
		press('C', 5);
		press('D', 5);
		await check();
		expect(feedback().dataset.kind).toBe('bass');
		expect(feedback().textContent).toBe('Right notes. Now put the root, D, at the bottom.');
	});

	it('Show me ghosts the voicing with the root marked as the bass', async () => {
		const { container } = render(ShellCycleDrill);
		await fireEvent.click(screen.getByTestId('shell-cycle-show'));
		expect(feedback().textContent).toBe('Shown with the 3rd under 7th. Play it, then Check.');
		const ghosts = [...container.querySelectorAll('[data-ghost]')].map((el) => el.getAttribute('data-ghost'));
		expect(ghosts.filter(Boolean).sort()).toEqual(['3', '7', 'R']);
		expect(container.querySelector('[data-bass]:not([data-bass=""])')).toBeTruthy();
	});

	it('a key with a Show me is done but not clean', async () => {
		render(ShellCycleDrill);
		await fireEvent.click(screen.getByTestId('shell-cycle-show'));
		for (let bar = 0; bar < 3; bar++) await playChord('major', 'C', bar);
		expect(feedback().textContent).toBe('C done. Next key: F.');
		const chip = screen.getByRole('button', { name: 'C' });
		expect(chip.dataset.clean).toBe('false');
	});

	it('a clean run of all 12 keys reports the form once and ends on the clean line', async () => {
		const onClean = vi.fn();
		render(ShellCycleDrill, { onClean });
		for (const key of SHELL_CYCLE_KEYS.major) {
			for (let bar = 0; bar < 3; bar++) await playChord('major', key, bar);
		}
		expect(onClean).toHaveBeenCalledTimes(1);
		expect(onClean).toHaveBeenCalledWith('major');
		expect(screen.getByTestId('shell-cycle-done').textContent).toContain('All 12 keys, every one clean.');
	});

	it('lists the keys still to play clean, and a key chip reruns just that key', async () => {
		const onClean = vi.fn();
		render(ShellCycleDrill, { onClean });
		for (const key of SHELL_CYCLE_KEYS.major) {
			if (key === 'E') {
				press('C', 4);
				await check();
				// A wrong play stays on the keys so it can be fixed; start over instead.
				await fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
			}
			for (let bar = 0; bar < 3; bar++) await playChord('major', key, bar);
		}
		expect(onClean).not.toHaveBeenCalled();
		expect(screen.getByTestId('shell-cycle-done').textContent).toContain('Still to play clean');
		expect(screen.getByTestId('shell-cycle-done').textContent).toContain(': E.');

		await fireEvent.click(screen.getByRole('button', { name: 'E' }));
		for (let bar = 0; bar < 3; bar++) await playChord('major', 'E', bar);
		expect(onClean).toHaveBeenCalledWith('major');
	});

	it('the minor form asks for the ♭5 on the iiø and starts on C minor', async () => {
		render(ShellCycleDrill);
		await fireEvent.click(screen.getByRole('button', { name: 'iiø V i' }));
		expect(screen.getByTestId('shell-cycle-prompt').textContent).toBe(
			'Root at the bottom, then the 3rd, the ♭5 and the 7th.'
		);
		// Without the ♭5 the shell is not accepted.
		press('D', 4);
		press('F', 4);
		press('C', 5);
		await check();
		expect(feedback().textContent).toContain('Missing: A♭.');
		await fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
		await playChord('minor', 'C', 0);
		expect(feedback().textContent).toContain('Right: Dm7b5.');
		expect(screen.getByTestId('shell-cycle-bars').textContent).toContain('G7');
	});
});
