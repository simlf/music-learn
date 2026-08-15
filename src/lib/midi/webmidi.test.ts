import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiPortEvent } from './webmidi';

/**
 * Pure-logic + mocked-boundary tests only (mirrors swUpdate.test.ts's own
 * split). Real hardware behavior (the actual device name string, real
 * hot-plug timing) is manual-only; the real Chromium permission path is
 * covered by tests/e2e/midi.spec.ts in plan 38-04. Vitest intercepts the
 * dynamic `import('webmidi')` inside webmidi.ts, so `enableMidi()`'s lazy
 * load resolves to this fake namespace rather than touching a browser API.
 */

type Listener = (event: unknown) => void;

const fakeWebMidi = {
	enable: vi.fn(),
	inputs: [] as Array<{ id: string; name?: string; manufacturer?: string; type?: string }>,
	addListener: vi.fn(),
	removeListener: vi.fn()
};

vi.mock('webmidi', () => ({
	get WebMidi() {
		return fakeWebMidi;
	}
}));

// Every test dynamically re-imports './webmidi' to observe its module-scope
// state (webMidiNamespace, the registered listener pair) fresh; without
// resetting the module registry, ES module caching would let one test's
// enableMidi()/watchPorts() calls leak into the next test's assertions.
beforeEach(() => {
	vi.resetModules();
});

describe('midiUnsupportedReason / isMidiSupported', () => {
	afterEach(() => {
		Reflect.deleteProperty(navigator, 'requestMIDIAccess');
	});

	it('returns unsupported and false in plain jsdom (no navigator.requestMIDIAccess)', async () => {
		const { midiUnsupportedReason, isMidiSupported } = await import('./webmidi');
		expect(midiUnsupportedReason()).toBe('unsupported');
		expect(isMidiSupported()).toBe(false);
	});

	it('returns null and true once navigator.requestMIDIAccess is defined', async () => {
		Object.defineProperty(navigator, 'requestMIDIAccess', {
			value: () => Promise.resolve({}),
			configurable: true
		});
		const { midiUnsupportedReason, isMidiSupported } = await import('./webmidi');
		expect(midiUnsupportedReason()).toBeNull();
		expect(isMidiSupported()).toBe(true);
	});
});

describe('mapEnableError', () => {
	it('maps SecurityError to permission-denied', async () => {
		const { mapEnableError } = await import('./webmidi');
		expect(mapEnableError(new DOMException('x', 'SecurityError'))).toBe('permission-denied');
	});

	it('maps NotAllowedError to permission-denied', async () => {
		const { mapEnableError } = await import('./webmidi');
		expect(mapEnableError(new DOMException('x', 'NotAllowedError'))).toBe('permission-denied');
	});

	it('maps NotSupportedError to unsupported', async () => {
		const { mapEnableError } = await import('./webmidi');
		expect(mapEnableError(new DOMException('x', 'NotSupportedError'))).toBe('unsupported');
	});

	it('maps a plain Error mentioning permission (case-insensitive) to permission-denied', async () => {
		const { mapEnableError } = await import('./webmidi');
		expect(mapEnableError(new Error('Web MIDI permission was refused'))).toBe('permission-denied');
	});

	it('maps an unrelated plain Error to unknown', async () => {
		const { mapEnableError } = await import('./webmidi');
		expect(mapEnableError(new Error('boom'))).toBe('unknown');
	});

	it('maps a non-Error value to unknown', async () => {
		const { mapEnableError } = await import('./webmidi');
		expect(mapEnableError('not an error at all')).toBe('unknown');
	});
});

describe('enableMidi', () => {
	beforeEach(() => {
		Object.defineProperty(navigator, 'requestMIDIAccess', {
			value: () => Promise.resolve({}),
			configurable: true
		});
		fakeWebMidi.enable.mockReset();
		fakeWebMidi.inputs = [];
	});

	afterEach(() => {
		Reflect.deleteProperty(navigator, 'requestMIDIAccess');
	});

	it('resolves unsupported without calling enable when feature detection fails', async () => {
		Reflect.deleteProperty(navigator, 'requestMIDIAccess');
		const { enableMidi } = await import('./webmidi');
		const result = await enableMidi();
		expect(result).toEqual({ ok: false, reason: 'unsupported' });
		expect(fakeWebMidi.enable).not.toHaveBeenCalled();
	});

	it('calls enable with exactly { sysex: false } (proof of T-38-01 mitigation)', async () => {
		fakeWebMidi.enable.mockResolvedValue(undefined);
		const { enableMidi } = await import('./webmidi');
		await enableMidi();
		expect(fakeWebMidi.enable).toHaveBeenCalledTimes(1);
		expect(fakeWebMidi.enable).toHaveBeenCalledWith({ sysex: false });
	});

	it('resolves ok with the flat DTO for each connected input', async () => {
		fakeWebMidi.enable.mockResolvedValue(undefined);
		fakeWebMidi.inputs = [
			{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha', type: 'input' }
		];
		const { enableMidi } = await import('./webmidi');
		const result = await enableMidi();
		expect(result).toEqual({
			ok: true,
			inputs: [{ id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha' }]
		});
	});

	it('resolves ok with an empty inputs array when nothing is connected', async () => {
		fakeWebMidi.enable.mockResolvedValue(undefined);
		fakeWebMidi.inputs = [];
		const { enableMidi } = await import('./webmidi');
		const result = await enableMidi();
		expect(result).toEqual({ ok: true, inputs: [] });
	});

	it('maps a rejected enable to permission-denied and never throws', async () => {
		fakeWebMidi.enable.mockRejectedValue(new DOMException('x', 'SecurityError'));
		const { enableMidi } = await import('./webmidi');
		const result = await enableMidi();
		expect(result).toEqual({ ok: false, reason: 'permission-denied' });
	});

	/**
	 * WR-06. A persistently blocked permission must not cost a request:
	 * WebMidi.enable() would call navigator.requestMIDIAccess() again, Chrome
	 * would auto-reject it with no prompt, and the user would tap a chip that
	 * does nothing observable. The Permissions API answers that up front.
	 */
	describe('a persistent block is detected without re-requesting', () => {
		function stubPermissions(query: () => Promise<{ state: string }>): void {
			Object.defineProperty(navigator, 'permissions', {
				value: { query },
				configurable: true
			});
		}

		afterEach(() => {
			Reflect.deleteProperty(navigator, 'permissions');
		});

		it('resolves permission-denied without calling enable when the state is denied', async () => {
			stubPermissions(() => Promise.resolve({ state: 'denied' }));
			fakeWebMidi.enable.mockResolvedValue(undefined);
			const { enableMidi } = await import('./webmidi');
			const result = await enableMidi();
			expect(result).toEqual({ ok: false, reason: 'permission-denied' });
			expect(fakeWebMidi.enable).not.toHaveBeenCalled();
		});

		it('queries for the midi permission by name', async () => {
			const query = vi.fn(() => Promise.resolve({ state: 'granted' }));
			stubPermissions(query);
			fakeWebMidi.enable.mockResolvedValue(undefined);
			const { enableMidi } = await import('./webmidi');
			await enableMidi();
			expect(query).toHaveBeenCalledWith({ name: 'midi' });
		});

		it('proceeds normally on granted', async () => {
			stubPermissions(() => Promise.resolve({ state: 'granted' }));
			fakeWebMidi.enable.mockResolvedValue(undefined);
			const { enableMidi } = await import('./webmidi');
			expect(await enableMidi()).toEqual({ ok: true, inputs: [] });
			expect(fakeWebMidi.enable).toHaveBeenCalledTimes(1);
		});

		it('proceeds normally on prompt (the first-ever ask must still reach the prompt)', async () => {
			stubPermissions(() => Promise.resolve({ state: 'prompt' }));
			fakeWebMidi.enable.mockResolvedValue(undefined);
			const { enableMidi } = await import('./webmidi');
			expect(await enableMidi()).toEqual({ ok: true, inputs: [] });
			expect(fakeWebMidi.enable).toHaveBeenCalledTimes(1);
		});

		it('proceeds normally when the query throws (Firefox rejects the midi permission name)', async () => {
			stubPermissions(() => Promise.reject(new TypeError("'midi' is not a valid enum value")));
			fakeWebMidi.enable.mockResolvedValue(undefined);
			const { enableMidi } = await import('./webmidi');
			expect(await enableMidi()).toEqual({ ok: true, inputs: [] });
			expect(fakeWebMidi.enable).toHaveBeenCalledTimes(1);
		});

		it('proceeds normally when navigator.permissions is absent entirely', async () => {
			Reflect.deleteProperty(navigator, 'permissions');
			fakeWebMidi.enable.mockResolvedValue(undefined);
			const { enableMidi } = await import('./webmidi');
			expect(await enableMidi()).toEqual({ ok: true, inputs: [] });
			expect(fakeWebMidi.enable).toHaveBeenCalledTimes(1);
		});
	});
});

/**
 * WR-04. The chunk fetch must not sit between the user's click and
 * `navigator.requestMIDIAccess()`, so the module load is memoised and can be
 * warmed ahead of the gesture. Warming must itself request nothing.
 */
describe('prewarmMidi', () => {
	afterEach(() => {
		Reflect.deleteProperty(navigator, 'requestMIDIAccess');
	});

	it('does nothing on an unsupported browser: no enable, no device enumeration', async () => {
		fakeWebMidi.enable.mockReset();
		const { prewarmMidi } = await import('./webmidi');
		prewarmMidi();
		await Promise.resolve();
		expect(fakeWebMidi.enable).not.toHaveBeenCalled();
	});

	it('never requests access on a supported browser either (warm-up is not a connect)', async () => {
		Object.defineProperty(navigator, 'requestMIDIAccess', {
			value: () => Promise.resolve({}),
			configurable: true
		});
		fakeWebMidi.enable.mockReset();
		const { prewarmMidi } = await import('./webmidi');
		prewarmMidi();
		await Promise.resolve();
		expect(fakeWebMidi.enable).not.toHaveBeenCalled();
	});

	it('is idempotent, and a warmed module still enables normally', async () => {
		Object.defineProperty(navigator, 'requestMIDIAccess', {
			value: () => Promise.resolve({}),
			configurable: true
		});
		fakeWebMidi.enable.mockReset();
		fakeWebMidi.enable.mockResolvedValue(undefined);
		fakeWebMidi.inputs = [];
		const { prewarmMidi, enableMidi } = await import('./webmidi');
		prewarmMidi();
		prewarmMidi();
		prewarmMidi();
		const result = await enableMidi();
		expect(result).toEqual({ ok: true, inputs: [] });
		expect(fakeWebMidi.enable).toHaveBeenCalledTimes(1);
		expect(fakeWebMidi.enable).toHaveBeenCalledWith({ sysex: false });
	});
});

describe('watchPorts', () => {
	beforeEach(() => {
		Object.defineProperty(navigator, 'requestMIDIAccess', {
			value: () => Promise.resolve({}),
			configurable: true
		});
		fakeWebMidi.enable.mockReset();
		fakeWebMidi.enable.mockResolvedValue(undefined);
		fakeWebMidi.addListener.mockReset();
		fakeWebMidi.removeListener.mockReset();
		fakeWebMidi.inputs = [];
	});

	afterEach(() => {
		Reflect.deleteProperty(navigator, 'requestMIDIAccess');
	});

	it('registers exactly one connected and one disconnected listener', async () => {
		const { enableMidi, watchPorts } = await import('./webmidi');
		await enableMidi();
		watchPorts(() => {});
		const connectedCalls = fakeWebMidi.addListener.mock.calls.filter(
			(call) => call[0] === 'connected'
		);
		const disconnectedCalls = fakeWebMidi.addListener.mock.calls.filter(
			(call) => call[0] === 'disconnected'
		);
		expect(connectedCalls).toHaveLength(1);
		expect(disconnectedCalls).toHaveLength(1);
	});

	it('forwards a connected event as a MidiPortEvent', async () => {
		const { enableMidi, watchPorts } = await import('./webmidi');
		await enableMidi();
		const handler = vi.fn();
		watchPorts(handler);
		const connectedListener = fakeWebMidi.addListener.mock.calls.find(
			(call) => call[0] === 'connected'
		)?.[1] as Listener;
		connectedListener({ port: { id: 'in-1', name: 'Yamaha P-125', type: 'input' } });
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith({
			type: 'connected',
			portKind: 'input',
			id: 'in-1',
			name: 'Yamaha P-125'
		});
	});

	it('forwards a disconnected event with the output port kind', async () => {
		const { enableMidi, watchPorts } = await import('./webmidi');
		await enableMidi();
		const handler = vi.fn();
		watchPorts(handler);
		const disconnectedListener = fakeWebMidi.addListener.mock.calls.find(
			(call) => call[0] === 'disconnected'
		)?.[1] as Listener;
		disconnectedListener({ port: { id: 'out-1', name: 'Yamaha P-125', type: 'output' } });
		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ portKind: 'output' }));
	});

	/**
	 * WR-01. The library resolves `event.port` by id lookup before emitting,
	 * and its lookups return `undefined` on a miss. Because these listeners
	 * run inside a browser-dispatched `statechange` callback, a TypeError here
	 * is uncatchable by app code and freezes MIDI state for the session, so an
	 * unresolvable port must be dropped rather than dereferenced.
	 */
	describe('unresolvable ports are dropped, never dereferenced', () => {
		async function firstListener(
			kind: 'connected' | 'disconnected',
			handler: (event: MidiPortEvent) => void
		): Promise<Listener> {
			const { enableMidi, watchPorts } = await import('./webmidi');
			await enableMidi();
			watchPorts(handler);
			return fakeWebMidi.addListener.mock.calls.find((call) => call[0] === kind)?.[1] as Listener;
		}

		it('does not throw and does not call the handler when port is undefined', async () => {
			const handler = vi.fn();
			const listener = await firstListener('disconnected', handler);
			expect(() => listener({ port: undefined })).not.toThrow();
			expect(handler).not.toHaveBeenCalled();
		});

		it('does not throw and does not call the handler when the event itself has no port key', async () => {
			const handler = vi.fn();
			const listener = await firstListener('connected', handler);
			expect(() => listener({})).not.toThrow();
			expect(handler).not.toHaveBeenCalled();
		});

		it('drops a port with no id (nothing downstream can key on it)', async () => {
			const handler = vi.fn();
			const listener = await firstListener('connected', handler);
			expect(() => listener({ port: { name: 'Nameless', type: 'input' } })).not.toThrow();
			expect(handler).not.toHaveBeenCalled();
		});

		it('drops a port whose type is neither input nor output', async () => {
			const handler = vi.fn();
			const listener = await firstListener('connected', handler);
			expect(() => listener({ port: { id: 'in-1', name: 'X', type: undefined } })).not.toThrow();
			expect(handler).not.toHaveBeenCalled();
		});

		it('still forwards a fully resolved port (the guard is not over-broad)', async () => {
			const handler = vi.fn();
			const listener = await firstListener('connected', handler);
			listener({ port: { id: 'in-1', name: 'Yamaha P-125', type: 'input' } });
			expect(handler).toHaveBeenCalledWith({
				type: 'connected',
				portKind: 'input',
				id: 'in-1',
				name: 'Yamaha P-125'
			});
		});
	});

	it('removes the previous listener pair before registering a new pair (no accumulation)', async () => {
		const { enableMidi, watchPorts } = await import('./webmidi');
		await enableMidi();
		watchPorts(() => {});
		watchPorts(() => {});
		const connectedAddCalls = fakeWebMidi.addListener.mock.calls.filter(
			(call) => call[0] === 'connected'
		);
		const disconnectedAddCalls = fakeWebMidi.addListener.mock.calls.filter(
			(call) => call[0] === 'disconnected'
		);
		const connectedRemoveCalls = fakeWebMidi.removeListener.mock.calls.filter(
			(call) => call[0] === 'connected'
		);
		const disconnectedRemoveCalls = fakeWebMidi.removeListener.mock.calls.filter(
			(call) => call[0] === 'disconnected'
		);
		expect(connectedAddCalls).toHaveLength(2);
		expect(disconnectedAddCalls).toHaveLength(2);
		expect(connectedRemoveCalls).toHaveLength(1);
		expect(disconnectedRemoveCalls).toHaveLength(1);
	});

	it('the returned disposer removes both listeners', async () => {
		const { enableMidi, watchPorts } = await import('./webmidi');
		await enableMidi();
		const dispose = watchPorts(() => {});
		dispose();
		const connectedRemoveCalls = fakeWebMidi.removeListener.mock.calls.filter(
			(call) => call[0] === 'connected'
		);
		const disconnectedRemoveCalls = fakeWebMidi.removeListener.mock.calls.filter(
			(call) => call[0] === 'disconnected'
		);
		expect(connectedRemoveCalls).toHaveLength(1);
		expect(disconnectedRemoveCalls).toHaveLength(1);
	});

	/**
	 * WR-02. A stale disposer must not erase the module's record of the LIVE
	 * listener pair, or the next watchPorts() has nothing to remove and the
	 * superseded pair stays attached alongside the new one forever.
	 */
	it('a stale disposer does not strand the live listener: a later watchPorts still removes the current pair', async () => {
		const { enableMidi, watchPorts } = await import('./webmidi');
		await enableMidi();

		const handlerA = vi.fn();
		const handlerB = vi.fn();
		const handlerC = vi.fn();

		const disposeA = watchPorts(handlerA);
		watchPorts(handlerB);

		// The listener B is currently registered with, captured before the
		// stale disposer runs.
		const bConnected = fakeWebMidi.addListener.mock.calls.filter(
			(call) => call[0] === 'connected'
		)[1][1];

		// A's disposer is now stale: watchPorts(handlerB) already superseded it.
		disposeA();

		fakeWebMidi.removeListener.mockClear();
		watchPorts(handlerC);

		const removedConnected = fakeWebMidi.removeListener.mock.calls
			.filter((call) => call[0] === 'connected')
			.map((call) => call[1]);
		expect(removedConnected).toContain(bConnected);

		// Proof of the consequence, not just the bookkeeping: exactly one
		// handler is still live, and it is C.
		const cConnected = fakeWebMidi.addListener.mock.calls.filter(
			(call) => call[0] === 'connected'
		)[2][1] as Listener;
		cConnected({ port: { id: 'in-1', name: 'Yamaha P-125', type: 'input' } });
		expect(handlerC).toHaveBeenCalledTimes(1);
		expect(handlerB).not.toHaveBeenCalled();
		expect(handlerA).not.toHaveBeenCalled();
	});
});

describe('activeInput', () => {
	beforeEach(() => {
		Object.defineProperty(navigator, 'requestMIDIAccess', {
			value: () => Promise.resolve({}),
			configurable: true
		});
		fakeWebMidi.enable.mockReset();
		fakeWebMidi.inputs = [];
	});

	afterEach(() => {
		Reflect.deleteProperty(navigator, 'requestMIDIAccess');
	});

	it('returns null before any successful enableMidi()', async () => {
		const { activeInput } = await import('./webmidi');
		expect(activeInput('in-1')).toBeNull();
	});

	it('returns the matching raw input after a successful enableMidi(), and null for an unknown id', async () => {
		fakeWebMidi.enable.mockResolvedValue(undefined);
		const rawInput = { id: 'in-1', name: 'Yamaha P-125', manufacturer: 'Yamaha', type: 'input' };
		fakeWebMidi.inputs = [rawInput];
		const { enableMidi, activeInput } = await import('./webmidi');
		await enableMidi();
		expect(activeInput('in-1')).toBe(rawInput);
		expect(activeInput('nope')).toBeNull();
	});
});
