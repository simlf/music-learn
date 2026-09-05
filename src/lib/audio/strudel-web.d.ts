/**
 * Minimal ambient typing for `@strudel/web` (1.3.0, pinned in package.json).
 * It ships no bundled types (no `types`/`typings` field), so this declares
 * only the exports `strudel.ts` actually calls, not its whole surface.
 */
declare module '@strudel/web' {
	export function initStrudel(opts?: Record<string, unknown>): Promise<unknown>;
	/** Resolves to the evaluated Pattern (see `@strudel/core`'s repl.mjs): opaque here, handed to `$lib/audio/strudelPianoroll` as-is. */
	export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
	export function hush(): void;
	/** The engine's transport clock, in cycles. Re-exported from `@strudel/core`; only valid after `initStrudel`/`evaluate` has run once. */
	export function getTime(): number;
}
