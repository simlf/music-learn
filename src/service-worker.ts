/// <reference types="@sveltejs/kit" />

// SvelteKit auto-registers this file as the production client's service
// worker. In dev the `$service-worker` arrays are empty so the worker
// effectively no-ops (no stale-cache risk while developing).
import { build, files, prerendered, version } from '$service-worker';
import { SALAMANDER_BASE_URL } from '$lib/audio/samples';
import { cacheName, installPrecacheList } from '$lib/pwa/precache';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Version-keyed cache name: a new deploy gets a fresh cache, and `activate`
// deletes every other cache key so old builds never linger.
const CACHE = cacheName(version);

// App-shell precache: hashed build chunks, small static files (icons,
// manifest), and prerendered route HTML. The ~1.9MB Salamander samples are
// deliberately excluded here (see installPrecacheList) and are instead
// runtime-cached on demand the first time they're actually played.
const PRECACHE = installPrecacheList(build, files, prerendered);
const PRECACHE_SET = new Set(PRECACHE);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(PRECACHE);
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Version-keyed cleanup: remove every cache from a previous deploy.
			const keys = await caches.keys();
			await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;

	// Never cache non-GET requests (T-22-01).
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Never cache cross-origin requests (T-22-01).
	if (url.origin !== sw.location.origin) return;

	// Precached immutable app-shell assets: cache-first.
	if (PRECACHE_SET.has(url.pathname)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(url.pathname);
				return cached ?? fetch(request);
			})()
		);
		return;
	}

	// Salamander piano samples: runtime-cache on demand. Cache-first once
	// populated so offline playback works after first use; the synth
	// fallback already covers offline-before-first-play.
	if (url.pathname.includes(SALAMANDER_BASE_URL)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(request);
				if (cached) return cached;

				const response = await fetch(request);
				if (response.status === 200 && response.type === 'basic') {
					await cache.put(request, response.clone());
				}
				return response;
			})()
		);
		return;
	}

	// Navigation requests: try the network first, then fall back to the
	// cached prerendered page for this URL, then the cached app-shell root
	// so routes still open while offline.
	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					return await fetch(request);
				} catch {
					const cache = await caches.open(CACHE);
					const cachedPage = await cache.match(url.pathname);
					if (cachedPage) return cachedPage;
					const shell = await cache.match('/');
					if (shell) return shell;
					throw new Error('No cached app shell available offline');
				}
			})()
		);
		return;
	}

	// Everything else: network-first, falling back to any cache match.
	event.respondWith(
		(async () => {
			try {
				const response = await fetch(request);
				if (response.status === 200 && response.type === 'basic') {
					const cache = await caches.open(CACHE);
					await cache.put(request, response.clone());
				}
				return response;
			} catch (err) {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(request);
				if (cached) return cached;
				throw err;
			}
		})()
	);
});

// Update-flow contract consumed by Plan 03: the waiting worker only takes
// over when explicitly told to, never silently mid-session.
sw.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		sw.skipWaiting();
	}
});
