import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RevealInsight from './RevealInsight.svelte';

describe('RevealInsight: wrong identification (contrast + mnemonic)', () => {
	it('shows the contrast line between the correct and picked symbols', () => {
		render(RevealInsight, { correctSymbol: 'Cm7', givenSymbol: 'C7' });

		const contrast = screen.getByTestId('contrast-line');
		expect(contrast).toHaveTextContent('Cm7 has E♭, C7 has E.');
	});

	it('shows the mnemonic too, but it yields to the contrast on phone widths', () => {
		render(RevealInsight, { correctSymbol: 'Cm7', givenSymbol: 'C7' });

		const mnemonic = screen.getByTestId('mnemonic-line');
		expect(mnemonic).toHaveTextContent('Minor triad plus a ♭7.');
		// Density rule: when both lines exist, the mnemonic hides below sm.
		expect(mnemonic.className).toMatch(/\bhidden\b/);
		expect(mnemonic.className).toMatch(/\bsm:block\b/);
	});

	it('shows only the contrast when the quality has no mnemonic (triads)', () => {
		render(RevealInsight, { correctSymbol: 'C', givenSymbol: 'Cm' });

		expect(screen.getByTestId('contrast-line')).toHaveTextContent('C has E, Cm has E♭.');
		expect(screen.queryByTestId('mnemonic-line')).not.toBeInTheDocument();
	});
});

describe('RevealInsight: wrong construction (mnemonic only)', () => {
	it('shows the mnemonic without the phone-yield class when no contrast exists', () => {
		render(RevealInsight, { correctSymbol: 'F#m7b5' });

		expect(screen.queryByTestId('contrast-line')).not.toBeInTheDocument();
		const mnemonic = screen.getByTestId('mnemonic-line');
		expect(mnemonic).toHaveTextContent('An m7 with the 5 lowered a half step.');
		expect(mnemonic.className).not.toMatch(/\bhidden\b/);
	});
});

describe('RevealInsight: renders nothing when it has nothing worth saying', () => {
	it('no insight block for a mnemonic-less quality with no given symbol', () => {
		render(RevealInsight, { correctSymbol: 'C' });

		expect(screen.queryByTestId('reveal-insight')).not.toBeInTheDocument();
	});

	it('falls back to the mnemonic when the contrast is not expressible', () => {
		// Cmaj7 vs Cdim7 diff is too wide for one line: contrastLine is null.
		render(RevealInsight, { correctSymbol: 'Cmaj7', givenSymbol: 'Cdim7' });

		expect(screen.queryByTestId('contrast-line')).not.toBeInTheDocument();
		const mnemonic = screen.getByTestId('mnemonic-line');
		expect(mnemonic).toHaveTextContent('Major triad, then a 7th a half step under the octave.');
		expect(mnemonic.className).not.toMatch(/\bhidden\b/);
	});
});
