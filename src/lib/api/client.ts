/**
 * Bearer-token-attaching fetch wrapper for the backend API (D-03/D-04).
 *
 * getApiToken()/setApiToken() persist the shared-secret bearer token in
 * localStorage, mirroring the try/catch/never-throw shape of
 * src/lib/lookup/recentLookups.ts: missing or inaccessible storage degrades
 * to a safe default ('') rather than throwing.
 *
 * apiFetch() attaches the token as an Authorization header only when one is
 * stored, so unauthenticated requests (e.g. before the user enters a token
 * in 08-03) simply omit the header rather than sending 'Bearer '.
 */

const TOKEN_KEY = 'music-learn:api-token';

// import.meta.env resolves in Vite dev/build AND vitest, without needing
// SvelteKit's $env virtual module (which vitest doesn't provide).
const API_BASE =
	(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';

/**
 * Reads the stored bearer token. Returns '' when unset, or when localStorage
 * access itself throws (disabled/unavailable storage) - never throws.
 */
export function getApiToken(): string {
	try {
		const raw = localStorage.getItem(TOKEN_KEY);
		return typeof raw === 'string' ? raw : '';
	} catch {
		return '';
	}
}

/**
 * Persists the bearer token. Storage failures (quota/disabled) degrade to a
 * no-op rather than throwing (availability over durability).
 */
export function setApiToken(token: string): void {
	try {
		localStorage.setItem(TOKEN_KEY, token);
	} catch {
		// Quota exceeded or storage disabled: keep the app working without
		// persistence rather than throwing.
	}
}

export interface ApiFetchOptions {
	method?: string;
	body?: unknown;
}

const FETCH_TIMEOUT_MS = 8000;

/**
 * Fetches `${API_BASE}${path}` with a JSON Content-Type and, when a token is
 * stored, a Bearer Authorization header. Returns the raw Response; callers
 * decide what `.ok`/status means for them.
 *
 * Aborts after FETCH_TIMEOUT_MS via AbortSignal.timeout (feature-detected and
 * omitted when unavailable, e.g. jsdom) so a hung request can't wedge
 * progress.ts's serialized drainChain for minutes; the abort surfaces as a
 * rejected fetch, which drainQueue already treats as a transient failure.
 */
export async function apiFetch(path: string, opts: ApiFetchOptions = {}): Promise<Response> {
	const token = getApiToken();
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (token !== '') {
		headers.Authorization = `Bearer ${token}`;
	}

	return fetch(`${API_BASE}${path}`, {
		method: opts.method ?? 'GET',
		headers,
		body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
		...(typeof AbortSignal.timeout === 'function'
			? { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
			: {})
	});
}
