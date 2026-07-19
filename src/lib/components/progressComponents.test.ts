import { render, screen, within, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PracticeItemRow from './PracticeItemRow.svelte';
import AccuracyTable from './AccuracyTable.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';

afterEach(() => {
	setLocale('en');
});

describe('PracticeItemRow', () => {
	it('renders the symbol, kind tag, attempts, accuracy%, and the weak accent class when attempts >= 3 and accuracy < 0.7', () => {
		render(PracticeItemRow, { item: { item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4 } });

		const row = screen.getByTestId('practice-item-row');
		expect(within(row).getByText('Cm7')).toBeInTheDocument();
		expect(within(row).getByText('CHORD')).toBeInTheDocument();
		expect(within(row).getByText('5')).toBeInTheDocument();
		expect(within(row).getByText('40%')).toBeInTheDocument();
		expect(row).toHaveClass('practice-row--weak');

		// The KIND cell stays in the DOM but is hidden on mobile via a
		// responsive display class (09-06: mobile-fit accuracy table).
		const kindCell = within(row).getByText('CHORD');
		expect(kindCell).toHaveClass('hidden');
		expect(kindCell.className).toMatch(/sm:table-cell/);
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

	it('renders the inline accuracy bar on every row, including a non-weak (strong) row', () => {
		render(PracticeItemRow, { item: { item: 'G7', kind: 'chord', attempts: 5, accuracy: 0.8 } });

		const row = screen.getByTestId('practice-item-row');
		expect(within(row).getByTestId('accuracy-bar')).toBeInTheDocument();
	});

	it('renders no DRILL button when onDrill is omitted, even for a weak chord item', () => {
		render(PracticeItemRow, { item: { item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4 } });

		const row = screen.getByTestId('practice-item-row');
		expect(within(row).getByTestId('accuracy-bar')).toBeInTheDocument();
		expect(within(row).queryByRole('button')).not.toBeInTheDocument();
	});

	it('renders a ghost DRILL button with the chord symbol in its aria-label when onDrill is supplied for a weak chord, and clicking it calls onDrill with the symbol', async () => {
		const onDrill = vi.fn();
		render(PracticeItemRow, {
			item: { item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4 },
			onDrill
		});

		const row = screen.getByTestId('practice-item-row');
		const button = within(row).getByRole('button', { name: 'Drill Cm7' });
		expect(button).toBeInTheDocument();

		await fireEvent.click(button);
		expect(onDrill).toHaveBeenCalledWith('Cm7');
	});

	it('renders no DRILL button for a weak SCALE item even when onDrill is supplied (chord-only)', () => {
		const onDrill = vi.fn();
		render(PracticeItemRow, {
			item: { item: 'C major', kind: 'scale', attempts: 5, accuracy: 0.4 },
			onDrill
		});

		const row = screen.getByTestId('practice-item-row');
		expect(within(row).queryByRole('button')).not.toBeInTheDocument();
	});

	it('renders no DRILL button for a non-weak chord item even when onDrill is supplied', () => {
		const onDrill = vi.fn();
		render(PracticeItemRow, {
			item: { item: 'G7', kind: 'chord', attempts: 5, accuracy: 0.8 },
			onDrill
		});

		const row = screen.getByTestId('practice-item-row');
		expect(within(row).queryByRole('button')).not.toBeInTheDocument();
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
		const kindHeader = within(table).getByText('KIND');
		expect(kindHeader).toBeInTheDocument();
		expect(kindHeader).toHaveClass('hidden');
		expect(kindHeader.className).toMatch(/sm:table-cell/);
		expect(within(table).getByText('ATTEMPTS')).toBeInTheDocument();
		expect(within(table).getByText('ACCURACY')).toBeInTheDocument();

		const rows = within(table).getAllByTestId('practice-item-row');
		expect(rows).toHaveLength(2);
	});
});

describe('French locale (I18N-02)', () => {
	it('AccuracyTable renders French column headers under fr', () => {
		setLocale('fr');
		render(AccuracyTable, {
			items: [{ item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4 }]
		});

		const table = screen.getByTestId('accuracy-table');
		expect(within(table).getByText('SYMBOLE')).toBeInTheDocument();
		expect(within(table).getByText('ESSAIS')).toBeInTheDocument();
		expect(within(table).getByText('PRÉCISION')).toBeInTheDocument();
	});

	it('PracticeItemRow renders the French KIND category word but keeps the chord symbol and accuracy% verbatim', () => {
		setLocale('fr');
		render(PracticeItemRow, { item: { item: 'Cm7', kind: 'chord', attempts: 5, accuracy: 0.4 } });

		const row = screen.getByTestId('practice-item-row');
		expect(within(row).getByText('Cm7')).toBeInTheDocument();
		expect(within(row).getByText('ACCORD')).toBeInTheDocument();
		expect(within(row).getByText('40%')).toBeInTheDocument();
	});
});
