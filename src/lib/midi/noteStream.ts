import { connectedDeviceId } from './midi.svelte';
import { activeInput } from './webmidi';

/**
 * The note-on stream of the connected MIDI instrument: the seam the Phase 38
 * connection code left for play-to-answer. It only LISTENS; connecting still
 * goes through `connectMidi()` from a user gesture.
 *
 * `listenNotes` attaches to whichever input is currently selected. Velocity 0
 * note-ons (a running-status note-off some keyboards send) are not notes and
 * are dropped. Returns a disposer that detaches exactly the listener it added.
 */
export interface NoteOnEvent {
	/** MIDI note number, C4 = 60. */
	midi: number;
	/** 0 to 1. */
	velocity: number;
}

interface NoteOnLike {
	note: { number: number };
	rawVelocity?: number;
	velocity?: number;
}

export function listenNotes(handler: (event: NoteOnEvent) => void): () => void {
	const id = connectedDeviceId();
	const input = id === null ? null : activeInput(id);
	if (!input) return () => {};
	const listener = (e: unknown): void => {
		const ev = e as NoteOnLike;
		const velocity = typeof ev.velocity === 'number' ? ev.velocity : (ev.rawVelocity ?? 0) / 127;
		if (velocity <= 0) return;
		handler({ midi: ev.note.number, velocity });
	};
	input.addListener('noteon', listener);
	return () => {
		try {
			input.removeListener('noteon', listener);
		} catch {
			// The device may already be gone.
		}
	};
}
