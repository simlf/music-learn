import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LookupPage from '../src/routes/+page.svelte';

// Note: masthead assertions intentionally live outside this file. The masthead
// is rendered by +layout.svelte, not +page.svelte, and this suite renders the
// page component in isolation (no layout wrapper) to avoid layout-render
// coupling. Masthead behavior is verified via manual/e2e navigation checks,
// not a unit-rendered +layout.svelte import here.

describe('lookup page happy path', () => {
	it('typing Dm7 and clicking Stamp renders a chord-result with dual naming and interval-colored keys', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Dm7' } });

		const button = screen.getByRole('button', { name: /stamp/i });
		await fireEvent.click(button);

		const result = screen.getByTestId('chord-result');
		expect(result).toBeInTheDocument();

		const glyphShadow = screen.getAllByTestId('chord-glyph-shadow')[0];
		expect(glyphShadow).toBeInTheDocument();
		expect(within(glyphShadow).getByText('D')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard.querySelector('.piano-keyboard__key--root')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--third')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--fifth')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--seventh')).toBeInTheDocument();
		expect(within(keyboard).getByText('D')).toBeInTheDocument();
		expect(within(keyboard).getByText('F')).toBeInTheDocument();
		expect(within(keyboard).getByText('A')).toBeInTheDocument();
		expect(within(keyboard).getByText('C')).toBeInTheDocument();
	});
});

describe('lookup page dual naming and interval formula', () => {
	it('typing Cm7 and stamping renders the interval-formula chip labels and dual-named notes', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Cm7' } });

		const button = screen.getByRole('button', { name: /stamp/i });
		await fireEvent.click(button);

		const formula = screen.getByTestId('interval-formula');
		expect(within(formula).getByText('R')).toBeInTheDocument();
		expect(within(formula).getByText('m3')).toBeInTheDocument();
		expect(within(formula).getByText('P5')).toBeInTheDocument();
		expect(within(formula).getByText('m7')).toBeInTheDocument();
		expect(within(formula).getByText('C')).toBeInTheDocument();
		expect(within(formula).getByText('Do')).toBeInTheDocument();
	});
});

describe('lookup page identity', () => {
	it('shows the "Chord lookup" heading and "No chord yet" empty state before any input', () => {
		render(LookupPage);

		expect(screen.getByText('Chord lookup')).toBeInTheDocument();
		expect(screen.getByText('No chord yet')).toBeInTheDocument();
	});
});

describe('lookup page non-blocking error', () => {
	it('stamping a valid chord then an invalid one shows the error bar while keeping the previous result visible', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Zxq9' } });
		await fireEvent.click(button);

		expect(screen.getByTestId('error-bar')).toBeInTheDocument();
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});
});
