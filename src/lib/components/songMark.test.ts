import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
import SongMark from './SongMark.svelte';

afterEach(() => {
	setLocale('en');
});

describe('SongMark', () => {
	it('renders nothing for an empty songs array', () => {
		render(SongMark, { songs: [] });

		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();
	});

	it('renders the note glyph and song name for a single song, without the multi modifier', () => {
		render(SongMark, { songs: ['Autumn Leaves'] });

		const mark = screen.getByTestId('song-mark');
		expect(mark).toHaveTextContent('♪ Autumn Leaves');
		expect(mark).not.toHaveClass('song-mark--multi');
	});

	it('renders a bare N SONGS count with the multi modifier for two or more songs', () => {
		render(SongMark, { songs: ['Autumn Leaves', 'Blue Bossa'] });

		const mark = screen.getByTestId('song-mark');
		expect(mark).toHaveTextContent('2 SONGS');
		expect(mark.textContent).not.toContain('♪');
		expect(mark).toHaveClass('song-mark--multi');
	});

	it('renders a markup-bearing song name as literal text, never parsed HTML', () => {
		render(SongMark, { songs: ['<b>x</b>'] });

		const mark = screen.getByTestId('song-mark');
		expect(mark.querySelector('b')).not.toBeInTheDocument();
		expect(mark).toHaveTextContent('♪ <b>x</b>');
	});
});

describe('SongMark renders in French (I18N-02, Phase 20 Plan 05)', () => {
	it('renders {N} MORCEAUX for a 3-song array under fr', () => {
		setLocale('fr');
		render(SongMark, { songs: ['Autumn Leaves', 'Blue Bossa', 'All of Me'] });

		expect(screen.getByTestId('song-mark')).toHaveTextContent('3 MORCEAUX');
	});

	it('renders the single-song name verbatim in both locales (user data immunity)', () => {
		render(SongMark, { songs: ['Autumn Leaves'] });
		expect(screen.getByTestId('song-mark')).toHaveTextContent('♪ Autumn Leaves');

		setLocale('fr');
		render(SongMark, { songs: ['Autumn Leaves'] });
		const marks = screen.getAllByTestId('song-mark');
		expect(marks[marks.length - 1]).toHaveTextContent('♪ Autumn Leaves');
	});
});
