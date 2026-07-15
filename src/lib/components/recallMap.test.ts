import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecallMap from './RecallMap.svelte';
import { newCard, Rating, State } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';

/**
 * Component test for RecallMap (11-06, MEM-04): mocks only the deck's
 * getAllCards, keeping the REAL deriveCellState (imported alongside the mock
 * via importOriginal) so the four cell-state classifications exercise the
 * real 11-03 logic. Uses the REAL allFacts() (pure, no mocking needed) and
 * REAL newCard()/Rating/State from the scheduler to build fixtures covering
 * all four cell states for known factIds from the real 192-entry catalog.
 */

const getAllCardsMock = vi.fn();

vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		getAllCards: (...args: unknown[]) => getAllCardsMock(...args)
	};
});

const NOW = new Date('2026-07-15T12:00:00Z');
const FUTURE = new Date('2026-08-15T12:00:00Z');

function baseCard(factId: string, factKind: CardRecord['factKind']): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode: 'formula',
		lastRating: null
	};
}

beforeEach(() => {
	getAllCardsMock.mockReset();
});

describe('RecallMap (MEM-04: fact x mode recall map)', () => {
	it('renders all four cell states with the correct treatment/glyph, and the legend', async () => {
		// due: a brand-new card, due <= now, regardless of state/lastRating.
		const dueCard = baseCard('chord-formula:Cm7', 'chord-formula');

		// mastered: due > now, state === Review, most recent grade not Again.
		const masteredCard: CardRecord = {
			...baseCard('interval-size:m3', 'interval-size'),
			due: FUTURE,
			state: State.Review,
			lastRating: Rating.Good
		};

		// weak: due > now, most recent grade === Again.
		const weakCard: CardRecord = {
			...baseCard('scale-degree:G:3', 'scale-degree'),
			due: FUTURE,
			state: State.Review,
			lastRating: Rating.Again
		};

		// 'interval-size:M2' is a real catalog factId with no card at all: not-yet-seen.

		getAllCardsMock.mockResolvedValue([dueCard, masteredCard, weakCard]);

		render(RecallMap);
		await waitFor(() => screen.getByTestId('recall-map-grid'));
		// The grid renders synchronously from allFacts(); getAllCards() resolves
		// asynchronously on mount, so wait for the loaded cell state to land
		// before asserting on it (otherwise every cell reads not-yet-seen).
		await waitFor(() =>
			expect(screen.getByTestId('recall-map-cell-chord-formula:Cm7')).toHaveAttribute(
				'data-cell-state',
				'due'
			)
		);

		const masteredCell = screen.getByTestId('recall-map-cell-interval-size:m3');
		expect(masteredCell).toHaveAttribute('data-cell-state', 'mastered');
		expect(masteredCell).toHaveTextContent('✓');

		const weakCell = screen.getByTestId('recall-map-cell-scale-degree:G:3');
		expect(weakCell).toHaveAttribute('data-cell-state', 'weak');
		expect(weakCell).toHaveTextContent('!');

		expect(screen.getByTestId('recall-map-cell-interval-size:M2')).toHaveAttribute(
			'data-cell-state',
			'not-yet-seen'
		);

		// Legend: exactly 4 entries.
		expect(screen.getByText('Not yet seen')).toBeInTheDocument();
		expect(screen.getByText('Due')).toBeInTheDocument();
		expect(screen.getByText('Weak')).toBeInTheDocument();
		expect(screen.getByText('Mastered')).toBeInTheDocument();

		// Row label rendering: chord-formula uses the display-glyph symbol.
		expect(screen.getByText('Cm7')).toBeInTheDocument();
	});

	it('narrows the visible rows via the kind filter tabs', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(RecallMap);
		await waitFor(() => screen.getByTestId('recall-map-grid'));

		expect(screen.getByTestId('recall-map-row-chord-formula:Cm7')).toBeInTheDocument();
		expect(screen.getByTestId('recall-map-row-interval-size:m3')).toBeInTheDocument();
		expect(screen.getByTestId('recall-map-row-scale-degree:G:3')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Chords' }));

		expect(screen.getByTestId('recall-map-row-chord-formula:Cm7')).toBeInTheDocument();
		expect(screen.queryByTestId('recall-map-row-interval-size:m3')).not.toBeInTheDocument();
		expect(screen.queryByTestId('recall-map-row-scale-degree:G:3')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Scales' }));

		expect(screen.queryByTestId('recall-map-row-chord-formula:Cm7')).not.toBeInTheDocument();
		expect(screen.getByTestId('recall-map-row-scale-degree:G:3')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'All' }));

		expect(screen.getByTestId('recall-map-row-chord-formula:Cm7')).toBeInTheDocument();
		expect(screen.getByTestId('recall-map-row-scale-degree:G:3')).toBeInTheDocument();
	});
});
