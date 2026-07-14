import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrillsPage from '../src/routes/drills/+page.svelte';

// +layout.svelte reads the `$page` store from $app/stores to mark the active
// nav link. That store is populated by the real SvelteKit client router at
// runtime, which isn't present when rendering +layout.svelte standalone here
// - so it's mocked with a minimal readable stub exposing just the `url`
// shape the masthead's active-link check reads (`$page.url.pathname`).
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

// The drills page now fire-and-forgets every graded answer to the backend
// (PROG-01) via $lib/api/progress. Mocked here so this suite never touches
// real fetch/localStorage and the existing timing-sensitive assertions stay
// unaffected.
const recordAnswerMock = vi.fn();
const flushQueueMock = vi.fn();
vi.mock('$lib/api/progress', () => ({
	recordAnswer: (...args: unknown[]) => recordAnswerMock(...args),
	flushQueue: (...args: unknown[]) => flushQueueMock(...args)
}));

// The drills page reads/writes the rotate-hint dismissed flag (D-05) via
// $lib/drills/rotateHint. Mocked so each rotate-hint scenario controls the
// dismissed state explicitly rather than depending on real localStorage.
const isRotateHintDismissedMock = vi.fn(() => false);
const dismissRotateHintMock = vi.fn();
vi.mock('$lib/drills/rotateHint', () => ({
	isRotateHintDismissed: () => isRotateHintDismissedMock(),
	dismissRotateHint: (...args: unknown[]) => dismissRotateHintMock(...args)
}));

// PianoKeyboard imports the audio contract for inspect-mode playback; tests
// never construct a real AudioContext (ARCHITECTURE-CONTRACTS.md rule).
const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

// This suite pins the construction-drill loop (Plan 03). generateQuestion's
// question type and symbol are drawn via Math.random(), so every test here
// mocks Math.random to force a deterministic construction question (Cm7)
// rather than relying on flaky real randomness (03-PATTERNS.md).
//
// DRAW-ORDER UPDATE (Track C union): the page now drills in MIX mode by
// default, so generateQuestion('mix') spends ONE leading 50/50 draw on the
// question family (< 0.5 -> chord, >= 0.5 -> interval) BEFORE the original
// chord draws. Every chord draw script below therefore starts with a 0
// (family -> chord); the remaining draws are unchanged: (1) randomChord's
// root index, (2) randomChord's quality index, (3) pickQuestionType's 0/1
// draw. Root index -> C (index 0), quality index -> m7 (index 4 in
// QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7']),
// question type -> 'construction' (index 0 of ['construction',
// 'identification']).
const ROOTS_LENGTH = 12;
const QUALITY_SUFFIXES = ['', 'm', 'dim', 'maj7', 'm7', '7', 'm7b5', 'dim7'];
const QUALITY_INDEX = QUALITY_SUFFIXES.indexOf('m7');
/** DRILL_INTERVALS order pinned by interval.test.ts; m3 sits at index 2. */
const DRILL_INTERVALS_LENGTH = 12;
const M3_INDEX = 2;

function forceConstructionCm7() {
	const draws = [
		0, // family draw (MIX mode) -> chord
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

// Interval scripts drive generateQuestion('intervals') (the INTERVALS mode
// button), which has NO family draw: it draws (1) root index over ROOTS,
// (2) interval index over DRILL_INTERVALS, (3) direction index over
// ['identification', 'construction'], then distractor/choice shuffle draws
// (trailing repeats of the last entry, content not asserted).
function forceIntervalIdentificationCm3() {
	const draws = [
		0 / ROOTS_LENGTH, // root index 0 -> 'C'
		M3_INDEX / DRILL_INTERVALS_LENGTH, // interval index 2 -> 'm3'
		0 // direction index 0 -> 'identification'
	];
	let call = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

function forceIntervalConstructionCm3() {
	const draws = [
		0 / ROOTS_LENGTH, // root index 0 -> 'C'
		M3_INDEX / DRILL_INTERVALS_LENGTH, // interval index 2 -> 'm3'
		0.99 // direction index 1 -> 'construction'
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
	recordAnswerMock.mockClear();
	flushQueueMock.mockClear();
	playNoteMock.mockClear();
	isRotateHintDismissedMock.mockReset().mockReturnValue(false);
	dismissRotateHintMock.mockClear();
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
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);

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
		const eFlatKeys = screen.getAllByRole('button', { name: 'D♯ key' });
		await fireEvent.click(cKeys[cKeys.length - 1]);
		await fireEvent.click(eFlatKeys[eFlatKeys.length - 1]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
	});
});

describe('drills page wrong construction answer teaches', () => {
	it('shows ONE merged feedback keyboard (interval colors + gray ✕ extra) and a legend, no text diff', async () => {
		render(DrillsPage);

		// Omit B♭, add A: an incorrect set (missing the 7th, an extra 6th).
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
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

		// Exactly ONE keyboard renders on the page (the input keyboard
		// transformed in place) — the separate correct-answer keyboard is gone.
		const keyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboards).toHaveLength(1);
		const keyboard = keyboards[0];

		// The wrongly-played A carries the wrong-fill gray class and a ✕ mark
		// (letter/pitch-class based, so every visible A instance across the
		// default two-octave render is marked — mirrors selectedClass's
		// existing octave-agnostic behavior).
		const wrongKeys = keyboard.querySelectorAll('.piano-keyboard__key--wrong');
		expect(wrongKeys.length).toBeGreaterThan(0);
		wrongKeys.forEach((key) => expect(within(key as HTMLElement).getByText('✕')).toBeInTheDocument());

		// The four correct Cm7 notes still render in their interval-role colors.
		const highlighted = keyboard.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);

		// A one-line legend explains the two color meanings.
		const legend = screen.getByTestId('feedback-legend');
		expect(legend).toHaveTextContent('The chord');
		expect(legend).toHaveTextContent('Your extra note');

		// The old two-keyboard text diff is gone.
		expect(screen.queryByTestId('played-diff')).not.toBeInTheDocument();
		expect(screen.queryByTestId('correct-diff')).not.toBeInTheDocument();
	});

	it('a wrong answer with only a missing note (no extras) still reveals the full chord with no gray keys', async () => {
		render(DrillsPage);

		// Play only 3 of the 4 Cm7 notes (missing the 7th, B♭), no extras.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const feedback = screen.getByTestId('drill-feedback');
		const keyboards = screen.getAllByRole('img', { name: /piano keyboard/i });
		expect(keyboards).toHaveLength(1);
		const keyboard = keyboards[0];

		expect(keyboard.querySelectorAll('.piano-keyboard__key--wrong')).toHaveLength(0);
		const highlighted = keyboard.querySelectorAll(
			'.piano-keyboard__key--root, .piano-keyboard__key--third, .piano-keyboard__key--fifth, .piano-keyboard__key--seventh'
		);
		expect(highlighted).toHaveLength(4);
		expect(within(feedback).getByTestId('feedback-legend')).toBeInTheDocument();
	});
});

describe('drills page Clear', () => {
	it('deselects all keys, disables Check again, and renders no feedback', async () => {
		render(DrillsPage);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		const checkButton = screen.getByRole('button', { name: 'Check' });
		expect(checkButton).toBeEnabled();

		await fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

		expect(checkButton).toBeDisabled();
		expect(screen.queryByTestId('drill-feedback')).not.toBeInTheDocument();
	});
});

describe('drills page rotate hint (D-05)', () => {
	it('shows a dismissable rotate hint on load when not yet dismissed', () => {
		render(DrillsPage);

		expect(screen.getByTestId('rotate-hint')).toBeInTheDocument();
	});

	it('clicking the dismiss control hides the hint and calls dismissRotateHint', async () => {
		render(DrillsPage);

		const hint = screen.getByTestId('rotate-hint');
		const dismissButton = within(hint).getByRole('button');
		await fireEvent.click(dismissButton);

		expect(dismissRotateHintMock).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('rotate-hint')).not.toBeInTheDocument();
	});

	it('is absent on load when isRotateHintDismissed is mocked true', () => {
		isRotateHintDismissedMock.mockReturnValue(true);
		render(DrillsPage);

		expect(screen.queryByTestId('rotate-hint')).not.toBeInTheDocument();
	});
});

describe('drills masthead nav link', () => {
	it('the masthead exposes a Drills link routing to /drills', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const link = screen.getByRole('link', { name: 'Drills' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/drills');
	});
});

// The scenarios below (Plan 04) force an IDENTIFICATION question instead of a
// construction one, reusing the same call-indexed Math.random draws array
// pattern as forceConstructionCm7 above, but flipping the question-type draw
// to index 1 ('identification'). generateQuestion() for an identification
// question draws, in order: (1) root index, (2) quality index, (3) question
// type index, then (4) pickDistractors' internal shuffle draws (near-miss and
// other candidate shuffles - Fisher-Yates consumes many draws), and finally
// the top-level shuffle([symbol, ...distractors]) draw. Since exact
// distractor content isn't asserted (only that 4 choices exist and one is the
// correct symbol), every draw after the fixed first three can safely return
// the same trailing value from the draws array (index clamps at the array's
// last entry), which still yields a valid, parseable set of distractors.
function forceIdentificationCm7() {
	const draws = [
		0, // family draw (MIX mode) -> chord (Track C union update)
		0 / ROOTS_LENGTH, // root index 0 -> 'C'
		QUALITY_INDEX / QUALITY_SUFFIXES.length, // quality index -> 'm7'
		0.99 // question type index 1 -> 'identification'
	];
	let call = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

describe('drills page identification prompt', () => {
	it('shows the Name this chord instruction, the interval-colored mystery keyboard, and 4 answer choices with no give-away symbol', () => {
		forceIdentificationCm7();
		render(DrillsPage);

		expect(screen.getByText('Name this chord.')).toBeInTheDocument();

		// The mystery chord's notes render on a DISPLAY-mode keyboard in
		// interval colors (a NoteLabel appears for the root, e.g. "C").
		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard).toBeInTheDocument();
		expect(within(keyboard).getByText('C')).toBeInTheDocument();

		// Exactly 4 answer choices, none of which reveal a give-away
		// Display-size ChordGlyph symbol for the prompt itself.
		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		expect(choices).toHaveLength(4);
		expect(screen.queryByTestId('chord-glyph-shadow')).not.toBeInTheDocument();

		// The choice grid keeps a 2-column base (D-13): a 2x2 block of large
		// targets on phone, only widening on desktop breakpoints.
		const choiceGrid = screen.getByTestId('choice-grid');
		expect(choiceGrid.className).toMatch(/(?:^|\s)grid-cols-2(?:\s|$)/);
	});
});

describe('drills page identification immediate grading', () => {
	it('grades the correct choice immediately with no separate Check step', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		const correctChoice = screen.getByRole('button', { name: 'Answer: Cm7' });
		await fireEvent.click(correctChoice);

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
	});

	it('reveals the correct symbol, interval formula, and wrong-answer headline on an incorrect choice', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		expect(wrongChoice).toBeDefined();
		await fireEvent.click(wrongChoice!);

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

		// The correct symbol is revealed since the user was naming it, via a
		// ChordGlyph (root "C" + superscript quality "m7" as separate nodes).
		expect(within(feedback).getAllByText('C').length).toBeGreaterThan(0);
		expect(within(feedback).getAllByText('m7').length).toBeGreaterThan(0);
	});

	it('locks further choice taps once answered', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		const correctChoice = screen.getByRole('button', { name: 'Answer: Cm7' });
		await fireEvent.click(correctChoice);

		expect(screen.getByRole('button', { name: 'Answer: Cm7' })).toBeDisabled();
	});
});

describe('drills page Next advances the loop', () => {
	it('is absent before answering and appears only after an answer, clearing feedback on click', async () => {
		forceConstructionCm7();
		render(DrillsPage);

		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
		const nextButton = screen.getByRole('button', { name: 'Next' });
		expect(nextButton).toBeInTheDocument();

		await fireEvent.click(nextButton);

		expect(screen.queryByTestId('drill-feedback')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
	});

	it('never auto-advances: feedback persists until Next is pressed', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
	});
});

describe('drills page ScoreRegister', () => {
	it('reads 0 RIGHT · 0 STREAK on load (literal mid-dot, not an em dash)', () => {
		forceConstructionCm7();
		render(DrillsPage);

		expect(screen.getByTestId('score-register')).toHaveTextContent('0 RIGHT · 0 STREAK');
	});

	it('increments correct and streak after a right answer', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.getByTestId('score-register')).toHaveTextContent('1 RIGHT · 1 STREAK');
	});

	it('resets the streak to 0 on a wrong answer while keeping the correct count', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));
		expect(screen.getByTestId('score-register')).toHaveTextContent('1 RIGHT · 1 STREAK');

		// Re-arm the deterministic draws BEFORE clicking Next, since Next's
		// question draw happens synchronously inside the click handler.
		forceIdentificationCm7();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		expect(wrongChoice).toBeDefined();
		await fireEvent.click(wrongChoice!);

		expect(screen.getByTestId('score-register')).toHaveTextContent('1 RIGHT · 0 STREAK');
	});
});

describe('drills page answer persistence (PROG-01)', () => {
	it('calls recordAnswer once with the question symbol, kind chord, and correct true after a right answer', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(recordAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'Cm7', kind: 'chord', correct: true });
	});

	it('calls recordAnswer with correct false after a wrong answer', async () => {
		forceIdentificationCm7();
		render(DrillsPage);

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		expect(wrongChoice).toBeDefined();
		await fireEvent.click(wrongChoice!);

		expect(recordAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'Cm7', kind: 'chord', correct: false });
	});

	it('flushes the queue on mount', () => {
		forceConstructionCm7();
		render(DrillsPage);

		expect(flushQueueMock).toHaveBeenCalledTimes(1);
	});
});

describe('drills page mode row (Track C)', () => {
	it('shows CHORDS, INTERVALS, and MIX with MIX active by default', () => {
		forceConstructionCm7();
		render(DrillsPage);

		const row = screen.getByTestId('drill-mode-row');
		const chords = within(row).getByRole('button', { name: 'Chords' });
		const intervals = within(row).getByRole('button', { name: 'Intervals' });
		const mix = within(row).getByRole('button', { name: 'Mix' });

		expect(chords).toHaveAttribute('aria-pressed', 'false');
		expect(intervals).toHaveAttribute('aria-pressed', 'false');
		expect(mix).toHaveAttribute('aria-pressed', 'true');
	});

	it('switching to INTERVALS draws a fresh interval question immediately', async () => {
		forceConstructionCm7();
		render(DrillsPage);
		expect(screen.getByText('Click the notes for Cm7.')).toBeInTheDocument();

		forceIntervalIdentificationCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));

		expect(screen.getByText('Name this interval.')).toBeInTheDocument();
		expect(screen.queryByText('Click the notes for Cm7.')).not.toBeInTheDocument();
	});
});

describe('interval identification drill', () => {
	async function renderIntervalIdentification() {
		forceConstructionCm7();
		render(DrillsPage);
		forceIntervalIdentificationCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));
	}

	it('highlights the two notes in degree colors and offers 4 choices with French sublabels', async () => {
		await renderIntervalIdentification();

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard.querySelector('.piano-keyboard__key--root')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--third')).toBeInTheDocument();

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		expect(choices).toHaveLength(4);
		const correctChoice = screen.getByRole('button', { name: 'Answer: m3' });
		expect(within(correctChoice).getByText('tierce mineure')).toBeInTheDocument();
	});

	it('tapping the correct choice grades immediately and records kind interval', async () => {
		await renderIntervalIdentification();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
		expect(recordAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'm3', kind: 'interval', correct: true });
	});

	it('a wrong choice reveals the correct name with its French long name', async () => {
		await renderIntervalIdentification();

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find((b) => b.getAttribute('aria-label') !== 'Answer: m3');
		expect(wrongChoice).toBeDefined();
		await fireEvent.click(wrongChoice!);

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Not quite\.|Close, but no cigar\.|Not this time\./)
		).toBeInTheDocument();
		const answerLine = within(feedback).getByTestId('interval-answer-line');
		expect(answerLine).toHaveTextContent('m3');
		expect(answerLine).toHaveTextContent('tierce mineure');
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'm3', kind: 'interval', correct: false });
	});

	it('locks the choices once answered', async () => {
		await renderIntervalIdentification();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));

		expect(screen.getByRole('button', { name: 'Answer: m3' })).toBeDisabled();
	});
});

describe('interval construction drill', () => {
	async function renderIntervalConstruction() {
		forceConstructionCm7();
		render(DrillsPage);
		forceIntervalConstructionCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));
	}

	it('prompts with the shorthand and French long name and shows only the root highlighted', async () => {
		await renderIntervalConstruction();

		// The prompt interleaves mono spans, so assert on the paragraph's text.
		const prompt = screen.getByTestId('interval-construction-prompt');
		expect(prompt).toHaveTextContent('Tap a m3 above C');
		expect(prompt).toHaveTextContent('Tierce mineure.');

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard.querySelector('.piano-keyboard__key--root')).toBeInTheDocument();
		expect(keyboard.querySelector('.piano-keyboard__key--third')).not.toBeInTheDocument();
	});

	it('grades the first tap immediately: the enharmonic D♯ key is a correct m3 above C', async () => {
		await renderIntervalConstruction();

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'm3', kind: 'interval', correct: true });

		// The reveal stamps the target in its degree color.
		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard.querySelector('.piano-keyboard__key--third')).toBeInTheDocument();
	});

	it('a wrong tap gets the gray ✕, the colored reveal, and a You-tapped register line', async () => {
		await renderIntervalConstruction();

		await fireEvent.click(screen.getAllByRole('button', { name: 'E key' })[0]);

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Not quite\.|Close, but no cigar\.|Not this time\./)
		).toBeInTheDocument();

		const tapLine = within(feedback).getByTestId('interval-tap-line');
		expect(tapLine).toHaveTextContent('You tapped E');
		expect(tapLine).toHaveTextContent('M3');
		expect(tapLine).toHaveTextContent('tierce majeure');

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard.querySelector('.piano-keyboard__key--third')).toBeInTheDocument();
		const wrongKeys = keyboard.querySelectorAll('.piano-keyboard__key--wrong');
		expect(wrongKeys.length).toBeGreaterThan(0);

		expect(recordAnswerMock).toHaveBeenCalledWith({ item: 'm3', kind: 'interval', correct: false });
	});

	it('Next after an interval answer draws a fresh question from the current mode', async () => {
		await renderIntervalConstruction();

		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);

		forceIntervalIdentificationCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(screen.getByText('Name this interval.')).toBeInTheDocument();
		expect(screen.queryByTestId('drill-feedback')).not.toBeInTheDocument();
	});
});

describe('drills wrong-answer reveal is inspectable (Track C)', () => {
	it('after a wrong construction answer, tapping a revealed key plays it and fills the register', async () => {
		forceConstructionCm7();
		render(DrillsPage);

		// Wrong answer: only 3 of the 4 Cm7 notes.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.queryByTestId('inspect-register')).not.toBeInTheDocument();
		playNoteMock.mockClear();

		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('B♭ · Si · m7 · septième mineure · 10 demi-tons');
		expect(playNoteMock).toHaveBeenCalledWith('Bb4');
	});

	it('feedback formula chips carry the French tooltip', async () => {
		forceConstructionCm7();
		render(DrillsPage);

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const formula = screen.getByTestId('interval-formula');
		expect(within(formula).getByText('m3')).toHaveAttribute('title', 'tierce mineure');
	});

	it('after answering an interval identification question, the prompt keyboard becomes inspectable', async () => {
		forceConstructionCm7();
		render(DrillsPage);
		forceIntervalIdentificationCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));

		// Before answering: display-only keyboard, no key buttons.
		expect(screen.queryAllByRole('button', { name: 'C key' })).toHaveLength(0);

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));
		playNoteMock.mockClear();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		expect(screen.getByTestId('inspect-register')).toHaveTextContent('C · Do · R · fondamentale');
		expect(playNoteMock).toHaveBeenCalled();
	});
});
