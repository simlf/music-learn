/**
 * GET /streak route: computes the current daily practice streak from the
 * raw answer history over the caller-supplied local calendar date (PROG-03,
 * D-02). Registered inside the same bearer-authed encapsulated context as
 * /answers and /stats.
 */

import type { FastifyInstance } from 'fastify';
import type { AnswerStore } from '../db.js';
import { computeStreak } from '../streak.js';

const streakQuerystringSchema = {
	type: 'object',
	additionalProperties: false,
	required: ['today'],
	properties: {
		today: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
	}
} as const;

export function registerStreakRoute(app: FastifyInstance, store: AnswerStore): void {
	app.get<{ Querystring: { today: string } }>(
		'/streak',
		{ schema: { querystring: streakQuerystringSchema } },
		async (request) => {
			return computeStreak(store.getAllAnswers(), request.query.today);
		}
	);
}
