import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '$lib/i18n/locale.svelte';
import SongHook from './SongHook.svelte';

/**
 * Sketch 006 (winner A: inline tap-to-reveal): the tune is strictly opt-in.
 * It must never render pre-revealed, and must toggle open/closed on tap.
 */
describe('SongHook', () => {
	it('renders nothing for an interval short outside the vetted table', () => {
		render(SongHook, { short: 'R' });
		expect(screen.queryByTestId('song-hook')).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('hides the tune until tapped', () => {
		render(SongHook, { short: 'm3' });
		expect(screen.queryByText(/Greensleeves/)).not.toBeInTheDocument();
	});

	it('reveals the tune on tap', async () => {
		render(SongHook, { short: 'm3' });

		await fireEvent.click(screen.getByRole('button'));

		expect(screen.getByText(/Greensleeves, opening/)).toBeInTheDocument();
	});

	it('hides the tune again on a second tap', async () => {
		render(SongHook, { short: 'm3' });
		const button = screen.getByRole('button');

		await fireEvent.click(button);
		expect(screen.getByText(/Greensleeves/)).toBeInTheDocument();

		await fireEvent.click(button);
		expect(screen.queryByText(/Greensleeves/)).not.toBeInTheDocument();
	});
});

describe('SongHook renders in French (I18N-02, Phase 20 Plan 05)', () => {
	afterEach(() => {
		setLocale('en');
	});

	it('renders the French toggle copy and flips to "Masquer l\'air" on reveal', async () => {
		setLocale('fr');
		render(SongHook, { short: 'm3' });

		const button = screen.getByRole('button');
		expect(button).toHaveTextContent('Ça sonne comme…');

		await fireEvent.click(button);
		expect(button).toHaveTextContent("Masquer l'air");
	});
});
