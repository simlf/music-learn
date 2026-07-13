import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchStats, flushQueue, localDateString, recordAnswer } from './progress';
import { setApiToken } from './client';

const QUEUE_KEY = 'music-learn:answer-queue';

function readQueueFromStorage(): unknown[] {
	const raw = localStorage.getItem(QUEUE_KEY);
	return raw === null ? [] : (JSON.parse(raw) as unknown[]);
}

describe('progress', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('localDateString', () => {
		it('returns the LOCAL calendar date as YYYY-MM-DD, not a UTC toISOString slice', () => {
			expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
		});
	});

	describe('recordAnswer', () => {
		it('returns undefined synchronously and never throws, even when fetch is unavailable', () => {
			vi.stubGlobal('fetch', undefined);

			let result: void;
			expect(() => {
				result = recordAnswer({ item: 'Cm7', kind: 'chord', correct: true });
			}).not.toThrow();
			expect(result).toBeUndefined();
		});

		it('POSTs to /answers with item, kind, correct, and a matching clientDate when fetch resolves ok', async () => {
			setApiToken('abc');
			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
			vi.stubGlobal('fetch', fetchMock);

			recordAnswer({ item: 'Cm7', kind: 'chord', correct: true });

			await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('http://localhost:8080/answers');
			const body = JSON.parse(init.body as string);
			expect(body).toMatchObject({ item: 'Cm7', kind: 'chord', correct: true });
			expect(body.clientDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it('enqueues the event when fetch rejects; a later flushQueue drains it once fetch succeeds', async () => {
			const fetchMock = vi.fn().mockRejectedValueOnce(new Error('network down'));
			vi.stubGlobal('fetch', fetchMock);

			recordAnswer({ item: 'Fmaj7', kind: 'chord', correct: false });

			// enqueue() is synchronous and happens before the fire-and-forget
			// flush attempt, so the event is already persisted here.
			expect(readQueueFromStorage()).toContainEqual(
				expect.objectContaining({ item: 'Fmaj7', kind: 'chord', correct: false })
			);

			// Let the internal fire-and-forget flush attempt (which will fail) settle.
			await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

			fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
			await flushQueue();

			expect(readQueueFromStorage()).toEqual([]);
		});
	});

	describe('flushQueue', () => {
		it('stops on the first failure and preserves the remaining unsent events', async () => {
			const seeded = [
				{ item: 'Cm7', kind: 'chord', correct: true, clientDate: '2026-01-01' },
				{ item: 'Fmaj7', kind: 'chord', correct: false, clientDate: '2026-01-02' }
			];
			localStorage.setItem(QUEUE_KEY, JSON.stringify(seeded));

			const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 }));
			vi.stubGlobal('fetch', fetchMock);

			await flushQueue();

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(readQueueFromStorage()).toEqual(seeded);
		});

		it('drains the queue to empty when all sends succeed', async () => {
			const seeded = [
				{ item: 'Cm7', kind: 'chord', correct: true, clientDate: '2026-01-01' },
				{ item: 'Fmaj7', kind: 'chord', correct: false, clientDate: '2026-01-02' }
			];
			localStorage.setItem(QUEUE_KEY, JSON.stringify(seeded));

			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
			vi.stubGlobal('fetch', fetchMock);

			await flushQueue();

			expect(fetchMock).toHaveBeenCalledTimes(2);
			expect(readQueueFromStorage()).toEqual([]);
		});
	});

	describe('fetchStats', () => {
		it('resolves to the parsed { items, weakest } on an ok response', async () => {
			const payload = {
				items: [{ item: 'Cm7', kind: 'chord', attempts: 3, accuracy: 0.5, needsPractice: true }],
				weakest: [{ item: 'Cm7', kind: 'chord', attempts: 3, accuracy: 0.5, needsPractice: true }]
			};
			const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
			vi.stubGlobal('fetch', fetchMock);

			const result = await fetchStats();

			expect(result).toEqual(payload);
		});

		it('throws on a non-ok response', async () => {
			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
			vi.stubGlobal('fetch', fetchMock);

			await expect(fetchStats()).rejects.toThrow();
		});
	});
});
