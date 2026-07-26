import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Lookup-page wiring test for sketch 016 (issue #14 point 4), mirroring
 * lookupSongMark.test.ts's harness: the disambiguation chips (016-B,
 * input-time) and the always-available "Pourquoi ces notes ?" panel (016-A)
 * mounted on every recognized result.
 */

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
});

afterEach(() => {
	cleanup();
});

describe('Disambiguation chips on the Lookup page (sketch 016-B)', () => {
	it('shows the disambig prompt with both chips and no result for ambiguous casing (am7)', async () => {
		renderPage();
		await lookupChord('am7');

		expect(screen.getByTestId('disambig-prompt')).toBeInTheDocument();
		expect(screen.getByTestId('disambig-chip-minor')).toBeInTheDocument();
		expect(screen.getByTestId('disambig-chip-major')).toBeInTheDocument();
		expect(screen.queryByTestId('chord-result')).not.toBeInTheDocument();
	});

	it('shows the disambig prompt for AM7 as well', async () => {
		renderPage();
		await lookupChord('AM7');

		expect(screen.getByTestId('disambig-prompt')).toBeInTheDocument();
	});

	it('resolves the minor chip to Am7 (A-C-E-G) and clears the prompt', async () => {
		renderPage();
		await lookupChord('am7');

		await fireEvent.click(screen.getByTestId('disambig-chip-minor'));

		expect(screen.queryByTestId('disambig-prompt')).not.toBeInTheDocument();
		const result = screen.getByTestId('chord-result');
		const formula = within(result).getByTestId('interval-view');
		expect(within(formula).getByText('A')).toBeInTheDocument();
		expect(within(formula).getByText('C')).toBeInTheDocument();
		expect(within(formula).getByText('E')).toBeInTheDocument();
		expect(within(formula).getByText('G')).toBeInTheDocument();
	});

	it('resolves the major chip to Amaj7 (A-C♯-E-G♯) and clears the prompt', async () => {
		renderPage();
		await lookupChord('AM7');

		await fireEvent.click(screen.getByTestId('disambig-chip-major'));

		expect(screen.queryByTestId('disambig-prompt')).not.toBeInTheDocument();
		const result = screen.getByTestId('chord-result');
		const formula = within(result).getByTestId('interval-view');
		expect(within(formula).getByText('A')).toBeInTheDocument();
		expect(within(formula).getByText('C♯')).toBeInTheDocument();
		expect(within(formula).getByText('E')).toBeInTheDocument();
		expect(within(formula).getByText('G♯')).toBeInTheDocument();
	});

	it('shows no disambiguation prompt for an unambiguous chord (Cm7)', async () => {
		renderPage();
		await lookupChord('Cm7');

		expect(screen.queryByTestId('disambig-prompt')).not.toBeInTheDocument();
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});

	it('clears a prior ambiguity state on a subsequent unambiguous lookup', async () => {
		renderPage();
		await lookupChord('am7');
		expect(screen.getByTestId('disambig-prompt')).toBeInTheDocument();

		await lookupChord('Cm7');
		expect(screen.queryByTestId('disambig-prompt')).not.toBeInTheDocument();
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});
});

describe('WhyTheseNotes mounted on every result (sketch 016-A)', () => {
	it('mounts the collapsed why-toggle on a recognized result', async () => {
		renderPage();
		await lookupChord('Cm7');

		const result = screen.getByTestId('chord-result');
		expect(within(result).getByTestId('why-toggle')).toBeInTheDocument();
		expect(within(result).queryByTestId('why-panel')).not.toBeInTheDocument();
	});

	it('the escape hatch re-runs the lookup for the counterpart', async () => {
		renderPage();
		await lookupChord('Am7');

		const result = screen.getByTestId('chord-result');
		await fireEvent.click(within(result).getByTestId('why-toggle'));
		await fireEvent.click(screen.getByTestId('why-escape-hatch'));

		const newResult = screen.getByTestId('chord-result');
		const formula = within(newResult).getByTestId('interval-view');
		expect(within(formula).getByText('C♯')).toBeInTheDocument();
	});
});
