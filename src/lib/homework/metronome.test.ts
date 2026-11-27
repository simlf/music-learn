import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMetronome, type MetronomeBeatEvent } from './metronome';

/** Fake clock: time only moves when the test advances it, firing due timers in order. */
function makeClock() {
	let t = 1000;
	let nextId = 1;
	const timers = new Map<number, { at: number; fn: () => void }>();
	return {
		now: () => t,
		setTimer: (fn: () => void, ms: number) => {
			const id = nextId++;
			timers.set(id, { at: t + ms, fn });
			return id;
		},
		clearTimer: (h: unknown) => void timers.delete(h as number),
		advance(ms: number) {
			const end = t + ms;
			for (;;) {
				const due = [...timers.entries()]
					.filter(([, v]) => v.at <= end)
					.sort((a, b) => a[1].at - b[1].at)[0];
				if (!due) break;
				timers.delete(due[0]);
				t = Math.max(t, due[1].at);
				due[1].fn();
			}
			t = end;
		},
		pending: () => timers.size
	};
}

describe('createMetronome', () => {
	let clock: ReturnType<typeof makeClock>;
	let beats: MetronomeBeatEvent[];
	let clicks: boolean[];
	let ended: number;

	function build() {
		return createMetronome({
			now: clock.now,
			setTimer: clock.setTimer,
			clearTimer: clock.clearTimer,
			click: (a) => clicks.push(a),
			onBeat: (e) => beats.push(e),
			onEnd: () => (ended += 1)
		});
	}

	beforeEach(() => {
		clock = makeClock();
		beats = [];
		clicks = [];
		ended = 0;
	});

	it('clicks immediately on start, then once per beat on the ideal grid', () => {
		const m = build();
		m.start({ bpm: 120, beatsPerBar: 4 });
		expect(beats.map((b) => b.timeMs)).toEqual([1000]);
		clock.advance(500);
		clock.advance(500);
		expect(beats.map((b) => b.timeMs)).toEqual([1000, 1500, 2000]);
		m.stop();
	});

	it('accents the first beat of every bar', () => {
		const m = build();
		m.start({ bpm: 120, beatsPerBar: 3 });
		clock.advance(2500);
		expect(clicks).toEqual([true, false, false, true, false, false]);
		m.stop();
	});

	it('stays on the grid even when timers fire late', () => {
		const m = build();
		m.start({ bpm: 60 });
		// Skip ahead 3.4 s in one jump: late timers must still report ideal times.
		clock.advance(3400);
		expect(beats.map((b) => b.timeMs)).toEqual([1000, 2000, 3000, 4000].slice(0, beats.length));
		expect(beats.map((b) => b.index)).toEqual([0, 1, 2, 3].slice(0, beats.length));
		m.stop();
	});

	it('stops cleanly: no more clicks and no pending timer', () => {
		const m = build();
		m.start({ bpm: 120 });
		clock.advance(600);
		m.stop();
		const n = clicks.length;
		clock.advance(5000);
		expect(clicks.length).toBe(n);
		expect(clock.pending()).toBe(0);
		expect(m.isRunning()).toBe(false);
	});

	it('restarting replaces the old run instead of doubling it', () => {
		const m = build();
		m.start({ bpm: 120 });
		m.start({ bpm: 120 });
		clock.advance(1000);
		// Two starts = two immediate clicks, then ONE stream of beats: 2 more in 1 s.
		expect(clicks.length).toBe(2 + 2);
		m.stop();
	});

	it('plays a count-in before the played beats and tags them', () => {
		const m = build();
		m.start({
			bpm: 120,
			beats: [{ accent: true }, { accent: false }],
			countInBeats: 2
		});
		clock.advance(3000);
		expect(beats.map((b) => [b.index, b.countIn, b.playIndex])).toEqual([
			[0, true, -1],
			[1, true, -1],
			[2, false, 0],
			[3, false, 1]
		]);
		expect(clicks).toEqual([true, false, true, false]);
	});

	it('reports the ideal time of the first played beat', () => {
		const m = build();
		m.start({ bpm: 120, beats: [{ accent: true }], countInBeats: 4 });
		expect(m.playStartMs()).toBe(1000 + 4 * 500);
		m.stop();
	});

	it('accents the count-in by bar length', () => {
		const m = build();
		m.start({ bpm: 120, beats: [{ accent: true }], countInBeats: 6, countInBarBeats: 3 });
		clock.advance(3000);
		expect(clicks.slice(0, 6)).toEqual([true, false, false, true, false, false]);
	});

	it('ends a finite plan once, after the last beat plus the tail', () => {
		const m = build();
		m.start({ bpm: 60, beats: [{ accent: true }, { accent: false }], tailMs: 300 });
		clock.advance(2200);
		expect(ended).toBe(0);
		clock.advance(200);
		expect(ended).toBe(1);
		clock.advance(10000);
		expect(ended).toBe(1);
		expect(m.isRunning()).toBe(false);
	});

	it('ends on time when the plan is empty and there is no count-in', () => {
		const m = build();
		m.start({ bpm: 60, beats: [] });
		expect(ended).toBe(1);
	});

	it('does not end an aborted plan', () => {
		const m = build();
		m.start({ bpm: 60, beats: [{ accent: true }, { accent: false }] });
		clock.advance(500);
		m.stop();
		clock.advance(10000);
		expect(ended).toBe(0);
	});

	it('changes tempo mid-run without a gap or a jump', () => {
		const m = build();
		m.start({ bpm: 60 });
		clock.advance(1000); // beat 1 at 2000
		m.setBpm(120);
		clock.advance(1500);
		expect(beats.map((b) => b.timeMs)).toEqual([1000, 2000, 2500, 3000, 3500].slice(0, beats.length));
		m.stop();
	});

	it('ignores setBpm for a finite plan and for junk tempi', () => {
		const m = build();
		m.start({ bpm: 60, beats: [{ accent: true }, { accent: false }, { accent: false }] });
		m.setBpm(240);
		clock.advance(1000);
		expect(beats.map((b) => b.timeMs)).toEqual([1000, 2000]);
		m.stop();
		m.start({ bpm: 60 });
		m.setBpm(Number.NaN);
		m.setBpm(-5);
		clock.advance(1000);
		expect(beats.map((b) => b.timeMs).slice(-2)).toEqual([clock.now() - 1000, clock.now()]);
		m.stop();
	});

	it('refuses to start at a nonsense tempo', () => {
		const m = build();
		m.start({ bpm: 0 });
		m.start({ bpm: Number.NaN });
		expect(m.isRunning()).toBe(false);
		expect(clicks).toEqual([]);
	});
});

describe('with the real timer', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('ticks through setTimeout and performance.now', () => {
		let count = 0;
		const m = createMetronome({
			now: () => performance.now(),
			setTimer: (fn, ms) => setTimeout(fn, ms),
			clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
			click: () => (count += 1)
		});
		m.start({ bpm: 120 });
		vi.advanceTimersByTime(1000);
		expect(count).toBe(3);
		m.stop();
	});
});
