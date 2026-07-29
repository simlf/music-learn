import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import type { DetectFrame } from '$lib/audio/chromaDetector';

/**
 * MicCheckPanel is the opt-in "check it on your piano" panel (Spike 025).
 * `$lib/audio/micInput` and `$lib/audio/audio` are mocked here entirely, so
 * this never touches a real getUserMedia/AudioContext - only the Svelte
 * lifecycle and state machine are under test. Teardown gets the heaviest
 * coverage: a microphone left open is the worst bug this feature could ship.
 */

interface FakeSession {
	ok: true;
	stop: () => void;
}
interface FakeUnavailable {
	ok: false;
	reason: string;
}

let micAvailable = true;
let micReason: string | null = null;
let stopCalls = 0;
let lastOnFrame: ((frame: DetectFrame) => void) | null = null;
let startCalls = 0;
/** When set, startMicSession returns this instead of an immediate success. */
let nextStartResult: FakeSession | FakeUnavailable | 'defer' = { ok: true, stop: () => {} };
let deferredResolve: ((result: FakeSession | FakeUnavailable) => void) | null = null;

vi.mock('$lib/audio/micInput', () => ({
	isMicAvailable: () => micAvailable,
	micUnavailableReason: () => micReason,
	startMicSession: (onFrame: (frame: DetectFrame) => void) => {
		startCalls += 1;
		lastOnFrame = onFrame;
		if (nextStartResult === 'defer') {
			return new Promise((resolve) => {
				deferredResolve = resolve;
			});
		}
		return Promise.resolve(nextStartResult);
	}
}));

let appAudioActive = false;
vi.mock('$lib/audio/audio', () => ({
	isAppAudioActive: () => appAudioActive
}));

const { default: MicCheckPanel } = await import('./MicCheckPanel.svelte');

const CM7 = spellChord('Cm7'); // required chroma {0, 3, 10}, ignored {7} (the perfect fifth)

function goodFrame(): DetectFrame {
	const chroma = new Float32Array(12);
	chroma[0] = 1;
	chroma[3] = 0.9;
	chroma[10] = 0.8;
	return { chroma, notes: [{ midi: 48, strength: 1 }], peak: 0.5 };
}

function silentFrame(): DetectFrame {
	return { chroma: new Float32Array(12), notes: [], peak: 0 };
}

async function clickStart(): Promise<void> {
	await fireEvent.click(screen.getByTestId('mic-check-start'));
}

beforeEach(() => {
	micAvailable = true;
	micReason = null;
	stopCalls = 0;
	startCalls = 0;
	lastOnFrame = null;
	deferredResolve = null;
	nextStartResult = { ok: true, stop: () => (stopCalls += 1) };
	appAudioActive = false;
});

afterEach(() => {
	cleanup();
});

describe('never auto-starts', () => {
	it('does not call startMicSession merely by mounting', () => {
		render(MicCheckPanel, { chord: CM7 });
		expect(startCalls).toBe(0);
		expect(screen.getByTestId('mic-check-start')).toBeInTheDocument();
	});
});

describe('graceful degradation', () => {
	it('shows a calm message and no start control when the mic is unavailable', () => {
		micAvailable = false;
		micReason = 'unsupported';
		render(MicCheckPanel, { chord: CM7 });
		expect(screen.getByTestId('mic-check-status')).toBeInTheDocument();
		expect(screen.queryByTestId('mic-check-start')).not.toBeInTheDocument();
	});

	it('shows a calm message when permission is denied after the user asks', async () => {
		nextStartResult = { ok: false, reason: 'permission-denied' };
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		expect(screen.getByTestId('mic-check-status').textContent).toMatch(/denied/i);
		expect(screen.queryByTestId('mic-check-stop')).not.toBeInTheDocument();
	});

	it('shows a calm message on an insecure context', async () => {
		nextStartResult = { ok: false, reason: 'insecure-context' };
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		expect(screen.getByTestId('mic-check-status').textContent).toMatch(/secure/i);
	});
});

describe('honesty about the fifth', () => {
	it('always states the fifth-verification limitation, regardless of listening state', () => {
		render(MicCheckPanel, { chord: CM7 });
		expect(screen.getByTestId('mic-check-fifth-note').textContent).toMatch(/fifth/i);
	});
});

describe('listening and confirming', () => {
	it('starts only after the button is clicked, and shows Stop while listening', async () => {
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		expect(startCalls).toBe(1);
		expect(screen.getByTestId('mic-check-stop')).toBeInTheDocument();
		expect(screen.queryByTestId('mic-check-start')).not.toBeInTheDocument();
	});

	it('confirms once enough consecutive matching frames arrive', async () => {
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		expect(lastOnFrame).not.toBeNull();
		for (let i = 0; i < 3; i++) lastOnFrame!(goodFrame());
		await waitFor(() =>
			expect(screen.getByTestId('mic-check-status').textContent).toMatch(/yes/i)
		);
	});

	it('reports a missing required note by name before enough frames arrive', async () => {
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		const incompleteFrame: DetectFrame = {
			chroma: (() => {
				const c = new Float32Array(12);
				c[0] = 1; // root only, missing the third and seventh
				return c;
			})(),
			notes: [],
			peak: 0.5
		};
		lastOnFrame!(incompleteFrame);
		await waitFor(() =>
			expect(screen.getByTestId('mic-check-status').textContent).toMatch(/not yet/i)
		);
	});

	it('shows a live "hearing" readout of picked notes while listening', async () => {
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		lastOnFrame!(goodFrame());
		await waitFor(() => expect(screen.getByTestId('mic-check-heard').textContent).toMatch(/C3/));
	});

	it('never confirms while the app is playing its own audio, and shows the paused state instead', async () => {
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		appAudioActive = true;
		for (let i = 0; i < 6; i++) lastOnFrame!(goodFrame());
		await waitFor(() =>
			expect(screen.getByTestId('mic-check-status').textContent).toMatch(/paused/i)
		);
	});

	it('a silent room never confirms', async () => {
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		for (let i = 0; i < 5; i++) lastOnFrame!(silentFrame());
		expect(screen.getByTestId('mic-check-status').textContent).not.toMatch(/yes/i);
	});
});

describe('teardown: the load-bearing part', () => {
	it('stops and releases the session on an explicit Stop click', async () => {
		render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		await fireEvent.click(screen.getByTestId('mic-check-stop'));
		expect(stopCalls).toBe(1);
		expect(screen.getByTestId('mic-check-start')).toBeInTheDocument();
	});

	it('stops and releases the session on unmount, with no explicit Stop click', async () => {
		const { unmount } = render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		expect(stopCalls).toBe(0);
		unmount();
		expect(stopCalls).toBe(1);
	});

	it('never double-releases when Stop is clicked and the component is then unmounted', async () => {
		const { unmount } = render(MicCheckPanel, { chord: CM7 });
		await clickStart();
		await fireEvent.click(screen.getByTestId('mic-check-stop'));
		expect(stopCalls).toBe(1);
		unmount();
		expect(stopCalls).toBe(1);
	});

	it('a session that resolves AFTER the component unmounted is stopped immediately rather than left running', async () => {
		nextStartResult = 'defer';
		const { unmount } = render(MicCheckPanel, { chord: CM7 });
		await fireEvent.click(screen.getByTestId('mic-check-start'));
		expect(deferredResolve).not.toBeNull();

		unmount();
		// The permission prompt / session resolves only now, after teardown.
		let released = false;
		deferredResolve!({
			ok: true,
			stop: () => {
				released = true;
			}
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(released).toBe(true);
	});
});
