import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveSong } from '$lib/practice/songs';

/**
 * SONG-01 wiring test for the Chord Lookup result header (Phase 18, Plan 04):
 * the shared SongMark appears beside the resolved chord name when the
 * looked-up chord belongs to an active song, and renders nothing when it
 * doesn't. `$lib/practice/songs` is left UNMOCKED so songProvenance's real
 * `listSongs()` reads the real (jsdom) localStorage seeded below via
 * `saveSong`. Lookup carries no filter control (SONG-02 is Drills/Recall
 * only) - this suite only asserts the mark itself.
 */

const { default: Page } = await import('./+page.svelte');

function renderPage() {
	return render(Page);
}

/** Seeds one active song containing exactly `symbols` (real songs.ts, real localStorage). */
function seedActiveSong(symbols: string[]) {
	saveSong({
		id: 'song-1',
		name: 'My Tune',
		chordSymbols: symbols,
		createdAt: '2026-07-18T00:00:00.000Z',
		source: 'custom',
		active: true
	});
}

async function lookupChord(symbol: string) {
	const input = screen.getByPlaceholderText(/Type a chord/i);
	await fireEvent.input(input, { target: { value: symbol } });
	const submitButton = screen.getByRole('button', { name: 'Stamp' });
	await fireEvent.click(submitButton);
}

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	cleanup();
});

describe('SongMark on the Chord Lookup result (SONG-01)', () => {
	it('shows the SongMark with the seeded song name for a resolved song chord', async () => {
		seedActiveSong(['Cm7']);
		renderPage();

		await lookupChord('Cm7');

		const mark = screen.getByTestId('song-mark');
		expect(mark).toHaveTextContent('My Tune');
	});

	it('shows no SongMark for a resolved chord in no song', async () => {
		seedActiveSong(['Fmaj7']); // Fmaj7, not Cm7: the looked-up chord below has no provenance.
		renderPage();

		await lookupChord('Cm7');

		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();
	});
});
