import { render, screen, within, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSong, type Song } from '$lib/practice/songs';
import { consumeSongPlaythrough } from '$lib/practice/songPlaythrough';
import { consumeCompSongSeed } from '$lib/practice/compSongSeed';

/**
 * The per-song "Play through" (Phase 40, PLAY-01) and "Play over it"
 * (proposal 2) row actions: each writes its own one-shot channel with the
 * song's OWN chordSymbols, in sheet order, and navigates to the surface that
 * consumes it - /practice for a drill play-through, /learn for the comping
 * loop.
 */

const gotoMock = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const { default: SongManager } = await import('./SongManager.svelte');

function song(overrides: Partial<Song> = {}): Song {
	return {
		id: 'song-1',
		name: 'Blue Bossa',
		chordSymbols: ['Cm7', 'Fm7', 'Bb7'],
		createdAt: '2026-07-14T00:00:00.000Z',
		source: 'custom',
		active: true,
		...overrides
	};
}

beforeEach(() => {
	localStorage.clear();
	gotoMock.mockReset();
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

describe('SongManager per-song actions', () => {
	it('play-through writes the song`s own chords, in order, and navigates to /practice', async () => {
		saveSong(song());
		render(SongManager);

		const row = screen.getByTestId('song-row');
		await fireEvent.click(within(row).getByTestId('song-play-through'));

		expect(gotoMock).toHaveBeenCalledWith('/practice');
		expect(consumeSongPlaythrough()).toEqual({
			songName: 'Blue Bossa',
			symbols: ['Cm7', 'Fm7', 'Bb7']
		});
	});

	it('play-over-it writes the song`s own chords, in order, and navigates to /learn', async () => {
		saveSong(song());
		render(SongManager);

		const row = screen.getByTestId('song-row');
		await fireEvent.click(within(row).getByTestId('song-play-over'));

		expect(gotoMock).toHaveBeenCalledWith('/learn');
		expect(consumeCompSongSeed()).toEqual({
			songName: 'Blue Bossa',
			symbols: ['Cm7', 'Fm7', 'Bb7']
		});
	});

	it('keeps repeats intact in the play-through handoff (PLAY-02)', async () => {
		saveSong(song({ chordSymbols: ['Cm7', 'F7', 'Cm7', 'F7'] }));
		render(SongManager);

		const row = screen.getByTestId('song-row');
		await fireEvent.click(within(row).getByTestId('song-play-through'));

		expect(consumeSongPlaythrough()?.symbols).toEqual(['Cm7', 'F7', 'Cm7', 'F7']);
	});

	it('neither action toggles the song active or opens the edit form', async () => {
		saveSong(song());
		render(SongManager);

		const row = screen.getByTestId('song-row');
		await fireEvent.click(within(row).getByTestId('song-play-through'));

		expect(screen.queryByTestId('save-song')).not.toBeInTheDocument();
		expect(within(row).getByTestId('song-toggle')).toHaveAttribute('aria-checked', 'true');
	});
});
