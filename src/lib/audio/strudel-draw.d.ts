/**
 * Minimal ambient typing for `@strudel/draw` (1.2.6, pinned in package.json,
 * matching the `@strudel/core@1.2.6` that `@strudel/web@1.3.0` already pulls
 * in transitively - no duplicate/mismatched core version). It ships no
 * bundled types, so this declares only what `strudelPianoroll.ts` calls.
 */
declare module '@strudel/draw' {
	/**
	 * Drives an onDraw callback once per animation frame, windowed against a
	 * scheduler-like object exposing `now()` (cycles) and `pattern.queryArc`.
	 * See strudelPianoroll.ts for why a plain `{ now, pattern }` shim stands
	 * in for a real Strudel scheduler here.
	 */
	export class Drawer {
		constructor(
			onDraw: (haps: unknown[], time: number) => void,
			drawTime: [number, number]
		);
		start(scheduler: { now: () => number; pattern: unknown }): void;
		stop(): void;
	}
	/** Paints one pianoroll frame onto `options.ctx`. Pure: no internal state, no DOM side effects beyond the given canvas. */
	export function drawPianoroll(
		options: {
			ctx: CanvasRenderingContext2D;
			time: number;
			haps: unknown[];
			drawTime: [number, number];
		} & Record<string, unknown>
	): void;
}
