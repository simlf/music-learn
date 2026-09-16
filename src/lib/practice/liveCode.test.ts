import { describe, expect, it } from 'vitest';
import { toStrudelPattern } from './liveCode';
import { buildCompBars } from './compLoop';
import { toAsciiAccidentals } from '$lib/theory/interval';

/**
 * The comping loop's "open in live code" escape hatch (CompingLoop.svelte),
 * tested as a pure function. Two promises locked here:
 *
 * 1. The chord sequence is exactly the comp loop's own bars, ascii-normalized,
 *    never a second table (matches compLoop.test.ts's own promise for
 *    buildCompBars against buildProgression).
 * 2. The tempo maps to Strudel's cycles-per-minute at one cycle per bar, so
 *    the seeded pattern actually plays at the tempo shown on screen.
 */
describe('toStrudelPattern', () => {
	it('renders the ii-V-I in C as a cycle-per-bar chord pattern at 70 BPM', () => {
		const bars = buildCompBars('major-ii-V-I', 'C');

		expect(toStrudelPattern(bars, 70)).toBe(
			'setcpm(17.5)\nchord("<Dm7 G7 Cmaj7>").voicing().s("triangle")'
		);
	});

	it('uses ascii accidentals, never the display glyphs', () => {
		const bars = buildCompBars('major-ii-V-I', 'D♭');
		const pattern = toStrudelPattern(bars, 70);

		expect(pattern).not.toMatch(/[♭♯]/);
		expect(pattern).toContain('<Ebm7 Ab7 Dbmaj7>');
	});

	it('reflects the tempo as cpm (bpm / 4, one chord per bar)', () => {
		const bars = buildCompBars('major-ii-V-I', 'C');

		expect(toStrudelPattern(bars, 120)).toContain('setcpm(30)');
		expect(toStrudelPattern(bars, 50)).toContain('setcpm(12.5)');
	});

	it('keeps the same chord sequence as the comp loop’s own bars, never a second table', () => {
		const cases: [string, string][] = [
			['minor-ii-V-i', 'A'],
			['major-turnaround-I-vi-ii-V', 'G']
		];
		for (const [templateId, key] of cases) {
			const bars = buildCompBars(templateId, key);
			const symbols = bars.map((bar) => toAsciiAccidentals(bar.symbol)).join(' ');
			expect(toStrudelPattern(bars, 70)).toContain(`<${symbols}>`);
		}
	});

	it('returns an empty string for no bars (total)', () => {
		expect(toStrudelPattern([], 70)).toBe('');
	});
});
