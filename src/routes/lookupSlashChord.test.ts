import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Slash-chord (inversion) lookup support (quick task 260722-2jy, Task 2): a
 * recognized slash chord renders one bass-explanation line and hides "Drill
 * it" (consumeDrillSeeds performs no chord-symbol validation, and the drill
 * deck cannot represent a slash symbol), while "Hear it" stays available. A
 * non-chord-tone bass (e.g. C/D) is rejected and never renders a
 * slash-explain line. goto is mocked, mirroring lookupDrillIt.test.ts, since
 * the page now calls goto unconditionally on Drill it.
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

describe('Slash-chord (inversion) support on the Chord Lookup', () => {
	it('shows the bass-explanation line and hides Drill it for C/E, keeping Hear it', async () => {
		renderPage();

		await lookupChord('C/E');

		const explain = screen.getByTestId('slash-explain');
		expect(explain).toHaveTextContent('E');
		expect(screen.queryByTestId('drill-it')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
	});

	it('shows Drill it and no slash-explain line for a plain chord (Cm7)', async () => {
		renderPage();

		await lookupChord('Cm7');

		expect(screen.getByTestId('drill-it')).toBeInTheDocument();
		expect(screen.queryByTestId('slash-explain')).not.toBeInTheDocument();
	});

	it('rejects C/D (non-chord-tone bass): no slash-explain line rendered', async () => {
		renderPage();

		await lookupChord('C/D');

		expect(screen.queryByTestId('slash-explain')).not.toBeInTheDocument();
	});
});
