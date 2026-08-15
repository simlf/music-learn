import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextMidiState, stateFromEnable, type MidiConnectionState } from './midi.svelte';
import type { MidiEnableResult, MidiPortEvent } from './webmidi';

/**
 * Pure connection-state logic (Plan 38-02, MIDI-01/MIDI-04). Real device
 * event wiring (webmidi.js `enable()`/port events) is not jsdom-testable and
 * is covered by `tests/e2e/midi.spec.ts` plus the hardware UAT in plan 38-04.
 */

describe('stateFromEnable', () => {
	it('returns connected with the id/name of a single input', () => {
		expect(
			stateFromEnable({
				ok: true,
				inputs: [{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' }]
			})
		).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });
	});

	it('returns no-device when the input list is empty', () => {
		expect(stateFromEnable({ ok: true, inputs: [] })).toEqual({ kind: 'no-device' });
	});

	it('returns the FIRST input when multiple inputs are present', () => {
		expect(
			stateFromEnable({
				ok: true,
				inputs: [
					{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' },
					{ id: 'in-2', name: 'Korg B2', manufacturer: 'Korg' }
				]
			})
		).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });
	});

	it('returns denied for a permission-denied failure', () => {
		expect(stateFromEnable({ ok: false, reason: 'permission-denied' })).toEqual({
			kind: 'denied'
		});
	});

	it('returns unsupported for an unsupported failure', () => {
		expect(stateFromEnable({ ok: false, reason: 'unsupported' })).toEqual({
			kind: 'unsupported'
		});
	});

	it('returns error for an unknown failure', () => {
		expect(stateFromEnable({ ok: false, reason: 'unknown' })).toEqual({ kind: 'error' });
	});
});

describe('nextMidiState', () => {
	function connectedEvent(id: string, name: string): MidiPortEvent {
		return { type: 'connected', portKind: 'input', id, name };
	}
	function disconnectedEvent(id: string, name = ''): MidiPortEvent {
		return { type: 'disconnected', portKind: 'input', id, name };
	}

	it('moves no-device to connected on a connected input event', () => {
		const current: MidiConnectionState = { kind: 'no-device' };
		expect(nextMidiState(current, connectedEvent('in-1', 'Yamaha P-125'))).toEqual({
			kind: 'connected',
			deviceId: 'in-1',
			deviceName: 'Yamaha P-125'
		});
	});

	it('moves connected to disconnected on a disconnected input event (unplug reads as disconnected)', () => {
		const current: MidiConnectionState = {
			kind: 'connected',
			deviceId: 'in-1',
			deviceName: 'Yamaha P-125'
		};
		expect(nextMidiState(current, disconnectedEvent('in-1'))).toEqual({ kind: 'disconnected' });
	});

	it('moves disconnected back to connected on a re-plug, with no new user tap', () => {
		const current: MidiConnectionState = { kind: 'disconnected' };
		expect(nextMidiState(current, connectedEvent('in-1', 'Yamaha P-125'))).toEqual({
			kind: 'connected',
			deviceId: 'in-1',
			deviceName: 'Yamaha P-125'
		});
	});

	it('leaves no-device unchanged on a stray disconnected event (never-saw-a-device is not disconnected)', () => {
		const current: MidiConnectionState = { kind: 'no-device' };
		expect(nextMidiState(current, disconnectedEvent('in-1'))).toBe(current);
	});

	it('leaves idle unchanged on a stray disconnected event', () => {
		const current: MidiConnectionState = { kind: 'idle' };
		expect(nextMidiState(current, disconnectedEvent('in-1'))).toBe(current);
	});

	it('leaves unsupported unchanged (same reference) for both a connected and a disconnected event', () => {
		const current: MidiConnectionState = { kind: 'unsupported' };
		expect(nextMidiState(current, connectedEvent('in-1', 'Yamaha P-125'))).toBe(current);
		expect(nextMidiState(current, disconnectedEvent('in-1'))).toBe(current);
	});

	it('ignores output-port events from a connected current state', () => {
		const current: MidiConnectionState = {
			kind: 'connected',
			deviceId: 'in-1',
			deviceName: 'Yamaha P-125'
		};
		const connectedOutput: MidiPortEvent = { type: 'connected', portKind: 'output', id: 'out-1', name: 'Out' };
		const disconnectedOutput: MidiPortEvent = {
			type: 'disconnected',
			portKind: 'output',
			id: 'out-1',
			name: 'Out'
		};
		expect(nextMidiState(current, connectedOutput)).toBe(current);
		expect(nextMidiState(current, disconnectedOutput)).toBe(current);
	});

	it('ignores output-port events from a no-device current state', () => {
		const current: MidiConnectionState = { kind: 'no-device' };
		const connectedOutput: MidiPortEvent = { type: 'connected', portKind: 'output', id: 'out-1', name: 'Out' };
		const disconnectedOutput: MidiPortEvent = {
			type: 'disconnected',
			portKind: 'output',
			id: 'out-1',
			name: 'Out'
		};
		expect(nextMidiState(current, connectedOutput)).toBe(current);
		expect(nextMidiState(current, disconnectedOutput)).toBe(current);
	});

	/**
	 * Device-identity regression suite (CR-01). Every case below uses TWO
	 * distinct port ids on purpose: webmidi.js fires `connected`/
	 * `disconnected` once per port and "it may fire several times if a device
	 * possesses multiple inputs and/or outputs (which is often the case)", so
	 * a reducer that only reads `event.type` looks perfectly correct against
	 * a single-port fixture and silently hijacks or clears the real device in
	 * front of actual hardware. A single-id fixture cannot catch that.
	 */
	describe('device identity (multi-port instruments)', () => {
		const connectedToIn1: MidiConnectionState = {
			kind: 'connected',
			deviceId: 'in-1',
			deviceName: 'Yamaha P-125'
		};

		it('keeps in-1 when a SECOND port (in-2) connects: an established device is never hijacked', () => {
			const next = nextMidiState(connectedToIn1, connectedEvent('in-2', 'Yamaha P-125 MIDI IN 2'));
			expect(next).toBe(connectedToIn1);
		});

		it('stays connected when a DIFFERENT port (in-2) disconnects: only our own port can disconnect us', () => {
			const next = nextMidiState(connectedToIn1, disconnectedEvent('in-2', 'Korg B2'));
			expect(next).toBe(connectedToIn1);
		});

		it('goes to disconnected when OUR port (in-1) disconnects', () => {
			expect(nextMidiState(connectedToIn1, disconnectedEvent('in-1'))).toEqual({
				kind: 'disconnected'
			});
		});

		it('treats a re-announcement of our own port as a no-op (same reference, no reactive churn)', () => {
			const next = nextMidiState(connectedToIn1, connectedEvent('in-1', 'Yamaha P-125'));
			expect(next).toBe(connectedToIn1);
		});

		it('agrees with stateFromEnable on a multi-port instrument: both select in-1, never in-2', () => {
			// The enable path picks inputs[0]...
			const fromEnable = stateFromEnable({
				ok: true,
				inputs: [
					{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' },
					{ id: 'in-2', name: 'Yamaha P-125 MIDI IN 2', manufacturer: 'Yamaha' }
				]
			});
			expect(fromEnable).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });

			// ...and the event path, fed the same two ports in order, agrees.
			let state = nextMidiState({ kind: 'idle' }, connectedEvent('in-1', 'Yamaha P-125'));
			state = nextMidiState(state, connectedEvent('in-2', 'Yamaha P-125 MIDI IN 2'));
			expect(state).toEqual(fromEnable);
		});

		it('selects a genuinely new device only once our own port has gone away', () => {
			const afterUnplug = nextMidiState(connectedToIn1, disconnectedEvent('in-1'));
			expect(afterUnplug).toEqual({ kind: 'disconnected' });
			expect(nextMidiState(afterUnplug, connectedEvent('in-9', 'Korg B2'))).toEqual({
				kind: 'connected',
				deviceId: 'in-9',
				deviceName: 'Korg B2'
			});
		});
	});

	it('stores an empty device name verbatim (display fallback is the component concern, not the reducer)', () => {
		const current: MidiConnectionState = { kind: 'no-device' };
		expect(nextMidiState(current, connectedEvent('in-1', ''))).toEqual({
			kind: 'connected',
			deviceId: 'in-1',
			deviceName: ''
		});
	});
});

/**
 * Reactive state, feature-detect init, and the gesture-gated connect.
 *
 * `./webmidi` is mocked so `enableMidi()`/`watchPorts()` call counts and
 * results are controllable, while `midiUnsupportedReason()` (used by
 * `initMidi()`/`connectMidi()` for feature detection) stays the real
 * implementation via the `importOriginal` spread - the same pattern used for
 * `$lib/srs/deck` in `src/lib/i18n/coverage.test.ts`.
 *
 * Every test dynamically re-imports `./midi.svelte` after `vi.resetModules()`
 * (mirroring `webmidi.test.ts`), so this module's own module-scope state
 * (`state`, `initialized`, `intent`, `watching`) never leaks across test
 * cases - each test gets a fully fresh module instance.
 */
const enableMidiMock = vi.fn<() => Promise<MidiEnableResult>>();
const watchPortsMock = vi.fn<(handler: (event: MidiPortEvent) => void) => () => void>();
// Stubbed so `initMidi()` never triggers the real dynamic import('webmidi')
// under jsdom, and so the warm-up wiring itself is assertable.
const prewarmMidiMock = vi.fn<() => void>();

vi.mock('./webmidi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./webmidi')>();
	return {
		...actual,
		enableMidi: (...args: unknown[]) => enableMidiMock(...(args as [])),
		watchPorts: (...args: Parameters<typeof watchPortsMock>) => watchPortsMock(...args),
		prewarmMidi: () => prewarmMidiMock()
	};
});

function stubMidiSupported(): void {
	Object.defineProperty(navigator, 'requestMIDIAccess', {
		value: () => Promise.resolve({}),
		configurable: true
	});
}

beforeEach(() => {
	vi.resetModules();
	enableMidiMock.mockReset();
	watchPortsMock.mockReset();
	prewarmMidiMock.mockReset();
});

afterEach(() => {
	Reflect.deleteProperty(navigator, 'requestMIDIAccess');
});

describe('midiState / setMidiState', () => {
	it('defaults to unsupported before anything runs', async () => {
		const { midiState } = await import('./midi.svelte');
		expect(midiState()).toEqual({ kind: 'unsupported' });
	});

	it('round-trips no-device then idle through the reactive module state', async () => {
		const { midiState, setMidiState } = await import('./midi.svelte');
		flushSync(() => setMidiState({ kind: 'no-device' }));
		expect(midiState()).toEqual({ kind: 'no-device' });

		flushSync(() => setMidiState({ kind: 'idle' }));
		expect(midiState()).toEqual({ kind: 'idle' });
	});
});

describe('connectedDeviceId', () => {
	it("returns the device's id when connected", async () => {
		const { setMidiState, connectedDeviceId } = await import('./midi.svelte');
		setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'X' });
		expect(connectedDeviceId()).toBe('in-1');
	});

	it('returns null for idle, no-device, disconnected, and unsupported', async () => {
		const { setMidiState, connectedDeviceId } = await import('./midi.svelte');
		for (const kind of ['idle', 'no-device', 'disconnected', 'unsupported'] as const) {
			setMidiState({ kind });
			expect(connectedDeviceId()).toBeNull();
		}
	});
});

describe('initMidi', () => {
	it('leaves the state at unsupported and never calls enableMidi in plain jsdom', async () => {
		const { initMidi, midiState } = await import('./midi.svelte');
		initMidi();
		expect(midiState()).toEqual({ kind: 'unsupported' });
		expect(enableMidiMock).toHaveBeenCalledTimes(0);
	});

	it('sets idle (never calls enableMidi) when detection is stubbed supported', async () => {
		stubMidiSupported();
		const { initMidi, midiState } = await import('./midi.svelte');
		initMidi();
		expect(midiState()).toEqual({ kind: 'idle' });
		expect(enableMidiMock).toHaveBeenCalledTimes(0);
	});

	it('is a no-op on a second call', async () => {
		stubMidiSupported();
		const { initMidi, midiState } = await import('./midi.svelte');
		initMidi();
		const first = midiState();
		initMidi();
		expect(midiState()).toEqual(first);
		expect(enableMidiMock).toHaveBeenCalledTimes(0);
	});

	/**
	 * WR-04. Warming the lazy chunk on mount is what keeps the later
	 * requestMIDIAccess() call in the same task as the user's click. It must
	 * still request nothing, and must not happen at all where Web MIDI can
	 * never work.
	 */
	it('warms the webmidi chunk on a supported browser, while still calling enableMidi zero times', async () => {
		stubMidiSupported();
		const { initMidi } = await import('./midi.svelte');
		initMidi();
		expect(prewarmMidiMock).toHaveBeenCalledTimes(1);
		expect(enableMidiMock).toHaveBeenCalledTimes(0);
	});

	it('never warms the webmidi chunk on an unsupported browser (Safari/iOS pays nothing)', async () => {
		const { initMidi } = await import('./midi.svelte');
		initMidi();
		expect(prewarmMidiMock).toHaveBeenCalledTimes(0);
	});

	it('does not warm on a remount that short-circuits on an already-connected state', async () => {
		stubMidiSupported();
		const { initMidi, setMidiState } = await import('./midi.svelte');
		setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });
		initMidi();
		expect(prewarmMidiMock).toHaveBeenCalledTimes(0);
	});

	it('does not reset an already-connected state back to idle on a remount', async () => {
		stubMidiSupported();
		const { initMidi, setMidiState, midiState } = await import('./midi.svelte');
		setMidiState({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });
		initMidi();
		expect(midiState()).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });
	});
});

describe('connectMidi', () => {
	it('resolves without throwing and leaves unsupported in plain jsdom, calling enableMidi zero times', async () => {
		const { connectMidi, midiState } = await import('./midi.svelte');
		await expect(connectMidi()).resolves.toBeUndefined();
		expect(midiState()).toEqual({ kind: 'unsupported' });
		expect(enableMidiMock).toHaveBeenCalledTimes(0);
	});

	it('resolves to connected and subscribes exactly once when enableMidi resolves one input', async () => {
		stubMidiSupported();
		enableMidiMock.mockResolvedValue({
			ok: true,
			inputs: [{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' }]
		});
		watchPortsMock.mockReturnValue(() => {});
		const { connectMidi, midiState } = await import('./midi.svelte');
		await connectMidi();
		expect(midiState()).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });
		expect(watchPortsMock).toHaveBeenCalledTimes(1);
	});

	it('passes through enabling while the enable promise is pending', async () => {
		stubMidiSupported();
		let resolveEnable!: (result: MidiEnableResult) => void;
		enableMidiMock.mockImplementation(
			() =>
				new Promise<MidiEnableResult>((resolve) => {
					resolveEnable = resolve;
				})
		);
		watchPortsMock.mockReturnValue(() => {});
		const { connectMidi, midiState } = await import('./midi.svelte');
		const pending = connectMidi();
		expect(midiState().kind).toBe('enabling');
		resolveEnable({ ok: true, inputs: [] });
		await pending;
		expect(midiState()).toEqual({ kind: 'no-device' });
	});

	it('ends at no-device (and still subscribes once) when enableMidi resolves zero inputs', async () => {
		stubMidiSupported();
		enableMidiMock.mockResolvedValue({ ok: true, inputs: [] });
		watchPortsMock.mockReturnValue(() => {});
		const { connectMidi, midiState } = await import('./midi.svelte');
		await connectMidi();
		expect(midiState()).toEqual({ kind: 'no-device' });
		expect(watchPortsMock).toHaveBeenCalledTimes(1);
	});

	it('ends at denied (and never subscribes) when enableMidi resolves permission-denied', async () => {
		stubMidiSupported();
		enableMidiMock.mockResolvedValue({ ok: false, reason: 'permission-denied' });
		const { connectMidi, midiState } = await import('./midi.svelte');
		await connectMidi();
		expect(midiState()).toEqual({ kind: 'denied' });
		expect(watchPortsMock).toHaveBeenCalledTimes(0);
	});

	it('does not double-call enableMidi or double-subscribe when called twice while the first is pending', async () => {
		stubMidiSupported();
		let resolveEnable!: (result: MidiEnableResult) => void;
		enableMidiMock.mockImplementation(
			() =>
				new Promise<MidiEnableResult>((resolve) => {
					resolveEnable = resolve;
				})
		);
		watchPortsMock.mockReturnValue(() => {});
		const { connectMidi } = await import('./midi.svelte');
		const first = connectMidi();
		const second = connectMidi();
		expect(enableMidiMock).toHaveBeenCalledTimes(1);
		resolveEnable({ ok: true, inputs: [{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' }] });
		await Promise.all([first, second]);
		expect(enableMidiMock).toHaveBeenCalledTimes(1);
		expect(watchPortsMock).toHaveBeenCalledTimes(1);
	});

	it('drives the state through the watchPorts handler: connected -> disconnected -> connected (hot-plug, no reload)', async () => {
		stubMidiSupported();
		enableMidiMock.mockResolvedValue({
			ok: true,
			inputs: [{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' }]
		});
		let capturedHandler: ((event: MidiPortEvent) => void) | null = null;
		watchPortsMock.mockImplementation((handler) => {
			capturedHandler = handler;
			return () => {};
		});
		const { connectMidi, midiState } = await import('./midi.svelte');
		await connectMidi();
		expect(midiState()).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });

		capturedHandler!({ type: 'disconnected', portKind: 'input', id: 'in-1', name: 'Yamaha P-125' });
		expect(midiState()).toEqual({ kind: 'disconnected' });

		capturedHandler!({ type: 'connected', portKind: 'input', id: 'in-1', name: 'Yamaha P-125' });
		expect(midiState()).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });
	});

	it('keeps connectedDeviceId() pinned to the played port when a multi-port instrument announces a second port (CR-01)', async () => {
		stubMidiSupported();
		enableMidiMock.mockResolvedValue({
			ok: true,
			inputs: [{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' }]
		});
		let capturedHandler: ((event: MidiPortEvent) => void) | null = null;
		watchPortsMock.mockImplementation((handler) => {
			capturedHandler = handler;
			return () => {};
		});
		const { connectMidi, midiState, connectedDeviceId } = await import('./midi.svelte');
		await connectMidi();
		expect(connectedDeviceId()).toBe('in-1');

		// The instrument's own second port announces itself: not a device change.
		capturedHandler!({ type: 'connected', portKind: 'input', id: 'in-2', name: 'P-125 MIDI IN 2' });
		expect(connectedDeviceId()).toBe('in-1');

		// An unrelated port goes away: the piano is still plugged in.
		capturedHandler!({ type: 'disconnected', portKind: 'input', id: 'in-2', name: 'P-125 MIDI IN 2' });
		expect(connectedDeviceId()).toBe('in-1');
		expect(midiState()).toEqual({ kind: 'connected', deviceId: 'in-1', deviceName: 'Yamaha P-125' });

		// Only our own port can end the session.
		capturedHandler!({ type: 'disconnected', portKind: 'input', id: 'in-1', name: 'Yamaha P-125' });
		expect(midiState()).toEqual({ kind: 'disconnected' });
		expect(connectedDeviceId()).toBeNull();
	});
});
