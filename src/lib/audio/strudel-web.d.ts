/**
 * Minimal ambient typing for `@strudel/web` (1.3.0, pinned in package.json).
 * It ships no bundled types (no `types`/`typings` field), so this declares
 * only the three exports `strudel.ts` actually calls, not its whole surface.
 */
declare module '@strudel/web' {
	export function initStrudel(opts?: Record<string, unknown>): Promise<unknown>;
	export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
	export function hush(): void;
}
