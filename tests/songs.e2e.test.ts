import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import SongsPage from '../src/routes/songs/+page.svelte';
import { activeSongChordSymbols, listSongs, saveSong, type Song } from '../src/lib/practice/songs';

// The songs page reads/writes localStorage (music-learn:songs) at mount and
// on every action, so each test starts from a clean store to stay
// deterministic and order-independent. Uses jsdom's real localStorage per
// vitest-setup.ts, matching the recentLookups/lookup page conventions.
beforeEach(() => {
	localStorage.clear();
});

function seedSong(overrides: Partial<Song> = {}): Song {
	const song: Song = {
		id: 'seed-1',
		name: 'My Waltz',
		chordSymbols: ['Cm7', 'F7', 'Bbmaj7'],
		createdAt: '2026-07-14T00:00:00.000Z',
		source: 'custom',
		active: true,
		...overrides
	};
	saveSong(song);
	return song;
}

describe('songs page empty state and preset shelf', () => {
	it('explains why songs matter and shows all 7 preset cards', () => {
		render(SongsPage);

		expect(screen.getByTestId('empty-state')).toBeInTheDocument();
		expect(screen.getByTestId('empty-state')).toHaveTextContent(/sheet/i);

		const cards = screen.getAllByTestId('preset-card');
		expect(cards).toHaveLength(7);
		expect(screen.getByText('Autumn Leaves (G minor)')).toBeInTheDocument();
		expect(screen.getByText('Autumn Leaves (E minor)')).toBeInTheDocument();
		expect(screen.getByText('Blue Bossa')).toBeInTheDocument();
		expect(screen.getByText('Take the A Train')).toBeInTheDocument();
		expect(screen.getByText('Summertime')).toBeInTheDocument();
		expect(screen.getByText('All of Me')).toBeInTheDocument();
		expect(screen.getByText('Fly Me to the Moon')).toBeInTheDocument();
	});

	it('renders no song rows and no empty state heading once a song exists', () => {
		seedSong();
		render(SongsPage);

		expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
		expect(screen.getAllByTestId('song-row')).toHaveLength(1);
	});
});

describe('adding a preset', () => {
	it('one tap copies the preset into the song list, active, with a register line', async () => {
		render(SongsPage);

		const blueBossa = screen
			.getAllByTestId('preset-card')
			.find((card) => within(card).queryByText('Blue Bossa') !== null)!;
		await fireEvent.click(blueBossa);

		const row = screen.getByTestId('song-row');
		expect(within(row).getByText('Blue Bossa')).toBeInTheDocument();
		expect(row).toHaveTextContent(/16 CHORDS · PRESET/);

		const toggle = screen.getByTestId('song-toggle');
		expect(toggle).toHaveAttribute('aria-checked', 'true');

		const stored = listSongs();
		expect(stored).toHaveLength(1);
		expect(stored[0].presetId).toBe('blue-bossa-cm');
		expect(stored[0].source).toBe('preset');
		expect(stored[0].active).toBe(true);
		expect(stored[0].chordSymbols).toHaveLength(16);
	});
});

describe('active toggle', () => {
	it('flips active state instantly and feeds activeSongChordSymbols', async () => {
		seedSong({ chordSymbols: ['Cm7', 'F7'] });
		render(SongsPage);

		expect(activeSongChordSymbols()).toEqual(['Cm7', 'F7']);

		const toggle = screen.getByTestId('song-toggle');
		expect(toggle).toHaveAttribute('aria-checked', 'true');

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-checked', 'false');
		expect(activeSongChordSymbols()).toEqual([]);

		await fireEvent.click(toggle);
		expect(activeSongChordSymbols()).toEqual(['Cm7', 'F7']);
	});
});

describe('creating a song', () => {
	it('chip-based entry validates through spellChord and saves a custom song', async () => {
		render(SongsPage);

		await fireEvent.click(screen.getByRole('button', { name: /new song/i }));

		const nameInput = screen.getByTestId('name-input');
		await fireEvent.input(nameInput, { target: { value: 'Solitude' } });

		const entry = screen.getByTestId('chord-entry');
		await fireEvent.input(entry, { target: { value: 'Cm7' } });
		await fireEvent.keyDown(entry, { key: 'Enter' });

		await fireEvent.input(entry, { target: { value: 'F♯m7♭5' } });
		await fireEvent.keyDown(entry, { key: 'Enter' });

		// Chips echo the canonical ASCII form spellChord returns.
		expect(screen.getByRole('button', { name: 'Remove Cm7' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove F#m7b5' })).toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('save-song'));

		const row = screen.getByTestId('song-row');
		expect(within(row).getByText('Solitude')).toBeInTheDocument();
		expect(row).toHaveTextContent(/2 CHORDS · CUSTOM/);

		const stored = listSongs();
		expect(stored).toHaveLength(1);
		expect(stored[0].chordSymbols).toEqual(['Cm7', 'F#m7b5']);
		expect(stored[0].source).toBe('custom');
		expect(stored[0].active).toBe(true);
	});

	it('keeps Save disabled until a name and at least one chip exist', async () => {
		render(SongsPage);

		await fireEvent.click(screen.getByRole('button', { name: /new song/i }));

		const save = screen.getByTestId('save-song');
		expect(save).toBeDisabled();

		await fireEvent.input(screen.getByTestId('name-input'), { target: { value: 'Solitude' } });
		expect(save).toBeDisabled();

		const entry = screen.getByTestId('chord-entry');
		await fireEvent.input(entry, { target: { value: 'Cm7' } });
		await fireEvent.keyDown(entry, { key: 'Enter' });

		expect(save).not.toBeDisabled();
	});
});

describe('typo handling in chord entry', () => {
	it('shows the error line and a tappable did-you-mean suggestion that stamps the chip', async () => {
		render(SongsPage);
		await fireEvent.click(screen.getByRole('button', { name: /new song/i }));

		const entry = screen.getByTestId('chord-entry');
		await fireEvent.input(entry, { target: { value: 'Cmn7' } });
		await fireEvent.keyDown(entry, { key: 'Enter' });

		expect(screen.getByTestId('entry-error')).toHaveTextContent(/not a chord symbol/i);

		const suggestion = screen.getByTestId('entry-suggestion');
		expect(suggestion).toHaveTextContent('Cm7');

		await fireEvent.click(suggestion);

		expect(screen.getByRole('button', { name: 'Remove Cm7' })).toBeInTheDocument();
		expect(screen.queryByTestId('entry-error')).not.toBeInTheDocument();
	});

	it('falls back to the plain error line with no suggestion for gibberish', async () => {
		render(SongsPage);
		await fireEvent.click(screen.getByRole('button', { name: /new song/i }));

		const entry = screen.getByTestId('chord-entry');
		await fireEvent.input(entry, { target: { value: 'Zxq9' } });
		await fireEvent.keyDown(entry, { key: 'Enter' });

		expect(screen.getByTestId('entry-error')).toBeInTheDocument();
		expect(screen.queryByTestId('entry-suggestion')).not.toBeInTheDocument();
	});
});

describe('paste-a-line bulk entry', () => {
	it('splits on whitespace, commas, and bars, adds valid chips, reports failures', async () => {
		render(SongsPage);
		await fireEvent.click(screen.getByRole('button', { name: /new song/i }));

		const entry = screen.getByTestId('chord-entry');
		await fireEvent.paste(entry, {
			clipboardData: { getData: () => 'Cm7 F7 | Bbmaj7, Xnope' }
		});

		expect(screen.getByRole('button', { name: 'Remove Cm7' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove F7' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove Bbmaj7' })).toBeInTheDocument();
		expect(screen.getByTestId('entry-error')).toHaveTextContent(
			'1 symbol not recognized: Xnope.'
		);
	});

	it('adds every chip silently when the whole line parses', async () => {
		render(SongsPage);
		await fireEvent.click(screen.getByRole('button', { name: /new song/i }));

		const entry = screen.getByTestId('chord-entry');
		await fireEvent.paste(entry, {
			clipboardData: { getData: () => 'Am7b5 | D7 | Gm' }
		});

		expect(screen.getByRole('button', { name: 'Remove Am7b5' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove D7' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove Gm' })).toBeInTheDocument();
		expect(screen.queryByTestId('entry-error')).not.toBeInTheDocument();
	});
});

describe('editing a song', () => {
	it('opens prefilled from a row tap, removes a chip, and saves the change', async () => {
		seedSong({ chordSymbols: ['Cm7', 'F7', 'Bbmaj7'] });
		render(SongsPage);

		await fireEvent.click(screen.getByTestId('song-open'));

		expect(screen.getByTestId('name-input')).toHaveValue('My Waltz');

		await fireEvent.click(screen.getByRole('button', { name: 'Remove F7' }));
		await fireEvent.click(screen.getByTestId('save-song'));

		const stored = listSongs();
		expect(stored[0].chordSymbols).toEqual(['Cm7', 'Bbmaj7']);
		expect(stored[0].id).toBe('seed-1');
		expect(stored[0].createdAt).toBe('2026-07-14T00:00:00.000Z');
	});
});

describe('deleting a song', () => {
	it('asks for confirmation in Print Shop voice, and Keep it backs out', async () => {
		seedSong();
		render(SongsPage);

		await fireEvent.click(screen.getByTestId('song-open'));
		await fireEvent.click(screen.getByTestId('delete-song'));

		expect(screen.getByText(/its practice history stays/i)).toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('keep-song'));

		expect(screen.queryByText(/its practice history stays/i)).not.toBeInTheDocument();
		expect(listSongs()).toHaveLength(1);
	});

	it('confirming removes the song and returns to the list', async () => {
		seedSong();
		render(SongsPage);

		await fireEvent.click(screen.getByTestId('song-open'));
		await fireEvent.click(screen.getByTestId('delete-song'));
		await fireEvent.click(screen.getByTestId('confirm-delete'));

		expect(listSongs()).toEqual([]);
		expect(screen.getByTestId('empty-state')).toBeInTheDocument();
	});
});
