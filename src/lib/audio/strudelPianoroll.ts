import type { StrudelPattern } from './strudel';

/**
 * Lazy wrapper around `@strudel/draw` (self-hosted from npm, pinned in
 * package.json, never a CDN): draws a pianoroll of the live-code pattern
 * currently playing on `$lib/audio/strudel`'s engine, so the learner SEES
 * what they hear (CompingLoop.svelte's live-code panel).
 *
 * `@strudel/draw@1.2.6` depends on `@strudel/core@1.2.6`, the EXACT version
 * `@strudel/web@1.3.0` already pulls in transitively - no duplicate/mismatched
 * core bundled twice. It is deliberately NOT `@strudel/codemirror`, which
 * would also draw a pianoroll but only as part of a much heavier bundle (full
 * REPL editor chrome: vim/emacs keybindings, autocomplete, 40+ themes) this
 * feature does not need; see strudelHighlight.ts for the highlighting half.
 *
 * `@strudel/draw`'s own `Pattern.prototype.pianoroll()` / `.draw()` looks
 * tempting but is unsuitable here: it auto-creates a hidden, full-viewport,
 * `position:fixed` canvas via `getDrawContext()` the first time ANYTHING
 * calls it (including its own `cleanupDraw()` teardown helper), and its
 * per-call animation-frame bookkeeping is keyed by a string id in a
 * module-private map with no exported way to reliably cancel a specific
 * frame from outside. Instead, this wraps the lower-level, side-effect-free
 * pieces `@strudel/draw` also exports - `Drawer` (frame-by-frame windowing of
 * which notes are visible, exactly what the real Strudel REPL uses to drive
 * its own pianoroll canvas) and `drawPianoroll` (a pure paint-one-frame
 * function) - onto a canvas THIS app owns and can size/theme/teardown itself.
 *
 * `Drawer` only ever calls `scheduler.now()` and `scheduler.pattern.queryArc`,
 * so a plain `{ now, pattern }` object stands in for a real Strudel scheduler
 * (which this wrapper never has direct access to: `$lib/audio/strudel` only
 * exposes the high-level evaluate/hush pair, not the underlying repl).
 */

export interface PianorollTheme {
	active: string;
	inactive: string;
	background: string;
	playheadColor: string;
}

type DrawModule = typeof import('@strudel/draw');

let modulePromise: Promise<DrawModule> | null = null;

function loadModule(): Promise<DrawModule> {
	if (!modulePromise) {
		modulePromise = import('@strudel/draw');
		modulePromise.catch(() => {
			modulePromise = null;
		});
	}
	return modulePromise;
}

/** Cycles of the pattern visible at once: half behind the playhead, half ahead. */
const VISIBLE_CYCLES = 4;
const DRAW_TIME: [number, number] = [-VISIBLE_CYCLES / 2, VISIBLE_CYCLES / 2];

let activeDrawer: import('@strudel/draw').Drawer | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;

const errorListeners = new Set<() => void>();

/**
 * Subscribes to a pianoroll draw failure that happens AFTER `startPianoroll`
 * already resolved `{ ok: true }` - the realistic case, since the real
 * `Drawer` schedules its frames via `requestAnimationFrame`, asynchronously.
 * Mirrors strudel.ts's `onStrudelError`: callers should keep the
 * subscription open for as long as a pianoroll might be drawing. Returns an
 * unsubscribe function.
 */
export function onPianorollError(callback: () => void): () => void {
	errorListeners.add(callback);
	return () => errorListeners.delete(callback);
}

function notifyError(): void {
	for (const listener of errorListeners) listener();
}

/**
 * Starts drawing `pattern` onto `ctx`, one frame per animation frame, until
 * `stopPianoroll()` is called. Never throws: a failed chunk load (offline)
 * or a draw error is swallowed, since the pattern's SOUND already played
 * successfully by the time this is called - a missing visualization must
 * degrade silently, never break playback.
 */
export async function startPianoroll(
	pattern: StrudelPattern,
	now: () => number,
	ctx: CanvasRenderingContext2D,
	theme: PianorollTheme
): Promise<{ ok: boolean }> {
	try {
		const mod = await loadModule();
		stopPianoroll();
		let startingSynchronously = true;
		const drawer = new mod.Drawer((haps, time) => {
			try {
				mod.drawPianoroll({
					ctx,
					time,
					haps,
					drawTime: DRAW_TIME,
					cycles: VISIBLE_CYCLES,
					playhead: 0.5,
					fill: true,
					...theme
				});
			} catch (err) {
				if (startingSynchronously) throw err;
				stopPianoroll();
				notifyError();
			}
		}, DRAW_TIME);
		drawer.start({ now, pattern });
		startingSynchronously = false;
		activeDrawer = drawer;
		activeCtx = ctx;
		return { ok: true };
	} catch {
		return { ok: false };
	}
}

/** Stops the animation frame and clears the canvas. Safe to call any time, including before a pianoroll ever started. */
export function stopPianoroll(): void {
	activeDrawer?.stop();
	activeDrawer = null;
	if (activeCtx) {
		try {
			activeCtx.clearRect(0, 0, activeCtx.canvas.width, activeCtx.canvas.height);
		} catch {
			// Never throw into UI code.
		}
	}
	activeCtx = null;
}

/** Test-only seam, mirroring strudel.ts's `_resetForTests`. Never call from app code. */
export function _resetForTests(): void {
	modulePromise = null;
	activeDrawer = null;
	activeCtx = null;
	errorListeners.clear();
}
