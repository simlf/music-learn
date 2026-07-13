import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrillsPage from '../src/routes/drills/+page.svelte';
import RootLayout from '../src/routes/+layout.svelte';

// This suite pins the construction-drill loop (Plan 03). generateQuestion's
// question type and symbol are drawn via Math.random(), so every test here
// mocks Math.random to force a deterministic construction question (Cm7)
// rather than relying on flaky real randomness (03-PATTERNS.md).
//
// generateQuestion() internally draws, in order: (1) randomChord's root
// index, (2) randomChord's quality index, (3) pickQuestionType's 0/1 draw.
// Returning 0 for all three draws yields root 'C', quality '' ... which is
// not what we want (a bare C major triad, question type 'construction' only
// when index 0 maps to 'construction'). We instead force draws precisely:
// root index -> C (index 0), quality index -> m7 (index 4 in
// QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7']),
// question type -> 'construction' (index 0 of ['construction',
// 'identification']).
const ROOTS_LENGTH = 12;
const QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7'];
const QUALITY_INDEX = QUALITY_SUFFIXES.indexOf('m7');

function forceConstructionCm7() {
	const draws = [
		0 / ROOTS_LENGTH, // root index 0 -> 'C'
		QUALITY_INDEX / QUALITY_SUFFIXES.length, // quality index -> 'm7'
		0 // question type index 0 -> 'construction'
	];
	let call = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

beforeEach(() => {
	forceConstructionCm7();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('drills page zero-friction construction load', () => {
	it('renders a construction prompt with the instruction line and the interactive keyboard, no setup screen', () => {
		render(DrillsPage);

		expect(screen.getByText('Click the notes for Cm7.')).toBeInTheDocument();

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard).toBeInTheDocument();
		expect(within(keyboard).getAllByRole('button').length).toBeGreaterThan(0);
	});
});

describe('drills page Check button gating', () => {
	it('disables Check on load and enables it after selecting one key', async () => {
		render(DrillsPage);

		const checkButton = screen.getByRole('button', { name: 'Check' });
		expect(checkButton).toBeDisabled();

		const cKey = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.click(cKey);

		expect(checkButton).toBeEnabled();
	});
});

describe('drills page correct construction answer', () => {
	it('grades a correct Cm7 voicing and shows the stamp feedback with a right-answer confirmation', async () => {
		render(DrillsPage);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'E♭ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'B♭ key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const feedback = screen.getByTestId('drill-feedback');
		expect(feedback).toBeInTheDocument();
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
	});

	it('accepts the correct pitch classes played in a different octave (any-voicing acceptance)', async () => {
		render(DrillsPage);

		// Click the second-octave duplicate of C and E♭ (indices 7+), and the
		// first-octave G and B♭, exercising matchChord's chroma equality across
		// octave-duplicated keys rather than requiring the exact same key index
		// every time (DRILL-01).
		const cKeys = screen.getAllByRole('button', { name: 'C key' });
		const eFlatKeys = screen.getAllByRole('button', { name: 'E♭ key' });
		await fireEvent.click(cKeys[cKeys.length - 1]);
		await fireEvent.click(eFlatKeys[eFlatKeys.length - 1]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'B♭ key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
	});
});

describe('drills page wrong construction answer teaches', () => {
	it('shows the wrong-answer headline, teaching lead-in, interval formula, and played/correct diff', async () => {
		render(DrillsPage);

		// Omit B♭, add A: an incorrect set (missing the 7th, an extra 6th).
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'E♭ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Not quite\.|Close, but no cigar\.|Not this time\./)
		).toBeInTheDocument();
		expect(within(feedback).getByText('Here is the shape:')).toBeInTheDocument();

		const formula = within(feedback).getByTestId('interval-formula');
		expect(within(formula).getByText('R')).toBeInTheDocument();
		expect(within(formula).getByText('m3')).toBeInTheDocument();
		expect(within(formula).getByText('P5')).toBeInTheDocument();
		expect(within(formula).getByText('m7')).toBeInTheDocument();

		expect(within(feedback).getByText('You played:')).toBeInTheDocument();
		expect(within(feedback).getByText('Correct:')).toBeInTheDocument();
	});
});

describe('drills page Clear', () => {
	it('deselects all keys, disables Check again, and renders no feedback', async () => {
		render(DrillsPage);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'E♭ key' })[0]);

		const checkButton = screen.getByRole('button', { name: 'Check' });
		expect(checkButton).toBeEnabled();

		await fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

		expect(checkButton).toBeDisabled();
		expect(screen.queryByTestId('drill-feedback')).not.toBeInTheDocument();
	});
});

describe('drills masthead nav link', () => {
	it('the masthead exposes a Drills link routing to /drills', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { children: emptyChildren });

		const link = screen.getByRole('link', { name: 'Drills' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/drills');
	});
});
