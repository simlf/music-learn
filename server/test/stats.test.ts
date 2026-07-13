/**
 * Unit tests for computeStats (pure aggregation over raw AnswerRow[]) plus
 * integration tests for the authed GET /stats route, mirroring
 * answers.test.ts's app.inject-against-buildApp shape.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/index.js';
import { createStore, type AnswerStore, type AnswerRow } from '../src/db.js';
import { computeStats } from '../src/stats.js';

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

describe('computeStats', () => {
	it('groups by (item, kind), computing attempts as count and accuracy as correct/attempts', () => {
		const rows = [
			row({ item: 'Cm7', kind: 'chord', correct: 1 }),
			row({ item: 'Cm7', kind: 'chord', correct: 1 }),
			row({ item: 'Cm7', kind: 'chord', correct: 0 })
		];

		const { items } = computeStats(rows);

		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			item: 'Cm7',
			kind: 'chord',
			attempts: 3,
			accuracy: 2 / 3
		});
	});

	it('flags needsPractice only when attempts >= 3 AND accuracy < 0.7', () => {
		// 5 attempts, 2 correct -> accuracy 0.4, attempts >= 3 -> flagged.
		const weakRows = [
			row({ item: 'G7', correct: 1 }),
			row({ item: 'G7', correct: 0 }),
			row({ item: 'G7', correct: 0 }),
			row({ item: 'G7', correct: 0 }),
			row({ item: 'G7', correct: 1 })
		];
		const { items } = computeStats(weakRows);
		expect(items[0].needsPractice).toBe(true);
	});

	it('does not flag an item at exactly 0.7 accuracy', () => {
		// 10 attempts, 7 correct -> exactly 0.7, not below threshold.
		const rows = Array.from({ length: 10 }, (_, i) => row({ item: 'Dm7', correct: i < 7 ? 1 : 0 }));
		const { items } = computeStats(rows);
		expect(items[0].accuracy).toBe(0.7);
		expect(items[0].needsPractice).toBe(false);
	});

	it('does not flag an item with only 2 attempts even at 0% accuracy', () => {
		const rows = [row({ item: 'F', correct: 0 }), row({ item: 'F', correct: 0 })];
		const { items, weakest } = computeStats(rows);
		expect(items[0].needsPractice).toBe(false);
		expect(weakest).toHaveLength(0);
	});

	it('weakest contains only needsPractice items, worst-accuracy-first, capped at 5', () => {
		// Build 6 distinct weak items with descending accuracy (more wrong each time),
		// each with >=3 attempts.
		const rows = [
			// A: 3 attempts, 0 correct -> accuracy 0
			...['A', 'A', 'A'].map((item) => row({ item, correct: 0 })),
			// B: 3 attempts, 1 correct -> accuracy 0.333
			...['B', 'B', 'B'].map((item, i) => row({ item, correct: i === 0 ? 1 : 0 })),
			// C: 4 attempts, 2 correct -> accuracy 0.5
			...['C', 'C', 'C', 'C'].map((item, i) => row({ item, correct: i < 2 ? 1 : 0 })),
			// D: 3 attempts, 2 correct -> accuracy 0.667
			...['D', 'D', 'D'].map((item, i) => row({ item, correct: i < 2 ? 1 : 0 })),
			// E: 3 attempts, 2 correct -> accuracy 0.667 (tie with D)
			...['E', 'E', 'E'].map((item, i) => row({ item, correct: i < 2 ? 1 : 0 })),
			// F: 3 attempts, 2 correct -> accuracy 0.667 (tie with D and E)
			...['F', 'F', 'F'].map((item, i) => row({ item, correct: i < 2 ? 1 : 0 }))
		];

		const { weakest } = computeStats(rows);

		expect(weakest).toHaveLength(5);
		expect(weakest.map((w) => w.item)).toEqual(['A', 'B', 'C', 'D', 'E']);
	});

	it('breaks accuracy ties by more attempts first, then alphabetically by item', () => {
		const rows = [
			// X: 3 attempts, 1 correct -> accuracy 0.333
			...['X', 'X', 'X'].map((item, i) => row({ item, correct: i === 0 ? 1 : 0 })),
			// Y: 6 attempts, 2 correct -> accuracy 0.333 too, but more attempts -> ranks first
			...['Y', 'Y', 'Y', 'Y', 'Y', 'Y'].map((item, i) => row({ item, correct: i < 2 ? 1 : 0 }))
		];

		const { weakest } = computeStats(rows);

		expect(weakest.map((w) => w.item)).toEqual(['Y', 'X']);
	});

	it('returns empty items and weakest for an empty rows array', () => {
		expect(computeStats([])).toEqual({ items: [], weakest: [] });
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

describe('GET /stats (authenticated)', () => {
	it('returns 200 with items and weakest reflecting seeded answers', async () => {
		store.insertAnswer({ item: 'Cm7', kind: 'chord', correct: true, clientDate: '2026-07-13' });
		store.insertAnswer({ item: 'Cm7', kind: 'chord', correct: false, clientDate: '2026-07-13' });
		store.insertAnswer({ item: 'Cm7', kind: 'chord', correct: false, clientDate: '2026-07-13' });

		const response = await app.inject({ method: 'GET', url: '/stats', headers: AUTH_HEADER });

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.items).toHaveLength(1);
		expect(body.items[0]).toMatchObject({ item: 'Cm7', kind: 'chord', attempts: 3 });
		expect(body.weakest).toHaveLength(1);
		expect(body.weakest[0].item).toBe('Cm7');
	});
});

describe('GET /stats (authentication)', () => {
	it('returns 401 with no Authorization header', async () => {
		const response = await app.inject({ method: 'GET', url: '/stats' });
		expect(response.statusCode).toBe(401);
	});

	it('returns 401 with a wrong bearer token', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/stats',
			headers: { authorization: 'Bearer wrong' }
		});
		expect(response.statusCode).toBe(401);
	});
});
