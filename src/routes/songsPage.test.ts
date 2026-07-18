import { render, screen, cleanup } from '@testing-library/svelte';
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
