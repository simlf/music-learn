import { describe, expect, it } from 'vitest';
import { activePracticedToday, activeNudge, zeroStreak, pickStreakLine } from './streak';

describe('streak copy pools', () => {
	it('activePracticedToday has the exact UI-SPEC lines', () => {
		expect(activePracticedToday).toEqual([
			'{N} days running. Bravo.',
			'{N} in a row. Et voilà.',
			'{N} days strong. Keep the presses warm.'
		]);
	});

	it('activeNudge has the exact UI-SPEC lines', () => {
		expect(activeNudge).toEqual([
			'{N} days and counting. Play something today to keep it alive.',
			'{N} in a row so far. A few minutes today keeps it going.',
			"{N} days strong. Don't let today be the gap."
		]);
	});

	it('zeroStreak has the exact UI-SPEC lines', () => {
		expect(zeroStreak).toEqual([
			'No streak yet. Every run starts with day one.',
			'Fresh page. Play a few chords to start the count.',
			'Day one is free. Go stamp something.'
		]);
	});

	it('every activePracticedToday and activeNudge line contains the {N} placeholder', () => {
		for (const line of [...activePracticedToday, ...activeNudge]) {
			expect(line).toContain('{N}');
		}
	});

	it('no pool line contains an em dash character', () => {
		for (const line of [...activePracticedToday, ...activeNudge, ...zeroStreak]) {
			expect(line).not.toContain('—');
		}
	});
});

describe('pickStreakLine', () => {
	it('returns a member of the requested pool', () => {
		expect(activePracticedToday).toContain(pickStreakLine('activePracticedToday'));
		expect(activeNudge).toContain(pickStreakLine('activeNudge'));
		expect(zeroStreak).toContain(pickStreakLine('zeroStreak'));
	});

	it('does not immediately repeat across a short run, independently per pool', () => {
		for (const kind of ['activePracticedToday', 'activeNudge', 'zeroStreak'] as const) {
			const picks = Array.from({ length: 10 }, () => pickStreakLine(kind));
			for (let i = 1; i < picks.length; i++) {
				expect(picks[i]).not.toBe(picks[i - 1]);
			}
		}
	});
});
