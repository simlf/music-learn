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

describe('PracticeChordDrill: counting-chip row (E2, SHAPE-01)', () => {
	it('shows the m7 counting-chip row (m3/M3/m3 gap-class order) after a correct answer', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		const row = screen.getByTestId('counting-chip-row');
		const gapChips = row.querySelectorAll('.gap-chip');
		expect(gapChips.length).toBe(3);
		expect(gapChips[0].classList.contains('m3')).toBe(true);
		expect(gapChips[1].classList.contains('M3')).toBe(true);
		expect(gapChips[2].classList.contains('m3')).toBe(true);
	});

	it('shows the m7 counting-chip row after a wrong answer too', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const wrong = within(choiceGrid)
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() !== 'Cm7');
		expect(wrong).toBeDefined();

		await fireEvent.click(wrong!);

		const row = screen.getByTestId('counting-chip-row');
		const gapChips = row.querySelectorAll('.gap-chip');
		expect(gapChips.length).toBe(3);
		expect(gapChips[0].classList.contains('m3')).toBe(true);
		expect(gapChips[1].classList.contains('M3')).toBe(true);
		expect(gapChips[2].classList.contains('m3')).toBe(true);
	});

	it('does not leak the counting-chip row before the user answers', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		expect(screen.queryByTestId('counting-chip-row')).not.toBeInTheDocument();
	});

	it('removes the old grey mono shape line, replaced by the counting-chip row (Success Criterion 4, IN-04)', async () => {
		// The old grey mono line (removed in commit 769afa7) rendered
		// "{targetQuality}: {stackedThirdsPattern}" where the gap labels were
		// joined by " · " (U+00B7 middot), e.g. Cm7 -> "m7: m3 · M3 · m3".
		// Asserting queryByTestId('chord-drill-shape') is absent is vacuous -
		// that testid never existed on this component. The real fingerprint
		// of the removed line is the middot-joined run itself; its absence
		// plus counting-chip-row's presence is genuine regression protection.
		const { container } = render(PracticeChordDrill, {
			props: { symbol: 'Cm7', onComplete: vi.fn() }
		});

		await fireEvent.click(choiceButton('Cm7'));

		expect(container.textContent).not.toContain('m3 · M3 · m3');
		expect(container.textContent ?? '').not.toMatch(/·/);
		expect(screen.getByTestId('counting-chip-row')).toBeInTheDocument();
	});
});

/**
 * T13 (mode collapse). The host used to hand this component every chord card
 * that was not 'formula-build' and pass no mode at all, so `formula`,
 * `see-play` and `hear-name` all rendered the SAME 4-choice identification
 * question: three modes the deck seeds, schedules and believes it trains
 * separately produced byte-identical items. These tests pin the contract that
 * fix establishes: one question shape per mode, all three distinguishable.
 */
describe('PracticeChordDrill: three modes, three DIFFERENT questions (T13 contract)', () => {
	/** A fingerprint of the question actually on screen, before any answer. */
	function questionShape(): string {
		const hasChoices = screen.queryByTestId('choice-grid') !== null;
		const hasCheck = screen.queryByRole('button', { name: 'Check' }) !== null;
		const hasPlay = screen.queryByRole('button', { name: 'Play' }) !== null;
		const hasKeyboard = document.querySelector('.piano-keyboard') !== null;
		const notesRevealed = document.querySelector('.piano-keyboard__key--root') !== null;
		return [hasChoices, hasCheck, hasPlay, hasKeyboard, notesRevealed].join('|');
	}

	it('renders a pairwise-distinct question shape for formula, see-play and hear-name', () => {
		const shapes: string[] = [];
		for (const mode of ['formula', 'see-play', 'hear-name'] as const) {
			const { unmount } = render(PracticeChordDrill, {
				props: { symbol: 'Cm7', mode, onComplete: vi.fn() }
			});
			shapes.push(questionShape());
			unmount();
		}

		expect(new Set(shapes).size).toBe(3);
		// And each one is the shape its own mode is supposed to have.
		expect(shapes[0]).toBe('true|false|false|true|true'); // notes shown, pick the symbol
		expect(shapes[1]).toBe('false|true|false|true|false'); // symbol shown, play the notes
		expect(shapes[2]).toBe('true|false|true|false|false'); // chord played, pick the symbol
	});

	it('defaults to the formula question when no mode is passed (REG-01: pre-existing callers unchanged)', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });
		expect(screen.getByTestId('practice-chord-drill')).toHaveAttribute('data-mode', 'formula');
		expect(screen.getByTestId('choice-grid')).toBeInTheDocument();
	});
});

describe('PracticeChordDrill: see-play (symbol shown, play the notes)', () => {
	/** Taps the nth key with this accessible name, re-querying so a selection-changed label never staleness-breaks the next tap. */
	async function tapKey(label: string, occurrence = 0) {
		const keys = screen.getAllByRole('button', { name: label });
		expect(keys.length).toBeGreaterThan(occurrence);
		await fireEvent.click(keys[occurrence]);
	}

	function seePlay(onComplete = vi.fn()) {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'see-play', onComplete } });
		return onComplete;
	}

	it('shows the symbol as the question and never a choice grid', () => {
		seePlay();
		expect(screen.getByTestId('chord-drill-play-prompt')).toBeInTheDocument();
		expect(screen.queryByTestId('choice-grid')).not.toBeInTheDocument();
	});

	it('does not reveal the chord on the keyboard before the answer', () => {
		seePlay();
		expect(document.querySelector('.piano-keyboard')).toBeInTheDocument();
		expect(document.querySelector('.piano-keyboard__key--root')).not.toBeInTheDocument();
		expect(document.querySelector('.piano-keyboard__key--seventh')).not.toBeInTheDocument();
	});

	it('cannot be checked with nothing played (no accidental instant miss)', () => {
		seePlay();
		expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
	});

	it('grades the played set by CHROMA: the same pitch classes an octave up still count as correct', async () => {
		const onComplete = seePlay();

		// Cm7 = C, E♭, G, B♭. Tapped on the SECOND octave's keys, and with the
		// black keys reached by their sharp spellings (D♯ / A♯), so nothing here
		// can pass by a spelled-letter or octave comparison - only by chroma.
		await tapKey('C key', 1);
		await tapKey('D♯ key', 1);
		await tapKey('G key', 1);
		await tapKey('A♯ key', 1);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('chord-drill-correct')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledExactlyOnceWith(true);
	});

	it('marks a wrong played set incorrect, flags the extra note, and names the two keyboard fills', async () => {
		const onComplete = seePlay();

		// C, D, G, A♯: D is an extra note and E♭ is missing.
		await tapKey('C key');
		await tapKey('D key');
		await tapKey('G key');
		await tapKey('A♯ key');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('chord-drill-incorrect')).toBeInTheDocument();
		expect(screen.queryByTestId('chord-drill-correct')).not.toBeInTheDocument();
		// The extra note carries the gray wrong-fill; the chord's own notes never do.
		const wrongKeys = [...document.querySelectorAll('.piano-keyboard__key--wrong')];
		expect(wrongKeys.length).toBeGreaterThan(0);
		expect(screen.getByTestId('chord-drill-legend')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledExactlyOnceWith(false);
	});

	it('reveals the chord on the keyboard once the answer is in', async () => {
		seePlay();
		await tapKey('C key');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		expect(document.querySelector('.piano-keyboard__key--root')).toBeInTheDocument();
	});

	it('has no picked-vs-correct line (there is no picked symbol to contrast)', async () => {
		seePlay();
		await tapKey('C key');
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		expect(screen.queryByTestId('chord-drill-picked-vs-correct')).not.toBeInTheDocument();
	});
});

describe('PracticeChordDrill: hear-name (chord played, name it)', () => {
	function hearName(onComplete = vi.fn()) {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'hear-name', onComplete } });
		return onComplete;
	}

	it('hides the keyboard entirely until the answer is in, so it cannot spoil the ear test', async () => {
		hearName();
		expect(screen.getByTestId('chord-drill-hear-prompt')).toBeInTheDocument();
		expect(document.querySelector('.piano-keyboard')).not.toBeInTheDocument();

		await fireEvent.click(choiceButton('Cm7'));
		expect(document.querySelector('.piano-keyboard')).toBeInTheDocument();
	});

	it('plays the chord on demand and offers a replay', async () => {
		hearName();

		await fireEvent.click(screen.getByRole('button', { name: 'Play' }));

		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭', 'G', 'B♭']);
		expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
	});

	it('grades the picked symbol and fires onComplete once on Next', async () => {
		const onComplete = hearName();
		await fireEvent.click(choiceButton('Cm7'));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledExactlyOnceWith(true);
	});

	it('shows the picked-vs-correct line on a miss, like the other identification mode', async () => {
		hearName();
		const wrong = within(screen.getByTestId('choice-grid'))
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() !== 'Cm7');
		await fireEvent.click(wrong!);
		expect(screen.getByTestId('chord-drill-picked-vs-correct')).toHaveTextContent('Cm7');
	});
});

/**
 * T13 item 2: the escalating hint ladder and the confusion-contrast line, both
 * already wired into RecallSession / ProgressionDrill / InversionDrill /
 * WhyTheseNotes but never into this component, which asks the overwhelming
 * majority of daily items.
 */
describe('PracticeChordDrill: opt-in hint ladder', () => {
	it('offers the ladder before the answer in see-play, collapsed (never an always-on inline hint)', () => {
		render(PracticeChordDrill, {
			props: { symbol: 'Cm7', mode: 'see-play', onComplete: vi.fn() }
		});

		expect(screen.getByTestId('hint-ladder')).toBeInTheDocument();
		expect(screen.getByTestId('hint-cta')).toHaveTextContent('Need a hint?');
		// Nothing is revealed until it is asked for.
		expect(screen.queryAllByTestId('hint-layer')).toHaveLength(0);
	});

	it('escalates one layer per tap in see-play', async () => {
		render(PracticeChordDrill, {
			props: { symbol: 'Cm7', mode: 'see-play', onComplete: vi.fn() }
		});

		await fireEvent.click(within(screen.getByTestId('hint-cta')).getByRole('button'));
		expect(screen.queryAllByTestId('hint-layer')).toHaveLength(1);

		await fireEvent.click(within(screen.getByTestId('hint-cta')).getByRole('button'));
		expect(screen.queryAllByTestId('hint-layer')).toHaveLength(2);
	});

	it('never touches grading: a hinted see-play answer still grades on the played notes alone', async () => {
		const onComplete = vi.fn();
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'see-play', onComplete } });

		await fireEvent.click(within(screen.getByTestId('hint-cta')).getByRole('button'));
		for (const label of ['C key', 'D♯ key', 'G key', 'A♯ key']) {
			await fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(onComplete).toHaveBeenCalledExactlyOnceWith(true);
	});

	it('withholds the ladder in the identification modes until a MISS (a rung there would be the answer)', async () => {
		const { unmount } = render(PracticeChordDrill, {
			props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() }
		});
		expect(screen.queryByTestId('hint-ladder')).not.toBeInTheDocument();

		await fireEvent.click(choiceButton('Cm7'));
		expect(screen.queryByTestId('hint-ladder')).not.toBeInTheDocument();
		unmount();

		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() } });
		const wrong = within(screen.getByTestId('choice-grid'))
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() !== 'Cm7');
		await fireEvent.click(wrong!);
		expect(screen.getByTestId('hint-ladder')).toBeInTheDocument();
	});
});

describe('PracticeChordDrill: confusion contrast on the wrong path', () => {
	it('teaches the boundary that was just missed on a wrong identification pick', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() } });

		const wrong = within(screen.getByTestId('choice-grid'))
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() !== 'Cm7');
		await fireEvent.click(wrong!);

		expect(screen.getByTestId('reveal-insight')).toBeInTheDocument();
	});

	it('says nothing on a correct answer', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() } });
		await fireEvent.click(choiceButton('Cm7'));
		expect(screen.queryByTestId('reveal-insight')).not.toBeInTheDocument();
	});

	it('falls back to the quality mnemonic on a see-play miss, which has no picked symbol', async () => {
		render(PracticeChordDrill, {
			props: { symbol: 'Cm7', mode: 'see-play', onComplete: vi.fn() }
		});

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('mnemonic-line')).toBeInTheDocument();
		expect(screen.queryByTestId('contrast-line')).not.toBeInTheDocument();
	});
});
