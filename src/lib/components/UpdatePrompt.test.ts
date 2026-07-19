import { render, screen, fireEvent } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale, t } from '$lib/i18n/locale.svelte';
import { setUpdateAvailable } from '$lib/pwa/swUpdate.svelte';
import UpdatePrompt from './UpdatePrompt.svelte';

// The reactive updateAvailable/setUpdateAvailable state is the real module
// (a genuine $state round-trip, same as the sibling test at
// src/lib/pwa/swUpdate.test.ts); only applyUpdate is replaced with a spy so
// we can assert the Reload control invokes it without touching a real SW.
const applyUpdateMock = vi.fn();
vi.mock('$lib/pwa/swUpdate.svelte', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/pwa/swUpdate.svelte')>();
	return {
		...actual,
		applyUpdate: (...args: unknown[]) => applyUpdateMock(...args)
	};
});

beforeEach(() => {
	applyUpdateMock.mockClear();
	flushSync(() => setUpdateAvailable(false));
});

afterEach(() => {
	flushSync(() => setUpdateAvailable(false));
	setLocale('en');
});

describe('UpdatePrompt', () => {
	it('renders nothing when no update is available', () => {
		render(UpdatePrompt);

		expect(screen.queryByTestId('update-prompt')).not.toBeInTheDocument();
	});

	it('shows the message, Reload, and Dismiss controls when an update is available', () => {
		flushSync(() => setUpdateAvailable(true));
		render(UpdatePrompt);

		const prompt = screen.getByTestId('update-prompt');
		expect(prompt).toHaveTextContent(t('pwa.update.message'));
		expect(screen.getByRole('button', { name: t('pwa.update.action') })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: t('pwa.update.dismiss') })).toBeInTheDocument();
	});

	it('renders the French copy when the locale is fr', () => {
		setLocale('fr');
		flushSync(() => setUpdateAvailable(true));
		render(UpdatePrompt);

		const prompt = screen.getByTestId('update-prompt');
		expect(prompt).toHaveTextContent('Mise à jour disponible.');
		expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Ignorer' })).toBeInTheDocument();
	});

	it('clicking Dismiss hides the prompt', async () => {
		flushSync(() => setUpdateAvailable(true));
		render(UpdatePrompt);

		await fireEvent.click(screen.getByRole('button', { name: t('pwa.update.dismiss') }));

		expect(screen.queryByTestId('update-prompt')).not.toBeInTheDocument();
	});

	it('clicking Reload invokes applyUpdate', async () => {
		flushSync(() => setUpdateAvailable(true));
		render(UpdatePrompt);

		await fireEvent.click(screen.getByRole('button', { name: t('pwa.update.action') }));

		expect(applyUpdateMock).toHaveBeenCalledOnce();
	});
});
