import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SongFilterToggle from './SongFilterToggle.svelte';

describe('SongFilterToggle', () => {
	it('reports aria-pressed=false when off, and calls onToggle exactly once on click', async () => {
		const onToggle = vi.fn();
		render(SongFilterToggle, { poolLabel: 'PRACTICE POOL', on: false, onToggle });

		const button = screen.getByRole('button');
		expect(button).toHaveAttribute('aria-pressed', 'false');

		await fireEvent.click(button);
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('reports aria-pressed=true when on', () => {
		render(SongFilterToggle, { poolLabel: 'PRACTICE POOL', on: true, onToggle: () => {} });

		expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
	});

	it('renders the passed poolLabel and the fixed "From my songs" button text', () => {
		render(SongFilterToggle, { poolLabel: 'REVIEW POOL', on: false, onToggle: () => {} });

		expect(screen.getByText('REVIEW POOL')).toBeInTheDocument();
		expect(screen.getByRole('button')).toHaveTextContent('From my songs');
	});

	it('renders the note text when a non-empty note prop is passed', () => {
		render(SongFilterToggle, {
			poolLabel: 'PRACTICE POOL',
			on: true,
			onToggle: () => {},
			note: 'Filter on: practicing the 5 chords from your active songs only.'
		});

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'Filter on: practicing the 5 chords from your active songs only.'
		);
	});

	it('renders no note element when note, noteOn, and noteOff are all omitted', () => {
		render(SongFilterToggle, { poolLabel: 'PRACTICE POOL', on: false, onToggle: () => {} });

		expect(screen.queryByTestId('song-filter-note')).not.toBeInTheDocument();
	});

	it('renders noteOn when on is true and the fallback note is not set', () => {
		render(SongFilterToggle, {
			poolLabel: 'PRACTICE POOL',
			on: true,
			onToggle: () => {},
			noteOn: 'Filter on: practicing the 5 chords from your active songs only.',
			noteOff: 'Filter off: full chord library. Chords from your songs still carry their mark.'
		});

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'Filter on: practicing the 5 chords from your active songs only.'
		);
	});

	it('renders noteOff when on is false and the fallback note is not set', () => {
		render(SongFilterToggle, {
			poolLabel: 'PRACTICE POOL',
			on: false,
			onToggle: () => {},
			noteOn: 'Filter on: practicing the 5 chords from your active songs only.',
			noteOff: 'Filter off: full chord library. Chords from your songs still carry their mark.'
		});

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'Filter off: full chord library. Chords from your songs still carry their mark.'
		);
	});

	it('prefers the fallback note over noteOn when both are set', () => {
		render(SongFilterToggle, {
			poolLabel: 'PRACTICE POOL',
			on: true,
			onToggle: () => {},
			note: 'No active songs yet, so showing the full library instead.',
			noteOn: 'Filter on: practicing the 5 chords from your active songs only.'
		});

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'No active songs yet, so showing the full library instead.'
		);
	});
});
