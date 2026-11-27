import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The metronome click (`playClick`) against a mocked 'tone': no AudioContext,
 * no real sound. Covers the contract the homework metronome leans on: a click
 * is synchronous once the engine is up, accented on the downbeat, silent when
 * sound is off, and never throws.
 */

const mockTone = vi.hoisted(() => ({
	start: vi.fn(async () => {}),
	context: { lookAhead: 0.1 },
	clickSynths: [] as { options: unknown; triggerAttackRelease: ReturnType<typeof vi.fn> }[],
	throwOnTrigger: false
}));

vi.mock('tone', () => {
	function instrument() {
		const i = {
			triggerAttackRelease: vi.fn(),
			triggerAttack: vi.fn(),
			triggerRelease: vi.fn(),
			releaseAll: vi.fn(),
			dispose: vi.fn(),
			toDestination: () => i
		};
		return i;
	}
	class PolySynth {
		constructor() {
			return instrument() as unknown as PolySynth;
		}
	}
	class Sampler {
		constructor() {
			return instrument() as unknown as Sampler;
		}
	}
	class Synth {
		constructor(options: unknown) {
			const i = instrument();
			i.triggerAttackRelease.mockImplementation(() => {
				if (mockTone.throwOnTrigger) throw new Error('start time must be greater');
			});
			mockTone.clickSynths.push({ options, triggerAttackRelease: i.triggerAttackRelease });
			return i as unknown as Synth;
		}
	}
	return { start: () => mockTone.start(), getContext: () => mockTone.context, PolySynth, Sampler, Synth };
});

import { _resetForTests, ensureAudioReady, isAppAudioActive, playClick, setSoundEnabled } from './audio';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
	localStorage.clear();
	mockTone.clickSynths.length = 0;
	mockTone.throwOnTrigger = false;
	mockTone.start.mockClear();
	_resetForTests();
});

describe('playClick', () => {
	it('builds nothing until the first click, then waits for the engine instead of dropping it', async () => {
		expect(mockTone.clickSynths).toHaveLength(0);
		playClick(true);
		await flush();
		expect(mockTone.clickSynths).toHaveLength(1);
		expect(mockTone.clickSynths[0].triggerAttackRelease).toHaveBeenCalledTimes(1);
	});

	it('clicks synchronously once the engine is up', async () => {
		await ensureAudioReady();
		playClick(false); // builds the synth
		await flush();
		const synth = mockTone.clickSynths[0].triggerAttackRelease;
		synth.mockClear();
		playClick(false);
		expect(synth).toHaveBeenCalledTimes(1);
	});

	it('uses a higher, louder click for the downbeat than for the other beats', async () => {
		await ensureAudioReady();
		playClick(true);
		await flush();
		const trigger = mockTone.clickSynths[0].triggerAttackRelease;
		trigger.mockClear();
		playClick(true);
		playClick(false);
		const [accent, plain] = trigger.mock.calls;
		expect(accent[0]).toBe('C6');
		expect(plain[0]).toBe('G5');
		expect(accent[3]).toBeGreaterThan(plain[3]);
	});

	it('reuses one synth for every click', async () => {
		await ensureAudioReady();
		for (let i = 0; i < 5; i++) playClick(i === 0);
		await flush();
		expect(mockTone.clickSynths).toHaveLength(1);
	});

	it('is silent and builds nothing while sound is off', async () => {
		setSoundEnabled(false);
		playClick(true);
		await flush();
		expect(mockTone.clickSynths).toHaveLength(0);
		expect(mockTone.start).not.toHaveBeenCalled();
		setSoundEnabled(true);
	});

	it('never throws when the synth refuses a retrigger', async () => {
		await ensureAudioReady();
		playClick(true);
		await flush();
		mockTone.throwOnTrigger = true;
		expect(() => playClick(false)).not.toThrow();
	});

	it('marks the engine busy briefly so a mic check does not hear the click as a note', async () => {
		await ensureAudioReady();
		playClick(true);
		expect(isAppAudioActive()).toBe(true);
	});
});
