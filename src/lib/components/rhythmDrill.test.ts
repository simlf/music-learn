import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RhythmExercise } from '$lib/homework/data/rhythmData';
import { setLocale } from '$lib/i18n/locale.svelte';

vi.mock('$lib/audio/audio', () => ({
	playClick: vi.fn(),
	ensureAudioReady: vi.fn(async () => {}),
	soundEnabled: () => true
}));

const { default: RhythmDrill } = await import('./RhythmDrill.svelte');

/**
 * 120 BPM = 500 ms per beat. Exercise: one 2/4 bar of quarters then a half
 * (4 beats, 3 onsets at beats 0, 1 and 2). With a one-bar count-in (2 beats)
 * the first played beat is at t = 1000 ms after pressing Start.
 */
const exercise: RhythmExercise = {
	book: 'etude-du-rythme-1',
	page: 1,
	number: 1,
	hint: 'test',
	timeSignature: '2/4',
	measures: ['q q', 'h']
};

const COUNT_IN_MS = 1000;
let clicks: boolean[];

function setPrefs(bpm: number, countInBars: number) {
	localStorage.setItem('music-learn:homework-prefs', JSON.stringify({ bpm, countInBars }));
}

function mount(ex: RhythmExercise = exercise) {
	return render(RhythmDrill, { exercise: ex, deps: { click: (a: boolean) => clicks.push(a) } });
}

const tap = () => fireEvent.pointerDown(screen.getByTestId('rhythm-tap'));
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

/** Starts a run and moves the fake clock to the first played beat. */
async function startAndReachFirstBeat() {
	await fireEvent.click(screen.getByTestId('rhythm-start'));
	await advance(COUNT_IN_MS);
}

beforeEach(() => {
	vi.useFakeTimers();
	clicks = [];
	localStorage.clear();
	setPrefs(120, 1);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	setLocale('en');
});

describe('RhythmDrill: start and the metronome', () => {
	it('shows the written rhythm and the tap pad before anything starts', () => {
		mount();
		expect(screen.getByTestId('rhythm-notation')).toBeInTheDocument();
		expect(screen.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'idle');
		expect(screen.getByTestId('rhythm-tap')).toBeInTheDocument();
		expect(screen.getByTestId('metronome-bpm')).toHaveTextContent('120');
	});

	it('counts in a bar with an accent on the first click, then plays the exercise', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-start'));
		expect(screen.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'run');
		expect(screen.getByTestId('rhythm-countin')).toHaveTextContent('2');
		await advance(500);
		expect(screen.getByTestId('rhythm-countin')).toHaveTextContent('1');
		await advance(500);
		expect(screen.queryByTestId('rhythm-countin')).toBeNull();
		await advance(2000);
		// 2 count-in beats + 4 exercise beats, accents on each bar's downbeat.
		expect(clicks).toEqual([true, false, true, false, true, false]);
	});

	it('counts in two bars when asked', async () => {
		setPrefs(120, 2);
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-start'));
		await advance(1500);
		expect(clicks).toEqual([true, false, true, false]);
	});

	it('starts straight in with no count-in', async () => {
		setPrefs(120, 0);
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-start'));
		expect(screen.queryByTestId('rhythm-countin')).toBeNull();
		expect(clicks).toEqual([true]);
	});

	it('moves the playhead along the written beats', async () => {
		mount();
		await startAndReachFirstBeat();
		expect(screen.getByTestId('rhythm-playhead')).toBeInTheDocument();
		await advance(500);
		expect(screen.getByTestId('rhythm-playhead')).toBeInTheDocument();
	});

	it('locks the tempo during a scored run but not the click-only metronome', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-start'));
		expect(screen.getByRole('button', { name: 'Faster' })).toBeDisabled();
		await fireEvent.click(screen.getByTestId('rhythm-stop'));
		await fireEvent.click(screen.getByTestId('rhythm-click-only'));
		expect(screen.getByRole('button', { name: 'Faster' })).not.toBeDisabled();
	});

	it('remembers tempo and count-in between visits', async () => {
		mount();
		await fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
		await fireEvent.click(screen.getByRole('button', { name: '2 bars' }));
		await Promise.resolve();
		expect(JSON.parse(localStorage.getItem('music-learn:homework-prefs')!)).toEqual({
			bpm: 125,
			countInBars: 2
		});
	});
});

describe('RhythmDrill: click only', () => {
	it('runs an endless click with beat dots, accented per bar', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-click-only'));
		expect(screen.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'practice');
		await advance(2000);
		expect(clicks.length).toBe(5);
		expect(clicks.slice(0, 4)).toEqual([true, false, true, false]);
		expect(screen.getByTestId('beat-dots').children).toHaveLength(2);
	});

	it('changes tempo live without stopping', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-click-only'));
		await advance(1000); // beats at 0, 500, 1000: three clicks
		const before = clicks.length;
		await fireEvent.click(screen.getByRole('button', { name: '60' })); // 60 BPM: 1000 ms beats
		await advance(2000);
		expect(clicks.length - before).toBe(2);
	});

	it('stops on demand and clicks no more', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-click-only'));
		await advance(600);
		await fireEvent.click(screen.getByTestId('rhythm-stop'));
		const n = clicks.length;
		await advance(5000);
		expect(clicks.length).toBe(n);
		expect(screen.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'idle');
	});

	it('never scores', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-click-only'));
		await tap();
		await advance(5000);
		expect(screen.queryByTestId('rhythm-result')).toBeNull();
	});
});

describe('RhythmDrill: scoring taps', () => {
	/** Taps on the three written onsets (beats 0, 1, 2); null skips that onset. */
	async function playTaps(taps: (true | null)[]) {
		await startAndReachFirstBeat(); // at beat 0
		for (let i = 0; i < 3; i++) {
			if (taps[i]) await tap();
			if (i < 2) await advance(500);
		}
		await advance(3000);
	}

	it('gives 100% for taps right on the written notes', async () => {
		mount();
		await playTaps([true, true, true]);
		expect(screen.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'scored');
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('100%');
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('Passed');
		expect(screen.getByTestId('rhythm-perfect')).toHaveTextContent('Spot on: 3');
		expect(screen.getByTestId('rhythm-missed')).toHaveTextContent('Missed: 0');
		expect(screen.getByTestId('rhythm-extra')).toHaveTextContent('Extra taps: 0');
	});

	it('colours each written note by how it went', async () => {
		mount();
		await playTaps([true, true, true]);
		for (let i = 0; i < 3; i++) {
			expect(screen.getByTestId(`rhythm-note-${i}`)).toHaveAttribute('data-state', 'perfect');
		}
	});

	it('counts a missing tap as missed and shows it on the note', async () => {
		mount();
		await playTaps([true, null, true]);
		expect(screen.getByTestId('rhythm-missed')).toHaveTextContent('Missed: 1');
		expect(screen.getByTestId('rhythm-note-1')).toHaveAttribute('data-state', 'missed');
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('67%');
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('Not yet');
	});

	it('counts extra taps against the score', async () => {
		mount();
		await startAndReachFirstBeat();
		await tap();
		await advance(250);
		await tap(); // between onsets: extra
		await advance(250);
		await tap();
		await advance(500);
		await tap();
		await advance(3000);
		expect(screen.getByTestId('rhythm-extra')).toHaveTextContent('Extra taps: 1');
	});

	it('ignores taps made during the count-in', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-start'));
		await advance(200);
		await tap();
		await advance(300);
		await tap();
		await advance(500); // t = 1000: first played beat
		await tap();
		await advance(500);
		await tap();
		await advance(500);
		await tap();
		await advance(3000);
		expect(screen.getByTestId('rhythm-extra')).toHaveTextContent('Extra taps: 0');
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('100%');
	});

	it('reports a dragging tendency for consistently late taps', async () => {
		mount();
		await startAndReachFirstBeat();
		for (let i = 0; i < 3; i++) {
			await advance(70);
			await tap();
			await advance(430);
		}
		await advance(3000);
		expect(screen.getByTestId('rhythm-tendency')).toHaveAttribute('data-tendency', 'dragging');
		expect(screen.getByTestId('rhythm-tendency')).toHaveTextContent('70 ms late');
	});

	it('reports a rushing tendency for consistently early taps', async () => {
		mount();
		await startAndReachFirstBeat();
		await tap(); // first note on time, to keep the grid
		await advance(430);
		await tap(); // 70 early
		await advance(500);
		await tap(); // 70 early (t = 1930 vs 2000 written)
		await advance(3000);
		expect(screen.getByTestId('rhythm-tendency')).toHaveAttribute('data-tendency', 'rushing');
		expect(screen.getByTestId('rhythm-tendency')).toHaveTextContent('early');
	});

	it('states the tolerance used', async () => {
		mount();
		await playTaps([true, true, true]);
		expect(screen.getByTestId('rhythm-window')).toHaveTextContent('within 125 ms');
	});

	it('records the attempt and shows the best and the count', async () => {
		mount();
		await playTaps([true, true, true]);
		expect(screen.getByTestId('rhythm-record')).toHaveTextContent('Best 100%, attempts: 1');
		const log = JSON.parse(localStorage.getItem('music-learn:homework-log')!);
		expect(log['rhythm:1:1']).toMatchObject({ attempts: 1, best: 100 });
	});

	it('offers a slower tempo after a failed run and applies it', async () => {
		mount();
		await playTaps([null, null, null]);
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('0%');
		await fireEvent.click(screen.getByTestId('rhythm-slower'));
		expect(screen.getByTestId('metronome-bpm')).toHaveTextContent('110');
	});

	it('offers no slower tempo after a pass', async () => {
		mount();
		await playTaps([true, true, true]);
		expect(screen.queryByTestId('rhythm-slower')).toBeNull();
	});

	it('plays again from the result with a fresh score', async () => {
		mount();
		await playTaps([true, true, true]);
		await fireEvent.click(screen.getByTestId('rhythm-start'));
		expect(screen.queryByTestId('rhythm-result')).toBeNull();
		expect(screen.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'run');
	});

	it('does not score an aborted run', async () => {
		mount();
		await startAndReachFirstBeat();
		await tap();
		await fireEvent.click(screen.getByTestId('rhythm-stop'));
		await advance(5000);
		expect(screen.queryByTestId('rhythm-result')).toBeNull();
		expect(localStorage.getItem('music-learn:homework-log')).toBeNull();
	});

	it('does not count a tied-on note as a tap to make', async () => {
		mount({ ...exercise, measures: ['q q~', 'q q'] });
		await startAndReachFirstBeat();
		await tap(); // beat 0
		await advance(500);
		await tap(); // beat 1 (tied into beat 2: nothing to tap there)
		await advance(1000);
		await tap(); // beat 3
		await advance(3000);
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('100%');
		expect(screen.getByTestId('rhythm-note-2')).toHaveAttribute('data-state', 'held');
	});
});

describe('RhythmDrill: the Space bar', () => {
	it('taps like the pad and does not scroll the page', async () => {
		mount();
		await startAndReachFirstBeat();
		const ev = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true, bubbles: true });
		window.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(true);
		await advance(500);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
		await advance(500);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
		await advance(3000);
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('100%');
	});

	it('ignores held-down repeats and modified space', async () => {
		mount();
		await startAndReachFirstBeat();
		window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', repeat: true, bubbles: true }));
		window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', ctrlKey: true, bubbles: true }));
		await advance(5000);
		expect(screen.getByTestId('rhythm-extra')).toHaveTextContent('Extra taps: 0');
	});

	it('leaves the space key alone inside a text field', () => {
		mount();
		const input = document.createElement('input');
		document.body.appendChild(input);
		const ev = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true, bubbles: true });
		input.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(false);
		input.remove();
	});

	it('taps from the focused tap pad itself', async () => {
		mount();
		await startAndReachFirstBeat();
		const pad = screen.getByTestId('rhythm-tap');
		pad.focus();
		const ev = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true, bubbles: true });
		pad.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(true);
		await advance(500);
		pad.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
		await advance(500);
		pad.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
		await advance(3000);
		expect(screen.getByTestId('rhythm-score')).toHaveTextContent('100%');
	});

	it('leaves the space key to a focused button and records no tap', async () => {
		mount();
		await startAndReachFirstBeat();
		const btn = document.createElement('button');
		document.body.appendChild(btn);
		const ev = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true, bubbles: true });
		btn.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(false);
		await advance(5000);
		expect(screen.getByTestId('rhythm-extra')).toHaveTextContent('Extra taps: 0');
		btn.remove();
	});
});

describe('RhythmDrill: cleanup and language', () => {
	it('stops its metronome when it unmounts', async () => {
		mount();
		await fireEvent.click(screen.getByTestId('rhythm-click-only'));
		await advance(600);
		cleanup();
		const n = clicks.length;
		await advance(5000);
		expect(clicks.length).toBe(n);
	});

	it('speaks French', async () => {
		setLocale('fr');
		mount();
		expect(screen.getByTestId('rhythm-start')).toHaveTextContent('Jouer avec le clic');
	});
});
