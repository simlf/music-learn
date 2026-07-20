import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveSong } from '$lib/practice/songs';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * I18N-02 (Phase 20 Plan 05) wiring test for the /songs profile page: the
 * page chrome (heading, empty-state copy, New song button) flips to French
 * under `setLocale('fr')`, while a user-entered song name stays verbatim in
 * both locales (user data, never routed through `t()`).
 */

const { default: Page } = await import('./songs/+page.svelte');

function renderPage() {
	return render(Page);
}

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	cleanup();
	setLocale('en');
});

describe('Songs page renders in French (I18N-02, Phase 20 Plan 05)', () => {
	it('renders the English heading and empty-state copy by default', () => {
		renderPage();

		expect(screen.getByRole('heading', { name: 'Songs' })).toBeInTheDocument();
		expect(screen.getByText('No songs yet')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'New song' })).toBeInTheDocument();
	});

	it('renders the French heading, empty-state copy, and New song button under fr', () => {
		setLocale('fr');
		renderPage();

		expect(screen.getByRole('heading', { name: 'Morceaux' })).toBeInTheDocument();
		expect(screen.getByText("Aucun morceau pour l'instant")).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Nouveau morceau' })).toBeInTheDocument();
	});

	it('keeps a user-entered song name verbatim under fr while chrome around it translates', () => {
		saveSong({
			id: 'song-1',
			name: 'Autumn Leaves',
			chordSymbols: ['Cm7'],
			createdAt: '2026-07-18T00:00:00.000Z',
			source: 'custom',
			active: true
		});

		setLocale('fr');
		renderPage();

		expect(screen.getByText('Autumn Leaves')).toBeInTheDocument();
		expect(screen.getByText('1 ACCORD · PERSONNALISÉ')).toBeInTheDocument();
	});

	it('translates preset note lines while keeping preset titles immune (Phase 20 addendum)', () => {
		renderPage();
		expect(
			screen.getByText('C minor, 16 bars, nothing simplified. A fine first song, mon ami.')
		).toBeInTheDocument();

		setLocale('fr');
		cleanup();
		renderPage();

		// Title is a proper noun and stays untranslated.
		expect(screen.getByText('Blue Bossa')).toBeInTheDocument();
		expect(
			screen.getByText('Do mineur, 16 mesures, rien de simplifié. Un bon premier morceau, mon ami.')
		).toBeInTheDocument();
	});
});

describe('Preset shelf dedupe (DPOL-01)', () => {
	it('clicking the same preset card twice creates exactly one song row and marks it Added', async () => {
		renderPage();

		const presetCards = screen.getAllByTestId('preset-card');
		const firstCard = presetCards[0];

		await fireEvent.click(firstCard);
		await fireEvent.click(firstCard);

		expect(screen.getAllByTestId('song-row')).toHaveLength(1);
		expect(firstCard).toHaveTextContent('Added');
		expect(screen.getByTestId('preset-added-marker')).toBeInTheDocument();
	});

	it('does not mark an untouched preset as Added', () => {
		renderPage();

		const presetCards = screen.getAllByTestId('preset-card');
		expect(presetCards[0]).not.toHaveTextContent('Added');
	});
});

/**
 * Quick task 260720-v9u: the ONE global "From my songs" practice-pool
 * filter control now lives on /songs (Drills and Recall no longer render
 * their own toggle - they just read the persisted `music-learn:song-filter`
 * pref). Mirrors recallSongFilter.test.ts's seedActiveSong helper.
 */
function seedActiveSong(symbols: string[]) {
	saveSong({
		id: 'song-1',
		name: 'My Tune',
		chordSymbols: symbols,
		createdAt: '2026-07-20T00:00:00.000Z',
		source: 'custom',
		active: true
	});
}

describe('Global "From my songs" practice-pool filter (quick task 260720-v9u)', () => {
	it('renders labelled PRACTICE POOL and a From my songs button defaulting to aria-pressed=false with the filter-off note', () => {
		renderPage();

		expect(screen.getByText('PRACTICE POOL')).toBeInTheDocument();
		const toggle = screen.getByRole('button', { name: /From my songs/i });
		expect(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'Filter off: full chord library. Chords from your songs still carry their mark.'
		);
	});

	it('clicking the button sets aria-pressed=true and persists true under music-learn:song-filter', async () => {
		renderPage();

		const toggle = screen.getByRole('button', { name: /From my songs/i });
		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		expect(localStorage.getItem('music-learn:song-filter')).toBe('true');
	});

	it('with an active song of two recognized chords, turning it on shows the filter-on note containing 2', async () => {
		seedActiveSong(['Bbmaj7', 'F7']);
		renderPage();

		const toggle = screen.getByRole('button', { name: /From my songs/i });
		await fireEvent.click(toggle);

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'Filter on: practicing the 2 chords from your active songs across Drills and Recall.'
		);
	});

	it('with no active songs, turning it on shows the fallback note', async () => {
		renderPage();

		const toggle = screen.getByRole('button', { name: /From my songs/i });
		await fireEvent.click(toggle);

		expect(screen.getByTestId('song-filter-note')).toHaveTextContent(
			'No active songs yet, so showing the full library instead.'
		);
	});

	it('under fr, the poolLabel and button copy resolve to French', () => {
		setLocale('fr');
		renderPage();

		expect(screen.getByText('BASSIN DE PRATIQUE')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Depuis mes morceaux' })).toBeInTheDocument();
	});
});
