import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import HintLadder from './HintLadder.svelte';

/**
 * Standalone component tests (mirrors intervalScaffold.test.ts /
 * songHook.test.ts): HintLadder has no side-effect imports (no deck/audio
 * mocks needed). Uses the canonical Cdim fixture (C, E♭, G♭) plus a seventh
 * chord (Cm7) to exercise both the 4-item and 3-item ladder shapes.
 */
describe('HintLadder', () => {
	it('renders nothing for an unrecognized symbol', () => {
		render(HintLadder, { symbol: 'Xyz', layers: ['family', 'formula', 'keyboard', 'spelling'] });
		expect(screen.queryByTestId('hint-ladder')).not.toBeInTheDocument();
	});

	it('depth 0: only the control is visible, labelled "Need a hint?"', () => {
		render(HintLadder, { symbol: 'Cdim', layers: ['family', 'formula', 'keyboard', 'spelling'] });

		const cta = screen.getByTestId('hint-cta');
		expect(within(cta).getByText('Need a hint?')).toBeInTheDocument();
		expect(screen.queryByTestId('hint-layer')).not.toBeInTheDocument();
		expect(screen.queryByTestId('hint-closing-line')).not.toBeInTheDocument();
	});

	it('4-item ladder: reveals family -> formula -> keyboard -> spelling cumulatively, with the exact control and tier labels', async () => {
		render(HintLadder, { symbol: 'Cdim', layers: ['family', 'formula', 'keyboard', 'spelling'] });

		const cta = () => screen.getByTestId('hint-cta');
		const button = () => within(cta()).getByRole('button');

		// Depth 0 -> 1: family.
		expect(within(cta()).getByText('Need a hint?')).toBeInTheDocument();
		await fireEvent.click(button());

		let layers = screen.getAllByTestId('hint-layer');
		expect(layers).toHaveLength(1);
		expect(layers[0]).toHaveAttribute('data-layer', 'family');
		expect(
			within(layers[0]).getByText('Hint 1 · the family', { exact: false })
		).toBeInTheDocument();
		expect(
			within(layers[0]).getByText(/Diminished means tense and unstable/)
		).toBeInTheDocument();

		// Depth 1 -> 2: formula.
		expect(within(cta()).getByText('Show the formula')).toBeInTheDocument();
		await fireEvent.click(button());

		layers = screen.getAllByTestId('hint-layer');
		expect(layers).toHaveLength(2);
		expect(layers[1]).toHaveAttribute('data-layer', 'formula');
		expect(
			within(layers[1]).getByText('Hint 2 · the formula', { exact: false })
		).toBeInTheDocument();
		expect(
			within(layers[1]).getByText('From the root, stack a minor 3rd, then a diminished 5th.')
		).toBeInTheDocument();
		expect(within(layers[1]).getByTestId('interval-scaffold')).toBeInTheDocument();
		// Family layer's text is still present (cumulative, not replaced).
		expect(screen.getByText(/Diminished means tense and unstable/)).toBeInTheDocument();

		// Depth 2 -> 3: keyboard.
		expect(within(cta()).getByText('Show it on the keyboard')).toBeInTheDocument();
		await fireEvent.click(button());

		layers = screen.getAllByTestId('hint-layer');
		expect(layers).toHaveLength(3);
		expect(layers[2]).toHaveAttribute('data-layer', 'keyboard');
		expect(
			within(layers[2]).getByText('Hint 3 · on the keys', { exact: false })
		).toBeInTheDocument();
		expect(within(layers[2]).getByRole('img', { name: /Piano keyboard/ })).toBeInTheDocument();
		// Prior layers remain present after the 3rd tap.
		expect(screen.getByText(/Diminished means tense and unstable/)).toBeInTheDocument();
		expect(
			screen.getByText('From the root, stack a minor 3rd, then a diminished 5th.')
		).toBeInTheDocument();

		// Depth 3 -> 4: spelling (max depth).
		expect(within(cta()).getByText('Show the full spelling')).toBeInTheDocument();
		await fireEvent.click(button());

		layers = screen.getAllByTestId('hint-layer');
		expect(layers).toHaveLength(4);
		expect(layers[3]).toHaveAttribute('data-layer', 'spelling');
		expect(
			within(layers[3]).getByText('Hint 4 · full spelling', { exact: false })
		).toBeInTheDocument();
		// Cdim note boxes: C, E♭, G♭.
		const noteBoxes = within(layers[3]).getByTestId('hint-note-boxes');
		expect(within(noteBoxes).getByText('C')).toBeInTheDocument();
		expect(within(noteBoxes).getByText('E♭')).toBeInTheDocument();
		expect(within(noteBoxes).getByText('G♭')).toBeInTheDocument();
		// SongHook toggle for the third (m3 -> vetted hook).
		expect(within(layers[3]).getByText('Sounds like…')).toBeInTheDocument();

		// All prior layers still present after the 4th tap (cumulative, explicit).
		expect(screen.getByText(/Diminished means tense and unstable/)).toBeInTheDocument();
		expect(
			screen.getByText('From the root, stack a minor 3rd, then a diminished 5th.')
		).toBeInTheDocument();
		expect(screen.getByRole('img', { name: /Piano keyboard/ })).toBeInTheDocument();

		// Max depth: the control is gone, the closing line takes its place.
		expect(screen.queryByTestId('hint-cta')).not.toBeInTheDocument();
		expect(screen.getByTestId('hint-closing-line')).toHaveTextContent("That's the whole chord.");
	});

	it('Cm7 (seventh chord): formula sentence includes the seventh, IntervalScaffold shows R/m3/P5/m7', async () => {
		render(HintLadder, { symbol: 'Cm7', layers: ['family', 'formula', 'keyboard', 'spelling'] });

		await fireEvent.click(within(screen.getByTestId('hint-cta')).getByRole('button'));
		await fireEvent.click(within(screen.getByTestId('hint-cta')).getByRole('button'));

		expect(
			screen.getByText('From the root, stack a minor 3rd, then a perfect 5th, then a minor 7th.')
		).toBeInTheDocument();
		const scaffold = screen.getByTestId('interval-scaffold');
		for (const short of ['R', 'm3', 'P5', 'm7']) {
			expect(within(scaffold).getAllByText(short).length).toBeGreaterThan(0);
		}
	});

	it('3-item ladder (formula omitted): tier labels and control labels renumber sequentially, never showing an interval-scaffold', async () => {
		render(HintLadder, { symbol: 'Cdim', layers: ['family', 'keyboard', 'spelling'] });

		const cta = () => screen.getByTestId('hint-cta');
		const button = () => within(cta()).getByRole('button');

		expect(within(cta()).getByText('Need a hint?')).toBeInTheDocument();
		await fireEvent.click(button());

		let layers = screen.getAllByTestId('hint-layer');
		expect(layers).toHaveLength(1);
		expect(
			within(layers[0]).getByText('Hint 1 · the family', { exact: false })
		).toBeInTheDocument();

		expect(within(cta()).getByText('Show it on the keyboard')).toBeInTheDocument();
		await fireEvent.click(button());

		layers = screen.getAllByTestId('hint-layer');
		expect(layers).toHaveLength(2);
		expect(layers[1]).toHaveAttribute('data-layer', 'keyboard');
		expect(
			within(layers[1]).getByText('Hint 2 · on the keys', { exact: false })
		).toBeInTheDocument();

		expect(within(cta()).getByText('Show the full spelling')).toBeInTheDocument();
		await fireEvent.click(button());

		layers = screen.getAllByTestId('hint-layer');
		expect(layers).toHaveLength(3);
		expect(layers[2]).toHaveAttribute('data-layer', 'spelling');
		expect(
			within(layers[2]).getByText('Hint 3 · full spelling', { exact: false })
		).toBeInTheDocument();

		expect(screen.queryByTestId('interval-scaffold')).not.toBeInTheDocument();
		expect(screen.queryByTestId('hint-cta')).not.toBeInTheDocument();
		expect(screen.getByTestId('hint-closing-line')).toHaveTextContent("That's the whole chord.");
	});

	it('onOpen fires exactly once, on the 0->1 transition', async () => {
		const onOpen = vi.fn();
		render(HintLadder, {
			symbol: 'Cdim',
			layers: ['family', 'formula', 'keyboard', 'spelling'],
			onOpen
		});

		const button = () => within(screen.getByTestId('hint-cta')).getByRole('button');

		await fireEvent.click(button());
		expect(onOpen).toHaveBeenCalledTimes(1);

		await fireEvent.click(button());
		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});
