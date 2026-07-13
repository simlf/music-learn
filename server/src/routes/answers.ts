/**
 * POST /answers route: validates a graded drill answer and persists it as
 * one raw event row (D-02).
 *
 * Validation is Fastify's built-in route JSON schema (no extra library):
 * strict field types, kind enum, YYYY-MM-DD clientDate pattern, and
 * additionalProperties false so unknown fields are rejected with 400
 * before anything touches the store (T-08-02 mitigation).
 */

import type { FastifyInstance } from 'fastify';
import type { AnswerEvent, AnswerStore } from '../db.js';

const answerBodySchema = {
	type: 'object',
	additionalProperties: false,
	required: ['item', 'kind', 'correct', 'clientDate'],
	properties: {
		item: { type: 'string', minLength: 1, maxLength: 64 },
		kind: { type: 'string', enum: ['chord', 'scale'] },
		correct: { type: 'boolean' },
		clientDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
	}
} as const;

export function registerAnswersRoute(app: FastifyInstance, store: AnswerStore): void {
	app.post<{ Body: AnswerEvent }>(
		'/answers',
		{ schema: { body: answerBodySchema } },
		async (request, reply) => {
			store.insertAnswer(request.body);
			// Minimal acknowledgement only: stored data is never echoed back.
			return reply.code(201).send({ ok: true });
		}
	);
}
