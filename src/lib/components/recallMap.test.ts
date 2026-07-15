import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecallMap from './RecallMap.svelte';
import { newCard, Rating, State } from '$lib/srs/scheduler';
import { allFacts } from '$lib/srs/facts';
import type { CardRecord } from '$lib/srs/deck';

/**
 * Component test for RecallMap (11-06/13-02, MEM-04/RECALL-01): mocks only the
 * deck's getAllCards, keeping the REAL deriveCellState (imported alongside the
 * mock via importOriginal, wrapped in a call-counting spy) so the four
 * cell-state classifications exercise the real 11-03 logic. Uses the REAL
 * allFacts() (pure, no mocking needed) and REAL newCard()/Rating/State from
 * the scheduler to build fixtures covering all four cell states for known
 * factIds from the real 192-entry catalog.
 */

const getAllCardsMock = vi.fn();
const deriveCellStateSpy = vi.fn();

vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
		deriveCellState: (...args: Parameters<typeof actual.deriveCellState>) => {
			deriveCellStateSpy(...args);
			return actual.deriveCellState(...args);
		}
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
		lastRating: null,
		masteryDayCount: 0
	};
}

beforeEach(() => {
	getAllCardsMock.mockReset();
	deriveCellStateSpy.mockReset();
});

describe('RecallMap (MEM-04: fact x mode recall map)', () => {
	it('renders all four cell states with the correct treatment/glyph, and the legend', async () => {
		// due: a brand-new card, due <= now, regardless of state/lastRating.
		const dueCard = baseCard('chord-formula:Cm7', 'chord-formula');

		// mastered: due > now, state === Review, most recent grade not Again,
		// AND masteryDayCount >= 2 (successive-relearning gate, IMP-01).
		const masteredCard: CardRecord = {
			...baseCard('interval-size:m3', 'interval-size'),
			due: FUTURE,
			state: State.Review,
			lastRating: Rating.Good,
			masteryDayCount: 2
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
			expect(screen.getByTestId('recall-map-cell-chord-formula:Cm7-formula')).toHaveAttribute(
				'data-cell-state',
				'due'
			)
		);

		const masteredCell = screen.getByTestId('recall-map-cell-interval-size:m3-formula');
		expect(masteredCell).toHaveAttribute('data-cell-state', 'mastered');
		expect(masteredCell).toHaveTextContent('✓');
		expect(masteredCell).toHaveAccessibleName('m3, Formula: Mastered');

		const weakCell = screen.getByTestId('recall-map-cell-scale-degree:G:3-formula');
		expect(weakCell).toHaveAttribute('data-cell-state', 'weak');
		expect(weakCell).toHaveTextContent('!');
		expect(weakCell).toHaveAccessibleName('G major degree 3, Formula: Weak');

		expect(screen.getByTestId('recall-map-cell-interval-size:M2-formula')).toHaveAccessibleName(
			'M2, Formula: Not yet seen'
		);

		expect(screen.getByTestId('recall-map-cell-interval-size:M2-formula')).toHaveAttribute(
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

	it('extends to 4 mode columns in fading-scaffold order (Formula, Build, Play, Name)', async () => {
		getAllCardsMock.mockResolvedValue([]);

		const { container } = render(RecallMap);
		await waitFor(() => screen.getByTestId('recall-map-grid'));

		// First .recall-map__header is the empty corner cell above the row
		// labels; the remaining 4 are the mode column headers, in order.
		const headerLabels = Array.from(container.querySelectorAll('.recall-map__header'))
			.slice(1)
			.map((el) => el.textContent?.trim());
		expect(headerLabels).toEqual(['Formula', 'Build', 'Play', 'Name']);

		const grid = screen.getByTestId('recall-map-grid');
		expect(grid.getAttribute('style')).toContain('repeat(4, 1fr)');
	});

	it('chord-formula rows get 4 real cells; interval-size/scale-degree rows get 1 real cell plus 3 not-applicable cells', async () => {
		const formulaCard = baseCard('chord-formula:Cm7', 'chord-formula'); // due

		const buildCard: CardRecord = {
			...baseCard('chord-formula:Cm7', 'chord-formula'),
			mode: 'formula-build',
			due: FUTURE,
			state: State.Review,
			lastRating: Rating.Good,
			masteryDayCount: 2
		};

		const playCard: CardRecord = {
			...baseCard('chord-formula:Cm7', 'chord-formula'),
			mode: 'see-play',
			due: FUTURE,
			state: State.Review,
			lastRating: Rating.Again
		};

		// 'chord-formula:Cm7'|'hear-name' has no card at all: not-yet-seen.

		getAllCardsMock.mockResolvedValue([formulaCard, buildCard, playCard]);

		render(RecallMap);
		await waitFor(() => screen.getByTestId('recall-map-grid'));
		await waitFor(() =>
			expect(screen.getByTestId('recall-map-cell-chord-formula:Cm7-formula')).toHaveAttribute(
				'data-cell-state',
				'due'
			)
		);

		// All 4 columns are real cells for a chord-formula row.
		expect(
			screen.getByTestId('recall-map-cell-chord-formula:Cm7-formula-build')
		).toHaveAttribute('data-cell-state', 'mastered');
		expect(screen.getByTestId('recall-map-cell-chord-formula:Cm7-see-play')).toHaveAttribute(
			'data-cell-state',
			'weak'
		);
		expect(screen.getByTestId('recall-map-cell-chord-formula:Cm7-hear-name')).toHaveAttribute(
			'data-cell-state',
			'not-yet-seen'
		);

		// interval-size row: only Formula is real; Build/Play/Name are 'not applicable'.
		expect(screen.getByTestId('recall-map-cell-interval-size:M2-formula')).toHaveAttribute(
			'data-cell-state',
			'not-yet-seen'
		);

		const intervalBuildCell = screen.getByTestId('recall-map-cell-interval-size:M2-formula-build');
		expect(intervalBuildCell).toHaveAttribute('data-cell-state', 'not-applicable');
		expect(intervalBuildCell).toHaveAccessibleName('M2, Build: Not applicable');
		expect(intervalBuildCell.querySelector('span[aria-hidden="true"]')).toHaveTextContent('·');

		const intervalPlayCell = screen.getByTestId('recall-map-cell-interval-size:M2-see-play');
		expect(intervalPlayCell).toHaveAttribute('data-cell-state', 'not-applicable');
		expect(intervalPlayCell).toHaveAccessibleName('M2, Play: Not applicable');

		const intervalNameCell = screen.getByTestId('recall-map-cell-interval-size:M2-hear-name');
		expect(intervalNameCell).toHaveAttribute('data-cell-state', 'not-applicable');
		expect(intervalNameCell).toHaveAccessibleName('M2, Name: Not applicable');

		// scale-degree row: same not-applicable pattern for Build/Play/Name.
		expect(screen.getByTestId('recall-map-cell-scale-degree:G:3-formula')).toHaveAttribute(
			'data-cell-state',
			'not-yet-seen'
		);

		const scaleBuildCell = screen.getByTestId('recall-map-cell-scale-degree:G:3-formula-build');
		expect(scaleBuildCell).toHaveAttribute('data-cell-state', 'not-applicable');
		expect(scaleBuildCell).toHaveAccessibleName('G major degree 3, Build: Not applicable');

		const scalePlayCell = screen.getByTestId('recall-map-cell-scale-degree:G:3-see-play');
		expect(scalePlayCell).toHaveAttribute('data-cell-state', 'not-applicable');
		expect(scalePlayCell).toHaveAccessibleName('G major degree 3, Play: Not applicable');

		const scaleNameCell = screen.getByTestId('recall-map-cell-scale-degree:G:3-hear-name');
		expect(scaleNameCell).toHaveAttribute('data-cell-state', 'not-applicable');
		expect(scaleNameCell).toHaveAccessibleName('G major degree 3, Name: Not applicable');

		// Legend still renders EXACTLY the 4 real CellStates - no 5th
		// 'not applicable' entry, even though not-applicable cells exist.
		expect(screen.getByText('Not yet seen')).toBeInTheDocument();
		expect(screen.getByText('Due')).toBeInTheDocument();
		expect(screen.getByText('Weak')).toBeInTheDocument();
		expect(screen.getByText('Mastered')).toBeInTheDocument();
		expect(screen.queryByText(/not applicable/i)).not.toBeInTheDocument();
	});

	it('never calls deriveCellState for the non-applicable Build/Play/Name columns on interval-size rows', async () => {
		getAllCardsMock.mockResolvedValue([]);

		render(RecallMap);
		await waitFor(() => screen.getByTestId('recall-map-grid'));
		await waitFor(() =>
			expect(screen.getByTestId('recall-map-cell-interval-size:M2-formula')).toHaveAttribute(
				'data-cell-state',
				'not-yet-seen'
			)
		);

		deriveCellStateSpy.mockClear();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));

		// Only the Formula column is a real cell for interval-size rows: after
		// narrowing to ONLY interval-size rows, deriveCellState must be called
		// exactly once per visible fact (one Formula cell each) - proving the
		// Build/Play/Name cells never call it at all for these rows, not just
		// that their visual output looks inert.
		const intervalFactCount = allFacts().filter((fact) => fact.factKind === 'interval-size').length;
		expect(deriveCellStateSpy).toHaveBeenCalledTimes(intervalFactCount);
	});
});
