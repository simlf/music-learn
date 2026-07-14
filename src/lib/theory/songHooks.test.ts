import { describe, expect, it } from 'vitest';
import { songHookFor } from './songHooks';

/**
 * Sketch 006 (winner A: inline tap-to-reveal): the vetted ascending-interval
 * to famous-tune table. Every DRILL_INTERVALS short plus a couple of
 * out-of-pool shorts (unison, tritone) to prove the null path.
 */
describe('songHookFor', () => {
	it('returns the vetted tune for every known ascending-interval short', () => {
		expect(songHookFor('m2')).toBe('the Jaws theme');
		expect(songHookFor('M2')).toBe('Happy Birthday, first two notes');
		expect(songHookFor('m3')).toBe('Greensleeves, opening');
		expect(songHookFor('M3')).toBe('When the Saints Go Marching In');
		expect(songHookFor('P4')).toBe('Here Comes the Bride');
		expect(songHookFor('A4')).toBe('The Simpsons theme, first two notes');
		expect(songHookFor('P5')).toBe('Twinkle Twinkle Little Star, first two notes');
		expect(songHookFor('m6')).toBe('the theme from Love Story');
		expect(songHookFor('M6')).toBe('My Bonnie Lies Over the Ocean');
		expect(songHookFor('m7')).toBe('Somewhere, from West Side Story');
		expect(songHookFor('M7')).toBe('Take On Me, the chorus leap');
		expect(songHookFor('P8')).toBe('Somewhere Over the Rainbow');
	});

	it('returns null for shorts outside the vetted table', () => {
		expect(songHookFor('R')).toBeNull();
		expect(songHookFor('d5')).toBeNull();
		expect(songHookFor('')).toBeNull();
		expect(songHookFor('bogus')).toBeNull();
	});
});
