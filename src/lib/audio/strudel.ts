/**
 * Lazy wrapper around `@strudel/web` (self-hosted from npm, pinned in
 * package.json, never a CDN): the engine behind the comping loop's "open in
 * live code" escape hatch (CompingLoop.svelte).
 *
 * This is a SECOND, deliberately separate playback engine from the app's one
 * audio engine (audio.ts). A live-coded pattern is arbitrary text the player
 * can shape with Strudel's own vocabulary (alternation, swing, arpeggiation,
 * probability), which cannot be expressed as the bars-of-pitches audio.ts's
 * Tone Transport schedules, so it needs its own scheduler. The two engines
 * never run at once: CompingLoop.svelte stops whichever one is playing
 * before starting the other.
 *
 * Offline honesty: `initStrudel()` registers only built-in synthesized
 * waveforms on init (sine/sawtooth/square/triangle/...) and does not fetch
 * the network-hosted sample/soundfont libraries unless a pattern names one,
 * so the shipped feature (which only ever seeds a synthesized waveform, see
 * `$lib/practice/liveCode`) works fully offline once its own lazy chunk has
 * been fetched once. Nothing here is imported eagerly: like `audio.ts`'s
 * `loadTone`, the dynamic import only fires from a click handler, never at
 * module load or during prerendering.
 */

/** Opaque handle to the evaluated Strudel Pattern: never inspected here, only handed to `$lib/audio/strudelPianoroll`. */
export type StrudelPattern = unknown;

export interface StrudelRunResult {
	ok: boolean;
	/** Set when ok is false: the engine itself failed to load (offline, chunk never cached). */
	unavailable?: boolean;
	/** Set when ok is true: the evaluated pattern, for `startPianoroll` to draw. */
	pattern?: StrudelPattern;
	/** Set when ok is true: the engine's transport clock (in cycles), for `startPianoroll` to sync against. */
	now?: () => number;
}

type StrudelModule = {
	initStrudel: (opts?: Record<string, unknown>) => Promise<unknown>;
	evaluate: (code: string, autoplay?: boolean) => Promise<unknown>;
	hush: () => void;
	getTime: () => number;
};

let modulePromise: Promise<StrudelModule> | null = null;
let readyPromise: Promise<void> | null = null;

function loadModule(): Promise<StrudelModule> {
	if (!modulePromise) {
		modulePromise = import('@strudel/web');
		// Allow a later retry if the code-split chunk failed to fetch (offline).
		modulePromise.catch(() => {
			modulePromise = null;
		});
	}
	return modulePromise;
}

/** Initializes the engine once (idempotent). Safe to call from a Play click. */
function ensureReady(): Promise<void> {
	if (!readyPromise) {
		readyPromise = loadModule().then(async (mod) => {
			await mod.initStrudel();
		});
		readyPromise.catch(() => {
			readyPromise = null;
		});
	}
	return readyPromise;
}

/**
 * Evaluates `code` as a Strudel pattern and starts it playing. Never throws:
 * a failed engine load (offline, chunk never cached) comes back as
 * `{ ok: false, unavailable: true }` rather than a rejected promise.
 *
 * A pattern error (bad syntax, an unknown sound name) does NOT reject either:
 * `@strudel/web`'s own `evaluate()` catches it internally and reports it
 * through the `strudel.log` DOM event (see `onStrudelError`), the same
 * channel it uses for a later runtime error mid-playback, so a caller must
 * hold its own `onStrudelError` subscription open for as long as the
 * pattern might be sounding rather than reading a message off this result.
 */
export async function runStrudelPattern(code: string): Promise<StrudelRunResult> {
	try {
		await ensureReady();
		const mod = await loadModule();
		const pattern = await mod.evaluate(code);
		return { ok: true, pattern, now: mod.getTime };
	} catch {
		return { ok: false, unavailable: true };
	}
}

/** Stops whatever Strudel pattern is playing. Safe before the engine has ever loaded. */
export function stopStrudelPattern(): void {
	if (!modulePromise) return;
	void modulePromise.then((mod) => {
		try {
			mod.hush();
		} catch {
			// Never throw into UI code.
		}
	});
}

/**
 * Subscribes to Strudel's own error channel: a `strudel.log` DOM
 * `CustomEvent` it dispatches on both an eval-time error and a later
 * runtime error while a pattern is already playing. Pure DOM, so it is safe
 * to call before the engine has ever loaded. Returns an unsubscribe
 * function; callers should keep the subscription open for as long as a
 * pattern might be sounding, since a runtime error can arrive well after
 * `runStrudelPattern` already resolved successfully.
 */
export function onStrudelError(callback: (message: string) => void): () => void {
	function handleLog(event: Event): void {
		const detail = (event as CustomEvent<{ message?: string; type?: string }>).detail;
		if (detail?.type === 'error') callback(String(detail.message ?? ''));
	}
	document.addEventListener('strudel.log', handleLog);
	return () => document.removeEventListener('strudel.log', handleLog);
}

/**
 * Test-only seam: clears module-level state so each Vitest case starts from
 * a fresh, never-loaded engine. Not part of the app-facing contract; never
 * call from app code.
 */
export function _resetForTests(): void {
	modulePromise = null;
	readyPromise = null;
}
