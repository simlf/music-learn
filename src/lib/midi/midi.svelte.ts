import { browser } from '$app/environment';
import { enableMidi, midiUnsupportedReason, prewarmMidi, watchPorts } from './webmidi';
import type { MidiEnableResult, MidiPortEvent } from './webmidi';

/**
 * Reactive session-wide MIDI connection state (Plan 38-02, MIDI-01/MIDI-04).
 *
 * A `.svelte.ts` module (not plain `.ts`) so the module-level `$state` below
 * is genuinely reactive across every consumer - a plain `.ts` file's
 * module-level `$state` is not reactive in Svelte 5. This mirrors the three
 * existing instances of the idiom in this codebase: `swUpdate.svelte.ts`
 * (PWA update-ready state), `locale.svelte.ts` (EN/FR toggle), and
 * `dueBadge.svelte.ts` (due-card count).
 *
 * Every decision about wiring the `webmidi` package itself lives in
 * `webmidi.ts`; this module only translates its events/results into one
 * live connection state and exposes the two calls the rest of the app needs:
 * `connectedDeviceId()` (Phase 39's note-stream seam, alongside `webmidi.ts`'s
 * `activeInput()`) and `connectMidi()` (the one gesture-gated entry point
 * that may ever request MIDI access).
 */
export type MidiConnectionState =
	| { kind: 'unsupported' }
	| { kind: 'idle' }
	| { kind: 'enabling' }
	| { kind: 'connected'; deviceId: string; deviceName: string }
	| { kind: 'no-device' }
	| { kind: 'disconnected' }
	| { kind: 'denied' }
	| { kind: 'error' };

/**
 * Maps plan 38-01's guard-first enable result onto the connection-state
 * union. The first input in the list wins (single-instrument app: the first
 * attached input is the one the user plays).
 *
 * PORT-SELECTION POLICY, shared with `nextMidiState` below: FIRST PORT WINS.
 * Both entry points must agree, because a single USB instrument routinely
 * exposes more than one input port (a keys port plus a second "MIDI IN 2"/DAW
 * port), and webmidi.js emits one `connected` event PER PORT. If this function
 * picked `inputs[0]` while the reducer let the last event win, the two paths
 * could select different ports for the same physical piano - a nondeterministic
 * display name and, worse, a nondeterministic target for Phase 39's note
 * stream. So: this path takes the first input in the list, and the reducer
 * refuses to let a later port displace an already-selected one.
 */
export function stateFromEnable(result: MidiEnableResult): MidiConnectionState {
	if (!result.ok) {
		if (result.reason === 'permission-denied') return { kind: 'denied' };
		if (result.reason === 'unsupported') return { kind: 'unsupported' };
		return { kind: 'error' };
	}
	const first = result.inputs[0];
	if (!first) return { kind: 'no-device' };
	return { kind: 'connected', deviceId: first.id, deviceName: first.name };
}

/**
 * The single reducer translating a `MidiPortEvent` into the next connection
 * state. Applies, in order:
 *  1. Unsupported is terminal (MIDI-04's mechanical guarantee): no event can
 *     ever move an unsupported browser off `unsupported`.
 *  2. Output ports are irrelevant to answering drills; ignore them.
 *  3. DEVICE IDENTITY IS PART OF EVERY DECISION. webmidi.js documents that
 *     `connected`/`disconnected` "may fire several times if a device
 *     possesses multiple inputs and/or outputs (which is often the case)",
 *     so an event's `id` must be compared with the currently selected
 *     `deviceId` before it is allowed to change anything:
 *       - a `connected` event for a DIFFERENT port while one is already
 *         selected is not a device change, it is that instrument's second
 *         port announcing itself, so it must not silently hijack
 *         `connectedDeviceId()` (Phase 39's note-stream target);
 *       - a `connected` event for the SAME port is a re-announcement
 *         (sleep/wake, port re-open) and is a no-op;
 *       - a `disconnected` event for a DIFFERENT port cannot clear us: only
 *         the port we are actually using can disconnect us. Without this,
 *         unplugging any other controller would read as "MIDI: DISCONNECTED"
 *         with the piano still plugged in, and kill the note stream.
 *     This is the same FIRST-PORT-WINS policy `stateFromEnable` applies; the
 *     two paths must never disagree about which port is "the" device.
 *  4. A `disconnected` input event only produces `disconnected` when the
 *     current state actually was `connected` - this is what keeps "never
 *     saw a device" (`no-device`/`idle`) distinct from "was connected, now
 *     is not" (`disconnected`); a stray disconnect on a state that never saw
 *     a device must not invent a disconnected reading.
 *
 * Returns the identical `current` reference (not a copy) on every no-change
 * path, so a caller can assert reference equality and a reactive consumer
 * never re-renders for a no-op.
 */
export function nextMidiState(
	current: MidiConnectionState,
	event: MidiPortEvent
): MidiConnectionState {
	if (current.kind === 'unsupported') return current;
	if (event.portKind !== 'input') return current;

	if (event.type === 'connected') {
		// An established device is never stolen, and never re-published for a
		// duplicate announcement of itself: either way this event tells us
		// nothing new about which port the user is playing.
		if (current.kind === 'connected') return current;
		return { kind: 'connected', deviceId: event.id, deviceName: event.name };
	}

	// event.type === 'disconnected'
	if (current.kind !== 'connected') return current;
	if (current.deviceId !== event.id) return current;
	return { kind: 'disconnected' };
}

/**
 * Module-scope reactive state. The initial value is deliberately the most
 * conservative one so adapter-static's prerender emits no MIDI markup and
 * MIDI-04 holds before any client code (let alone hydration) runs.
 */
let state = $state<MidiConnectionState>({ kind: 'unsupported' });

/**
 * The current connection state. Reading this inside a template or a
 * `$derived` is what makes a masthead status chip live.
 */
export function midiState(): MidiConnectionState {
	return state;
}

/** Sets the current connection state directly. This is also the test seam, mirroring `setUpdateAvailable`. */
export function setMidiState(next: MidiConnectionState): void {
	state = next;
}

/**
 * Returns the connected device's id, or null for every other state. Paired
 * with plan 38-01's `activeInput(id)`, this is the complete Phase 39
 * note-stream seam: Phase 39 resolves the raw Input from these two calls and
 * attaches its own note listeners, without this module gaining any
 * note-level code.
 */
export function connectedDeviceId(): string | null {
	return state.kind === 'connected' ? state.deviceId : null;
}

// Guards initMidi() so a second layout mount (or a second onMount call) is a
// no-op, mirroring swUpdate.svelte.ts's `reloaded` once-per-page-load guard.
let initialized = false;

/**
 * Browser-only, feature-detect-ONLY initializer. Safe to call more than
 * once from the root layout's `onMount` (mirrors `initLocale()`): a second
 * call, or a call while already connected/enabling, is a no-op.
 *
 * This function must never request MIDI access. Auto-requesting on mount
 * would surface a permission prompt on a first-ever visit with no context,
 * and as of the Chrome 124 change that prompt covers all MIDI access, not
 * only system-exclusive access. `MicCheckPanel.svelte` already refuses to
 * auto-start the microphone for exactly this reason; this module follows it.
 *
 * It does, on a supported browser only, WARM the lazy `webmidi` chunk
 * (`prewarmMidi()`). That requests nothing and enumerates nothing - it just
 * moves the chunk fetch off the gesture path, so the later
 * `navigator.requestMIDIAccess()` runs in the same task as the click that
 * asked for it rather than seconds after it on a cold cache. Safari/iOS never
 * reaches it: `prewarmMidi()` is itself feature-detect-gated.
 */
export function initMidi(): void {
	if (!browser) return;
	if (initialized) return;
	initialized = true;

	// A remount must never drop a live connection or interrupt an in-flight
	// connect attempt.
	if (state.kind === 'connected' || state.kind === 'enabling') return;

	if (midiUnsupportedReason()) {
		setMidiState({ kind: 'unsupported' });
		return;
	}

	setMidiState({ kind: 'idle' });
	prewarmMidi();
}

// Bumped on every connectMidi() call, so an enableMidi() promise resolving
// after a newer call started (or after the user moved on) never writes
// stale state. Mirrors MicCheckPanel.svelte's `intent` guard.
let intent = 0;

// True once watchPorts() has been called for this app session. Subscribing
// once per session (never per component mount, never per connect attempt)
// is what keeps hot-plug handlers from accumulating, and keeping the
// subscription alive across a disconnect is what lets a re-plug return to
// connected with no second tap and no reload.
let watching = false;

/**
 * The only function in the app that may request MIDI access, and only ever
 * from a user gesture handler (wired in plan 38-03). Idempotent: calling
 * this while already `enabling` or `connected` is a no-op re-entrancy guard
 * against a duplicate prompt.
 */
export async function connectMidi(): Promise<void> {
	if (!browser) return;

	if (midiUnsupportedReason()) {
		setMidiState({ kind: 'unsupported' });
		return;
	}

	if (state.kind === 'enabling' || state.kind === 'connected') return;

	const mine = ++intent;
	setMidiState({ kind: 'enabling' });

	const result: MidiEnableResult = await enableMidi();

	if (mine !== intent) return;

	setMidiState(stateFromEnable(result));

	if (result.ok && !watching) {
		watching = true;
		watchPorts((event) => {
			setMidiState(nextMidiState(midiState(), event));
		});
	}
}
