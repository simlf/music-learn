/**
 * Unit tests for computeStreak (pure aggregation over raw AnswerRow[]) plus
 * integration tests for the authed GET /streak route, mirroring
 * stats.test.ts's app.inject-against-buildApp shape.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/index.js';
import { createStore, type AnswerStore, type AnswerRow } from '../src/db.js';
import { computeStreak } from '../src/streak.js';

function row(overrides: Partial<AnswerRow>): AnswerRow {
	return {
		id: 0,
		item: 'Cm7',
		kind: 'chord',
		correct: 1,
		created_at: '2026-07-13T00:00:00.000Z',
		client_date: '2026-07-13',
		...overrides
	};
}

describe('computeStreak', () => {
	it('practiced today and the prior 2 days -> streak 3, practicedToday true', () => {
		const rows = [
			row({ client_date: '2026-07-13' }),
			row({ client_date: '2026-07-12' }),
			row({ client_date: '2026-07-11' })
		];

		expect(computeStreak(rows, '2026-07-13')).toEqual({ streak: 3, practicedToday: true });
	});

	it('not practiced today but practiced yesterday and the day before -> streak 2, practicedToday false (grace)', () => {
		const rows = [row({ client_date: '2026-07-12' }), row({ client_date: '2026-07-11' })];

		expect(computeStreak(rows, '2026-07-13')).toEqual({ streak: 2, practicedToday: false });
	});

	it('most recent practice date is 2+ days before today -> streak 0, practicedToday false', () => {
		const rows = [row({ client_date: '2026-07-10' })];

		expect(computeStreak(rows, '2026-07-13')).toEqual({ streak: 0, practicedToday: false });
	});

	it('single practice day == today -> streak 1, practicedToday true', () => {
		const rows = [row({ client_date: '2026-07-13' })];

		expect(computeStreak(rows, '2026-07-13')).toEqual({ streak: 1, practicedToday: true });
	});

	it('duplicate answers on the same date count that date once', () => {
		const rows = [
			row({ client_date: '2026-07-13' }),
			row({ client_date: '2026-07-13' }),
			row({ client_date: '2026-07-13' }),
			row({ client_date: '2026-07-12' })
		];

		expect(computeStreak(rows, '2026-07-13')).toEqual({ streak: 2, practicedToday: true });
	});

	it('returns streak 0, practicedToday false for empty rows', () => {
		expect(computeStreak([], '2026-07-13')).toEqual({ streak: 0, practicedToday: false });
	});
});

const API_TOKEN = 'test-token';
const AUTH_HEADER = { authorization: `Bearer ${API_TOKEN}` };

let store: AnswerStore;
let app: FastifyInstance;

beforeEach(async () => {
	store = createStore(':memory:');
	app = buildApp({ store, apiToken: API_TOKEN, corsOrigin: 'http://localhost:5173' });
	await app.ready();
});

afterEach(async () => {
	await app.close();
	store.close();
});

describe('GET /streak (authenticated)', () => {
	it('returns 200 with the computed shape from seeded client_dates', async () => {
		store.insertAnswer({ item: 'Cm7', kind: 'chord', correct: true, clientDate: '2026-07-13' });
		store.insertAnswer({ item: 'G7', kind: 'chord', correct: false, clientDate: '2026-07-12' });

		const response = await app.inject({
			method: 'GET',
			url: '/streak?today=2026-07-13',
			headers: AUTH_HEADER
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ streak: 2, practicedToday: true });
	});
});

describe('GET /streak (authentication)', () => {
	it('returns 401 with no Authorization header', async () => {
		const response = await app.inject({ method: 'GET', url: '/streak?today=2026-07-13' });
		expect(response.statusCode).toBe(401);
	});

	it('returns 401 with a wrong bearer token', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/streak?today=2026-07-13',
			headers: { authorization: 'Bearer wrong' }
		});
		expect(response.statusCode).toBe(401);
	});
});

describe('GET /streak (validation)', () => {
	it('returns 400 for a bad today format', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/streak?today=07-13-2026',
			headers: AUTH_HEADER
		});
		expect(response.statusCode).toBe(400);
	});

	it('returns 400 when today is missing', async () => {
		const response = await app.inject({ method: 'GET', url: '/streak', headers: AUTH_HEADER });
		expect(response.statusCode).toBe(400);
	});
});
