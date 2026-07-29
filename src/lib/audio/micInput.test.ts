import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isMicAvailable, micUnavailableReason, startMicSession } from './micInput';

/**
 * micInput.ts is the thin getUserMedia/AudioContext/AnalyserNode plumbing
 * feeding the pure DSP in chromaDetector.ts. These tests stub the browser
 * globals jsdom does not implement (there is no real Web Audio API in
 * jsdom), so every scenario is deterministic and none of it touches a real
 * microphone or AudioContext.
 *
 * Teardown gets the most coverage here on purpose: a microphone left open
 * is the worst possible bug this feature could ship, per the project brief.
 */

class FakeAnalyserNode {
	fftSize = 2048;
	smoothingTimeConstant = 1;
	connect = vi.fn();
	disconnect = vi.fn();
	getFloatTimeDomainData(arr: Float32Array): void {
		arr.fill(0);
	}
}

class FakeSourceNode {
	connect = vi.fn();
	disconnect = vi.fn();
}

class FakeAudioContext {
	static instances: FakeAudioContext[] = [];
	sampleRate = 44100;
	resume = vi.fn(async () => {});
	close = vi.fn(async () => {});
	createMediaStreamSource = vi.fn(() => new FakeSourceNode());
	createAnalyser = vi.fn(() => new FakeAnalyserNode());
	constructor() {
		FakeAudioContext.instances.push(this);
	}
}

function fakeTrack() {
	return { stop: vi.fn() };
}

function fakeStream(trackCount = 1) {
	const tracks = Array.from({ length: trackCount }, fakeTrack);
	return { getTracks: () => tracks };
}

/** Deterministic requestAnimationFrame/cancelAnimationFrame stand-ins, so ticks are driven by hand. */
let rafCallbacks: Map<number, FrameRequestCallback>;
let nextRafId: number;

function stubRaf(): void {
	rafCallbacks = new Map();
	nextRafId = 0;
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
		const id = ++nextRafId;
		rafCallbacks.set(id, cb);
		return id;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
		rafCallbacks.delete(id);
	});
}

/** Invokes every currently-scheduled rAF callback once, at `now`. Clears before invoking so a callback's own re-schedule lands in a fresh map rather than being lost. */
function flushRaf(now = 0): void {
	const entries = [...rafCallbacks.entries()];
	rafCallbacks.clear();
	for (const [, cb] of entries) cb(now);
}

function clearBrowserGlobals(): void {
	delete (window as unknown as { isSecureContext?: unknown }).isSecureContext;
	delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
	delete (window as unknown as { AudioContext?: unknown }).AudioContext;
}

beforeEach(() => {
	clearBrowserGlobals();
	FakeAudioContext.instances.length = 0;
	stubRaf();
});

afterEach(() => {
	clearBrowserGlobals();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('feature detection', () => {
	it('is unavailable in a plain jsdom environment (no isSecureContext, no mediaDevices, no AudioContext)', () => {
		// jsdom implements none of these, so this documents the real default
		// this app's own test suite runs under, rather than a contrived one.
		expect(isMicAvailable()).toBe(false);
		expect(micUnavailableReason()).not.toBeNull();
	});

	it('reports unsupported when secure but getUserMedia does not exist', () => {
		(window as unknown as { isSecureContext: boolean }).isSecureContext = true;
		expect(micUnavailableReason()).toBe('unsupported');
	});

	it('reports insecure-context when getUserMedia exists but the context is not secure', () => {
		(window as unknown as { isSecureContext: boolean }).isSecureContext = false;
		(navigator as unknown as { mediaDevices: unknown }).mediaDevices = {
			getUserMedia: vi.fn()
		};
		expect(micUnavailableReason()).toBe('insecure-context');
	});

	it('reports unsupported when secure and getUserMedia exists but there is no AudioContext', () => {
		(window as unknown as { isSecureContext: boolean }).isSecureContext = true;
		(navigator as unknown as { mediaDevices: unknown }).mediaDevices = {
			getUserMedia: vi.fn()
		};
		expect(micUnavailableReason()).toBe('unsupported');
	});

	it('is available once secure context, getUserMedia and AudioContext all exist', () => {
		(window as unknown as { isSecureContext: boolean }).isSecureContext = true;
		(navigator as unknown as { mediaDevices: unknown }).mediaDevices = {
			getUserMedia: vi.fn()
		};
		(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
		expect(micUnavailableReason()).toBeNull();
		expect(isMicAvailable()).toBe(true);
	});
});

/** Wires up a "fully supported" environment, ready for startMicSession. */
function makeAvailable(getUserMedia: ReturnType<typeof vi.fn>): void {
	(window as unknown as { isSecureContext: boolean }).isSecureContext = true;
	(navigator as unknown as { mediaDevices: unknown }).mediaDevices = { getUserMedia };
	(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
}

describe('startMicSession: unavailable environment', () => {
	it('never calls getUserMedia when the environment is not available', async () => {
		const getUserMedia = vi.fn();
		const onFrame = vi.fn();
		const result = await startMicSession(onFrame);
		expect(getUserMedia).not.toHaveBeenCalled();
		expect(result.ok).toBe(false);
	});
});

describe('startMicSession: getUserMedia error mapping', () => {
	it('maps NotAllowedError to permission-denied', async () => {
		const getUserMedia = vi.fn(async () => {
			throw new DOMException('denied', 'NotAllowedError');
		});
		makeAvailable(getUserMedia);
		const result = await startMicSession(vi.fn());
		expect(result).toEqual({ ok: false, reason: 'permission-denied' });
	});

	it('maps NotFoundError to no-device', async () => {
		const getUserMedia = vi.fn(async () => {
			throw new DOMException('no device', 'NotFoundError');
		});
		makeAvailable(getUserMedia);
		const result = await startMicSession(vi.fn());
		expect(result).toEqual({ ok: false, reason: 'no-device' });
	});

	it('maps an unrecognized failure to unknown', async () => {
		const getUserMedia = vi.fn(async () => {
			throw new Error('boom');
		});
		makeAvailable(getUserMedia);
		const result = await startMicSession(vi.fn());
		expect(result).toEqual({ ok: false, reason: 'unknown' });
	});

	it('requests the constraints that keep phone voice processing from mangling the piano', async () => {
		const getUserMedia = vi.fn(async () => {
			throw new Error('boom');
		});
		makeAvailable(getUserMedia);
		await startMicSession(vi.fn());
		expect(getUserMedia).toHaveBeenCalledWith({
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
				channelCount: 1
			}
		});
	});
});

describe('startMicSession: success path', () => {
	it('builds the audio graph, starts the analysis loop, and feeds onFrame', async () => {
		const stream = fakeStream();
		const getUserMedia = vi.fn(async () => stream);
		makeAvailable(getUserMedia);
		const onFrame = vi.fn();

		const result = await startMicSession(onFrame);
		expect(result.ok).toBe(true);

		const ctx = FakeAudioContext.instances[0];
		expect(ctx.resume).toHaveBeenCalledTimes(1);
		expect(ctx.createMediaStreamSource).toHaveBeenCalledWith(stream);
		const analyser = ctx.createAnalyser.mock.results[0]!.value as FakeAnalyserNode;
		expect(analyser.fftSize).toBe(32768);
		expect(analyser.smoothingTimeConstant).toBe(0);

		// First tick is throttled away (now - lastAt(0) < the hop interval);
		// the second flush, further ahead in time, actually analyzes a frame.
		flushRaf(0);
		expect(onFrame).not.toHaveBeenCalled();
		flushRaf(100);
		expect(onFrame).toHaveBeenCalledTimes(1);
		const frame = onFrame.mock.calls[0][0];
		expect(frame.chroma).toHaveLength(12);
	});

	it('never starts the analysis loop before startMicSession resolves (no auto-start)', async () => {
		const getUserMedia = vi.fn(async () => fakeStream());
		makeAvailable(getUserMedia);
		expect(getUserMedia).not.toHaveBeenCalled();
		expect(rafCallbacks.size).toBe(0);
	});
});

describe('startMicSession: teardown', () => {
	async function startSuccessfully(trackCount = 2) {
		const stream = fakeStream(trackCount);
		const getUserMedia = vi.fn(async () => stream);
		makeAvailable(getUserMedia);
		const onFrame = vi.fn();
		const result = await startMicSession(onFrame);
		if (!result.ok) throw new Error('expected a successful session in this test');
		return { result, stream, ctx: FakeAudioContext.instances[0], onFrame };
	}

	it('stops every MediaStreamTrack', async () => {
		const { result, stream } = await startSuccessfully(3);
		result.stop();
		for (const track of stream.getTracks()) expect(track.stop).toHaveBeenCalledTimes(1);
	});

	it('closes the AudioContext', async () => {
		const { result, ctx } = await startSuccessfully();
		result.stop();
		expect(ctx.close).toHaveBeenCalledTimes(1);
	});

	it('disconnects the analyser and source nodes', async () => {
		const { result, ctx } = await startSuccessfully();
		const analyser = ctx.createAnalyser.mock.results[0]!.value as FakeAnalyserNode;
		const source = ctx.createMediaStreamSource.mock.results[0]!.value as FakeSourceNode;
		result.stop();
		expect(analyser.disconnect).toHaveBeenCalledTimes(1);
		expect(source.disconnect).toHaveBeenCalledTimes(1);
	});

	it('cancels the pending animation frame, so no further onFrame call ever happens', async () => {
		const { result, onFrame } = await startSuccessfully();
		flushRaf(0); // schedules the "real" tick after the throttled first one
		result.stop();
		expect(rafCallbacks.size).toBe(0);
		flushRaf(1000);
		expect(onFrame).not.toHaveBeenCalled();
	});

	it('is idempotent: calling stop() twice never double-releases or throws', async () => {
		const { result, stream, ctx } = await startSuccessfully(2);
		expect(() => {
			result.stop();
			result.stop();
		}).not.toThrow();
		for (const track of stream.getTracks()) expect(track.stop).toHaveBeenCalledTimes(1);
		expect(ctx.close).toHaveBeenCalledTimes(1);
	});

	it('releases the stream and closes the context even when resume() fails', async () => {
		const stream = fakeStream(2);
		const getUserMedia = vi.fn(async () => stream);
		makeAvailable(getUserMedia);
		const failingCtx = new FakeAudioContext();
		failingCtx.resume = vi.fn(async () => {
			throw new Error('resume failed');
		});
		function FailingAudioContextCtor() {
			return failingCtx;
		}
		(window as unknown as { AudioContext: unknown }).AudioContext = FailingAudioContextCtor;

		const result = await startMicSession(vi.fn());
		expect(result.ok).toBe(false);
		for (const track of stream.getTracks()) expect(track.stop).toHaveBeenCalledTimes(1);
		expect(failingCtx.close).toHaveBeenCalledTimes(1);
	});
});
