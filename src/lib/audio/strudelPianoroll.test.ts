import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * strudelPianoroll.ts tested entirely against a mocked '@strudel/draw'
 * module, mirroring strudel.test.ts's own mocked '@strudel/web': no real
 * canvas rendering, no real Strudel Drawer, ever - only the module's own
 * lazy dynamic import, intercepted below.
 */

const startedDrawers: FakeDrawer[] = [];

class FakeDrawer {
	onDraw: (haps: unknown[], time: number) => void;
	drawTime: [number, number];
	stopped = false;
	constructor(onDraw: (haps: unknown[], time: number) => void, drawTime: [number, number]) {
		this.onDraw = onDraw;
		this.drawTime = drawTime;
		startedDrawers.push(this);
	}
	start(_scheduler: { now: () => number; pattern: unknown }) {
		// Simulate one animation frame synchronously so tests can assert the paint call.
		this.onDraw([], 0);
	}
	stop() {
		this.stopped = true;
	}
}

const drawPianoroll = vi.fn();

vi.mock('@strudel/draw', () => ({
	Drawer: FakeDrawer,
	drawPianoroll
}));

import { _resetForTests, onPianorollError, startPianoroll, stopPianoroll } from './strudelPianoroll';

/**
 * jsdom does not implement a real 2d canvas context (`getContext('2d')`
 * returns null there without the native `canvas` npm package), so this
 * stands in with the one method strudelPianoroll.ts actually calls on it.
 */
function fakeCtx(): CanvasRenderingContext2D {
	return {
		canvas: { width: 300, height: 96 },
		clearRect: vi.fn()
	} as unknown as CanvasRenderingContext2D;
}

const theme = { active: '#c8502e', inactive: '#221e17', background: 'transparent', playheadColor: '#716856' };

beforeEach(() => {
	_resetForTests();
	startedDrawers.length = 0;
	drawPianoroll.mockClear();
});

describe('startPianoroll', () => {
	it('starts a drawer against the given pattern and clock, and paints a frame', async () => {
		const now = () => 1.5;
		const result = await startPianoroll('fake-pattern', now, fakeCtx(), theme);

		expect(result).toEqual({ ok: true });
		expect(startedDrawers).toHaveLength(1);
		expect(drawPianoroll).toHaveBeenCalledTimes(1);
		expect(drawPianoroll).toHaveBeenCalledWith(
			expect.objectContaining({ time: 0, haps: [], ...theme })
		);
	});

	it('stops a previous pianoroll before starting a new one', async () => {
		await startPianoroll('a', () => 0, fakeCtx(), theme);
		const first = startedDrawers[0];

		await startPianoroll('b', () => 0, fakeCtx(), theme);

		expect(first.stopped).toBe(true);
		expect(startedDrawers).toHaveLength(2);
	});

	it('never throws when drawing itself fails: the pattern already played fine by this point', async () => {
		drawPianoroll.mockImplementationOnce(() => {
			throw new Error('canvas error');
		});

		const result = await startPianoroll('a', () => 0, fakeCtx(), theme);

		expect(result).toEqual({ ok: false });
	});

	it('reports a later, asynchronous draw failure through onPianorollError and stops drawing', async () => {
		const onError = vi.fn();
		const unsubscribe = onPianorollError(onError);

		const result = await startPianoroll('a', () => 0, fakeCtx(), theme);
		expect(result).toEqual({ ok: true });

		drawPianoroll.mockImplementationOnce(() => {
			throw new Error('canvas error on a later frame');
		});
		startedDrawers[0].onDraw([], 1);

		expect(onError).toHaveBeenCalledTimes(1);
		expect(startedDrawers[0].stopped).toBe(true);

		unsubscribe();
	});
});

describe('stopPianoroll', () => {
	it('is a safe no-op before a pianoroll has ever started', () => {
		expect(() => stopPianoroll()).not.toThrow();
	});

	it('stops the active drawer and clears the canvas', async () => {
		const ctx = fakeCtx();
		await startPianoroll('a', () => 0, ctx, theme);

		stopPianoroll();

		expect(startedDrawers[0].stopped).toBe(true);
		expect(ctx.clearRect).toHaveBeenCalled();
	});

	it('is safe to call twice in a row', async () => {
		await startPianoroll('a', () => 0, fakeCtx(), theme);

		stopPianoroll();
		expect(() => stopPianoroll()).not.toThrow();
	});
});
