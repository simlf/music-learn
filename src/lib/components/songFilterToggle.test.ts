import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
import SongFilterToggle from './SongFilterToggle.svelte';

afterEach(() => {
	setLocale('en');
});

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

describe('SongFilterToggle discrete variant (DPOL-02)', () => {
	it('does not carry the discrete class when the prop is omitted (Recall\'s base variant)', () => {
		render(SongFilterToggle, { poolLabel: 'PRACTICE POOL', on: false, onToggle: () => {} });

		const bar = screen.getByTestId('song-filter-toggle-bar');
		expect(bar).not.toHaveClass('song-filter-toggle-bar--discrete');
		expect(bar).toHaveAttribute('data-discrete', 'false');
	});

	it('carries the discrete class only when discrete is explicitly true', () => {
		render(SongFilterToggle, {
			poolLabel: 'PRACTICE POOL',
			on: false,
			onToggle: () => {},
			discrete: true
		});

		const bar = screen.getByTestId('song-filter-toggle-bar');
		expect(bar).toHaveClass('song-filter-toggle-bar--discrete');
		expect(bar).toHaveAttribute('data-discrete', 'true');
	});
});

describe('SongFilterToggle renders in French (I18N-02, Phase 20 Plan 05)', () => {
	it('renders the French button copy while the caller-supplied poolLabel stays as passed', () => {
		setLocale('fr');
		render(SongFilterToggle, { poolLabel: 'REVIEW POOL', on: false, onToggle: () => {} });

		expect(screen.getByText('REVIEW POOL')).toBeInTheDocument();
		expect(screen.getByRole('button')).toHaveTextContent('Depuis mes morceaux');
	});
});
