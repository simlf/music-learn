import { beforeEach, describe, expect, it } from 'vitest';
import { consumeCompPresetSeed, setCompPresetSeed } from './compPresetSeed';

const COMP_PRESET_SEED_KEY = 'music-learn:comp-preset-seed';

beforeEach(() => {
	localStorage.clear();
});

describe('comp preset seed one-shot handoff (a lesson lands on its own form and key)', () => {
	it('round-trips a preset and clears it on consume', () => {
		setCompPresetSeed('major-ii-V-I', 'C');
		expect(consumeCompPresetSeed()).toEqual({ templateId: 'major-ii-V-I', key: 'C' });
		expect(consumeCompPresetSeed()).toBeNull();
	});

	it('returns null when nothing was set, and on corrupt data without throwing', () => {
		expect(consumeCompPresetSeed()).toBeNull();
		localStorage.setItem(COMP_PRESET_SEED_KEY, '{nope');
		expect(consumeCompPresetSeed()).toBeNull();
	});

	it('refuses a form or a key the loop does not have', () => {
		setCompPresetSeed('blues', 'C');
		expect(consumeCompPresetSeed()).toBeNull();
		setCompPresetSeed('major-ii-V-I', 'H');
		expect(consumeCompPresetSeed()).toBeNull();
	});
});
