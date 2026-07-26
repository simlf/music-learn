import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeIntervalDrill from './PracticeIntervalDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';

/**
 * Component test for PracticeIntervalDrill (Phase 27 Plan 03): the
 * intervals render component, both directions. Math.random is mocked per
 * test to force generateIntervalQuestion's direction draw (mirrors the
 * codebase's existing generateIntervalQuestion.test.ts convention of a
 * fixed-return spy over the module's own draw order: root index, then
 * direction index, since `short` is always forced via props). $lib/audio/
 * audio is mocked (mirrors drills' e2e test convention: consumers in tests
 * always mock the audio module so no AudioContext/tone import ever happens
 * in jsdom).
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

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

describe('PracticeIntervalDrill: identification direction', () => {
	beforeEach(() => {
		// Math.random() draws: rootIndex=floor(0*12)=0 -> 'C', directionIndex=
		// floor(0*2)=0 -> 'identification'. `short` is forced via props, so no
		// interval-index draw occurs.
		vi.spyOn(Math, 'random').mockReturnValue(0);
		playChordMock.mockClear();
		ensureAudioReadyMock.mockClear();
	});

	it('renders a 4-cell shorthand choice grid including the correct interval', () => {
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		const grid = screen.getByTestId('interval-choice-grid');
		const buttons = within(grid).getAllByRole('button');
		expect(buttons).toHaveLength(4);
		expect(choiceButton('m3')).toBeInTheDocument();
	});

	it('grades a correct choice tap and fires onComplete(true) exactly once on Next', async () => {
		const onComplete = vi.fn();
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete } });

		await fireEvent.click(choiceButton('m3'));

		expect(screen.getByTestId('interval-drill-feedback')).toBeInTheDocument();
		expect(onComplete).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('grades a wrong choice tap and fires onComplete(false) exactly once on Next', async () => {
		const onComplete = vi.fn();
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete } });

		const grid = screen.getByTestId('interval-choice-grid');
		const buttons = within(grid).getAllByRole('button');
		const wrong = buttons.find((button) => button.getAttribute('aria-label') !== 'Answer: m3');
		expect(wrong).toBeDefined();

		await fireEvent.click(wrong!);
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith(false);
	});
});

describe('PracticeIntervalDrill: construction direction, chroma-based grading', () => {
	beforeEach(() => {
		// Math.random() draws: rootIndex=floor(0.9*12)=10 -> 'Bb',
		// directionIndex=floor(0.9*2)=1 -> 'construction'.
		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		playChordMock.mockClear();
		ensureAudioReadyMock.mockClear();
	});

	it('shows the construction prompt with no Next affordance before answering', () => {
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		expect(screen.getByTestId('interval-construction-prompt')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
		expect(screen.queryByTestId('interval-drill-feedback')).not.toBeInTheDocument();
	});

	it('grades a right-pitch-class tap on a DIFFERENT octave key as correct (chroma, not letter/octave, REG-01)', async () => {
		const onComplete = vi.fn();
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete } });

		// Root Bb + minor third (3 semitones) = chroma 1 = C#/Db. The 2-octave
		// keyboard renders two C# keys (octave 4 and octave 5); tapping the
		// SECOND occurrence still grades correct, proving the grader ignores
		// octave and works by chroma (gradeIntervalTap), never a letter+octave
		// string comparison.
		const targetKeys = screen.getAllByRole('button', { name: 'C♯ key' });
		expect(targetKeys.length).toBeGreaterThanOrEqual(2);

		await fireEvent.click(targetKeys[1]);
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('grades a wrong-pitch-class tap as incorrect and fires onComplete(false) once', async () => {
		const onComplete = vi.fn();
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete } });

		const wrongKeys = screen.getAllByRole('button', { name: 'C key' });
		await fireEvent.click(wrongKeys[0]);

		expect(screen.getByTestId('interval-tap-line')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith(false);
	});
});
