/**
 * Server configuration loaded from environment variables.
 *
 * API_TOKEN is mandatory: the service is internet-facing once deployed
 * (Phase 9), so it must never boot without its shared-secret bearer token
 * (D-03). Everything else has a sensible local-development default.
 */

export interface Config {
	apiToken: string;
	dbPath: string;
	port: number;
	host: string;
	corsOrigin: string;
	nodeEnv: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
	const apiToken = env.API_TOKEN;
	if (apiToken === undefined || apiToken === '') {
		throw new Error(
			'API_TOKEN is not set. The server refuses to start without a shared-secret bearer token. ' +
				'Set API_TOKEN to a random string, for example the output of: openssl rand -hex 32'
		);
	}

	return {
		apiToken,
		dbPath: env.DB_PATH ?? './data/music-learn.db',
		port: Number(env.PORT ?? 8080),
		host: env.HOST ?? '0.0.0.0',
		corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
		nodeEnv: env.NODE_ENV ?? 'development'
	};
}
