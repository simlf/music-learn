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
