import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * "Drill it" lookup handoff (quick task 260722-2jy, Task 1; repointed to
 * /practice in Phase 30 HUB-03): clicking "Drill it" after resolving a chord
 * seeds the resolved symbol into the one-shot drill queue and navigates to
 * /practice, mirroring progress/+page.svelte's setDrillSeeds -> goto('/practice')
 * handoff. goto is mocked because it is unavailable in the vitest SSR/jsdom
 * environment.
 */

const setDrillSeedsMock = vi.fn();
vi.mock('$lib/practice/drillSeeds', () => ({
	setDrillSeeds: (...args: unknown[]) => setDrillSeedsMock(...args)
}));

const gotoMock = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const { default: Page } = await import('./+page.svelte');

function renderPage() {
	return render(Page);
}

async function lookupChord(symbol: string) {
	const input = screen.getByPlaceholderText(/Type a chord/i);
	await fireEvent.input(input, { target: { value: symbol } });
	const submitButton = screen.getByRole('button', { name: 'Stamp' });
	await fireEvent.click(submitButton);
}

beforeEach(() => {
	localStorage.clear();
	setDrillSeedsMock.mockClear();
	gotoMock.mockClear();
});

afterEach(() => {
	cleanup();
});

describe('Drill it handoff on the Chord Lookup result', () => {
	it('seeds the resolved symbol and navigates to /practice', async () => {
		renderPage();

		await lookupChord('Cm7');

		const drillItButton = screen.getByTestId('drill-it');
		await fireEvent.click(drillItButton);

		expect(setDrillSeedsMock).toHaveBeenCalledWith(['Cm7']);
		expect(gotoMock).toHaveBeenCalledWith('/practice');
	});
});
