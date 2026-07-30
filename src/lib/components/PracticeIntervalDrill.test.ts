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

/**
 * T5 R4: every long interval name on this surface used to be `longFr`,
 * unconditionally, so an English session read "m3 · tierce mineure" and the
 * app never once showed the English words "minor 3rd" in a drill even though
 * its own prose used them. The long name now follows the reader's locale, in
 * all four places it appears (choice buttons, reveal chip, answer line,
 * you-tapped line), and is never doubled.
 */
describe('PracticeIntervalDrill: long interval names follow the reader locale (T5 R4)', () => {
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it('labels identification choices with English long names under en', () => {
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		const grid = screen.getByTestId('interval-choice-grid');
		expect(within(grid).getByText('minor 3rd')).toBeInTheDocument();
		expect(grid.textContent).not.toMatch(/tierce/);
	});

	it('labels identification choices with French long names under fr, with no English duplicate', () => {
		setLocale('fr');
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		const grid = screen.getByTestId('interval-choice-grid');
		expect(within(grid).getByText('tierce mineure')).toBeInTheDocument();
		expect(grid.textContent).not.toMatch(/minor 3rd/);
	});

	it('reveals the answer line in the reader locale while the shorthand stays immune', async () => {
		const { unmount } = render(PracticeIntervalDrill, {
			props: { short: 'm3', onComplete: vi.fn() }
		});
		await fireEvent.click(choiceButton('m3'));
		expect(screen.getByTestId('interval-answer-line').textContent?.trim()).toBe('m3 · minor 3rd');
		expect(
			within(screen.getByTestId('interval-drill-feedback')).getByText('m3')
		).toHaveAttribute('title', 'minor 3rd');
		unmount();

		setLocale('fr');
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });
		await fireEvent.click(screen.getByRole('button', { name: 'Réponse : m3' }));
		expect(screen.getByTestId('interval-answer-line').textContent?.trim()).toBe(
			'm3 · tierce mineure'
		);
		expect(
			within(screen.getByTestId('interval-drill-feedback')).getByText('m3')
		).toHaveAttribute('title', 'tierce mineure');
	});
});

describe('PracticeIntervalDrill: the you-tapped readout follows the reader locale (T5 R4)', () => {
	beforeEach(() => {
		// 0.9 draws root 'Bb' plus the construction direction.
		vi.spyOn(Math, 'random').mockReturnValue(0.9);
	});

	it('names the tapped interval in English under en and in French under fr', async () => {
		const { unmount } = render(PracticeIntervalDrill, {
			props: { short: 'm3', onComplete: vi.fn() }
		});
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		const enLine = screen.getByTestId('interval-tap-line').textContent ?? '';
		expect(enLine).toMatch(/major 2nd/);
		expect(enLine).not.toMatch(/seconde majeure/);
		unmount();

		setLocale('fr');
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		const frLine = screen.getByTestId('interval-tap-line').textContent ?? '';
		expect(frLine).toMatch(/seconde majeure/);
		expect(frLine).not.toMatch(/major 2nd/);
	});
});

/**
 * T13 item 2: this component and PracticeChordDrill generate the overwhelming
 * majority of daily items, and neither had a teaching scaffold. The escalating
 * ladder and the confusion contrast were wired into RecallSession,
 * ProgressionDrill, InversionDrill and WhyTheseNotes but never here.
 */
describe('PracticeIntervalDrill: opt-in escalating hint ladder', () => {
	describe('construction (the rungs teach the method, so they may come before the answer)', () => {
		beforeEach(() => {
			// 0.9 draws root 'Bb' plus the construction direction.
			vi.spyOn(Math, 'random').mockReturnValue(0.9);
		});

		it('offers a collapsed ladder before the answer, never an always-on inline hint', () => {
			render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

			expect(screen.getByTestId('interval-hint-ladder')).toBeInTheDocument();
			expect(screen.getByTestId('interval-hint-cta')).toHaveTextContent('Need a hint?');
			expect(screen.queryAllByTestId('interval-hint-layer')).toHaveLength(0);
			// Nothing about the answer has leaked.
			expect(screen.queryByTestId('interval-drill-feedback')).not.toBeInTheDocument();
		});

		it('escalates one rung per tap: the name, then the half-step count', async () => {
			render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

			await fireEvent.click(within(screen.getByTestId('interval-hint-cta')).getByRole('button'));
			let layers = screen.getAllByTestId('interval-hint-layer');
			expect(layers).toHaveLength(1);
			expect(layers[0]).toHaveAttribute('data-layer', 'name');
			expect(layers[0]).toHaveTextContent('m3 is a minor 3rd.');

			await fireEvent.click(within(screen.getByTestId('interval-hint-cta')).getByRole('button'));
			layers = screen.getAllByTestId('interval-hint-layer');
			expect(layers).toHaveLength(2);
			expect(layers[1]).toHaveAttribute('data-layer', 'count');
			// The count rung is the piece this surface never showed anywhere.
			expect(layers[1]).toHaveTextContent('Half steps up from B♭: 3.');
		});

		it('never changes grading: a hinted correct tap still grades correct exactly once', async () => {
			const onComplete = vi.fn();
			render(PracticeIntervalDrill, { props: { short: 'm3', onComplete } });

			await fireEvent.click(within(screen.getByTestId('interval-hint-cta')).getByRole('button'));
			await fireEvent.click(within(screen.getByTestId('interval-hint-cta')).getByRole('button'));

			// Bb + m3 = chroma 1 = C♯.
			await fireEvent.click(screen.getAllByRole('button', { name: 'C♯ key' })[0]);
			await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

			expect(onComplete).toHaveBeenCalledExactlyOnceWith(true);
		});

		it('renders the ladder rungs in French under fr', async () => {
			setLocale('fr');
			render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

			expect(screen.getByTestId('interval-hint-cta')).toHaveTextContent("Besoin d'un indice ?");
			await fireEvent.click(within(screen.getByTestId('interval-hint-cta')).getByRole('button'));
			expect(screen.getAllByTestId('interval-hint-layer')[0]).toHaveTextContent(
				"m3, c'est une tierce mineure."
			);
		});
	});

	describe('identification (the count IS the answer, so the ladder waits for a miss)', () => {
		beforeEach(() => {
			vi.spyOn(Math, 'random').mockReturnValue(0);
		});

		it('shows no ladder before the answer, and none after a correct answer', async () => {
			render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });
			expect(screen.queryByTestId('interval-hint-ladder')).not.toBeInTheDocument();

			await fireEvent.click(choiceButton('m3'));
			expect(screen.queryByTestId('interval-hint-ladder')).not.toBeInTheDocument();
		});

		it('offers the ladder after a MISS, without the redundant name rung', async () => {
			render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

			const grid = screen.getByTestId('interval-choice-grid');
			const wrong = within(grid)
				.getAllByRole('button')
				.find((button) => button.getAttribute('aria-label') !== 'Answer: m3');
			await fireEvent.click(wrong!);

			expect(screen.getByTestId('interval-hint-ladder')).toBeInTheDocument();
			await fireEvent.click(within(screen.getByTestId('interval-hint-cta')).getByRole('button'));
			const layers = screen.getAllByTestId('interval-hint-layer');
			// The choice chips already carried every long name, so 'name' is dropped.
			expect(layers[0]).toHaveAttribute('data-layer', 'count');
			expect(layers[0]).toHaveTextContent('Half steps between the two notes: 3.');
		});
	});
});

describe('PracticeIntervalDrill: confusion contrast on the wrong path', () => {
	it('contrasts the two half-step counts on a wrong construction tap', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		// Bb + M2 = C, one half step short of the m3 target.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		expect(screen.getByTestId('interval-semitone-contrast')).toHaveTextContent(
			'Half steps: M2 = 2, m3 = 3.'
		);
	});

	it('contrasts the counts and names the pick on a wrong identification choice', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		const grid = screen.getByTestId('interval-choice-grid');
		const wrong = within(grid)
			.getAllByRole('button')
			.find((button) => button.getAttribute('aria-label') !== 'Answer: m3');
		const wrongShort = wrong!.getAttribute('aria-label')?.replace('Answer: ', '') ?? '';
		await fireEvent.click(wrong!);

		const picked = screen.getByTestId('interval-picked-vs-correct');
		expect(picked).toHaveTextContent(wrongShort);
		expect(picked).toHaveTextContent('m3');
		expect(screen.getByTestId('interval-semitone-contrast')).toHaveTextContent('m3 = 3');
	});

	it('says nothing on a correct answer', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('m3'));

		expect(screen.queryByTestId('interval-semitone-contrast')).not.toBeInTheDocument();
		expect(screen.queryByTestId('interval-picked-vs-correct')).not.toBeInTheDocument();
	});

	it('renders the contrast in French under fr', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.9);
		setLocale('fr');
		render(PracticeIntervalDrill, { props: { short: 'm3', onComplete: vi.fn() } });

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);

		expect(screen.getByTestId('interval-semitone-contrast')).toHaveTextContent(
			'Demi-tons : M2 = 2, m3 = 3.'
		);
	});
});
