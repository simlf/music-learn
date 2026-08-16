import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The audio engine is tested entirely against a mocked 'tone' module: no
 * AudioContext, no Tone construction, ever (jsdom has neither). audio.ts
 * only ever loads tone via a lazy dynamic import, which Vitest intercepts
 * with the factory below.
 */

interface FakeInstrument {
	triggerAttackRelease: ReturnType<typeof vi.fn>;
	triggerAttack: ReturnType<typeof vi.fn>;
	triggerRelease: ReturnType<typeof vi.fn>;
	releaseAll: ReturnType<typeof vi.fn>;
	toDestination: () => FakeInstrument;
}

interface FakeSampler extends FakeInstrument {
	options: {
		urls: Record<string, string>;
		baseUrl: string;
		release: number;
		onload: () => void;
		onerror: (error: Error) => void;
	};
}

const mockTone = vi.hoisted(() => ({
	start: vi.fn(async () => {}),
	context: { lookAhead: 0.1 },
	synths: [] as unknown[],
	samplers: [] as unknown[]
}));

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
		constructor(options: FakeSampler['options']) {
			const instrument = Object.assign(makeInstrument(), { options });
			mockTone.samplers.push(instrument);
			return instrument as unknown as Sampler;
		}
	}
	return {
		start: () => mockTone.start(),
		getContext: () => mockTone.context,
		PolySynth,
		Synth: class {},
		Sampler
	};
});

import {
	_resetForTests,
	audioState,
	ensureAudioReady,
	isAppAudioActive,
	noteOff,
	noteOn,
	playArpeggio,
	playChord,
	playNote,
	playNotesOverChord,
	chordDemoActive,
	stopChordDemo,
	releaseAll,
	setSoundEnabled,
	setStudyModeEnabled,
	soundEnabled,
	studyModeEnabled
} from './audio';
import { toAscendingPitches } from './voicing';

/** Lets every queued ensureReady -> play chain settle. */
function flush(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function synth(index = 0): FakeInstrument {
	return mockTone.synths[index] as FakeInstrument;
}

function sampler(index = 0): FakeSampler {
	return mockTone.samplers[index] as FakeSampler;
}

beforeEach(() => {
	localStorage.clear();
	mockTone.start.mockClear();
	mockTone.context.lookAhead = 0.1;
	mockTone.synths.length = 0;
	mockTone.samplers.length = 0;
	_resetForTests();
});

describe('import safety (jsdom)', () => {
	it('merely importing the module and reading state constructs no Tone objects', () => {
		expect(soundEnabled()).toBe(true);
		expect(audioState()).toEqual({ instrument: 'synth', samplesLoaded: false });
		expect(mockTone.synths).toHaveLength(0);
		expect(mockTone.samplers).toHaveLength(0);
		expect(mockTone.start).not.toHaveBeenCalled();
	});
});

describe('ensureAudioReady', () => {
	it('loads tone, kills the lookAhead scheduling delay, unlocks the context, and builds synth + sampler', async () => {
		await ensureAudioReady();

		expect(mockTone.start).toHaveBeenCalled();
		expect(mockTone.context.lookAhead).toBe(0);
		expect(mockTone.synths).toHaveLength(1);
		expect(mockTone.samplers).toHaveLength(1);
	});

	it('is idempotent: repeated calls never build a second synth or sampler', async () => {
		await ensureAudioReady();
		await ensureAudioReady();
		await ensureAudioReady();

		expect(mockTone.synths).toHaveLength(1);
		expect(mockTone.samplers).toHaveLength(1);
	});

	it('points the sampler at the self-hosted Salamander set (30 files, minor-third spacing)', async () => {
		await ensureAudioReady();

		const { options } = sampler();
		expect(options.baseUrl).toBe('/samples/salamander/');
		expect(Object.keys(options.urls)).toHaveLength(30);
		expect(options.urls['A0']).toBe('A0.mp3');
		expect(options.urls['D#4']).toBe('Ds4.mp3');
		expect(options.urls['F#2']).toBe('Fs2.mp3');
		expect(options.urls['C8']).toBe('C8.mp3');
	});
});

describe('playNote', () => {
	/**
	 * Play calls await sample loading before choosing an instrument, so a play
	 * issued during the initial gesture must not resolve to the synth until the
	 * sampler's onload/onerror has fired. This helper flushes the ensureReady
	 * microtasks so the pending Sampler exists, fires its onload, then lets the
	 * awaited play chain settle on the sampled piano.
	 */
	async function loadSamplesForPendingPlays(): Promise<void> {
		await flush();
		sampler().options.onload();
		await flush();
	}

	it('sounds the first note on the sampled piano (awaits loading, never the synth)', async () => {
		playNote('C4');
		await loadSamplesForPendingPlays();

		expect(sampler().triggerAttackRelease).toHaveBeenCalledWith('C4', '8n', undefined, 0.75);
		expect(synth().triggerAttackRelease).not.toHaveBeenCalled();
	});

	it('falls back to the synth for a note played while samples fail to load', async () => {
		playNote('C4');
		await flush();
		sampler().options.onerror(new Error('offline'));
		await flush();

		expect(synth().triggerAttackRelease).toHaveBeenCalledWith('C4', '8n', undefined, 0.75);
	});

	it('normalizes display-glyph accidentals to ASCII pitches', async () => {
		playNote('B♭3');
		await loadSamplesForPendingPlays();

		expect(sampler().triggerAttackRelease).toHaveBeenCalledWith('Bb3', '8n', undefined, 0.75);
	});

	it('honors velocity and durationSec options', async () => {
		playNote('C4', { velocity: 0.5, durationSec: 2 });
		await loadSamplesForPendingPlays();

		expect(sampler().triggerAttackRelease).toHaveBeenCalledWith('C4', 2, undefined, 0.5);
	});

	it('plays on the sampled piano once samples finish loading', async () => {
		await ensureAudioReady();
		sampler().options.onload();

		playNote('C4');
		await flush();

		expect(sampler().triggerAttackRelease).toHaveBeenCalledWith('C4', '8n', undefined, 0.75);
		expect(synth().triggerAttackRelease).not.toHaveBeenCalled();
	});

	it('ignores a same-note retrigger within the 50ms spam window, then allows it again', async () => {
		await ensureAudioReady();
		sampler().options.onload();
		const nowSpy = vi.spyOn(Date, 'now');
		try {
			nowSpy.mockReturnValue(1000);
			playNote('C4');
			playNote('C4');
			await flush();
			expect(sampler().triggerAttackRelease).toHaveBeenCalledTimes(1);

			nowSpy.mockReturnValue(1060);
			playNote('C4');
			await flush();
			expect(sampler().triggerAttackRelease).toHaveBeenCalledTimes(2);
		} finally {
			nowSpy.mockRestore();
		}
	});

	it('lets two different notes sound back to back inside the window (guard is per note)', async () => {
		await ensureAudioReady();
		sampler().options.onload();
		const nowSpy = vi.spyOn(Date, 'now');
		try {
			nowSpy.mockReturnValue(1000);
			playNote('C4');
			playNote('E4');
			await flush();
			expect(sampler().triggerAttackRelease).toHaveBeenCalledTimes(2);
		} finally {
			nowSpy.mockRestore();
		}
	});
});

describe('playChord', () => {
	/** Flushes the pending Sampler into existence, loads it, and settles plays. */
	async function loadSamplesForPendingPlays(): Promise<void> {
		await flush();
		sampler().options.onload();
		await flush();
	}

	it('voices spelled letters as ascending root-position pitches at reveal velocity', async () => {
		playChord(['C', 'E♭', 'G', 'B♭']);
		await loadSamplesForPendingPlays();

		expect(sampler().triggerAttackRelease).toHaveBeenCalledWith(
			['C4', 'Eb4', 'G4', 'Bb4'],
			'2n',
			undefined,
			0.85
		);
	});

	it('honors velocity and durationSec options', async () => {
		playChord(['C', 'E', 'G'], { velocity: 0.6, durationSec: 1.5 });
		await loadSamplesForPendingPlays();

		expect(sampler().triggerAttackRelease).toHaveBeenCalledWith(
			['C4', 'E4', 'G4'],
			1.5,
			undefined,
			0.6
		);
	});

	it('does nothing (and loads nothing) for an empty note list', async () => {
		playChord([]);
		await flush();

		expect(mockTone.synths).toHaveLength(0);
	});
});

describe('playArpeggio', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	/**
	 * Loads the sampled piano so the awaited-instrument path in withInstrument
	 * resolves to the sampler under fake timers. Must run before scheduling the
	 * arpeggio; uses real timers only for the load handshake.
	 */
	async function preloadSampler(): Promise<void> {
		await ensureAudioReady();
		sampler().options.onload();
		await flush();
	}

	it('sounds the first note synchronously, then later notes at their staggered ticks in order', async () => {
		await preloadSampler();
		vi.useFakeTimers();
		try {
			playArpeggio(['C', 'E', 'G'], { staggerMs: 260 });
			await vi.advanceTimersByTimeAsync(0);
			expect(sampler().triggerAttackRelease).toHaveBeenNthCalledWith(
				1,
				'C4',
				'8n',
				undefined,
				0.75
			);

			await vi.advanceTimersByTimeAsync(260);
			expect(sampler().triggerAttackRelease).toHaveBeenNthCalledWith(
				2,
				'E4',
				'8n',
				undefined,
				0.75
			);

			await vi.advanceTimersByTimeAsync(260);
			expect(sampler().triggerAttackRelease).toHaveBeenNthCalledWith(
				3,
				'G4',
				'8n',
				undefined,
				0.75
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('never attacks when sound is off', async () => {
		setSoundEnabled(false);
		vi.useFakeTimers();
		try {
			playArpeggio(['C', 'E', 'G'], { staggerMs: 260 });
			await vi.advanceTimersByTimeAsync(1000);
			expect(mockTone.synths).toHaveLength(0);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does nothing for an empty note list', async () => {
		vi.useFakeTimers();
		try {
			playArpeggio([], { staggerMs: 260 });
			await vi.advanceTimersByTimeAsync(1000);
			expect(mockTone.synths).toHaveLength(0);
		} finally {
			vi.useRealTimers();
		}
	});

	it('rolls a scale ascending, matching the block-strike voicing', async () => {
		await preloadSampler();
		vi.useFakeTimers();
		try {
			const notes = ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G'];
			playArpeggio(notes, { staggerMs: 260 });

			await vi.advanceTimersByTimeAsync(0);
			for (let i = 1; i < notes.length; i++) {
				await vi.advanceTimersByTimeAsync(260);
			}

			const played = sampler().triggerAttackRelease.mock.calls.map((call) => call[0]);
			expect(played).toEqual(['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5']);
			expect(played).toEqual(toAscendingPitches(notes));
		} finally {
			vi.useRealTimers();
		}
	});

	it('startDelayMs offsets every attack so nothing sounds at t=0', async () => {
		await preloadSampler();
		vi.useFakeTimers();
		try {
			playArpeggio(['C', 'E', 'G'], { staggerMs: 260, startDelayMs: 260 });

			await vi.advanceTimersByTimeAsync(0);
			expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(260);
			expect(sampler().triggerAttackRelease).toHaveBeenNthCalledWith(
				1,
				'C4',
				'8n',
				undefined,
				0.75
			);

			await vi.advanceTimersByTimeAsync(260);
			expect(sampler().triggerAttackRelease).toHaveBeenNthCalledWith(
				2,
				'E4',
				'8n',
				undefined,
				0.75
			);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('study mode toggle', () => {
	it('defaults to disabled with no stored value', () => {
		expect(studyModeEnabled()).toBe(false);
	});

	it('persists the toggle to localStorage under music-learn:study-mode', () => {
		setStudyModeEnabled(true);
		expect(localStorage.getItem('music-learn:study-mode')).toBe('true');
		expect(studyModeEnabled()).toBe(true);
	});

	it('reads a persisted true back on a fresh session', () => {
		localStorage.setItem('music-learn:study-mode', 'true');
		_resetForTests();

		expect(studyModeEnabled()).toBe(true);
	});

	it('treats a non-boolean garbage value as the disabled default', () => {
		localStorage.setItem('music-learn:study-mode', 'banana');
		_resetForTests();

		expect(studyModeEnabled()).toBe(false);
	});
});

describe('noteOn / noteOff', () => {
	/** Loads the sampled piano so held-note attacks resolve to the sampler. */
	async function preloadSampler(): Promise<void> {
		await ensureAudioReady();
		sampler().options.onload();
		await flush();
	}

	it('attacks on noteOn and releases on noteOff', async () => {
		await preloadSampler();

		noteOn('C4');
		await flush();
		expect(sampler().triggerAttack).toHaveBeenCalledWith('C4', undefined, 0.75);

		noteOff('C4');
		await flush();
		expect(sampler().triggerRelease).toHaveBeenCalledWith('C4');
	});

	it('noteOff before anything ever sounded is a silent no-op that loads no tone', async () => {
		noteOff('C4');
		await flush();

		expect(mockTone.synths).toHaveLength(0);
	});

	it('soft-caps held voices at 16 by releasing the oldest before a new attack', async () => {
		await preloadSampler();

		const pitches = Array.from({ length: 17 }, (_, i) => `C${i}`);
		for (const pitch of pitches) noteOn(pitch);
		await flush();

		expect(sampler().triggerAttack).toHaveBeenCalledTimes(17);
		expect(sampler().triggerRelease).toHaveBeenCalledWith('C0');
	});
});

describe('releaseAll', () => {
	it('releases everything on both instruments once loaded', async () => {
		await ensureAudioReady();
		releaseAll();

		expect(synth().releaseAll).toHaveBeenCalled();
	});

	it('never throws when nothing was ever loaded', () => {
		expect(() => releaseAll()).not.toThrow();
		expect(mockTone.synths).toHaveLength(0);
	});
});

describe('playNotesOverChord (the improvisation guide demo)', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	/** Loads the sampled piano so withInstrument resolves under fake timers. */
	async function preloadSampler(): Promise<void> {
		await ensureAudioReady();
		sampler().options.onload();
		await flush();
	}

	it('holds the chord as a left-hand shell with the note voiced above it', async () => {
		await preloadSampler();
		playNotesOverChord('C', ['C', 'E', 'G', 'B'], ['F']);
		await flush();

		const calls = sampler().triggerAttackRelease.mock.calls;
		expect(calls).toHaveLength(2);
		// The shell: root in octave 3, guide tones above, quieter than the note.
		expect(calls[0][0]).toEqual(['C3', 'E4', 'G4', 'B4']);
		expect(calls[0][3]).toBe(0.62);
		// The note being judged: above the shell, and louder than it.
		expect(calls[1][0]).toBe('F5');
		expect(calls[1][3]).toBe(0.8);
		// Both held for the same window, so they sound as one thing.
		expect(calls[0][1]).toBe(calls[1][1]);
	});

	it('plays the chord alone when no melody is given (the keyboard sounds its own key)', async () => {
		await preloadSampler();
		playNotesOverChord('C', ['C', 'E', 'G'], []);
		await flush();

		const calls = sampler().triggerAttackRelease.mock.calls;
		expect(calls).toHaveLength(1);
		expect(calls[0][0]).toEqual(['C3', 'E4', 'G4']);
	});

	it('sounds two melodies back to back, the second only after the first has held', async () => {
		await preloadSampler();
		vi.useFakeTimers();
		try {
			playNotesOverChord('C', ['C', 'E', 'G', 'B'], ['E', 'F']);
			await vi.advanceTimersByTimeAsync(0);
			expect(sampler().triggerAttackRelease.mock.calls.map((call) => call[0])).toEqual([
				['C3', 'E4', 'G4', 'B4'],
				'E5'
			]);

			await vi.advanceTimersByTimeAsync(2050);
			expect(sampler().triggerAttackRelease.mock.calls.map((call) => call[0])).toEqual([
				['C3', 'E4', 'G4', 'B4'],
				'E5',
				['C3', 'E4', 'G4', 'B4'],
				'F5'
			]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('keeps the two steps in order when the samples load slower than the step gap', async () => {
		vi.useFakeTimers();
		try {
			// First gesture of a session: nothing is loaded yet.
			playNotesOverChord('C', ['C', 'E', 'G', 'B'], ['E', 'F']);
			await vi.advanceTimersByTimeAsync(5000);

			// The load has outlasted the gap between the two steps, and neither
			// has attacked: the sequence starts from the load, not from the click.
			expect(mockTone.samplers).toHaveLength(1);
			expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();

			sampler().options.onload();
			await vi.advanceTimersByTimeAsync(0);
			expect(sampler().triggerAttackRelease.mock.calls.map((call) => call[0])).toEqual([
				['C3', 'E4', 'G4', 'B4'],
				'E5'
			]);

			await vi.advanceTimersByTimeAsync(2050);
			expect(sampler().triggerAttackRelease.mock.calls.map((call) => call[0])).toEqual([
				['C3', 'E4', 'G4', 'B4'],
				'E5',
				['C3', 'E4', 'G4', 'B4'],
				'F5'
			]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('cuts a demo that is still waiting on the samples, and never attacks it late', async () => {
		vi.useFakeTimers();
		try {
			playNotesOverChord('C', ['C', 'E', 'G', 'B'], ['E', 'F']);
			await vi.advanceTimersByTimeAsync(0);
			stopChordDemo();
			expect(chordDemoActive()).toBe(false);

			sampler().options.onload();
			await vi.advanceTimersByTimeAsync(5000);
			expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();
			expect(chordDemoActive()).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it('cuts the running demo on a second call: rapid clicks swap the sound, never stack it', async () => {
		await preloadSampler();
		vi.useFakeTimers();
		try {
			playNotesOverChord('C', ['C', 'E', 'G', 'B'], ['E', 'F']);
			await vi.advanceTimersByTimeAsync(0);
			playNotesOverChord('C', ['C', 'E', 'G', 'B'], ['D']);
			await vi.advanceTimersByTimeAsync(0);

			// The first demo's ringing pitches were released by the second call.
			expect(sampler().triggerRelease).toHaveBeenCalledWith('E5');
			expect(sampler().triggerRelease).toHaveBeenCalledWith('C3');

			// And its pending second step never fires.
			await vi.advanceTimersByTimeAsync(4000);
			const melodies = sampler()
				.triggerAttackRelease.mock.calls.map((call) => call[0])
				.filter((arg) => typeof arg === 'string');
			expect(melodies).toEqual(['E5', 'D5']);
		} finally {
			vi.useRealTimers();
		}
	});

	it('stops counting as active once the last step has rung out', async () => {
		await preloadSampler();
		vi.useFakeTimers();
		try {
			playNotesOverChord('C', ['C', 'E', 'G'], ['D']);
			await vi.advanceTimersByTimeAsync(0);
			expect(chordDemoActive()).toBe(true);

			await vi.advanceTimersByTimeAsync(3000);
			expect(chordDemoActive()).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it('stopChordDemo cuts a running demo and is safe before anything ever loaded', async () => {
		expect(() => stopChordDemo()).not.toThrow();

		await preloadSampler();
		playNotesOverChord('C', ['C', 'E', 'G'], ['D']);
		await flush();
		stopChordDemo();

		expect(sampler().triggerRelease).toHaveBeenCalledWith('D5');
		expect(chordDemoActive()).toBe(false);
	});

	it('never attacks when sound is off, and turning sound off cuts a running demo', async () => {
		await preloadSampler();
		playNotesOverChord('C', ['C', 'E', 'G'], ['D']);
		await flush();
		setSoundEnabled(false);
		expect(chordDemoActive()).toBe(false);

		sampler().triggerAttackRelease.mockClear();
		playNotesOverChord('C', ['C', 'E', 'G'], ['D']);
		await flush();
		expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();
	});

	it('refuses an empty chord rather than voicing nothing', async () => {
		await preloadSampler();
		playNotesOverChord('C', [], ['D']);
		await flush();
		expect(sampler().triggerAttackRelease).not.toHaveBeenCalled();
	});
});

describe('sound toggle', () => {
	it('defaults to enabled with no stored value', () => {
		expect(soundEnabled()).toBe(true);
	});

	it('persists the toggle to localStorage under music-learn:sound', () => {
		setSoundEnabled(false);
		expect(localStorage.getItem('music-learn:sound')).toBe('false');
		expect(soundEnabled()).toBe(false);

		setSoundEnabled(true);
		expect(localStorage.getItem('music-learn:sound')).toBe('true');
		expect(soundEnabled()).toBe(true);
	});

	it('reads a persisted false back on a fresh session', () => {
		localStorage.setItem('music-learn:sound', 'false');
		_resetForTests();

		expect(soundEnabled()).toBe(false);
	});

	it('treats corrupt stored values as the enabled default', () => {
		localStorage.setItem('music-learn:sound', 'banana');
		_resetForTests();

		expect(soundEnabled()).toBe(true);
	});

	it('turns every play call into a no-op while disabled (nothing loads, nothing sounds)', async () => {
		setSoundEnabled(false);

		playNote('C4');
		playChord(['C', 'E', 'G']);
		noteOn('D4');
		await ensureAudioReady();
		await flush();

		expect(mockTone.synths).toHaveLength(0);
		expect(mockTone.samplers).toHaveLength(0);
		expect(mockTone.start).not.toHaveBeenCalled();
	});

	it('sounds again after re-enabling', async () => {
		setSoundEnabled(false);
		playNote('C4');
		await flush();

		setSoundEnabled(true);
		playNote('C4');
		await flush();
		sampler().options.onload();
		await flush();

		expect(sampler().triggerAttackRelease).toHaveBeenCalledTimes(1);
	});
});

describe('audioState', () => {
	it('reports the synth while samples are loading, sampled once loaded', async () => {
		expect(audioState()).toEqual({ instrument: 'synth', samplesLoaded: false });

		await ensureAudioReady();
		expect(audioState()).toEqual({ instrument: 'synth', samplesLoaded: false });

		sampler().options.onload();
		expect(audioState()).toEqual({ instrument: 'sampled', samplesLoaded: true });
	});

	it('drops to a permanent synth-only session when sample loading fails', async () => {
		await ensureAudioReady();
		sampler().options.onerror(new Error('offline'));

		expect(audioState()).toEqual({ instrument: 'synth', samplesLoaded: false });

		// A later ensureAudioReady never retries a failed sample fetch.
		await ensureAudioReady();
		expect(mockTone.samplers).toHaveLength(1);

		playNote('C4');
		await flush();
		expect(synth().triggerAttackRelease).toHaveBeenCalled();
	});
});

/**
 * The mic verifier's (Spike 025) app-audio gate: the mic panel polls
 * `isAppAudioActive()` every analysis frame and suppresses detection while
 * true, because the spike measured a 97.2% false accept without this gate
 * (the app playing its own answer through the speaker). These tests use
 * fake timers, scoped to this describe block only, so `Date.now()` (the
 * clock `markAudioBusyFor` reads) is fully controlled.
 */
describe('isAppAudioActive', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('is false when nothing has ever played', () => {
		expect(isAppAudioActive()).toBe(false);
	});

	it('is true immediately after playNote, and clears once its gate window elapses', () => {
		playNote('C4');
		expect(isAppAudioActive()).toBe(true);
		vi.advanceTimersByTime(1199);
		expect(isAppAudioActive()).toBe(true);
		vi.advanceTimersByTime(2);
		expect(isAppAudioActive()).toBe(false);
	});

	it('is true immediately after playChord, with a longer gate window than a single note', () => {
		playChord(['C', 'E', 'G']);
		expect(isAppAudioActive()).toBe(true);
		vi.advanceTimersByTime(1300); // well past playNote's own (shorter) window
		expect(isAppAudioActive()).toBe(true);
		vi.advanceTimersByTime(2000);
		expect(isAppAudioActive()).toBe(false);
	});

	it('playArpeggio gates for its full stagger length plus a note-attack tail', () => {
		playArpeggio(['C', 'E', 'G'], { staggerMs: 300 });
		expect(isAppAudioActive()).toBe(true);
		// 3 notes * 300ms stagger = 900ms, plus the note gate window, minus a
		// hair: still active just before that point.
		vi.advanceTimersByTime(900 + 1199);
		expect(isAppAudioActive()).toBe(true);
		vi.advanceTimersByTime(2);
		expect(isAppAudioActive()).toBe(false);
	});

	it('is true for a held note (noteOn) regardless of elapsed time, then tails off after noteOff', () => {
		noteOn('C4');
		vi.advanceTimersByTime(10_000);
		expect(isAppAudioActive()).toBe(true); // still held, however long
		noteOff('C4');
		expect(isAppAudioActive()).toBe(true); // release tail
		vi.advanceTimersByTime(900); // past the sampler's 0.8s release tail
		expect(isAppAudioActive()).toBe(false);
	});

	it('a second held note keeps the gate active after the first is released', () => {
		noteOn('C4');
		noteOn('E4');
		noteOff('C4');
		expect(isAppAudioActive()).toBe(true); // E4 is still held
		noteOff('E4');
		vi.advanceTimersByTime(900);
		expect(isAppAudioActive()).toBe(false);
	});

	it('turning sound off clears the gate immediately, even mid-window', () => {
		playChord(['C', 'E', 'G']);
		expect(isAppAudioActive()).toBe(true);
		setSoundEnabled(false);
		expect(isAppAudioActive()).toBe(false);
		setSoundEnabled(true);
	});

	it('never gates at all while sound is disabled, since no play call attacks anything', () => {
		setSoundEnabled(false);
		playNote('C4');
		playChord(['C', 'E', 'G']);
		playArpeggio(['C', 'E', 'G'], { staggerMs: 50 });
		expect(isAppAudioActive()).toBe(false);
		setSoundEnabled(true);
	});
});
