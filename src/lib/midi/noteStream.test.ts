import { beforeEach, describe, expect, it, vi } from 'vitest';

let deviceId: string | null = null;
const listeners = new Map<string, Set<(e: unknown) => void>>();
const input = {
	addListener: vi.fn((type: string, fn: (e: unknown) => void) => {
		if (!listeners.has(type)) listeners.set(type, new Set());
		listeners.get(type)!.add(fn);
	}),
	removeListener: vi.fn((type: string, fn: (e: unknown) => void) => {
		listeners.get(type)?.delete(fn);
	})
};

vi.mock('./midi.svelte', () => ({ connectedDeviceId: () => deviceId }));
vi.mock('./webmidi', () => ({ activeInput: (id: string) => (id === 'piano' ? input : null) }));

import { listenNotes } from './noteStream';

function emit(e: unknown) {
	for (const fn of listeners.get('noteon') ?? []) fn(e);
}

describe('listenNotes', () => {
	beforeEach(() => {
		deviceId = 'piano';
		listeners.clear();
		input.addListener.mockClear();
		input.removeListener.mockClear();
	});

	it('delivers note numbers and velocity from the connected input', () => {
		const got: unknown[] = [];
		listenNotes((e) => got.push(e));
		emit({ note: { number: 62 }, velocity: 0.5 });
		expect(got).toEqual([{ midi: 62, velocity: 0.5 }]);
	});

	it('falls back to the raw velocity when the normalized one is absent', () => {
		const got: { velocity: number }[] = [];
		listenNotes((e) => got.push(e));
		emit({ note: { number: 60 }, rawVelocity: 127 });
		expect(got[0].velocity).toBe(1);
	});

	it('drops velocity-0 note-ons, which are note-offs in disguise', () => {
		const got: unknown[] = [];
		listenNotes((e) => got.push(e));
		emit({ note: { number: 60 }, velocity: 0 });
		emit({ note: { number: 60 }, rawVelocity: 0 });
		expect(got).toEqual([]);
	});

	it('detaches exactly its own listener', () => {
		const stop = listenNotes(() => {});
		expect(listeners.get('noteon')?.size).toBe(1);
		stop();
		expect(listeners.get('noteon')?.size).toBe(0);
		expect(input.removeListener).toHaveBeenCalledTimes(1);
	});

	it('is a safe no-op with no device connected', () => {
		deviceId = null;
		const stop = listenNotes(() => {});
		expect(input.addListener).not.toHaveBeenCalled();
		expect(() => stop()).not.toThrow();
	});

	it('is a safe no-op when the selected device has vanished', () => {
		deviceId = 'ghost';
		expect(() => listenNotes(() => {})()).not.toThrow();
		expect(input.addListener).not.toHaveBeenCalled();
	});

	it('does not throw if the device is already gone when disposing', () => {
		input.removeListener.mockImplementationOnce(() => {
			throw new Error('gone');
		});
		const stop = listenNotes(() => {});
		expect(() => stop()).not.toThrow();
	});
});
