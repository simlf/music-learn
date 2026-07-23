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

const playChordMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: vi.fn(),
	ensureAudioReady: async () => {}
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
	playChordMock.mockClear();
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

	it('hides the alias-equivalence line for a slash chord (aliases are bass-less)', async () => {
		renderPage();

		await lookupChord('C/E');

		// tonal's aliases drop the /bass, so the line would falsely read
		// "C/E = CM = C = ..." contradicting the explain line below it.
		expect(screen.queryByTestId('alias-line')).not.toBeInTheDocument();
		expect(screen.getByTestId('slash-explain')).toBeInTheDocument();
	});

	it('still shows the alias-equivalence line for a plain chord with aliases (C-7)', async () => {
		renderPage();

		await lookupChord('C-7');

		expect(screen.getByTestId('alias-line')).toBeInTheDocument();
	});

	it('shows Drill it and no slash-explain line for a plain chord (Cm7)', async () => {
		renderPage();

		await lookupChord('Cm7');

		expect(screen.getByTestId('drill-it')).toBeInTheDocument();
		expect(screen.queryByTestId('slash-explain')).not.toBeInTheDocument();
	});

	it('Hear it voices the bass lowest for C/E (E leads, not root position)', async () => {
		renderPage();

		await lookupChord('C/E');
		await fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));

		expect(playChordMock).toHaveBeenCalledTimes(1);
		const letters = playChordMock.mock.calls[0][0] as string[];
		// The card promises "E at the bottom": E must lead so toAscendingPitches
		// voices it lowest, rather than the canonical root-position C-E-G.
		expect(letters[0]).toBe('E');
		expect(new Set(letters)).toEqual(new Set(['C', 'E', 'G']));
	});

	it('rejects C/D (non-chord-tone bass): no slash-explain line rendered', async () => {
		renderPage();

		await lookupChord('C/D');

		expect(screen.queryByTestId('slash-explain')).not.toBeInTheDocument();
	});
});
