import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logConfidence } from '$lib/practice/confidenceLog';

/**
 * Progress confidence calibration payoff (sketch 020-C, Phase 25 Plan 08):
 * the confidence-vs-correctness view built on 25-04's calibration()/
 * dangerCards() and 25-06's Recall confidence-dot capture. Exercises the
 * REAL confidenceLog module (real localStorage, cleared per test) - matches
 * recallSession.test.ts's convention for this same log rather than mocking
 * it.
 */

vi.mock('$lib/api/client', () => ({
	getApiToken: () => '',
	setApiToken: vi.fn()
}));

vi.mock('$lib/api/progress', () => ({
	fetchStats: vi.fn(() => Promise.resolve({ items: [], weakest: [] })),
	fetchStreak: vi.fn(() => Promise.resolve({ streak: 0, practicedToday: false })),
	localDateString: () => '2026-07-21'
}));

const setDrillSeedsMock = vi.fn();
vi.mock('$lib/practice/drillSeeds', () => ({
	setDrillSeeds: (...args: unknown[]) => setDrillSeedsMock(...args)
}));

const gotoMock = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

const { default: ProgressPage } = await import('./progress/+page.svelte');

beforeEach(() => {
	localStorage.clear();
	setDrillSeedsMock.mockClear();
	gotoMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('Progress confidence calibration (sketch 020-C)', () => {
	it('renders the calibration section with three level bars from the confidence log', () => {
		logConfidence({
			factId: 'chord-formula:Cm7',
			mode: 'formula',
			confidence: 'certain',
			correct: true,
			at: '2026-07-20T10:00:00.000Z'
		});

		render(ProgressPage);

		const section = screen.getByTestId('confidence-calibration');
		expect(within(section).getAllByTestId('calibration-bar')).toHaveLength(3);
	});

	it('shows the MISCALIBRATED flag when certain-accuracy is below somewhat-accuracy', () => {
		logConfidence({
			factId: 'chord-formula:Cm7',
			mode: 'formula',
			confidence: 'somewhat',
			correct: true,
			at: '2026-07-20T10:00:00.000Z'
		});
		logConfidence({
			factId: 'chord-formula:Dm7',
			mode: 'formula',
			confidence: 'certain',
			correct: false,
			at: '2026-07-20T10:01:00.000Z'
		});

		render(ProgressPage);

		expect(screen.getByTestId('calibration-miscalibrated-flag')).toBeInTheDocument();
	});

	it('does not show the MISCALIBRATED flag when certain-accuracy is at or above somewhat-accuracy', () => {
		logConfidence({
			factId: 'chord-formula:Cm7',
			mode: 'formula',
			confidence: 'somewhat',
			correct: false,
			at: '2026-07-20T10:00:00.000Z'
		});
		logConfidence({
			factId: 'chord-formula:Dm7',
			mode: 'formula',
			confidence: 'certain',
			correct: true,
			at: '2026-07-20T10:01:00.000Z'
		});

		render(ProgressPage);

		expect(screen.queryByTestId('calibration-miscalibrated-flag')).not.toBeInTheDocument();
	});

	it('lists the confident-but-wrong danger cards and the drill CTA seeds their symbols + navigates to /drills', async () => {
		logConfidence({
			factId: 'chord-formula:Cm7',
			mode: 'formula',
			confidence: 'certain',
			correct: false,
			at: '2026-07-20T10:00:00.000Z'
		});
		logConfidence({
			factId: 'chord-formula:Cm7',
			mode: 'formula',
			confidence: 'certain',
			correct: false,
			at: '2026-07-20T10:01:00.000Z'
		});

		render(ProgressPage);

		const card = screen.getByTestId('danger-card');
		expect(within(card).getByText('Cm7')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Drill the danger cards' }));

		expect(setDrillSeedsMock).toHaveBeenCalledWith(['Cm7']);
		expect(gotoMock).toHaveBeenCalledWith('/drills');
	});

	it('hides the calibration section entirely when the confidence log is empty', () => {
		render(ProgressPage);

		expect(screen.queryByTestId('confidence-calibration')).not.toBeInTheDocument();
	});
});
