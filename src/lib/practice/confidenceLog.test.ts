import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CONFIDENCE_LOG_CAP,
	calibration,
	dangerCards,
	listConfidence,
	logConfidence,
	type Confidence,
	type ConfidenceEntry
} from './confidenceLog';

const STORAGE_KEY = 'music-learn:confidence-log';

/** Minimal valid ConfidenceEntry factory so each test states only what it cares about. */
function entry(overrides: Partial<ConfidenceEntry> = {}): ConfidenceEntry {
	return {
		factId: 'Cm7',
		mode: 'see-play',
		confidence: 'certain',
		correct: true,
		at: '2026-07-20T00:00:00.000Z',
		...overrides
	};
}

describe('confidenceLog localStorage persistence', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('logConfidence + listConfidence', () => {
		it('appends a review record and reads it back deep-equal', () => {
			const record = entry({ factId: 'Cm7', mode: 'see-play', confidence: 'certain', correct: false });

			logConfidence(record);

			expect(listConfidence()).toEqual([record]);
		});

		it('returns [] when the store is empty', () => {
			expect(listConfidence()).toEqual([]);
		});

		it('keeps only the most recent CONFIDENCE_LOG_CAP entries when appending beyond the cap', () => {
			for (let i = 0; i < CONFIDENCE_LOG_CAP + 10; i++) {
				logConfidence(entry({ factId: `chord-${i}`, at: `2026-07-20T00:00:${String(i % 60).padStart(2, '0')}.000Z` }));
			}

			const stored = listConfidence();
			expect(stored).toHaveLength(CONFIDENCE_LOG_CAP);
			// Oldest dropped: the ring buffer keeps the most recent entries.
			expect(stored[0].factId).toBe('chord-10');
			expect(stored[stored.length - 1].factId).toBe(`chord-${CONFIDENCE_LOG_CAP + 9}`);
		});

		it('degrades to [] on non-JSON garbage without throwing', () => {
			localStorage.setItem(STORAGE_KEY, 'not json {{{');
			expect(() => listConfidence()).not.toThrow();
			expect(listConfidence()).toEqual([]);
		});

		it('degrades to [] when the stored JSON is not an array', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
			expect(listConfidence()).toEqual([]);
		});

		it('drops individually malformed entries while keeping valid ones', () => {
			const valid = entry({ factId: 'valid-1' });
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify([valid, { factId: 'missing-fields' }, 'not-an-object', null])
			);

			expect(listConfidence()).toEqual([valid]);
		});

		it('is a silent no-op when localStorage.setItem throws (quota/disabled)', () => {
			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('quota exceeded');
			});

			expect(() => logConfidence(entry())).not.toThrow();
		});
	});

	describe('calibration', () => {
		it('computes per-level accuracy and flags miscalibration when certain accuracy < somewhat accuracy', () => {
			const entries: ConfidenceEntry[] = [
				// certain: 3/4 correct (0.75)
				entry({ confidence: 'certain', correct: true }),
				entry({ confidence: 'certain', correct: true }),
				entry({ confidence: 'certain', correct: true }),
				entry({ confidence: 'certain', correct: false }),
				// somewhat: 4/4 correct (1.0)
				entry({ confidence: 'somewhat', correct: true }),
				entry({ confidence: 'somewhat', correct: true }),
				entry({ confidence: 'somewhat', correct: true }),
				entry({ confidence: 'somewhat', correct: true }),
				// unrated: excluded from the three calibration levels
				entry({ confidence: 'unrated', correct: false })
			];

			const result = calibration(entries);

			expect(result.miscalibrated).toBe(true);
			const certainRow = result.levels.find((row) => row.level === 'certain');
			const somewhatRow = result.levels.find((row) => row.level === 'somewhat');
			expect(certainRow).toEqual({ level: 'certain', total: 4, correct: 3, accuracy: 0.75 });
			expect(somewhatRow).toEqual({ level: 'somewhat', total: 4, correct: 4, accuracy: 1 });
			expect(result.levels.map((row) => row.level)).toEqual(['unsure', 'somewhat', 'certain']);
		});

		it('excludes unrated entries from all three calibration levels', () => {
			const entries: ConfidenceEntry[] = [entry({ confidence: 'unrated', correct: true })];

			const result = calibration(entries);

			for (const row of result.levels) {
				expect(row.total).toBe(0);
			}
		});

		it('is not miscalibrated when there are zero samples in a compared level (divide-by-zero guard)', () => {
			const entries: ConfidenceEntry[] = [entry({ confidence: 'somewhat', correct: true })];

			const result = calibration(entries);

			expect(result.miscalibrated).toBe(false);
		});
	});

	describe('dangerCards', () => {
		it('groups certain-and-wrong entries by factId+mode with descending wrong count', () => {
			const entries: ConfidenceEntry[] = [
				entry({ factId: 'Cm7', mode: 'see-play', confidence: 'certain', correct: false }),
				entry({ factId: 'Cm7', mode: 'see-play', confidence: 'certain', correct: false }),
				entry({ factId: 'Cm7', mode: 'see-play', confidence: 'certain', correct: false }),
				entry({ factId: 'F7', mode: 'see-play', confidence: 'certain', correct: false }),
				// not danger: certain but correct
				entry({ factId: 'Bbmaj7', mode: 'see-play', confidence: 'certain', correct: true }),
				// not danger: wrong but not certain
				entry({ factId: 'Dm7', mode: 'see-play', confidence: 'unsure', correct: false })
			];

			const result = dangerCards(entries);

			expect(result).toEqual([
				{ factId: 'Cm7', mode: 'see-play', wrongCount: 3 },
				{ factId: 'F7', mode: 'see-play', wrongCount: 1 }
			]);
		});

		it('returns [] when there are no certain-and-wrong entries', () => {
			const entries: ConfidenceEntry[] = [entry({ confidence: 'certain', correct: true })];
			expect(dangerCards(entries)).toEqual([]);
		});
	});

	describe('Confidence type usage', () => {
		it('accepts all four confidence levels including unrated', () => {
			const levels: Confidence[] = ['unsure', 'somewhat', 'certain', 'unrated'];
			expect(levels).toHaveLength(4);
		});
	});
});
