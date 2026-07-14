import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchStats, fetchStreak, flushQueue, localDateString, recordAnswer } from './progress';
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

		it('drops 400-rejected events (old deployed server), keeps draining, and warns once per session', async () => {
			// The deployed production server predates kind 'interval' and the
			// durationMs/given fields: it answers 400 to those events forever,
			// so retrying can never succeed. They must be dropped (with one
			// console.warn per session) WITHOUT blocking the chord events
			// queued behind them, or the drill loop's persistence would wedge
			// on the first interval answer.
			const seeded = [
				{ item: 'm3', kind: 'interval', correct: true, clientDate: '2026-01-01' },
				{ item: 'M6', kind: 'interval', correct: false, clientDate: '2026-01-01' },
				{ item: 'Cm7', kind: 'chord', correct: true, clientDate: '2026-01-02' }
			];
			localStorage.setItem(QUEUE_KEY, JSON.stringify(seeded));

			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(new Response(null, { status: 400 }))
				.mockResolvedValueOnce(new Response(null, { status: 400 }))
				.mockResolvedValueOnce(new Response(null, { status: 201 }));
			vi.stubGlobal('fetch', fetchMock);

			await flushQueue();

			expect(fetchMock).toHaveBeenCalledTimes(3);
			expect(readQueueFromStorage()).toEqual([]);
			expect(warnSpy).toHaveBeenCalledTimes(1);
		});

		it('still stops and retains everything from the first transient failure on', async () => {
			const seeded = [
				{ item: 'Cm7', kind: 'chord', correct: true, clientDate: '2026-01-01' },
				{ item: 'm3', kind: 'interval', correct: true, clientDate: '2026-01-01' }
			];
			localStorage.setItem(QUEUE_KEY, JSON.stringify(seeded));

			const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
			vi.stubGlobal('fetch', fetchMock);

			await flushQueue();

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(readQueueFromStorage()).toEqual(seeded);
		});
	});

	describe('recordAnswer optional fields (Track B consumes)', () => {
		it('passes durationMs and given through to the POST body', async () => {
			setApiToken('abc');
			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
			vi.stubGlobal('fetch', fetchMock);

			recordAnswer({ item: 'm3', kind: 'interval', correct: false, durationMs: 4200, given: 'M3' });

			await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

			const [, init] = fetchMock.mock.calls[0];
			const body = JSON.parse(init.body as string);
			expect(body).toMatchObject({
				item: 'm3',
				kind: 'interval',
				correct: false,
				durationMs: 4200,
				given: 'M3'
			});
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

	describe('fetchStreak', () => {
		it('calls apiFetch with a path including /streak?today=... and resolves the parsed result', async () => {
			const payload = { streak: 3, practicedToday: true };
			const fetchMock = vi
				.fn()
				.mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
			vi.stubGlobal('fetch', fetchMock);

			const result = await fetchStreak('2026-07-13');

			expect(result).toEqual(payload);
			const [url] = fetchMock.mock.calls[0];
			expect(url).toBe('http://localhost:8080/streak?today=2026-07-13');
		});

		it('throws on a non-ok response', async () => {
			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
			vi.stubGlobal('fetch', fetchMock);

			await expect(fetchStreak('2026-07-13')).rejects.toThrow();
		});
	});
});
