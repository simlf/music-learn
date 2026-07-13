/**
 * Shared-secret bearer-token authentication (D-03).
 *
 * A single static token protects every write/read endpoint except /health.
 * Comparison uses node:crypto timingSafeEqual behind an equal-length
 * pre-check, so a mismatched token length short-circuits to rejection
 * without leaking timing information about the secret (T-08-01 mitigation).
 */

import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const BEARER_PREFIX = 'Bearer ';

export function bearerAuth(apiToken: string) {
	const expected = Buffer.from(apiToken, 'utf8');

	return async function verifyBearerToken(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<FastifyReply | undefined> {
		const header = request.headers.authorization;
		if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
			return reply.code(401).send({ error: 'Unauthorized' });
		}

		const presented = Buffer.from(header.slice(BEARER_PREFIX.length), 'utf8');
		if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
			return reply.code(401).send({ error: 'Unauthorized' });
		}

		return undefined;
	};
}
