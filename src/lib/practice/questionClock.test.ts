import { afterEach, describe, expect, it, vi } from 'vitest';
import { elapsedSinceQuestionStart, startQuestionClock } from './questionClock';

describe('questionClock (Y1 consolidation: shared per-question telemetry clock)', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('startQuestionClock stamps the current time', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));

		expect(startQuestionClock()).toBe(new Date('2026-07-15T12:00:00Z').getTime());
	});

	it('elapsedSinceQuestionStart reports the ms elapsed since the stamp', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
		const startedAt = startQuestionClock();

		vi.setSystemTime(new Date('2026-07-15T12:00:00.750Z'));

		expect(elapsedSinceQuestionStart(startedAt)).toBe(750);
	});
});
