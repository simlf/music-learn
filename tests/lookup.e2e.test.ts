import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import LookupPage from '../src/routes/+page.svelte';

// Note: masthead assertions intentionally live outside this file. The masthead
// is rendered by +layout.svelte, not +page.svelte, and this suite renders the
// page component in isolation (no layout wrapper) to avoid layout-render
// coupling. Masthead behavior is verified via manual/e2e navigation checks,
// not a unit-rendered +layout.svelte import here.

// Recent-lookups state is read from localStorage at page mount, so every
// test in this file needs a clean store to stay deterministic and
// independent of test execution order.
beforeEach(() => {
	localStorage.clear();
});

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

describe('lookup page keyboard reactivity across repeat lookups', () => {
	it('stamping Cm7 then Fmaj7 updates the keyboard highlights to the new chord (no stale E♭)', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);

		let keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(within(keyboard).getByText('E♭')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Fmaj7' } });
		await fireEvent.click(button);

		keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(within(keyboard).queryByText('E♭')).not.toBeInTheDocument();
		expect(within(keyboard).queryByText('B♭')).not.toBeInTheDocument();
		expect(within(keyboard).getByText('F')).toBeInTheDocument();
		expect(within(keyboard).getByText('A')).toBeInTheDocument();
		expect(within(keyboard).getByText('C')).toBeInTheDocument();
		expect(within(keyboard).getByText('E')).toBeInTheDocument();
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

describe('lookup page recent lookups', () => {
	it('does not render a recent-chip row before the first successful lookup', () => {
		render(LookupPage);

		expect(screen.queryByTestId('recent-chip-row')).not.toBeInTheDocument();
	});

	it('shows a recent-chip row after stamping, and re-stamps on chip click', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);
		await fireEvent.input(input, { target: { value: 'Fmaj7' } });
		await fireEvent.click(button);

		const row = screen.getByTestId('recent-chip-row');
		expect(within(row).getByText('Cm7')).toBeInTheDocument();
		expect(within(row).getByText('Fmaj7')).toBeInTheDocument();

		await fireEvent.click(within(row).getByRole('button', { name: 'Look up Cm7 again' }));

		const result = screen.getByTestId('chord-result');
		const glyphShadow = within(result).getAllByTestId('chord-glyph-shadow')[0];
		expect(within(glyphShadow).getByText('C')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();
	});
});

describe('lookup page sharp/flat helpers', () => {
	it('clicking the sharp helper inserts the glyph into the input value', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'F' } });

		const sharpButton = screen.getByRole('button', { name: 'Insert sharp' });
		await fireEvent.click(sharpButton);

		expect(input.value).toContain('♯');
	});

	it('clicking the flat helper inserts the glyph into the input value', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'B' } });

		const flatButton = screen.getByRole('button', { name: 'Insert flat' });
		await fireEvent.click(flatButton);

		expect(input.value).toContain('♭');
	});
});

describe('lookup page did-you-mean suggestion', () => {
	it('stamping an unrecognized-but-close symbol shows a tappable suggestion that stamps the candidate on click', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cmn7' } });
		await fireEvent.click(button);

		const errorBar = screen.getByTestId('error-bar');
		expect(errorBar).toHaveTextContent(/DID YOU MEAN/);

		const suggestion = within(errorBar).getByTestId('suggestion');
		expect(suggestion).toHaveTextContent('Cm7');

		await fireEvent.click(suggestion);

		const result = screen.getByTestId('chord-result');
		const glyphShadow = within(result).getAllByTestId('chord-glyph-shadow')[0];
		expect(within(glyphShadow).getByText('C')).toBeInTheDocument();
		expect(within(glyphShadow).getByText('m7')).toBeInTheDocument();
	});

	it('stamping an unrelated unrecognized symbol falls back to a plain rotating hint with no suggestion token', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Zxq9' } });
		await fireEvent.click(button);

		const errorBar = screen.getByTestId('error-bar');
		expect(errorBar).toBeInTheDocument();
		expect(within(errorBar).queryByTestId('suggestion')).not.toBeInTheDocument();
	});

	it('keeps the previously rendered chord-result visible while showing the suggestion bar (non-blocking)', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Cmn7' } });
		await fireEvent.click(button);

		expect(screen.getByTestId('error-bar')).toBeInTheDocument();
		expect(screen.getByTestId('chord-result')).toBeInTheDocument();
	});
});

describe('lookup page focus behavior', () => {
	it('autofocuses the input on initial mount', () => {
		render(LookupPage);

		const input = screen.getByRole('textbox');
		expect(document.activeElement).toBe(input);
	});

	it('re-selects the input content after a successful stamp for type-over entry', async () => {
		render(LookupPage);

		const input = screen.getByRole('textbox') as HTMLInputElement;
		const button = screen.getByRole('button', { name: /stamp/i });

		await fireEvent.input(input, { target: { value: 'Cm7' } });
		await fireEvent.click(button);

		expect(document.activeElement).toBe(input);
		expect(input.selectionStart).toBe(0);
		expect(input.selectionEnd).toBe(input.value.length);
	});
});
