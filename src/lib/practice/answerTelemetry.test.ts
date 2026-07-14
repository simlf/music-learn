import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordAnswerMock = vi.fn();
vi.mock('$lib/api/progress', () => ({
	recordAnswer: (...args: unknown[]) => recordAnswerMock(...args),
	localDateString: () => '2026-07-14'
}));

const apiFetchMock = vi.fn();
vi.mock('$lib/api/client', () => ({
	apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

import { TELEMETRY_SUPPORT_KEY, recordPracticeAnswer } from './answerTelemetry';

beforeEach(() => {
	localStorage.clear();
	recordAnswerMock.mockReset();
	apiFetchMock.mockReset();
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('recordPracticeAnswer without telemetry fields', () => {
	it('goes straight through the offline-queue path, no probe', async () => {
		recordPracticeAnswer({ item: 'Cm7', kind: 'chord', correct: true });
		await flush();
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'Cm7', kind: 'chord', correct: true });
		expect(apiFetchMock).not.toHaveBeenCalled();
	});
});

describe('unknown server support: one direct probe, never through the queue', () => {
	it('a 2xx probe records the extended event once and remembers support', async () => {
		apiFetchMock.mockResolvedValue({ ok: true, status: 201 });
		recordPracticeAnswer({ item: 'Cm7', kind: 'chord', correct: true, durationMs: 2100, given: undefined });
		await flush();
		expect(apiFetchMock).toHaveBeenCalledWith('/answers', {
			method: 'POST',
			body: { item: 'Cm7', kind: 'chord', correct: true, durationMs: 2100, clientDate: '2026-07-14' }
		});
		// Recorded once via the probe: the queue path is NOT also used.
		expect(recordAnswerMock).not.toHaveBeenCalled();
		expect(localStorage.getItem(TELEMETRY_SUPPORT_KEY)).toBe('supported');
	});

	it('a 400 probe (old deployed server) falls back to the base event and remembers rejection', async () => {
		apiFetchMock.mockResolvedValue({ ok: false, status: 400 });
		recordPracticeAnswer({ item: 'Cm7', kind: 'chord', correct: false, durationMs: 3500 });
		await flush();
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'Cm7', kind: 'chord', correct: false });
		expect(localStorage.getItem(TELEMETRY_SUPPORT_KEY)).toBe('unsupported');
	});

	it('a network failure queues the base event and stays undecided', async () => {
		apiFetchMock.mockRejectedValue(new Error('offline'));
		recordPracticeAnswer({ item: 'G7', kind: 'chord', correct: true, durationMs: 900 });
		await flush();
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'G7', kind: 'chord', correct: true });
		expect(localStorage.getItem(TELEMETRY_SUPPORT_KEY)).toBeNull();
	});

	it('a non-400 error (401, 500) queues the base event and stays undecided', async () => {
		apiFetchMock.mockResolvedValue({ ok: false, status: 401 });
		recordPracticeAnswer({ item: 'G7', kind: 'chord', correct: true, durationMs: 900 });
		await flush();
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'G7', kind: 'chord', correct: true });
		expect(localStorage.getItem(TELEMETRY_SUPPORT_KEY)).toBeNull();
	});
});

describe('decided server support', () => {
	it('supported: extended events flow through the normal offline-queue path', async () => {
		localStorage.setItem(TELEMETRY_SUPPORT_KEY, 'supported');
		recordPracticeAnswer({ item: 'Cm7', kind: 'chord', correct: false, durationMs: 4200, given: 'C7' });
		await flush();
		expect(apiFetchMock).not.toHaveBeenCalled();
		expect(recordAnswerMock).toHaveBeenCalledWith({
			item: 'Cm7',
			kind: 'chord',
			correct: false,
			durationMs: 4200,
			given: 'C7'
		});
	});

	it('unsupported: telemetry fields are stripped so the queue can never jam on a 400', async () => {
		localStorage.setItem(TELEMETRY_SUPPORT_KEY, 'unsupported');
		recordPracticeAnswer({ item: 'Cm7', kind: 'chord', correct: true, durationMs: 1200, given: 'Cm' });
		await flush();
		expect(apiFetchMock).not.toHaveBeenCalled();
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'Cm7', kind: 'chord', correct: true });
	});
});
