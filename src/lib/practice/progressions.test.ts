import { describe, expect, it, vi } from 'vitest';
import { spellChord } from '$lib/theory/chord';
import {
	buildProgression,
	nameChoices,
	randomProgression,
	PROGRESSION_TEMPLATES,
	PROGRESSION_KEYS
} from './progressions';

/**
 * TDD RED suite for the pure progression engine (sketch-017 synthesis,
 * SK-017). Exercises the real spellChord/theory helpers throughout - no
 * mocks - so the reachability assertion below proves the genuine parser
 * accepts every symbol the engine can produce.
 */

describe('buildProgression', () => {
	it("builds major-ii-V-I on B♭: ii/V/I roman order, correct symbols, function labels", () => {
		const bars = buildProgression('major-ii-V-I', 'B♭');
		expect(bars).toHaveLength(3);
		expect(bars.map((b) => b.roman)).toEqual(['ii', 'V', 'I']);
		expect(bars.map((b) => b.symbol)).toEqual(['Cm7', 'F7', 'B♭maj7']);
		expect(bars.map((b) => b.functionLabel)).toEqual(['subdominant', 'dominant', 'tonic']);
		expect(bars.map((b) => b.index)).toEqual([0, 1, 2]);
	});

	it('builds major-ii-V-I on C: Dm7, G7, Cmaj7', () => {
		const bars = buildProgression('major-ii-V-I', 'C');
		expect(bars.map((b) => b.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7']);
	});

	it('builds minor-ii-V-i on A: iiø (Bm7b5), V (E7), i (Am7) with subdominant/dominant/tonic', () => {
		const bars = buildProgression('minor-ii-V-i', 'A');
		expect(bars.map((b) => b.symbol)).toEqual(['Bm7b5', 'E7', 'Am7']);
		expect(bars.map((b) => b.functionLabel)).toEqual(['subdominant', 'dominant', 'tonic']);
	});
});

describe('nameChoices', () => {
	it('returns 4 distinct same-key diatonic-seventh symbols including the correct V of B♭ (F7)', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.3);
		const bars = buildProgression('major-ii-V-I', 'B♭');
		const vBar = bars[1];
		expect(vBar.symbol).toBe('F7');

		const choices = nameChoices(vBar, 'B♭');
		expect(choices).toHaveLength(4);
		expect(new Set(choices).size).toBe(4);
		expect(choices).toContain('F7');

		// Every choice must be diatonic to B♭ major: derived from B♭ major's own
		// 7 diatonic seventh chords, never an out-of-key symbol.
		const bFlatDiatonicSevenths = [
			'B♭maj7',
			'Cm7',
			'Dm7',
			'E♭maj7',
			'F7',
			'Gm7',
			'Am7b5'
		];
		for (const choice of choices) {
			expect(bFlatDiatonicSevenths).toContain(choice);
		}
		vi.restoreAllMocks();
	});

	it('is deterministic given a seeded Math.random (same mocked draw -> same set)', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.6);
		const bars = buildProgression('major-ii-V-I', 'C');
		const vBar = bars[1];
		const first = nameChoices(vBar, 'C');
		const second = nameChoices(vBar, 'C');
		expect(first).toEqual(second);
		vi.restoreAllMocks();
	});
});

describe('reachability: every template x key produces only spellChord-recognized bars', () => {
	it('every bar symbol across every template and key is recognized', () => {
		for (const template of PROGRESSION_TEMPLATES) {
			for (const key of PROGRESSION_KEYS) {
				const bars = buildProgression(template.id, key);
				for (const bar of bars) {
					expect(spellChord(bar.symbol).recognized, `${template.id}/${key}: ${bar.symbol}`).toBe(
						true
					);
				}
			}
		}
	});
});

describe('randomProgression', () => {
	it('returns a templateId/key drawn from the exported pools and bars matching buildProgression', () => {
		const result = randomProgression();
		expect(PROGRESSION_TEMPLATES.map((t) => t.id)).toContain(result.templateId);
		expect(PROGRESSION_KEYS).toContain(result.key);
		expect(result.bars).toEqual(buildProgression(result.templateId, result.key));
	});
});
