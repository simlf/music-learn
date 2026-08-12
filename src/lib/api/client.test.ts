import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, getApiToken, setApiToken } from './client';

describe('client', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('getApiToken/setApiToken', () => {
		it('returns "" when unset', () => {
			expect(getApiToken()).toBe('');
		});

		it('setApiToken then getApiToken round-trips the value', () => {
			setApiToken('abc');
			expect(getApiToken()).toBe('abc');
		});

		it('never throws when localStorage access itself throws, returning ""', () => {
			vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('storage disabled');
			});
			expect(() => getApiToken()).not.toThrow();
			expect(getApiToken()).toBe('');
		});
	});

	describe('apiFetch', () => {
		it('calls fetch with the base-prefixed URL, Bearer header, JSON Content-Type, and a stringified body when a token is stored', async () => {
			setApiToken('abc');
			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
			vi.stubGlobal('fetch', fetchMock);

			await apiFetch('/answers', {
				method: 'POST',
				body: { item: 'Cm7', kind: 'chord', correct: true }
			});

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('http://localhost:8080/answers');
			expect(init.method).toBe('POST');
			expect(init.headers.Authorization).toBe('Bearer abc');
			expect(init.headers['Content-Type']).toBe('application/json');
			expect(init.body).toBe(JSON.stringify({ item: 'Cm7', kind: 'chord', correct: true }));
		});

		it('omits the Authorization header when no token is stored', async () => {
			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
			vi.stubGlobal('fetch', fetchMock);

			await apiFetch('/answers', { method: 'POST', body: { foo: 'bar' } });

			const [, init] = fetchMock.mock.calls[0];
			expect(init.headers.Authorization).toBeUndefined();
		});

		it('rejects at the 8s timeout when the request hangs, so it can never wedge the drain chain', async () => {
			vi.useFakeTimers();
			// Fake timers don't drive the native AbortSignal.timeout internals, so
			// swap it for a setTimeout-backed equivalent that they DO drive - this
			// still exercises the real apiFetch -> AbortSignal.timeout(8000) wiring.
			vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
				const controller = new AbortController();
				setTimeout(() => controller.abort(), ms);
				return controller.signal;
			});
			const fetchMock = vi.fn(
				(_url: string, init: RequestInit) =>
					new Promise((_resolve, reject) => {
						init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
					})
			);
			vi.stubGlobal('fetch', fetchMock);

			const promise = apiFetch('/answers', { method: 'POST', body: {} });
			let rejected = false;
			promise.catch(() => {
				rejected = true;
			});

			await vi.advanceTimersByTimeAsync(7999);
			expect(rejected).toBe(false);

			await vi.advanceTimersByTimeAsync(1);
			await Promise.resolve();
			expect(rejected).toBe(true);

			vi.useRealTimers();
		});

		it('omits the signal option when AbortSignal.timeout is unavailable (jsdom safety)', async () => {
			const original = AbortSignal.timeout;
			// @ts-expect-error simulating an environment without AbortSignal.timeout
			delete AbortSignal.timeout;

			const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
			vi.stubGlobal('fetch', fetchMock);

			await apiFetch('/answers');

			const [, init] = fetchMock.mock.calls[0];
			expect(init.signal).toBeUndefined();

			AbortSignal.timeout = original;
		});
	});
});
