/**
 * A drift-free metronome scheduler with an injectable clock, so the whole
 * timing contract is unit-tested with fake time and no audio.
 *
 * Beats sit on an IDEAL grid (`startMs + n * beatMs`). Each tick is a timer
 * aimed at the next grid point, and the beat handed to `onBeat` carries its
 * IDEAL time, not the time the timer happened to fire. Timer jitter therefore
 * never accumulates and never leaks into a score: the rhythm drill compares
 * taps against this same grid. Only the audible click can be a few ms late,
 * which no tap scoring depends on.
 *
 * Sound is not this module's business: `click` is injected (the app wires it
 * to the single audio engine's `playClick`).
 */

export interface Beat {
	accent: boolean;
}

export interface MetronomeBeatEvent {
	/** 0-based beat number since start, count-in included. */
	index: number;
	accent: boolean;
	/** The ideal time of this beat on the clock's timeline (ms). */
	timeMs: number;
	/** True while the beat belongs to the count-in. */
	countIn: boolean;
	/** Beat number within the played part (0 for the first played beat). -1 during the count-in. */
	playIndex: number;
}

export interface MetronomeDeps {
	now: () => number;
	setTimer: (fn: () => void, ms: number) => unknown;
	clearTimer: (handle: unknown) => void;
	click: (accent: boolean) => void;
	onBeat?: (event: MetronomeBeatEvent) => void;
	/** Fires once when a finite plan has played its last beat plus its tail. */
	onEnd?: () => void;
}

export interface StartOptions {
	bpm: number;
	/**
	 * Finite plan: the beats of the played part. Omit for an endless
	 * metronome that loops `beatsPerBar` beats (accent on the first).
	 */
	beats?: Beat[];
	/** Endless mode only. Default 4. */
	beatsPerBar?: number;
	/** Count-in clicks before the first played beat. */
	countInBeats?: number;
	/** Count-in accent pattern: the beat count per bar of the count-in, so the first is accented. Default = countInBeats. */
	countInBarBeats?: number;
	/** Finite plan: ms to wait after the last beat before `onEnd`, so late taps still land. Default half a beat. */
	tailMs?: number;
}

export interface Metronome {
	start: (options: StartOptions) => void;
	stop: () => void;
	/** Endless mode only: changes tempo from the next beat on, keeping the grid continuous. */
	setBpm: (bpm: number) => void;
	isRunning: () => boolean;
	/** Ideal time of the first PLAYED beat, once started (null before). */
	playStartMs: () => number | null;
}

export function createMetronome(deps: MetronomeDeps): Metronome {
	let running = false;
	let timer: unknown = null;
	let token = 0;

	let anchorMs = 0;
	let anchorIndex = 0;
	let beatMs = 0;
	let nextIndex = 0;
	let options: StartOptions | null = null;
	let countIn = 0;
	let playStart: number | null = null;

	function timeOf(index: number): number {
		return anchorMs + (index - anchorIndex) * beatMs;
	}

	function planBeat(index: number): { accent: boolean; countIn: boolean; playIndex: number } | null {
		const o = options as StartOptions;
		if (index < countIn) {
			const bar = o.countInBarBeats ?? countIn;
			return { accent: index % bar === 0, countIn: true, playIndex: -1 };
		}
		const playIndex = index - countIn;
		if (o.beats) {
			const beat = o.beats[playIndex];
			return beat ? { accent: beat.accent, countIn: false, playIndex } : null;
		}
		const bar = o.beatsPerBar ?? 4;
		return { accent: playIndex % bar === 0, countIn: false, playIndex };
	}

	function finish(myToken: number): void {
		if (myToken !== token) return;
		running = false;
		timer = null;
		deps.onEnd?.();
	}

	function tick(myToken: number): void {
		if (myToken !== token || !running) return;
		const planned = planBeat(nextIndex);
		if (!planned) {
			// Past the last beat of a finite plan: wait out the tail, then end.
			return finish(myToken);
		}
		const event: MetronomeBeatEvent = {
			index: nextIndex,
			accent: planned.accent,
			timeMs: timeOf(nextIndex),
			countIn: planned.countIn,
			playIndex: planned.playIndex
		};
		deps.click(planned.accent);
		deps.onBeat?.(event);
		if (myToken !== token || !running) return;
		nextIndex += 1;
		scheduleNext(myToken);
	}

	function scheduleNext(myToken: number): void {
		const o = options as StartOptions;
		const planned = planBeat(nextIndex);
		if (!planned) {
			// Finite plan done: end after the tail, measured from where the next beat would have been.
			const tail = o.tailMs ?? beatMs / 2;
			const wait = Math.max(0, timeOf(nextIndex) + tail - deps.now());
			timer = deps.setTimer(() => finish(myToken), wait);
			return;
		}
		const wait = Math.max(0, timeOf(nextIndex) - deps.now());
		timer = deps.setTimer(() => tick(myToken), wait);
	}

	function stop(): void {
		token += 1;
		running = false;
		if (timer !== null) deps.clearTimer(timer);
		timer = null;
	}

	return {
		start(opts) {
			stop();
			const bpm = opts.bpm;
			if (!Number.isFinite(bpm) || bpm <= 0) return;
			options = opts;
			beatMs = 60000 / bpm;
			countIn = Math.max(0, Math.floor(opts.countInBeats ?? 0));
			running = true;
			token += 1;
			anchorMs = deps.now();
			anchorIndex = 0;
			nextIndex = 0;
			playStart = anchorMs + countIn * beatMs;
			tick(token);
		},
		stop,
		setBpm(bpm) {
			if (!running || !options || options.beats || nextIndex === 0) return;
			if (!Number.isFinite(bpm) || bpm <= 0) return;
			// Re-anchor at the beat just played so the grid stays continuous, then
			// re-aim the pending timer: the new tempo applies from the NEXT beat.
			const last = nextIndex - 1;
			anchorMs = timeOf(last);
			anchorIndex = last;
			beatMs = 60000 / bpm;
			if (timer !== null) deps.clearTimer(timer);
			scheduleNext(token);
		},
		isRunning: () => running,
		playStartMs: () => playStart
	};
}
