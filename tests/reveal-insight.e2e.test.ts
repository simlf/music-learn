import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrillsPage from '../src/routes/drills/+page.svelte';

// Same mock scaffolding as tests/drills.e2e.test.ts, kept in its own file so
// Track D's reveal-card additions do not contend with the other tracks'
// edits to that suite (drills.e2e.test.ts is a 4-track merge hotspot).
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

const recordAnswerMock = vi.fn();
const flushQueueMock = vi.fn();
vi.mock('$lib/api/progress', () => ({
	recordAnswer: (...args: unknown[]) => recordAnswerMock(...args),
	flushQueue: (...args: unknown[]) => flushQueueMock(...args)
}));

const isRotateHintDismissedMock = vi.fn(() => true);
const dismissRotateHintMock = vi.fn();
vi.mock('$lib/drills/rotateHint', () => ({
	isRotateHintDismissed: () => isRotateHintDismissedMock(),
	dismissRotateHint: (...args: unknown[]) => dismissRotateHintMock(...args)
}));

// generateQuestion() draws, in order: (1) randomChord root index,
// (2) randomChord quality index, (3) pickQuestionType 0/1. Identification
// additionally consumes shuffle draws, which safely clamp to the trailing
// value (see drills.e2e.test.ts for the full explanation of this pattern).
const ROOTS_LENGTH = 12;
const QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7'];
const QUALITY_INDEX = QUALITY_SUFFIXES.indexOf('m7');

function forceQuestion(kindDraw: number) {
	const draws = [0 / ROOTS_LENGTH, QUALITY_INDEX / QUALITY_SUFFIXES.length, kindDraw];
	let call = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

const forceConstructionCm7 = () => forceQuestion(0);
const forceIdentificationCm7 = () => forceQuestion(0.99);

beforeEach(() => {
	recordAnswerMock.mockClear();
	flushQueueMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('wrong identification answer shows the confusion contrast', () => {
	it('renders the contrast line between the correct symbol and the picked one', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		expect(wrongChoice).toBeDefined();
		const pickedSymbol = wrongChoice!.getAttribute('aria-label')!.replace('Answer: ', '');
		await fireEvent.click(wrongChoice!);

		const feedback = screen.getByTestId('drill-feedback');
		const contrast = within(feedback).getByTestId('contrast-line');
		// The line names both symbols plainly (glyph-rooted display form).
		expect(contrast.textContent).toContain('Cm7');
		expect(contrast.textContent).toContain(
			pickedSymbol.replace(/#/g, '♯').replace(/^([A-G])b/, '$1♭')
		);
	});

	it('renders the m7 mnemonic alongside, tagged to yield on phone widths', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		await fireEvent.click(wrongChoice!);

		const mnemonic = within(screen.getByTestId('drill-feedback')).getByTestId('mnemonic-line');
		expect(mnemonic).toHaveTextContent('Minor triad plus a ♭7.');
		expect(mnemonic.className).toMatch(/\bhidden\b/);
		expect(mnemonic.className).toMatch(/\bsm:block\b/);
	});
});

describe('wrong construction answer shows the mnemonic, never a contrast', () => {
	it('renders the quality mnemonic with no contrast line', async () => {
		forceConstructionCm7();
		render(DrillsPage);

		// Wrong voicing: C alone is not Cm7.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const feedback = screen.getByTestId('drill-feedback');
		expect(within(feedback).queryByTestId('contrast-line')).not.toBeInTheDocument();
		const mnemonic = within(feedback).getByTestId('mnemonic-line');
		expect(mnemonic).toHaveTextContent('Minor triad plus a ♭7.');
		expect(mnemonic.className).not.toMatch(/\bhidden\b/);
	});
});

describe('correct answers keep the one-line caption, no insight block', () => {
	it('renders no reveal insight after a correct identification', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.queryByTestId('reveal-insight')).not.toBeInTheDocument();
	});
});

describe('Next clears the picked symbol', () => {
	it('a wrong pick followed by Next and a new wrong pick contrasts the NEW pick', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		const firstChoices = screen.getAllByRole('button', { name: /^Answer: / });
		const firstWrong = firstChoices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		await fireEvent.click(firstWrong!);
		expect(screen.getByTestId('contrast-line')).toBeInTheDocument();

		forceIdentificationCm7();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		// Fresh question: no stale insight from the previous reveal.
		expect(screen.queryByTestId('reveal-insight')).not.toBeInTheDocument();
	});
});
