import { render, screen, fireEvent, within, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeChordDrill from './PracticeChordDrill.svelte';
import { setLocale } from '$lib/i18n/locale.svelte';
import { saveSong, type Song } from '$lib/practice/songs';

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

describe('PracticeChordDrill: reveal keyboard carries the chord shape (quick-260804-1uq)', () => {
	it('after a correct answer, no counting-chip row exists and the reveal keyboard carries the m7 gaps', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		expect(screen.queryByTestId('counting-chip-row')).not.toBeInTheDocument();
		const labels = [...document.querySelectorAll('.piano-keyboard__gap-label')].map((el) =>
			el.textContent?.trim()
		);
		expect(labels).toEqual(['m3 · 3', 'M3 · 4', 'm3 · 3']);
	});

	it('after a wrong answer, no counting-chip row exists and the reveal keyboard carries the m7 gaps too', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		const choiceGrid = screen.getByTestId('choice-grid');
		const wrong = within(choiceGrid)
			.getAllByRole('button')
			.find((button) => button.textContent?.trim() !== 'Cm7');
		expect(wrong).toBeDefined();

		await fireEvent.click(wrong!);

		expect(screen.queryByTestId('counting-chip-row')).not.toBeInTheDocument();
		const labels = [...document.querySelectorAll('.piano-keyboard__gap-label')].map((el) =>
			el.textContent?.trim()
		);
		expect(labels).toEqual(['m3 · 3', 'M3 · 4', 'm3 · 3']);
	});

	it('removes the old grey mono shape line, now that the reveal keyboard carries the shape (Success Criterion 4, IN-04)', async () => {
		// The old grey mono line (removed in commit 769afa7) rendered
		// "{targetQuality}: {stackedThirdsPattern}" where the gap labels were
		// joined by " · " (U+00B7 middot), e.g. Cm7 -> "m7: m3 · M3 · m3". The
		// counting-chip row that superseded it has itself been removed
		// (quick-260804-1uq): the reveal keyboard's tick rail now carries the
		// same gap information, so the middot-bearing gap labels live above
		// the board rather than inside the feedback stamp.
		//
		// The blanket middot sweep is scoped to the feedback region
		// (chord-drill-feedback), not the whole container, because the
		// interval tick rail (wired in quick task 260803-u3g) legitimately
		// renders its own middot-joined gap labels ("m3 · 3") above the
		// keyboard once answered - a container-wide sweep would now fail on
		// the rail rather than on the grey mono line it is meant to guard.
		const { container } = render(PracticeChordDrill, {
			props: { symbol: 'Cm7', onComplete: vi.fn() }
		});

		await fireEvent.click(choiceButton('Cm7'));

		expect(container.textContent).not.toContain('m3 · M3 · m3');
		expect(screen.getByTestId('chord-drill-feedback').textContent ?? '').not.toMatch(/·/);
		expect(screen.queryByTestId('counting-chip-row')).not.toBeInTheDocument();
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
 * Quick task 260803-u3g: PianoKeyboard's showIntervalTicks prop (commit
 * 471d32a, PR #66) was shipped and wired into Lookup, but never into this
 * component - the app's busiest drill surface. These tests pin the rail's
 * gate (never before the answer, in any of the three modes) and its
 * presence/content once the answer is in.
 */
describe('PracticeChordDrill: interval tick rail (showIntervalTicks)', () => {
	it('formula: no rail before answering, though the keyboard is already showing the notes', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		expect(document.querySelector('.piano-keyboard')).toBeInTheDocument();
		expect(document.querySelector('.piano-keyboard__rail')).not.toBeInTheDocument();
	});

	it('formula: rail appears after answering, with the Cm7 gap labels', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		expect(document.querySelector('.piano-keyboard__rail')).toBeInTheDocument();
		const labels = [...document.querySelectorAll('.piano-keyboard__gap-label')].map((el) =>
			el.textContent?.trim()
		);
		expect(labels).toEqual(['m3 · 3', 'M3 · 4', 'm3 · 3']);
	});

	it('see-play: no rail before Check', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'see-play', onComplete: vi.fn() } });

		expect(document.querySelector('.piano-keyboard__rail')).not.toBeInTheDocument();
	});

	it('see-play: rail appears on the reveal keyboard after Check', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'see-play', onComplete: vi.fn() } });

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(document.querySelector('.piano-keyboard__rail')).toBeInTheDocument();
	});

	it('hear-name: no keyboard at all before answering, so no rail either', () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'hear-name', onComplete: vi.fn() } });

		expect(document.querySelector('.piano-keyboard')).not.toBeInTheDocument();
		expect(document.querySelector('.piano-keyboard__rail')).not.toBeInTheDocument();
	});

	it('hear-name: rail appears once the post-answer keyboard mounts', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'hear-name', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		expect(document.querySelector('.piano-keyboard__rail')).toBeInTheDocument();
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

describe('PracticeChordDrill: song provenance (retention audit item)', () => {
	function song(overrides: Partial<Song> = {}): Song {
		return {
			id: 'song-1',
			name: 'Autumn Leaves (my chart)',
			chordSymbols: ['Cm7'],
			createdAt: '2026-07-20T00:00:00.000Z',
			source: 'custom',
			active: true,
			...overrides
		};
	}

	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('see-play shows the mark immediately, next to the given prompt symbol (no spoiler risk)', () => {
		saveSong(song());
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'see-play', onComplete: vi.fn() } });

		const prompt = screen.getByTestId('chord-drill-play-prompt');
		expect(prompt.querySelector('[data-testid="song-mark"]')).toHaveTextContent(
			'Autumn Leaves (my chart)'
		);
	});

	it('formula and hear-name withhold the mark until after answering, since the symbol is the answer', () => {
		saveSong(song());
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() } });

		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();
	});

	it('formula shows the mark on reveal, correct or not', async () => {
		saveSong(song());
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		const feedback = screen.getByTestId('chord-drill-feedback');
		expect(feedback.querySelector('[data-testid="song-mark"]')).toHaveTextContent(
			'Autumn Leaves (my chart)'
		);
	});

	it('hear-name shows the mark on reveal after Play then answering', async () => {
		saveSong(song());
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'hear-name', onComplete: vi.fn() } });

		await fireEvent.click(screen.getByRole('button', { name: 'Play' }));
		await fireEvent.click(choiceButton('Cm7'));

		const feedback = screen.getByTestId('chord-drill-feedback');
		expect(feedback.querySelector('[data-testid="song-mark"]')).toHaveTextContent(
			'Autumn Leaves (my chart)'
		);
	});

	it('renders nothing when no active song contains this symbol', async () => {
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();
	});

	it('an inactive song never surfaces its mark', async () => {
		saveSong(song({ active: false }));
		render(PracticeChordDrill, { props: { symbol: 'Cm7', mode: 'formula', onComplete: vi.fn() } });

		await fireEvent.click(choiceButton('Cm7'));

		expect(screen.queryByTestId('song-mark')).not.toBeInTheDocument();
	});
});

describe('PracticeChordDrill: NAME IT templates (C5, ml-practice-variety)', () => {
	it('pick-notes shows the SYMBOL, no keyboard, and four note spellings to choose from', () => {
		render(PracticeChordDrill, {
			props: { symbol: 'Cm', mode: 'formula', variant: 'pick-notes', onComplete: vi.fn() }
		});

		expect(screen.getByTestId('chord-drill-notes-prompt')).toBeInTheDocument();
		expect(screen.getByText('Which notes spell this chord?')).toBeInTheDocument();
		expect(document.querySelector('.piano-keyboard')).toBeNull();
		const grid = screen.getByTestId('choice-grid');
		expect(grid).toHaveAttribute('data-variant', 'pick-notes');
		const choices = within(grid).getAllByRole('button', { name: /^Answer: / });
		expect(choices).toHaveLength(4);
		expect(within(grid).getByRole('button', { name: 'Answer: C E♭ G' })).toBeInTheDocument();
	});

	it('pick-notes grades the right spelling correct and reveals the notes on the keyboard', async () => {
		const onComplete = vi.fn();
		render(PracticeChordDrill, {
			props: { symbol: 'Cm', mode: 'formula', variant: 'pick-notes', onComplete }
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: C E♭ G' }));
		expect(screen.getByTestId('chord-drill-correct')).toBeInTheDocument();
		expect(document.querySelector('.piano-keyboard')).not.toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledWith(true);
	});

	it('pick-notes names a miss in notes, not symbols', async () => {
		const onComplete = vi.fn();
		render(PracticeChordDrill, {
			props: { symbol: 'Cm', mode: 'formula', variant: 'pick-notes', onComplete }
		});

		const wrong = screen
			.getAllByRole('button', { name: /^Answer: / })
			.find((button) => button.getAttribute('aria-label') !== 'Answer: C E♭ G');
		expect(wrong).toBeDefined();
		await fireEvent.click(wrong as HTMLElement);
		expect(screen.getByTestId('chord-drill-picked-vs-correct')).toHaveTextContent('C E♭ G');
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		expect(onComplete).toHaveBeenCalledWith(false);
	});

	it('name-mixed-root lights the notes and offers chips on more than one root', () => {
		render(PracticeChordDrill, {
			props: { symbol: 'C', mode: 'formula', variant: 'name-mixed-root', onComplete: vi.fn() }
		});

		expect(document.querySelector('.piano-keyboard')).not.toBeNull();
		const labels = screen
			.getAllByRole('button', { name: /^Answer: / })
			.map((button) => button.getAttribute('aria-label')?.replace('Answer: ', '') ?? '');
		expect(labels).toHaveLength(4);
		expect(labels).toContain('C');
		expect(labels.filter((label) => !label.startsWith('C')).length).toBe(2);
	});

	it('the variant is ignored outside the formula mode', () => {
		render(PracticeChordDrill, {
			props: { symbol: 'Cm', mode: 'see-play', variant: 'pick-notes', onComplete: vi.fn() }
		});
		expect(screen.queryByTestId('choice-grid')).toBeNull();
		expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
	});
});
