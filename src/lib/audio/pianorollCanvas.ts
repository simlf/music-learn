import type { PianorollTheme } from './strudelPianoroll';

/**
 * The two DOM chores every pianoroll host does before `startPianoroll`
 * (`strudelPianoroll.ts`): read the colours from the app's own CSS tokens
 * (app.css), never a hardcoded hex, and size the canvas backing store for
 * the device. Kept apart from `strudelPianoroll.ts` so a host's tests can
 * mock the drawing engine without losing these. Shared by the comping
 * loop's live-code panel and chapter 11's guide-tone lines.
 */

/** The pianoroll theme read from the app's CSS tokens. */
export function pianorollThemeFromTokens(): PianorollTheme {
	const style = getComputedStyle(document.documentElement);
	return {
		active: style.getPropertyValue('--color-vermilion').trim(),
		inactive: style.getPropertyValue('--color-ink').trim(),
		background: 'transparent',
		playheadColor: style.getPropertyValue('--color-muted').trim()
	};
}

/**
 * Sizes the canvas backing store for the device's pixel ratio, so notes
 * stay crisp rather than blurry. `drawPianoroll` computes every coordinate
 * as a fraction of `ctx.canvas.width`/`height` (the backing store, not the
 * CSS size), so a bigger backing store alone is enough - no `ctx.scale()`,
 * which would double-apply the ratio and draw everything squeezed into one
 * corner.
 */
export function sizePianorollCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
	const ratio = window.devicePixelRatio || 1;
	canvas.width = canvas.clientWidth * ratio;
	canvas.height = canvas.clientHeight * ratio;
	return canvas.getContext('2d');
}
