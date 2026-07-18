import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LevelPicker from './LevelPicker.svelte';
import { LEVEL_KEY } from '$lib/practice/levelState';
import { setLocale } from '$lib/i18n/locale.svelte';

// LevelPicker reads/writes the real levelState via localStorage (jsdom
// provides it). Each test seeds the level explicitly.
function seedLevel(currentTier: number, unlockedTiers: number[]) {
	localStorage.setItem(LEVEL_KEY, JSON.stringify({ currentTier, unlockedTiers }));
}

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
	cleanup();
	setLocale('en');
});

describe('LevelPicker course stepper (sketch 007)', () => {
	it('shows the current tier by name with its blurb, tier 1 by default', () => {
		render(LevelPicker);

		const picker = screen.getByTestId('level-picker');
		expect(within(picker).getByText('White-key triads')).toBeInTheDocument();
		expect(
			within(picker).getByText(/Just the white-key major and minor chords/)
		).toBeInTheDocument();
		expect(within(picker).getByTestId('current-tier-tag')).toHaveTextContent('Tier 1');
	});

	it('previews the immediate next tier as Not yet', () => {
		render(LevelPicker);

		const next = screen.getByTestId('next-up');
		expect(next).toHaveTextContent('Tier 2: All-key triads');
		expect(next).toHaveTextContent('Not yet');
	});

	it('hides the Change level control when only tier 1 is reached', () => {
		render(LevelPicker);

		expect(screen.queryByRole('button', { name: 'Change level' })).not.toBeInTheDocument();
	});

	it('offers only reached tiers when changing level, never unreached or locked ones', async () => {
		seedLevel(3, [1, 2, 3]);
		render(LevelPicker);

		await fireEvent.click(screen.getByRole('button', { name: 'Change level' }));

		const reached = screen.getByTestId('reached-tiers');
		expect(within(reached).getByRole('button', { name: 'Switch to tier 1' })).toBeInTheDocument();
		expect(within(reached).getByRole('button', { name: 'Switch to tier 2' })).toBeInTheDocument();
		expect(within(reached).getByRole('button', { name: 'Switch to tier 3' })).toBeInTheDocument();
		// Tier 4 is available but not yet reached, tiers 5-6 are locked: none appear.
		expect(within(reached).queryByRole('button', { name: 'Switch to tier 4' })).not.toBeInTheDocument();
		expect(within(reached).queryByRole('button', { name: 'Switch to tier 5' })).not.toBeInTheDocument();
	});

	it('picking a reached tier updates the current tier and persists it', async () => {
		seedLevel(3, [1, 2, 3]);
		render(LevelPicker);

		await fireEvent.click(screen.getByRole('button', { name: 'Change level' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Switch to tier 2' }));

		expect(screen.getByTestId('current-tier-tag')).toHaveTextContent('Tier 2');
		expect(screen.getByTestId('level-picker')).toHaveTextContent('All-key triads');
		// Persisted through levelState (setCurrentTier rewrites unlockedTiers to 1..2).
		expect(JSON.parse(localStorage.getItem(LEVEL_KEY)!).currentTier).toBe(2);
	});
});

describe('LevelPicker renders in French (I18N-02, Phase 20 Plan 04)', () => {
	it('shows the French course caption, tier tag, and Change level control under fr', () => {
		setLocale('fr');
		render(LevelPicker);

		const picker = screen.getByTestId('level-picker');
		expect(within(picker).getByText('Ton parcours')).toBeInTheDocument();
		expect(within(picker).getByTestId('current-tier-tag')).toHaveTextContent('Niveau 1');
		expect(within(picker).getByTestId('next-up')).toHaveTextContent('Niveau 2:');
		expect(within(picker).getByTestId('next-up')).toHaveTextContent('Pas encore');
	});

	it('translates the tier name and blurb (Phase 20 addendum: tiers.ts residual)', () => {
		setLocale('fr');
		render(LevelPicker);

		const picker = screen.getByTestId('level-picker');
		expect(within(picker).getByText('Triades aux touches blanches')).toBeInTheDocument();
		expect(
			within(picker).getByText(/Seulement les accords majeurs et mineurs des touches blanches/)
		).toBeInTheDocument();
		expect(within(picker).getByTestId('next-up')).toHaveTextContent(
			'Niveau 2: Triades sur toutes les touches'
		);
	});

	it('offers reached tiers with translated names under fr', async () => {
		seedLevel(3, [1, 2, 3]);
		setLocale('fr');
		render(LevelPicker);

		await fireEvent.click(screen.getByRole('button', { name: 'Changer de niveau' }));

		const reached = screen.getByTestId('reached-tiers');
		expect(within(reached).getByText('Niveau 1: Triades aux touches blanches')).toBeInTheDocument();
		expect(
			within(reached).getByText('Niveau 3: Les trois grandes septièmes')
		).toBeInTheDocument();
	});
});
