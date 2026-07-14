import { describe, expect, it } from 'vitest';
import { intervalScaffoldLevel } from './scaffoldLevel';

describe('intervalScaffoldLevel (sketch 005 fade)', () => {
	it('gives a beginner (tier 1) the full scaffold', () => {
		expect(intervalScaffoldLevel(1)).toBe('full');
	});

	it('compacts to interval names only through the middle tiers (2 and 3)', () => {
		expect(intervalScaffoldLevel(2)).toBe('compact');
		expect(intervalScaffoldLevel(3)).toBe('compact');
	});

	it('turns the scaffold off once the user reaches tier 4 and beyond', () => {
		expect(intervalScaffoldLevel(4)).toBe('off');
		expect(intervalScaffoldLevel(5)).toBe('off');
		expect(intervalScaffoldLevel(6)).toBe('off');
	});
});
