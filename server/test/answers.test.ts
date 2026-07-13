/**
 * Integration tests for the answers API: HTTP request through buildApp down
 * to a real (in-memory) SQLite row, via app.inject — no socket opened.
 *
 * Covers the three trust-boundary behaviors of POST /answers (persist on
 * valid+authed, 401 on bad auth with no write, 400 on malformed body with
 * no write) plus the unauthenticated GET /health liveness probe.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/index.js';
import { createStore, type AnswerStore } from '../src/db.js';

const API_TOKEN = 'test-token';
const AUTH_HEADER = { authorization: `Bearer ${API_TOKEN}` };
const VALID_BODY = {
	item: 'Cm7',
	kind: 'chord',
	correct: true,
	clientDate: '2026-07-13'
};

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

describe('POST /answers (valid, authenticated)', () => {
	it('returns 201 and persists exactly one raw answer row', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/answers',
			headers: AUTH_HEADER,
			payload: VALID_BODY
		});

		expect(response.statusCode).toBe(201);

		const rows = store.getAllAnswers();
		expect(rows).toHaveLength(1);
		expect(rows[0].item).toBe('Cm7');
		expect(rows[0].kind).toBe('chord');
		expect(rows[0].correct).toBe(1);
		expect(rows[0].client_date).toBe('2026-07-13');
		expect(rows[0].created_at).not.toBe('');
		expect(rows[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	});
});

describe('POST /answers (authentication)', () => {
	it('returns 401 with no Authorization header and writes nothing', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/answers',
			payload: VALID_BODY
		});

		expect(response.statusCode).toBe(401);
		expect(store.getAllAnswers()).toHaveLength(0);
	});

	it('returns 401 with a wrong bearer token and writes nothing', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/answers',
			headers: { authorization: 'Bearer wrong' },
			payload: VALID_BODY
		});

		expect(response.statusCode).toBe(401);
		expect(store.getAllAnswers()).toHaveLength(0);
	});
});

describe('POST /answers (body validation)', () => {
	it('returns 400 for an invalid kind and writes nothing', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/answers',
			headers: AUTH_HEADER,
			payload: { ...VALID_BODY, kind: 'banana' }
		});

		expect(response.statusCode).toBe(400);
		expect(store.getAllAnswers()).toHaveLength(0);
	});

	it('returns 400 when correct is missing and writes nothing', async () => {
		const { correct: _correct, ...withoutCorrect } = VALID_BODY;
		const response = await app.inject({
			method: 'POST',
			url: '/answers',
			headers: AUTH_HEADER,
			payload: withoutCorrect
		});

		expect(response.statusCode).toBe(400);
		expect(store.getAllAnswers()).toHaveLength(0);
	});

	it('returns 400 for an unknown extra field and writes nothing', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/answers',
			headers: AUTH_HEADER,
			payload: { ...VALID_BODY, foo: 1 }
		});

		expect(response.statusCode).toBe(400);
		expect(store.getAllAnswers()).toHaveLength(0);
	});

	it('returns 400 for a clientDate not in YYYY-MM-DD format', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/answers',
			headers: AUTH_HEADER,
			payload: { ...VALID_BODY, clientDate: '07/13/2026' }
		});

		expect(response.statusCode).toBe(400);
		expect(store.getAllAnswers()).toHaveLength(0);
	});
});

describe('GET /health', () => {
	it('returns 200 without any Authorization header', async () => {
		const response = await app.inject({ method: 'GET', url: '/health' });

		expect(response.statusCode).toBe(200);
	});
});
