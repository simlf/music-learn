import { analyzeBuffer, buildKernels, type DetectFrame, type DetectorKernels } from './chromaDetector';

/**
 * Thin getUserMedia / AudioContext / AnalyserNode plumbing for the "check it
 * on your piano" mic panel. Every DSP decision lives in `chromaDetector.ts`
 * (pure, browser-free); this module's only job is getting real microphone
 * samples into that code and guaranteeing the stream is fully released.
 *
 * Capture shape matches Spike 025's verified `index.html` reference exactly
 * (an `AnalyserNode` at fftSize 32768 polled on `requestAnimationFrame`,
 * throttled to ~46ms, matching the offline harness's 46.4ms hop), rather
 * than an `AudioWorklet`: this is a first, deliberately low-risk slice, and
 * porting the already-verified shape beats introducing a new capture path.
 *
 * Merely importing this module touches no browser API (mirrors audio.ts's
 * own "importing constructs nothing" contract), so it is prerender/jsdom
 * safe: every `navigator`/`window`/`AudioContext` reference lives inside a
 * function body, never at module scope.
 */

export type MicUnavailableReason =
	| 'unsupported'
	| 'insecure-context'
	| 'permission-denied'
	| 'no-device'
	| 'unknown';

export interface MicUnavailable {
	ok: false;
	reason: MicUnavailableReason;
}

export interface MicSession {
	ok: true;
	/**
	 * Stops the analysis loop, disconnects every audio graph node, stops
	 * every MediaStreamTrack, and closes the AudioContext. Idempotent and
	 * synchronous-looking (the AudioContext close is fire-and-forget): safe
	 * to call from a Svelte `onDestroy`, a manual stop button, or twice.
	 */
	stop(): void;
}

export type MicStartResult = MicSession | MicUnavailable;

/** Roughly the spike's 46.4ms analysis hop; throttles the rAF-driven tick. */
const TICK_INTERVAL_MS = 46;
/**
 * Matches the spike's `index.html`: long enough that, once decimated by 4,
 * the buffer comfortably outlasts the longest constant-Q kernel (4096
 * decimated samples ~ 371ms at 11025Hz), whatever the device's native rate.
 */
const FFT_SIZE = 32768;

/** True when this environment can plausibly grant microphone capture at all. */
export function isMicAvailable(): boolean {
	return micUnavailableReason() === null;
}

/** Why the mic is unavailable in this environment, or null when it should work. */
export function micUnavailableReason(): MicUnavailableReason | null {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
	if (!window.isSecureContext) return 'insecure-context';
	if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return 'unsupported';
	const hasAudioContext =
		typeof window.AudioContext !== 'undefined' ||
		typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !==
			'undefined';
	if (!hasAudioContext) return 'unsupported';
	return null;
}

function mapGetUserMediaError(err: unknown): MicUnavailableReason {
	const name = err instanceof DOMException ? err.name : '';
	if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission-denied';
	if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'no-device';
	return 'unknown';
}

/**
 * Requests the microphone (echo cancellation / noise suppression / auto
 * gain all explicitly off - phone voice processing mangles a piano) and
 * starts feeding analyzed frames to `onFrame` roughly every
 * `TICK_INTERVAL_MS`. Never called except from a user gesture handler by
 * this module's callers; this function itself does not enforce that, but
 * it also never runs on its own (no auto-start anywhere in this module).
 */
export async function startMicSession(onFrame: (frame: DetectFrame) => void): Promise<MicStartResult> {
	const reason = micUnavailableReason();
	if (reason) return { ok: false, reason };

	let stream: MediaStream;
	try {
		stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
				channelCount: 1
			}
		});
	} catch (err) {
		return { ok: false, reason: mapGetUserMediaError(err) };
	}

	const AudioContextCtor: typeof AudioContext =
		window.AudioContext ??
		(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
	const ctx = new AudioContextCtor();
	let stopped = false;
	let rafId = 0;

	const teardown = () => {
		if (stopped) return;
		stopped = true;
		if (rafId) cancelAnimationFrame(rafId);
		for (const track of stream.getTracks()) {
			try {
				track.stop();
			} catch {
				// Never throw from teardown.
			}
		}
		try {
			void ctx.close().catch(() => {});
		} catch {
			// Already closed, or close() unsupported: nothing more to release.
		}
	};

	try {
		await ctx.resume();
		const source = ctx.createMediaStreamSource(stream);
		const analyser = ctx.createAnalyser();
		analyser.fftSize = FFT_SIZE;
		analyser.smoothingTimeConstant = 0;
		source.connect(analyser);
		const raw = new Float32Array(analyser.fftSize);
		const det: DetectorKernels = buildKernels(ctx.sampleRate / 4);

		let lastAt = 0;
		const tick = (now: number) => {
			if (stopped) return;
			rafId = requestAnimationFrame(tick);
			if (now - lastAt < TICK_INTERVAL_MS) return;
			lastAt = now;
			analyser.getFloatTimeDomainData(raw);
			onFrame(analyzeBuffer(raw, ctx.sampleRate, det));
		};
		rafId = requestAnimationFrame(tick);

		return {
			ok: true,
			stop() {
				try {
					source.disconnect();
				} catch {
					// Never throw from teardown.
				}
				try {
					analyser.disconnect();
				} catch {
					// Never throw from teardown.
				}
				teardown();
			}
		};
	} catch {
		teardown();
		return { ok: false, reason: 'unknown' };
	}
}
