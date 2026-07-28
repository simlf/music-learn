import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The comping loop's Transport scheduling and, above all, its TEARDOWN.
 *
 * A play-along loop that keeps playing after you leave the page is the one bug
 * that would make this feature unusable, so the stop paths are tested harder
 * than the start path: explicit stop, sound toggled off, a second loop
 * superseding the first, and the nasty one, a start whose samples finish
 * loading AFTER the page was left.
 *
 * Tested entirely against a mocked 'tone' module (same convention as
 * audio.test.ts): no AudioContext, no Transport, no Draw, ever. The fake
 * sampler deliberately does NOT auto-fire onload, so each test controls
 * exactly when sample loading resolves.
 */

interface FakeInstrument {
	triggerAttackRelease: ReturnType<typeof vi.fn>;
	triggerAttack: ReturnType<typeof vi.fn>;
	triggerRelease: ReturnType<typeof vi.fn>;
	releaseAll: ReturnType<typeof vi.fn>;
	toDestination: () => FakeInstrument;
}

const mockTone = vi.hoisted(() => {
	const transport = {
		bpm: { value: 120 },
		timeSignature: 4 as number | number[],
		position: 'nowhere' as unknown,
		start: vi.fn(),
		stop: vi.fn(),
		cancel: vi.fn(),
		clear: vi.fn(),
		scheduleRepeat: vi.fn(),
		repeats: [] as { id: number; callback: (time: number) => void; interval: unknown }[],
		nextId: 1
	};
	const draw = {
		schedule: vi.fn(),
		cancel: vi.fn(),
		queued: [] as { callback: () => void; time: number }[]
	};
	return {
		start: vi.fn(async () => {}),
		context: { lookAhead: 0.1 },
		transport,
		draw,
		synths: [] as FakeInstrument[],
		samplers: [] as (FakeInstrument & { options: { onload: () => void } })[]
	};
});

vi.mock('tone', () => {
	function makeInstrument(): FakeInstrument {
		const instrument: FakeInstrument = {
			triggerAttackRelease: vi.fn(),
			triggerAttack: vi.fn(),
			triggerRelease: vi.fn(),
			releaseAll: vi.fn(),
			toDestination: () => instrument
		};
		return instrument;
	}
	class PolySynth {
		constructor() {
			const instrument = makeInstrument();
			mockTone.synths.push(instrument);
			return instrument as unknown as PolySynth;
		}
	}
	class Sampler {
		constructor(options: { onload: () => void }) {
			const instrument = Object.assign(makeInstrument(), { options });
			mockTone.samplers.push(instrument);
			return instrument as unknown as Sampler;
		}
	}
	mockTone.transport.scheduleRepeat.mockImplementation(
		(callback: (time: number) => void, interval: unknown) => {
			const id = mockTone.transport.nextId++;
			mockTone.transport.repeats.push({ id, callback, interval });
			return id;
		}
	);
	mockTone.draw.schedule.mockImplementation((callback: () => void, time: number) => {
		mockTone.draw.queued.push({ callback, time });
	});
	return {
		start: () => mockTone.start(),
		getContext: () => mockTone.context,
		getTransport: () => mockTone.transport,
		getDraw: () => mockTone.draw,
		PolySynth,
		Synth: class {},
		Sampler
	};
});

import {
	_resetForTests,
	compLoopRunning,
	setSoundEnabled,
	startCompLoop,
	stopCompLoop
} from './audio';
import { BEATS_PER_BAR, barDurationSec } from './loopTiming';

const BARS = [
	{ pitches: ['D3', 'F4', 'C5'] },
	{ pitches: ['G3', 'B4', 'F5'] },
	{ pitches: ['C3', 'E4', 'B4'] }
];

/** Resolves the sampler's onload so any awaited startCompLoop can proceed. */
function loadSamples(): void {
	for (const sampler of mockTone.samplers) sampler.options.onload();
}

/** Lets pending promise chains settle. */
function flush(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function sampler(index = 0): FakeInstrument {
	return mockTone.samplers[index];
}

/** Starts a loop, resolving the sample load the moment loading begins. */
async function start(
	opts: Partial<Parameters<typeof startCompLoop>[0]> = {}
): Promise<Awaited<ReturnType<typeof startCompLoop>>> {
	const promise = startCompLoop({ bars: BARS, bpm: 70, ...opts });
	await flush();
	loadSamples();
	return promise;
}

/** Fires the Transport's repeat callback `times` times, as the audio clock would. */
function tick(times = 1): void {
	for (let i = 0; i < times; i++) {
		for (const repeat of mockTone.transport.repeats) repeat.callback(i * 2);
	}
}

/** Runs whatever the loop handed to Tone's Draw, as the animation frame would. */
function drawFrame(): void {
	const queued = [...mockTone.draw.queued];
	mockTone.draw.queued.length = 0;
	for (const entry of queued) entry.callback();
}

beforeEach(() => {
	localStorage.clear();
	mockTone.start.mockClear();
	mockTone.context.lookAhead = 0.1;
	mockTone.synths.length = 0;
	mockTone.samplers.length = 0;
	mockTone.transport.start.mockClear();
	mockTone.transport.stop.mockClear();
	mockTone.transport.cancel.mockClear();
	mockTone.transport.clear.mockClear();
	mockTone.transport.scheduleRepeat.mockClear();
	mockTone.transport.repeats.length = 0;
	mockTone.transport.nextId = 1;
	mockTone.transport.bpm.value = 120;
	mockTone.transport.position = 'nowhere';
	mockTone.draw.schedule.mockClear();
	mockTone.draw.cancel.mockClear();
	mockTone.draw.queued.length = 0;
	_resetForTests();
});

afterEach(() => {
	stopCompLoop();
});

describe('startCompLoop: refusals', () => {
	it('starts nothing at all when sound is off', async () => {
		setSoundEnabled(false);

		const handle = await startCompLoop({ bars: BARS, bpm: 70 });

		expect(handle).toBeNull();
		expect(compLoopRunning()).toBe(false);
		expect(mockTone.transport.start).not.toHaveBeenCalled();
		// Nothing was loaded either: the sound-off contract is "no audio stack".
		expect(mockTone.samplers).toHaveLength(0);
		expect(mockTone.synths).toHaveLength(0);
	});

	it('refuses an empty form rather than starting a silent transport', async () => {
		const handle = await startCompLoop({ bars: [], bpm: 70 });

		expect(handle).toBeNull();
		expect(compLoopRunning()).toBe(false);
		expect(mockTone.transport.start).not.toHaveBeenCalled();
	});
});

describe('startCompLoop: Transport scheduling', () => {
	it('schedules one repeat per measure and starts the Transport from the top', async () => {
		const handle = await start();

		expect(handle).not.toBeNull();
		expect(handle?.isRunning()).toBe(true);
		expect(compLoopRunning()).toBe(true);
		expect(mockTone.transport.scheduleRepeat).toHaveBeenCalledTimes(1);
		expect(mockTone.transport.scheduleRepeat.mock.calls[0][1]).toBe('1m');
		expect(mockTone.transport.timeSignature).toBe(BEATS_PER_BAR);
		expect(mockTone.transport.bpm.value).toBe(70);
		expect(mockTone.transport.position).toBe(0);
		expect(mockTone.transport.start).toHaveBeenCalledTimes(1);
	});

	it('uses the Transport rather than a timer: no repeat callback means no sound', async () => {
		await start();

		expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();

		tick();
		expect(sampler().triggerAttackRelease).toHaveBeenCalledTimes(1);
	});

	it('strikes each bar as a block chord, held just under the bar length', async () => {
		await start();
		tick();

		const [pitches, duration, time, velocity] = sampler().triggerAttackRelease.mock.calls[0];
		expect(pitches).toEqual(['D3', 'F4', 'C5']);
		expect(duration).toBeLessThan(barDurationSec(70));
		expect(duration).toBeGreaterThan(barDurationSec(70) * 0.75);
		expect(time).toBe(0);
		// The comp sits under the player rather than competing with them.
		expect(velocity).toBeLessThan(0.85);
	});

	it('advances through the form and wraps back to bar 1', async () => {
		await start();
		tick(5);

		expect(
			sampler().triggerAttackRelease.mock.calls.map((call) => call[0])
		).toEqual([
			['D3', 'F4', 'C5'],
			['G3', 'B4', 'F5'],
			['C3', 'E4', 'B4'],
			['D3', 'F4', 'C5'],
			['G3', 'B4', 'F5']
		]);
	});

	it('reports the sounding bar through Tone Draw, so the symbol changes with the chord', async () => {
		const seen: number[] = [];
		await start({ onBar: (index) => seen.push(index) });

		tick(4);
		// Scheduling ran ahead of the sound: nothing is reported until the draw frame.
		expect(seen).toEqual([]);

		drawFrame();
		expect(seen).toEqual([0, 1, 2, 0]);
	});

	it('rolls the bar one note at a time in study mode, each note later than the last', async () => {
		await start({ roll: true });
		tick();

		const calls = sampler().triggerAttackRelease.mock.calls;
		expect(calls.map((call) => call[0])).toEqual(['D3', 'F4', 'C5']);
		expect(calls[1][2]).toBeGreaterThan(calls[0][2]);
		expect(calls[2][2]).toBeGreaterThan(calls[1][2]);
		// Still inside its own bar.
		expect(calls[2][2] - calls[0][2]).toBeLessThan(barDurationSec(70));
	});

	it('changes tempo live without interrupting the loop', async () => {
		const handle = await start();
		// startCompLoop stops the Transport once during setup, to guarantee a
		// clean slate; clear that so the assertion is about setTempo alone.
		mockTone.transport.stop.mockClear();

		handle?.setTempo(100);

		expect(mockTone.transport.bpm.value).toBe(100);
		expect(handle?.isRunning()).toBe(true);
		expect(mockTone.transport.stop).not.toHaveBeenCalled();
		expect(mockTone.transport.clear).not.toHaveBeenCalled();
	});
});

describe('teardown: the loop must never outlive its page', () => {
	it('stop() clears the repeat, stops and rewinds the Transport, drops pending draws, and releases voices', async () => {
		const handle = await start();
		const repeatId = mockTone.transport.scheduleRepeat.mock.results[0].value;

		handle?.stop();

		expect(mockTone.transport.clear).toHaveBeenCalledWith(repeatId);
		expect(mockTone.transport.stop).toHaveBeenCalled();
		expect(mockTone.transport.cancel).toHaveBeenCalledWith(0);
		expect(mockTone.transport.position).toBe(0);
		expect(mockTone.draw.cancel).toHaveBeenCalledWith(0);
		expect(sampler().releaseAll).toHaveBeenCalled();
		expect(compLoopRunning()).toBe(false);
		expect(handle?.isRunning()).toBe(false);
	});

	it('goes silent after stop even if the Transport fires one more time', async () => {
		const handle = await start();
		tick();
		handle?.stop();
		sampler().triggerAttackRelease.mockClear();

		tick(3);

		expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();
	});

	it('reports no bar after stop even if a queued draw frame still runs', async () => {
		const seen: number[] = [];
		const handle = await start({ onBar: (index) => seen.push(index) });
		tick();
		handle?.stop();

		drawFrame();

		expect(seen).toEqual([]);
	});

	it('stop() is idempotent and safe to call twice', async () => {
		const handle = await start();

		handle?.stop();
		handle?.stop();
		stopCompLoop();

		expect(compLoopRunning()).toBe(false);
	});

	it('stopCompLoop is safe before Tone has ever loaded', () => {
		expect(() => stopCompLoop()).not.toThrow();
		expect(compLoopRunning()).toBe(false);
		expect(mockTone.samplers).toHaveLength(0);
	});

	it('turning sound off kills the loop', async () => {
		await start();
		tick();
		sampler().triggerAttackRelease.mockClear();

		setSoundEnabled(false);

		expect(compLoopRunning()).toBe(false);
		expect(mockTone.transport.stop).toHaveBeenCalled();
		expect(sampler().releaseAll).toHaveBeenCalled();
		tick(2);
		expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();
	});

	it('a second start supersedes the first, leaving exactly one loop running', async () => {
		const first = await start();
		const firstId = mockTone.transport.scheduleRepeat.mock.results[0].value;

		const second = await start({ bars: [{ pitches: ['F3', 'A4', 'E5'] }] });

		expect(mockTone.transport.clear).toHaveBeenCalledWith(firstId);
		expect(first?.isRunning()).toBe(false);
		expect(second?.isRunning()).toBe(true);

		sampler().triggerAttackRelease.mockClear();
		tick();
		// Only the new form sounds; the superseded one is gone.
		expect(sampler().triggerAttackRelease.mock.calls.map((call) => call[0])).toEqual([
			['F3', 'A4', 'E5']
		]);
	});

	it('a start that resolves AFTER the page was left never starts the Transport', async () => {
		// The real shape of the bug: the user taps start, navigates away while
		// the 1.9MB piano is still loading, and the loop begins on a dead page.
		const pending = startCompLoop({ bars: BARS, bpm: 70 });
		await flush();

		stopCompLoop(); // component destroy

		loadSamples(); // samples arrive late
		const handle = await pending;

		expect(handle).toBeNull();
		expect(compLoopRunning()).toBe(false);
		expect(mockTone.transport.start).not.toHaveBeenCalled();
		expect(mockTone.transport.scheduleRepeat).not.toHaveBeenCalled();
	});

	it('_resetForTests leaves no loop behind', async () => {
		await start();

		_resetForTests();

		expect(compLoopRunning()).toBe(false);
	});
});
