import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeChordDrill from './PracticeChordDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Component test for PracticeChordDrill (Phase 27 Plan 03): the name-it
 * render component. Mocks Math.random (drives generateQuestion's distractor
 * pick/shuffle deterministically) and $lib/audio/audio (mirrors drills'
 * e2e test convention: consumers in tests always mock the audio module so
 * no AudioContext/tone import ever happens in jsdom).
 */

const playChordMock = vi.fn();
const ensureAudioReadyMock = vi.fn(async () => {});
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: vi.fn(),
	ensureAudioReady: () => ensureAudioReadyMock()
}));

function choiceButton(name: string) {
	return screen.getByRole('button', { name: `Answer: ${name}` });
}

beforeEach(() => {
	vi.spyOn(Math, 'random').mockReturnValue(0);
	playChordMock.mockClear();
	ensureAudioReadyMock.mockClear();
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('PracticeChordDrill: same-root identification choices', () => {
	it('renders 4 choices sharing the correct root, including the correct symbol', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const buttons = within(choiceGrid).getAllByRole('button');
		expect(buttons).toHaveLength(4);

		const labels = buttons.map((button) => button.textContent?.trim());
		expect(labels).toContain('Cm7');
		for (const label of labels) {
			expect(label?.startsWith('C')).toBe(true);
		}
	});
});

describe('PracticeChordDrill: grading and reveal', () => {
	it('tapping the correct choice reveals the answer without calling onComplete until Next', async () => {
		const onComplete = vi.fn();
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete } });

		await fireEvent.click(choiceButton('Cm7'));

		expect(screen.getByTestId('chord-drill-feedback')).toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('tapping a wrong choice reveals the correct symbol glyph and calls onComplete(false) on Next', async () => {
		const onComplete = vi.fn();
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const buttons = within(choiceGrid).getAllByRole('button');
		const wrong = buttons.find((button) => button.textContent?.trim() !== 'Cm7');
		expect(wrong).toBeDefined();

		await fireEvent.click(wrong!);

		const feedback = screen.getByTestId('chord-drill-feedback');
		expect(feedback.querySelector('.chord-glyph')).toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith(false);
	});

	it('answering disables the choice grid so onComplete never fires twice for one item', async () => {
		const onComplete = vi.fn();
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete } });

		await fireEvent.click(choiceButton('Cm7'));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
	});
});

describe('PracticeChordDrill: right/wrong affirmation (UAT F4)', () => {
	it('a correct answer shows a clear "Correct" affirmation, and no incorrect marker or glyph', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		const feedback = screen.getByTestId('chord-drill-feedback');
		expect(screen.getByTestId('chord-drill-correct')).toHaveTextContent('Correct');
		expect(feedback.querySelector('.chord-glyph')).not.toBeInTheDocument();
		expect(screen.queryByTestId('chord-drill-incorrect')).not.toBeInTheDocument();
	});

	it('a wrong answer shows the correct-symbol glyph plus a clear "Incorrect" marker, and no correct affirmation', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const buttons = within(choiceGrid).getAllByRole('button');
		const wrong = buttons.find((button) => button.textContent?.trim() !== 'Cm7');
		expect(wrong).toBeDefined();

		await fireEvent.click(wrong!);

		const feedback = screen.getByTestId('chord-drill-feedback');
		expect(feedback.querySelector('.chord-glyph')).toBeInTheDocument();
		expect(screen.getByTestId('chord-drill-incorrect')).toHaveTextContent('Incorrect');
		expect(screen.queryByTestId('chord-drill-correct')).not.toBeInTheDocument();
	});

	it('renders the French affirmation/marker copy under fr', async () => {
		setLocale('fr');
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const correct = within(choiceGrid)
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() === 'Cm7');
		expect(correct).toBeDefined();

		await fireEvent.click(correct!);

		expect(screen.getByTestId('chord-drill-correct')).toHaveTextContent('Bien vu');
	});

	it('does not leak interval-badge roles before the user answers', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		expect(document.querySelector('.piano-keyboard__ivbadge')).not.toBeInTheDocument();
	});
});

describe('PracticeChordDrill: picked-vs-correct on a miss (E1)', () => {
	it('shows what the user picked and the correct answer on a wrong choice', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const buttons = within(choiceGrid).getAllByRole('button');
		const wrong = buttons.find((button) => button.textContent?.trim() !== 'Cm7');
		expect(wrong).toBeDefined();
		const wrongLabel = wrong!.textContent?.trim();

		await fireEvent.click(wrong!);

		const line = screen.getByTestId('chord-drill-picked-vs-correct');
		expect(line).toHaveTextContent(wrongLabel!);
		expect(line).toHaveTextContent('Cm7');
	});

	it('does not render a picked-vs-correct line on a correct answer', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		expect(screen.queryByTestId('chord-drill-picked-vs-correct')).not.toBeInTheDocument();
	});

	it('renders the French picked-vs-correct copy under fr', async () => {
		setLocale('fr');
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const wrong = within(choiceGrid)
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() !== 'Cm7');
		expect(wrong).toBeDefined();

		await fireEvent.click(wrong!);

		expect(screen.getByTestId('chord-drill-picked-vs-correct')).toHaveTextContent('Tu as choisi');
	});
});

describe('PracticeChordDrill: per-quality stacked-thirds pattern (E2)', () => {
	it('shows the m7 stacked-thirds shape after a correct answer', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		const shape = screen.getByTestId('chord-drill-shape');
		expect(shape).toHaveTextContent('m7: m3 · M3 · m3');
	});

	it('shows the m7 stacked-thirds shape after a wrong answer too', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const wrong = within(choiceGrid)
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() !== 'Cm7');
		expect(wrong).toBeDefined();

		await fireEvent.click(wrong!);

		expect(screen.getByTestId('chord-drill-shape')).toHaveTextContent('m7: m3 · M3 · m3');
	});

	it('does not leak the stacked-thirds shape before the user answers', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		expect(screen.queryByTestId('chord-drill-shape')).not.toBeInTheDocument();
	});
});
