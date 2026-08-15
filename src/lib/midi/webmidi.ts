import type { Input } from 'webmidi';

/**
 * Thin webmidi.js plumbing for MIDI device connection. Every state-machine
 * decision lives in midi.svelte.ts (pure-ish, event-driven); this module's
 * only job is wiring WebMidi.enable()/inputs/events.
 *
 * Merely importing this module touches no browser API: every
 * navigator/window/WebMidi reference lives inside a function body, never at
 * module scope. The `webmidi` package itself is reached through a lazy
 * dynamic import, so adapter-static's strict prerender (run under Node,
 * where `navigator` does not exist) can never execute it, and the library
 * stays out of the INITIAL CLIENT BUNDLE: it is emitted as its own chunk,
 * referenced only from an `import()` call site, with no `modulepreload` link
 * in the prerendered HTML. So no browser parses or executes it before a user
 * asks to connect.
 *
 * WHAT THIS DOES *NOT* BUY, contrary to the obvious assumption: it does not
 * keep the bytes off browsers that can never use Web MIDI. The service worker
 * precaches every hashed build chunk at install time
 * (`installPrecacheList()`/`cache.addAll(PRECACHE)` in `src/service-worker.ts`),
 * and that runs on every platform with service-worker support - Safari and iOS
 * included. So a Safari user does download this chunk, just never runs it.
 * Excluding it from the precache list would need a stable filename marker to
 * filter on, and SvelteKit treats `build.rollupOptions.output.chunkFileNames`
 * as enforced config (client chunks are hash-only, `[hash].js`), so there is
 * no name to match without fighting the framework. Deliberately left as is:
 * the download is ~68KB once per deploy on a browser that will not execute it,
 * which is a real but small cost, and it also means the gesture-path warm-up
 * (`prewarmMidi()`) is free on any repeat visit.
 */

export type MidiUnsupportedReason = 'no-window' | 'unsupported';

export type MidiConnectFailure = 'unsupported' | 'permission-denied' | 'unknown';

export interface MidiInputInfo {
	id: string;
	name: string;
	manufacturer: string;
}

export type MidiPortKind = 'input' | 'output';

export interface MidiPortEvent {
	type: 'connected' | 'disconnected';
	portKind: MidiPortKind;
	id: string;
	name: string;
}

export type MidiEnableResult =
	| { ok: true; inputs: MidiInputInfo[] }
	| { ok: false; reason: MidiConnectFailure };

/** Minimal shape of the `webmidi` package namespace this module relies on. */
interface WebMidiNamespace {
	enable(options: { sysex: boolean }): Promise<unknown>;
	inputs: Array<{ id: string; name?: string; manufacturer?: string }>;
	addListener(event: 'connected' | 'disconnected', handler: (event: PortChangeEvent) => void): void;
	removeListener(
		event: 'connected' | 'disconnected',
		handler: (event: PortChangeEvent) => void
	): void;
}

/**
 * The shape of a webmidi.js `connected`/`disconnected` event, typed to what
 * the library actually GUARANTEES rather than to what is convenient.
 *
 * `port` is optional on purpose. The library populates it by lookup before
 * emitting (`_onInterfaceStateChange` assigns `event.port = this.getInputById(...)`
 * / `getOutputById(...)`), and those lookups return `undefined` on a miss
 * rather than throwing - the disconnect branch searches `_disconnectedInputs`,
 * which is only populated once the backend has already dropped the port from
 * `MIDIAccess.inputs`. A miss therefore emits an event with no `port`, and a
 * `TypeError` raised here would be raised from inside a browser-dispatched
 * `statechange` callback: app code cannot catch it, the remaining listener
 * work is abandoned, and MIDI state freezes for the rest of the session.
 */
interface PortChangeEvent {
	port?: { id?: string; name?: string; type?: MidiPortKind };
}

/** Cached package namespace, populated once `enableMidi()` has succeeded. */
let webMidiNamespace: WebMidiNamespace | null = null;

/** Module-scope pair of registered `watchPorts` listeners, so a second call cannot accumulate duplicates. */
let registeredConnected: ((event: PortChangeEvent) => void) | null = null;
let registeredDisconnected: ((event: PortChangeEvent) => void) | null = null;

/** True when this environment can plausibly expose Web MIDI at all. */
export function isMidiSupported(): boolean {
	return midiUnsupportedReason() === null;
}

/** Why Web MIDI is unavailable in this environment, or null when it should work. */
export function midiUnsupportedReason(): MidiUnsupportedReason | null {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'no-window';
	if (typeof navigator.requestMIDIAccess !== 'function') return 'unsupported';
	return null;
}

export function mapEnableError(err: unknown): MidiConnectFailure {
	const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : '';
	if (name === 'SecurityError' || name === 'NotAllowedError') return 'permission-denied';
	if (name === 'NotSupportedError') return 'unsupported';
	const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
	if (message.toLowerCase().includes('permission')) return 'permission-denied';
	return 'unknown';
}

/**
 * The browser's PERSISTED MIDI permission decision, or null when it cannot be
 * determined.
 *
 * Null covers every "do not know, so do not act on it" case and they are all
 * normal: Firefox does not accept `'midi'` as a Permissions API name and
 * throws, and `navigator.permissions` is absent entirely in some environments.
 * Callers must treat null as "go ahead and ask", never as a denial.
 *
 * `'midi' as PermissionName` is a cast because the DOM lib's PermissionName
 * union does not list it; the name is spec'd by Web MIDI, not by the
 * Permissions API spec, which is why the try/catch above is load-bearing
 * rather than defensive noise.
 */
async function midiPermissionState(): Promise<PermissionState | null> {
	try {
		const permissions = navigator.permissions;
		if (!permissions?.query) return null;
		const status = await permissions.query({ name: 'midi' as PermissionName });
		return status.state;
	} catch {
		return null;
	}
}

/**
 * Requests note-level Web MIDI access (never system-exclusive: this app has
 * no sysex use case) and resolves the app's own flat DTO for every connected
 * input. Guards on feature detection first, so no permission prompt and no
 * device-enumeration fingerprinting surface is ever reached on an
 * unsupported environment.
 */
export async function enableMidi(): Promise<MidiEnableResult> {
	const reason = midiUnsupportedReason();
	if (reason) return { ok: false, reason: 'unsupported' };

	/*
	 * A persistently blocked permission is checked BEFORE anything else,
	 * because `WebMidi.enable()` only short-circuits when it is already
	 * enabled: otherwise it calls `navigator.requestMIDIAccess()` again, which
	 * Chrome auto-rejects against a blocked permission with no prompt at all.
	 * The user taps a chip that looks actionable, nothing observable happens,
	 * and they are never told the fix lives in site settings. Detecting the
	 * block here turns that into an immediate, honest `denied` with no wasted
	 * request, and `MidiStatus.svelte` pairs it with the recovery copy.
	 *
	 * This `await` does NOT reintroduce the gesture-path problem `prewarmMidi()`
	 * exists to solve: `permissions.query()` answers from state the browser
	 * already holds, with no network involved, so the transient-activation
	 * window is not at risk the way a cold ~68KB chunk fetch would be.
	 */
	if ((await midiPermissionState()) === 'denied') {
		return { ok: false, reason: 'permission-denied' };
	}

	try {
		const mod = await loadWebMidi();
		await mod.enable({ sysex: false });
		webMidiNamespace = mod;
		const inputs: MidiInputInfo[] = mod.inputs.map((input) => ({
			id: input.id,
			name: input.name ?? '',
			manufacturer: input.manufacturer ?? ''
		}));
		return { ok: true, inputs };
	} catch (err) {
		return { ok: false, reason: mapEnableError(err) };
	}
}

/**
 * Registers exactly one `connected` and one `disconnected` listener,
 * forwarding each as a `MidiPortEvent`. Removes any pair this module
 * previously registered before adding the new pair, so repeated calls can
 * never accumulate duplicate hot-plug handlers. Returns a disposer that
 * removes both listeners and clears the module-scope references.
 */
export function watchPorts(handler: (event: MidiPortEvent) => void): () => void {
	if (!webMidiNamespace) return () => {};

	const namespace = webMidiNamespace;

	if (registeredConnected) namespace.removeListener('connected', registeredConnected);
	if (registeredDisconnected) namespace.removeListener('disconnected', registeredDisconnected);

	/**
	 * One factory for both directions, so the guard below can never be added
	 * to the `connected` branch and forgotten on the `disconnected` one.
	 *
	 * An event whose port the library could not resolve tells us nothing about
	 * which device changed, and the reducer downstream keys every decision on
	 * the port id, so dropping such an event is strictly better than throwing
	 * inside a browser event dispatch (see PortChangeEvent above).
	 */
	const forward = (type: 'connected' | 'disconnected') => (event: PortChangeEvent) => {
		const port = event?.port;
		if (!port || !port.id) return;
		if (port.type !== 'input' && port.type !== 'output') return;
		handler({ type, portKind: port.type, id: port.id, name: port.name ?? '' });
	};

	const onConnected = forward('connected');
	const onDisconnected = forward('disconnected');

	namespace.addListener('connected', onConnected);
	namespace.addListener('disconnected', onDisconnected);
	registeredConnected = onConnected;
	registeredDisconnected = onDisconnected;

	return () => {
		namespace.removeListener('connected', onConnected);
		namespace.removeListener('disconnected', onDisconnected);
		// Only clear the module refs if THIS pair is still the registered pair.
		// A stale disposer (from a call that a later watchPorts() already
		// superseded) that nulled them unconditionally would erase the record
		// of the live pair, and the next watchPorts() would then have nothing
		// to remove - leaving the superseded listener attached alongside the
		// new one forever, which is exactly the accumulation this module's
		// contract promises cannot happen.
		if (registeredConnected === onConnected) registeredConnected = null;
		if (registeredDisconnected === onDisconnected) registeredDisconnected = null;
	};
}

/**
 * Returns the raw webmidi `Input` for `id`, or `null` before any successful
 * `enableMidi()` or when no input matches. This is the documented Phase 39
 * seam: Phase 39 attaches noteon/noteoff listeners to this Input, and
 * Phase 38 never reads a single note event.
 */
export function activeInput(id: string): Input | null {
	if (!webMidiNamespace) return null;
	const match = webMidiNamespace.inputs.find((input) => input.id === id);
	return (match as Input | undefined) ?? null;
}

/**
 * Memoised lazy load of the `webmidi` package.
 *
 * The memo is what keeps `enableMidi()`'s `await` from costing a network round
 * trip: once this promise exists, the `await` resolves from the microtask
 * queue, so `mod.enable()` (and therefore
 * `navigator.requestMIDIAccess()`) still runs in the same task as the user
 * gesture that asked for it. Without it, the chunk fetch sits between the
 * click and the permission call, which on a cold cache over a slow link is
 * seconds - well past the ~5s transient-activation window a browser could
 * legitimately start enforcing on `requestMIDIAccess`. Chrome does not
 * require user activation there today, so nothing is currently broken; this
 * is what stops "gesture-gated" from depending on that staying true.
 */
let modPromise: Promise<WebMidiNamespace> | null = null;

function loadWebMidi(): Promise<WebMidiNamespace> {
	modPromise ??= import('webmidi')
		.then((m) => m.WebMidi as unknown as WebMidiNamespace)
		.catch((err: unknown) => {
			// One failed fetch (offline, transient error) must not poison every
			// later attempt, so the memo is dropped before the rejection is
			// re-thrown for enableMidi() to map into a connection state.
			modPromise = null;
			throw err;
		});
	return modPromise;
}

/**
 * Starts the lazy `webmidi` fetch without requesting anything.
 *
 * Requests NO permission, touches no device, and enumerates nothing: it only
 * warms the module so a later gesture-driven `enableMidi()` does not have to
 * wait on the network. Feature-detect-gated, so a browser that can never use
 * Web MIDI (Safari, every iOS browser) never fetches the chunk from here.
 * Safe to call more than once; the memo above makes repeat calls free.
 */
export function prewarmMidi(): void {
	if (midiUnsupportedReason()) return;
	// A failed warm-up is deliberately silent: it is not an app error, and
	// loadWebMidi() has already dropped its memo so the real, gesture-driven
	// load retries and surfaces its own failure as a connection state.
	void loadWebMidi().catch(() => {});
}
