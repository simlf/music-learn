/**
 * Runtime entrypoint: the only file that opens a socket. Tests import
 * buildApp from index.ts directly and never touch this file.
 */

import { loadConfig } from './config.js';
import { createStore } from './db.js';
import { buildApp } from './index.js';

const config = loadConfig();
const store = createStore(config.dbPath);
const app = buildApp({
	store,
	apiToken: config.apiToken,
	corsOrigin: config.corsOrigin
});

app
	.listen({ port: config.port, host: config.host })
	.then((address) => {
		console.log(`music-learn server listening at ${address}`);
	})
	.catch((error: unknown) => {
		console.error('Failed to start server:', error instanceof Error ? error.message : error);
		process.exit(1);
	});
