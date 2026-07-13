/**
 * Fastify app factory (dependency-injected, no listening).
 *
 * buildApp({ store, apiToken, corsOrigin }) wires CORS, the open /health
 * probe, and the bearer-guarded /answers route. Tests inject an in-memory
 * store and a known token and drive the app via app.inject; the runtime
 * socket is opened only by main.ts.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { bearerAuth } from './auth.js';
import { registerAnswersRoute } from './routes/answers.js';
import type { AnswerStore } from './db.js';

export interface BuildAppOptions {
	store: AnswerStore;
	apiToken: string;
	corsOrigin: string;
}

export function buildApp({ store, apiToken, corsOrigin }: BuildAppOptions): FastifyInstance {
	const app = Fastify({
		// Payloads are a tiny fixed shape; a small cap blunts oversized-body
		// DoS attempts (T-08-03). logger: false disables all logging,
		// including request logging, so request contents never reach logs
		// (T-08-04). If a logger is ever enabled here, request-body logging
		// must stay off.
		bodyLimit: 4096,
		logger: false,
		ajv: {
			customOptions: {
				// Fastify's default is removeAdditional: true, which silently
				// STRIPS unknown body fields so additionalProperties: false never
				// rejects. The contract here is strict: unknown fields are a 400.
				removeAdditional: false
			}
		}
	});

	app.register(cors, {
		origin: corsOrigin,
		methods: ['GET', 'POST'],
		allowedHeaders: ['Authorization', 'Content-Type']
	});

	// Generic error handler: client errors keep their status but get a
	// generic body; everything else collapses to a bare 500. No stack
	// traces, no DB paths, no internals in any response (T-08-04).
	app.setErrorHandler((error: unknown, _request, reply) => {
		const rawStatus =
			typeof error === 'object' && error !== null && 'statusCode' in error
				? (error as { statusCode?: unknown }).statusCode
				: undefined;
		const statusCode =
			typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500 ? rawStatus : 500;
		const message = statusCode === 500 ? 'Internal Server Error' : 'Bad Request';
		return reply.code(statusCode).send({ error: message });
	});

	// Liveness probe: deliberately unauthenticated so a container
	// healthcheck can hit it without the shared secret.
	app.get('/health', async () => ({ status: 'ok' }));

	// Encapsulated authenticated context: the bearer preHandler guards every
	// route registered inside this plugin (today /answers; later /stats and
	// /streak) while /health above stays open.
	app.register(async (authenticated) => {
		authenticated.addHook('preHandler', bearerAuth(apiToken));
		registerAnswersRoute(authenticated, store);
	});

	return app;
}
