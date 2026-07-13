/**
 * GET /stats route: computes and serves per-item accuracy + the weakest
 * items shortlist from the raw answer history (PROG-02, D-02). Registered
 * inside the same bearer-authed encapsulated context as /answers.
 */

import type { FastifyInstance } from 'fastify';
import type { AnswerStore } from '../db.js';
import { computeStats } from '../stats.js';

export function registerStatsRoute(app: FastifyInstance, store: AnswerStore): void {
	app.get('/stats', async () => {
		return computeStats(store.getAllAnswers());
	});
}
