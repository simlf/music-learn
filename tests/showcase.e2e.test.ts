import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ShowcasePage from '../src/routes/showcase/+page.svelte';

describe('showcase e2e happy path', () => {
	it('typing Dm7 and clicking Show chord renders a ChordGlyph and highlights D, F, A, C on the keyboard in role colors', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Dm7' } });

		const button = screen.getByRole('button', { name: /show chord/i });
		await fireEvent.click(button);

		// ChordGlyph: root "D" with "m7" suffix (superscript quality suffix).
		const glyphShadow = screen.getAllByTestId('chord-glyph-shadow')[0];
		expect(glyphShadow).toBeInTheDocument();
		expect(within(glyphShadow).getByText('D')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();

		// Keyboard: D, F, A, C highlighted with role classes (root/third/fifth/seventh).
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

	it('entering the alias C-7 shows the alias-equivalence line containing Cm7 and C-7', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'C-7' } });

		const button = screen.getByRole('button', { name: /show chord/i });
		await fireEvent.click(button);

		const aliasLine = screen.getByTestId('alias-line');
		expect(aliasLine).toHaveTextContent('Cm7');
		expect(aliasLine).toHaveTextContent('C-7');
	});

	it('renders the interval-formula readout as IntervalChips with dual-named notes beneath', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Cm7' } });

		const button = screen.getByRole('button', { name: /show chord/i });
		await fireEvent.click(button);

		const formula = screen.getByTestId('interval-formula');
		expect(within(formula).getByText('R')).toBeInTheDocument();
		expect(within(formula).getByText('m3')).toBeInTheDocument();
		expect(within(formula).getByText('P5')).toBeInTheDocument();
		expect(within(formula).getByText('m7')).toBeInTheDocument();
		// Dual-named notes render beneath each chip (letter + solfège).
		expect(within(formula).getByText('C')).toBeInTheDocument();
		expect(within(formula).getByText('Do')).toBeInTheDocument();
	});

	it('applies the stamp animation class on chord render with no extra congratulation text', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Cm7' } });

		const button = screen.getByRole('button', { name: /show chord/i });
		await fireEvent.click(button);

		const result = screen.getByTestId('chord-result');
		expect(result.className).toMatch(/stamp/);
		expect(screen.queryByText(/congratulations/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/well done/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/great job/i)).not.toBeInTheDocument();
	});
});

describe('showcase empty state, errors, and surprise-me', () => {
	it('shows the empty state with 2-3 clickable starter chords before any input', () => {
		render(ShowcasePage);

		expect(screen.getByText('No chord yet')).toBeInTheDocument();

		const starters = screen.getAllByTestId('starter-chord');
		expect(starters.length).toBeGreaterThanOrEqual(2);
		expect(starters.length).toBeLessThanOrEqual(3);
	});

	it('clicking a starter chord populates and renders it', async () => {
		render(ShowcasePage);

		const starters = screen.getAllByTestId('starter-chord');
		await fireEvent.click(starters[0]);

		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});

	it('shows a playful non-blocking hint on unrecognized input and keeps the previous result visible', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /show chord/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Zxq9' } });
		await fireEvent.click(button);

		expect(screen.getByTestId('error-bar')).toBeInTheDocument();
		// Previous result stays visible (non-blocking, D-08).
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});

	it('rotates through different hint variants on repeated errors', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /show chord/i });

		await fireEvent.input(input, { target: { value: 'Zxq9' } });
		await fireEvent.click(button);
		const firstHint = screen.getByTestId('error-bar').textContent;

		await fireEvent.input(input, { target: { value: 'Wyz3' } });
		await fireEvent.click(button);
		const secondHint = screen.getByTestId('error-bar').textContent;

		expect(firstHint).not.toBe(secondHint);
	});

	it('a surprise-me ghost button stamps a random supported chord', async () => {
		render(ShowcasePage);

		const surpriseButton = screen.getByRole('button', { name: /surprise me/i });
		await fireEvent.click(surpriseButton);

		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});
});

describe('showcase hear-it playback', () => {
	it('renders a hear-it button on the rendered result', async () => {
		render(ShowcasePage);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Cm7' } });

		const button = screen.getByRole('button', { name: /show chord/i });
		await fireEvent.click(button);

		expect(screen.getByRole('button', { name: /hear it/i })).toBeInTheDocument();
	});
});
