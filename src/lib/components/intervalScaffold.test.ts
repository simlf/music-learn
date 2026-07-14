import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import IntervalScaffold from './IntervalScaffold.svelte';
import { formulaFor } from '$lib/lookup/chordPresentation';
import { spellChord } from '$lib/theory/chord';

const cm7 = formulaFor(spellChord('Cm7'));

describe('IntervalScaffold (sketch 005)', () => {
	it('full level shows every interval short name plus its French long name', () => {
		render(IntervalScaffold, { entries: cm7, level: 'full' });

		const scaffold = screen.getByTestId('interval-scaffold');
		for (const short of ['R', 'm3', 'P5', 'm7']) {
			expect(within(scaffold).getAllByText(short).length).toBeGreaterThan(0);
		}
		// French long names present at full level.
		expect(within(scaffold).getByText('tierce mineure')).toBeInTheDocument();
	});

	it('compact level shows interval short names but drops the long names', () => {
		render(IntervalScaffold, { entries: cm7, level: 'compact' });

		const scaffold = screen.getByTestId('interval-scaffold');
		expect(within(scaffold).getAllByText('m3').length).toBeGreaterThan(0);
		expect(within(scaffold).queryByText('tierce mineure')).not.toBeInTheDocument();
	});

	it('never shows the answer note letters (intervals only, so construction is not given away)', () => {
		render(IntervalScaffold, { entries: cm7, level: 'full' });

		const scaffold = screen.getByTestId('interval-scaffold');
		// The spelled notes are C, E flat, G, B flat: none should appear as a label.
		expect(within(scaffold).queryByText('E♭')).not.toBeInTheDocument();
		expect(within(scaffold).queryByText('B♭')).not.toBeInTheDocument();
	});

	it('renders nothing at level off', () => {
		render(IntervalScaffold, { entries: cm7, level: 'off' });
		expect(screen.queryByTestId('interval-scaffold')).not.toBeInTheDocument();
	});
});
