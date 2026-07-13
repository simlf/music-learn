import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PracticeItemRow from './PracticeItemRow.svelte';
import AccuracyTable from './AccuracyTable.svelte';

describe('PracticeItemRow', () => {
	it('renders the symbol, kind tag, attempts, accuracy%, and the weak accent class when attempts >= 3 and accuracy < 0.7', () => {
		render(PracticeItemRow, { item: { item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4 } });

		const row = screen.getByTestId('practice-item-row');
		expect(within(row).getByText('Cm7')).toBeInTheDocument();
		expect(within(row).getByText('CHORD')).toBeInTheDocument();
		expect(within(row).getByText('5')).toBeInTheDocument();
		expect(within(row).getByText('40%')).toBeInTheDocument();
		expect(row).toHaveClass('practice-row--weak');
	});

	it('does not carry the weak accent class at 80% accuracy (above threshold)', () => {
		render(PracticeItemRow, { item: { item: 'G7', kind: 'chord', attempts: 5, accuracy: 0.8 } });

		const row = screen.getByTestId('practice-item-row');
		expect(row).not.toHaveClass('practice-row--weak');
	});

	it('does not carry the weak accent class below the 3-attempt floor even at 0% accuracy', () => {
		render(PracticeItemRow, { item: { item: 'F', kind: 'chord', attempts: 2, accuracy: 0 } });

		const row = screen.getByTestId('practice-item-row');
		expect(row).not.toHaveClass('practice-row--weak');
	});
});

describe('AccuracyTable', () => {
	it('renders the column headers and one practice-item-row per item', () => {
		render(AccuracyTable, {
			items: [
				{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4 },
				{ item: 'G7', kind: 'chord', attempts: 5, accuracy: 0.8 }
			]
		});

		const table = screen.getByTestId('accuracy-table');
		expect(within(table).getByText('SYMBOL')).toBeInTheDocument();
		expect(within(table).getByText('KIND')).toBeInTheDocument();
		expect(within(table).getByText('ATTEMPTS')).toBeInTheDocument();
		expect(within(table).getByText('ACCURACY')).toBeInTheDocument();

		const rows = within(table).getAllByTestId('practice-item-row');
		expect(rows).toHaveLength(2);
	});
});
