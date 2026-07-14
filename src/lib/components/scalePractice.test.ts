import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScalePractice from './ScalePractice.svelte';
import { majorScaleNotes } from '$lib/theory/scale';

const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

beforeEach(() => {
	playNoteMock.mockClear();
});

describe('ScalePractice ascending tap drill (sketch 004)', () => {
	it('renders a 1-7 degree ladder and a tap row of seven degrees, none filled yet', () => {
		render(ScalePractice, { notes: majorScaleNotes('C'), tonic: 'C' });

		const ladder = screen.getByTestId('drill-ladder');
		const rungs = within(ladder).getAllByTestId('rung');
		expect(rungs).toHaveLength(7);
		expect(rungs.every((rung) => rung.dataset.done === 'false')).toBe(true);

		const row = screen.getByTestId('drill-row');
		expect(within(row).getAllByRole('button')).toHaveLength(7);
	});

	it('tapping the tonic first plays it and fills the first rung', async () => {
		render(ScalePractice, { notes: majorScaleNotes('C'), tonic: 'C' });

		await fireEvent.click(screen.getByRole('button', { name: 'C degree 1' }));

		expect(playNoteMock).toHaveBeenCalledWith('C4');
		const ladder = screen.getByTestId('drill-ladder');
		const rungs = within(ladder).getAllByTestId('rung');
		expect(rungs[0].dataset.done).toBe('true');
		expect(rungs[1].dataset.now).toBe('true');
	});

	it('tapping out of order flags the wrong degree and does not advance', async () => {
		render(ScalePractice, { notes: majorScaleNotes('C'), tonic: 'C' });

		await fireEvent.click(screen.getByRole('button', { name: 'E degree 3' }));

		const ladder = screen.getByTestId('drill-ladder');
		expect(within(ladder).getAllByTestId('rung')[0].dataset.done).toBe('false');
		expect(screen.getByRole('button', { name: 'E degree 3' })).toHaveClass('wrong');
		// A wrong tap never sounds: only a correct next-degree tap plays.
		expect(playNoteMock).not.toHaveBeenCalled();
	});

	it('tapping all seven degrees in order completes the drill and shows congratulations', async () => {
		render(ScalePractice, { notes: majorScaleNotes('C'), tonic: 'C' });

		for (let degree = 1; degree <= 7; degree++) {
			const button = screen.getAllByRole('button').find((btn) =>
				btn.getAttribute('aria-label')?.endsWith(`degree ${degree}`)
			)!;
			await fireEvent.click(button);
		}

		expect(screen.getByTestId('drill-complete')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Run it again' })).toBeInTheDocument();
		expect(playNoteMock).toHaveBeenCalledTimes(7);
	});

	it('Run it again resets the drill to step 0', async () => {
		render(ScalePractice, { notes: majorScaleNotes('C'), tonic: 'C' });

		for (let degree = 1; degree <= 7; degree++) {
			const button = screen.getAllByRole('button').find((btn) =>
				btn.getAttribute('aria-label')?.endsWith(`degree ${degree}`)
			)!;
			await fireEvent.click(button);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Run it again' }));

		expect(screen.queryByTestId('drill-complete')).not.toBeInTheDocument();
		const ladder = screen.getByTestId('drill-ladder');
		expect(within(ladder).getAllByTestId('rung').every((rung) => rung.dataset.done === 'false')).toBe(
			true
		);
	});

	it('resets the drill when the tonic/notes change', async () => {
		const { rerender } = render(ScalePractice, { notes: majorScaleNotes('C'), tonic: 'C' });

		await fireEvent.click(screen.getByRole('button', { name: 'C degree 1' }));
		let ladder = screen.getByTestId('drill-ladder');
		expect(within(ladder).getAllByTestId('rung')[0].dataset.done).toBe('true');

		await rerender({ notes: majorScaleNotes('G'), tonic: 'G' });

		ladder = screen.getByTestId('drill-ladder');
		expect(within(ladder).getAllByTestId('rung')[0].dataset.done).toBe('false');
		expect(screen.getByRole('button', { name: 'G degree 1' })).toBeInTheDocument();
	});
});
