import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SongMark from './SongMark.svelte';

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
