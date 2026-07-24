import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DrillsPage from '../src/routes/drills/+page.svelte';

/**
 * Drills' keyboard renders inline in the page's own content flow
 * (`.drill-layout__keyboard`), so a plain page render puts the keyboard
 * content in the same `document.body` that `screen` queries.
 */
function renderDrillsPage() {
	return render(DrillsPage);
}

// +layout.svelte reads the `$page` store from $app/stores to mark the active
// nav link. That store is populated by the real SvelteKit client router at
// runtime, which isn't present when rendering +layout.svelte standalone here
// - so it's mocked with a minimal readable stub exposing just the `url`
// shape the masthead's active-link check reads (`$page.url.pathname`).
vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

// The drills page now fire-and-forgets every graded answer to the backend
// (PROG-01) via the tolerant practice-telemetry wrapper, and fetches stats
// on mount for the practice pool (D-02). Mocked here so this suite never
// touches real fetch/localStorage and the existing timing-sensitive
// assertions stay unaffected.
const flushQueueMock = vi.fn();
const fetchStatsMock = vi.fn((..._args: unknown[]) =>
	Promise.resolve({ items: [], weakest: [] })
);
vi.mock('$lib/api/progress', () => ({
	flushQueue: (...args: unknown[]) => flushQueueMock(...args),
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	localDateString: () => '2026-07-14'
}));

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
}));

// Practice-engine modules (Track B): the pool draw is mocked to pin the
// question SYMBOL deterministically (replacing the old root/quality
// Math.random draw-order script, which the pool integration removed), and
// the persistence modules are mocked so no real localStorage is touched.
// The session module stays REAL: its transitions are pure and deterministic.
interface PoolDrawStub {
	symbol: string;
	bucket: string;
	scaffoldStage: string | null;
}
const drawFromPoolMock = vi.fn(
	(..._args: unknown[]): PoolDrawStub => ({ symbol: 'Cm7', bucket: 'tier', scaffoldStage: null })
);
const scaffoldStageForSymbolMock = vi.fn((..._args: unknown[]): string | null => null);
vi.mock('$lib/practice/pool', () => ({
	drawFromPool: (...args: unknown[]) => drawFromPoolMock(...args),
	scaffoldStageForSymbol: (...args: unknown[]) => scaffoldStageForSymbolMock(...args)
}));

const recentMissesMock = vi.fn((..._args: unknown[]): string[] => []);
const appendPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/practiceLog', () => ({
	recentMisses: (...args: unknown[]) => recentMissesMock(...args),
	appendPracticeAnswer: (...args: unknown[]) => appendPracticeAnswerMock(...args),
	readPracticeLog: () => [],
	practiceDaysSince: () => 99
}));

const checkUnlockMock = vi.fn((..._args: unknown[]) => ({
	tier: 1,
	nextTier: 2,
	eligible: false,
	rollingAccuracy: 0,
	rollingCount: 0,
	lifetimeAttempts: 0,
	distinctDays: 0,
	perQuality: []
}));
const setCurrentTierMock = vi.fn();
const snoozeSuggestionMock = vi.fn();
vi.mock('$lib/practice/levelState', () => ({
	getLevelState: () => ({ currentTier: 1, unlockedTiers: [1] }),
	checkUnlock: (...args: unknown[]) => checkUnlockMock(...args),
	isSnoozed: () => false,
	setCurrentTier: (...args: unknown[]) => setCurrentTierMock(...args),
	snoozeSuggestion: (...args: unknown[]) => snoozeSuggestionMock(...args)
}));

vi.mock('$lib/practice/songs', () => ({
	activeSongChordSymbols: (): string[] => [],
	listSongs: (): unknown[] => []
}));

const writeScaffoldMock = vi.fn();
vi.mock('$lib/practice/scaffold', () => ({
	readScaffolds: () => ({}),
	writeScaffold: (...args: unknown[]) => writeScaffoldMock(...args),
	recordScaffoldAnswer: (state: unknown) => state
}));

vi.mock('$lib/practice/drillSeeds', () => ({
	consumeDrillSeeds: (): string[] => [],
	consumeLessonSeeds: (): string[] => []
}));

// The drills page now plays sound through the Track A audio engine: a
// key-touch note on pointerdown and the correct chord on every answer
// reveal. Mocked per the audio contract (consumers in tests always
// vi.mock('$lib/audio/audio')) so no AudioContext or tone import ever
// happens in jsdom.
const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn(async () => {});
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: () => ensureAudioReadyMock()
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

const { default: RootLayout } = await import('../src/routes/+layout.svelte');

// This suite pins the construction-drill loop (Plan 03). The question SYMBOL
// is supplied by the mocked practice pool (drawFromPoolMock returns Cm7), so
// Math.random only controls the draws around it. DRAW-ORDER UPDATE (Track C
// integration merge): the page drills in MIX mode by default, so every FRESH
// pool draw now spends ONE leading 50/50 family draw (< 0.5 -> chord,
// >= 0.5 -> interval) via pickQuestionFamily BEFORE pickQuestionType's 0/1
// direction draw and the downstream cosmetic draws (distractor shuffles,
// feedback-copy variant picks).
//
// A constant 0 satisfies construction (family 0 -> chord, direction 0 ->
// construction); identification needs a call-indexed script (family must
// stay < 0.5 while the direction draw needs >= 0.5), the same draw-script
// pattern the pre-practice-engine suite used.
function forceDraws(draws: number[]) {
	let call = 0;
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = draws[Math.min(call, draws.length - 1)];
		call++;
		return value;
	});
}

function forceConstructionCm7() {
	vi.spyOn(Math, 'random').mockReturnValue(0); // family -> chord, direction -> 'construction'
}

beforeEach(() => {
	forceConstructionCm7();
	recordPracticeAnswerMock.mockClear();
	appendPracticeAnswerMock.mockClear();
	flushQueueMock.mockClear();
	playChordMock.mockClear();
	playNoteMock.mockClear();
	ensureAudioReadyMock.mockClear();
	fetchStatsMock.mockClear();
	drawFromPoolMock.mockClear();
	isRotateHintDismissedMock.mockReset().mockReturnValue(false);
	dismissRotateHintMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('drills page zero-friction construction load', () => {
	it('renders a construction prompt with the instruction line and the interactive keyboard, no setup screen', () => {
		renderDrillsPage();

		expect(screen.getByText('Click the notes for Cm7.')).toBeInTheDocument();

		const keyboard = screen.getByRole('img', { name: /piano keyboard/i });
		expect(keyboard).toBeInTheDocument();
		expect(within(keyboard).getAllByRole('button').length).toBeGreaterThan(0);
	});
});

describe('drills page Check button gating', () => {
	it('disables Check on load and enables it after selecting one key', async () => {
		renderDrillsPage();

		const checkButton = screen.getByRole('button', { name: 'Check' });
		expect(checkButton).toBeDisabled();

		const cKey = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.click(cKey);

		expect(checkButton).toBeEnabled();
	});
});

describe('drills page correct construction answer', () => {
	it('grades a correct Cm7 voicing and shows the stamp feedback with a right-answer confirmation', async () => {
		renderDrillsPage();

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
		renderDrillsPage();

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
		renderDrillsPage();

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
		renderDrillsPage();

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
		renderDrillsPage();

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
		renderDrillsPage();

		expect(screen.getByTestId('rotate-hint')).toBeInTheDocument();
	});

	it('clicking the dismiss control hides the hint and calls dismissRotateHint', async () => {
		renderDrillsPage();

		const hint = screen.getByTestId('rotate-hint');
		const dismissButton = within(hint).getByRole('button');
		await fireEvent.click(dismissButton);

		expect(dismissRotateHintMock).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('rotate-hint')).not.toBeInTheDocument();
	});

	it('is absent on load when isRotateHintDismissed is mocked true', () => {
		isRotateHintDismissedMock.mockReturnValue(true);
		renderDrillsPage();

		expect(screen.queryByTestId('rotate-hint')).not.toBeInTheDocument();
	});
});

describe('drills masthead nav link', () => {
	it('the masthead exposes a Drills link routing to /drills', () => {
		const emptyChildren = createRawSnippet(() => ({
			render: () => '<div></div>'
		}));

		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		// jsdom does not evaluate media queries, so Phase 23 1A's phone-only
		// bottom-tab-bar renders alongside the desktop masthead nav,
		// duplicating the Drills link - scope to the masthead to disambiguate.
		const link = within(screen.getByTestId('masthead')).getByRole('link', { name: 'Drills' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/drills');
	});
});

// The scenarios below (Plan 04) force an IDENTIFICATION question instead of
// a construction one: the mocked pool still supplies Cm7. Draw script
// (Track C integration merge): the first draw is the MIX family draw and
// must stay below 0.5 (chord); the trailing 0.99 then flips pickQuestionType
// to index 1 ('identification') and feeds pickDistractors' internal
// Fisher-Yates shuffles plus the top-level shuffle([symbol, ...distractors]),
// which still yields a valid, parseable 4-choice set (exact distractor
// content is never asserted here).
function forceIdentificationCm7() {
	forceDraws([0, 0.99]);
}

describe('drills page identification prompt', () => {
	it('shows the Name this chord instruction, the interval-colored mystery keyboard, and 4 answer choices with no give-away symbol', () => {
		forceIdentificationCm7();
		renderDrillsPage();

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
		renderDrillsPage();

		const correctChoice = screen.getByRole('button', { name: 'Answer: Cm7' });
		await fireEvent.click(correctChoice);

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
	});

	it('reveals the correct symbol, interval formula, and wrong-answer headline on an incorrect choice', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

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
		renderDrillsPage();

		const correctChoice = screen.getByRole('button', { name: 'Answer: Cm7' });
		await fireEvent.click(correctChoice);

		expect(screen.getByRole('button', { name: 'Answer: Cm7' })).toBeDisabled();
	});
});

describe('drills page Next advances the loop', () => {
	it('is absent before answering and appears only after an answer, clearing feedback on click', async () => {
		forceConstructionCm7();
		renderDrillsPage();

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
		renderDrillsPage();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
		expect(screen.getByTestId('drill-feedback')).toBeInTheDocument();
	});
});

describe('drills page ScoreRegister', () => {
	it('reads 0 RIGHT · 0 STREAK on load (literal mid-dot, not an em dash)', () => {
		forceConstructionCm7();
		renderDrillsPage();

		expect(screen.getByTestId('score-register')).toHaveTextContent('0 RIGHT · 0 STREAK');
	});

	it('increments correct and streak after a right answer', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.getByTestId('score-register')).toHaveTextContent('1 RIGHT · 1 STREAK');
	});

	it('resets the streak to 0 on a wrong answer while keeping the correct count', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

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

describe('drills page answer persistence (PROG-01 + telemetry)', () => {
	it('records a right identification answer with the given choice and a duration', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'Cm7',
			kind: 'chord',
			correct: true,
			durationMs: expect.any(Number),
			given: 'Cm7'
		});
	});

	it('records a wrong identification answer with the picked symbol as given', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		expect(wrongChoice).toBeDefined();
		await fireEvent.click(wrongChoice!);

		const picked = wrongChoice!.getAttribute('aria-label')!.replace('Answer: ', '');
		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'Cm7',
			kind: 'chord',
			correct: false,
			durationMs: expect.any(Number),
			given: picked
		});
	});

	it('records a construction answer with a duration and no given field', async () => {
		forceConstructionCm7();
		renderDrillsPage();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'Cm7',
			kind: 'chord',
			correct: false,
			durationMs: expect.any(Number),
			given: undefined
		});
	});

	it('appends every graded answer to the local practice log (unlock windows, warm-up)', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(appendPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(appendPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'Cm7',
			correct: true,
			assisted: false,
			date: '2026-07-14'
		});
	});

	it('flushes the queue on mount', () => {
		forceConstructionCm7();
		renderDrillsPage();

		expect(flushQueueMock).toHaveBeenCalledTimes(1);
	});
});

describe('drills page sound (Track A)', () => {
	const CM7_LETTERS = ['C', 'E♭', 'G', 'B♭'];

	async function playCm7Correctly() {
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);
	}

	it('pressing a key plays its note and unlocks audio inside the gesture', async () => {
		forceConstructionCm7();
		renderDrillsPage();

		const cKey = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.pointerDown(cKey);

		expect(ensureAudioReadyMock).toHaveBeenCalled();
		expect(playNoteMock).toHaveBeenCalledWith('C4');
	});

	it('a correct construction answer still plays the correct chord on reveal', async () => {
		forceConstructionCm7();
		renderDrillsPage();

		await playCm7Correctly();
		expect(playChordMock).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(CM7_LETTERS);
	});

	it('a wrong construction answer plays the CORRECT chord, not the played one', async () => {
		forceConstructionCm7();
		renderDrillsPage();

		// Wrong set: missing the 7th, extra 6th (A).
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'A key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(CM7_LETTERS);
	});

	it('a correct identification answer plays the chord on reveal', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(CM7_LETTERS);
	});

	it('a wrong identification answer plays the correct chord on reveal', async () => {
		forceIdentificationCm7();
		renderDrillsPage();

		const choices = screen.getAllByRole('button', { name: /^Answer: / });
		const wrongChoice = choices.find(
			(button) => button.getAttribute('aria-label') !== 'Answer: Cm7'
		);
		expect(wrongChoice).toBeDefined();
		await fireEvent.click(wrongChoice!);

		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(CM7_LETTERS);
	});
});

// ---- Track C: mode row + interval recognition drill ------------------------
// Interval scripts drive the INTERVALS deck (mode switch), where
// pickQuestionFamily consumes NO draw; generateIntervalQuestion then draws
// (1) root index over ROOTS, (2) interval index over DRILL_INTERVALS,
// (3) direction index over ['identification', 'construction'], then
// distractor/choice shuffle draws (trailing repeats, content not asserted).
const ROOTS_LENGTH = 12;
const DRILL_INTERVALS_LENGTH = 12;
const M3_INDEX = 2; // DRILL_INTERVALS order pinned by interval.test.ts

function forceIntervalIdentificationCm3() {
	forceDraws([0 / ROOTS_LENGTH, M3_INDEX / DRILL_INTERVALS_LENGTH, 0]);
}

function forceIntervalConstructionCm3() {
	forceDraws([0 / ROOTS_LENGTH, M3_INDEX / DRILL_INTERVALS_LENGTH, 0.99]);
}

describe('drills page mode row (Track C)', () => {
	it('shows CHORDS, INTERVALS, and MIX with MIX active by default', () => {
		forceConstructionCm7();
		renderDrillsPage();

		const row = screen.getByTestId('drill-mode-row');
		expect(within(row).getByRole('button', { name: 'Chords' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(within(row).getByRole('button', { name: 'Intervals' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(within(row).getByRole('button', { name: 'Mix' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('switching to INTERVALS re-deals the fresh pool question immediately', async () => {
		forceConstructionCm7();
		renderDrillsPage();
		expect(screen.getByText('Click the notes for Cm7.')).toBeInTheDocument();

		forceIntervalIdentificationCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));

		expect(screen.getByText('Name this interval.')).toBeInTheDocument();
		expect(screen.queryByText('Click the notes for Cm7.')).not.toBeInTheDocument();
	});

	it('switching back to CHORDS re-deals a pool chord question', async () => {
		forceConstructionCm7();
		renderDrillsPage();

		forceIntervalIdentificationCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));
		expect(screen.getByText('Name this interval.')).toBeInTheDocument();

		forceConstructionCm7();
		await fireEvent.click(screen.getByRole('button', { name: 'Chords' }));

		expect(screen.getByText('Click the notes for Cm7.')).toBeInTheDocument();
	});
});

describe('interval identification drill (Track C)', () => {
	async function renderIntervalIdentification() {
		forceConstructionCm7();
		renderDrillsPage();
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

	it('tapping the correct choice grades immediately and records kind interval with telemetry', async () => {
		await renderIntervalIdentification();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));

		const feedback = screen.getByTestId('drill-feedback');
		expect(
			within(feedback).getByText(/Nailed it\.|Et voilà\.|Bang on\.|Spot on, mon ami\./)
		).toBeInTheDocument();
		expect(recordPracticeAnswerMock).toHaveBeenCalledTimes(1);
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'm3',
			kind: 'interval',
			correct: true,
			durationMs: expect.any(Number),
			given: 'm3'
		});
		// The chord-only practice log (tier unlock windows) stays untouched.
		expect(appendPracticeAnswerMock).not.toHaveBeenCalled();
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

		const picked = wrongChoice!.getAttribute('aria-label')!.replace('Answer: ', '');
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'm3',
			kind: 'interval',
			correct: false,
			durationMs: expect.any(Number),
			given: picked
		});
	});

	it('locks the choices once answered', async () => {
		await renderIntervalIdentification();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));

		expect(screen.getByRole('button', { name: 'Answer: m3' })).toBeDisabled();
	});

	it('the reveal plays the interval pair, not a chord', async () => {
		await renderIntervalIdentification();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));

		expect(playChordMock).toHaveBeenCalledTimes(1);
		expect(playChordMock).toHaveBeenCalledWith(['C', 'E♭']);
	});
});

describe('interval construction drill (Track C)', () => {
	async function renderIntervalConstruction() {
		forceConstructionCm7();
		renderDrillsPage();
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
		expect(recordPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'm3',
			kind: 'interval',
			correct: true,
			durationMs: expect.any(Number),
			given: 'm3'
		});

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
		expect(keyboard.querySelectorAll('.piano-keyboard__key--wrong').length).toBeGreaterThan(0);

		expect(recordPracticeAnswerMock).toHaveBeenCalledWith({
			item: 'm3',
			kind: 'interval',
			correct: false,
			durationMs: expect.any(Number),
			given: 'M3'
		});
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
	it('after a wrong construction answer, tapping a revealed key plays it and fills the register (en default)', async () => {
		forceConstructionCm7();
		renderDrillsPage();

		// Wrong answer: only 3 of the 4 Cm7 notes.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'D♯ key' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'G key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		expect(screen.queryByTestId('inspect-register')).not.toBeInTheDocument();
		playNoteMock.mockClear();

		await fireEvent.click(screen.getAllByRole('button', { name: 'A♯ key' })[0]);

		const register = screen.getByTestId('inspect-register');
		expect(register).toHaveTextContent('B♭ · Si♭ · m7 · minor 7th · 10 semitones');
		expect(playNoteMock).toHaveBeenCalledWith('Bb4');
	});

	it('feedback formula chips carry the French tooltip', async () => {
		forceConstructionCm7();
		renderDrillsPage();

		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		await fireEvent.click(screen.getByRole('button', { name: 'Check' }));

		const formula = screen.getByTestId('interval-formula');
		expect(within(formula).getByText('m3')).toHaveAttribute('title', 'tierce mineure');
	});

	it('interval keys always play on tap, but only report the interval register once answered', async () => {
		forceConstructionCm7();
		renderDrillsPage();
		forceIntervalIdentificationCm3();
		await fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));

		// Before answering: keys are playable (sound on tap, "always make a
		// sound" behavior) but the interval register stays hidden so tapping to
		// hear the pitches never spoils the answer.
		playNoteMock.mockClear();
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		expect(playNoteMock).toHaveBeenCalled();
		expect(screen.queryByTestId('inspect-register')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: m3' }));
		playNoteMock.mockClear();

		// After answering: tapping plays AND prints the interval register.
		await fireEvent.click(screen.getAllByRole('button', { name: 'C key' })[0]);
		expect(screen.getByTestId('inspect-register')).toHaveTextContent('C · Do · R · root');
		expect(playNoteMock).toHaveBeenCalled();
	});
});
