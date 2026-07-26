import { describe, it, expect } from 'vitest';

/**
 * Redirect shim assertions (Phase 30 HUB-05 / HUB-03): each of the 8 old
 * routes (/drills, /build, /voicings, /progressions -> /practice; /scales,
 * /theory -> /learn; /recall, /songs -> /progress) is now a thin
 * prerender-safe +page.ts whose load() throws a 308 redirect to its
 * absorbing hub.
 *
 * The shim's load() throws synchronously (SvelteKit's redirect() throws a
 * plain object, not a rejected Promise), so each assertion captures the
 * throw with try/catch rather than awaiting a rejection.
 */

type RedirectLike = { status: number; location: string };

function captureRedirect(load: () => unknown): RedirectLike {
	try {
		load();
	} catch (e) {
		return e as RedirectLike;
	}
	throw new Error('load() did not throw a redirect');
}

describe('Redirect shims (Phase 30 HUB-03)', () => {
	it('/drills redirects to /practice', async () => {
		const { load } = await import('./drills/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/practice');
	});

	it('/build redirects to /practice', async () => {
		const { load } = await import('./build/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/practice');
	});

	it('/voicings redirects to /practice', async () => {
		const { load } = await import('./voicings/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/practice');
	});

	it('/progressions redirects to /practice', async () => {
		const { load } = await import('./progressions/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/practice');
	});

	it('/scales redirects to /learn', async () => {
		const { load } = await import('./scales/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/learn');
	});

	it('/theory redirects to /learn', async () => {
		const { load } = await import('./theory/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/learn');
	});

	it('/recall redirects to /progress', async () => {
		const { load } = await import('./recall/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/progress');
	});

	it('/songs redirects to /progress', async () => {
		const { load } = await import('./songs/+page');
		const redirectError = captureRedirect(load);
		expect(redirectError.status).toBe(308);
		expect(redirectError.location).toBe('/progress');
	});
});
