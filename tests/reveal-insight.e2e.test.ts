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

// Mock scaffolding mirrors tests/drills.e2e.test.ts post practice-engine
// merge: the pool draw pins the question SYMBOL (Cm7) and Math.random only
// steers pickQuestionType's kind draw plus cosmetic downstream draws.
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

const drawFromPoolMock = vi.fn((..._args: unknown[]) => ({
	symbol: 'Cm7',
	bucket: 'tier',
	scaffoldStage: null
}));
vi.mock('$lib/practice/pool', () => ({
	drawFromPool: (...args: unknown[]) => drawFromPoolMock(...args),
	scaffoldStageForSymbol: (..._args: unknown[]) => null
}));

vi.mock('$lib/practice/practiceLog', () => ({
	recentMisses: (): string[] => [],
	appendPracticeAnswer: () => {},
	readPracticeLog: () => [],
	practiceDaysSince: () => 99
}));

vi.mock('$lib/practice/levelState', () => ({
	getLevelState: () => ({ currentTier: 1, unlockedTiers: [1] }),
	checkUnlock: () => ({
		tier: 1,
		nextTier: 2,
		eligible: false,
		rollingAccuracy: 0,
		rollingCount: 0,
		lifetimeAttempts: 0,
		distinctDays: 0,
		perQuality: []
	}),
	isSnoozed: () => false,
	setCurrentTier: () => {},
	snoozeSuggestion: () => {}
}));

vi.mock('$lib/practice/songs', () => ({
	activeSongChordSymbols: (): string[] => [],
	listSongs: (): unknown[] => []
}));

vi.mock('$lib/practice/scaffold', () => ({
	readScaffolds: () => ({}),
	writeScaffold: () => {},
	recordScaffoldAnswer: (state: unknown) => state
}));

vi.mock('$lib/practice/drillSeeds', () => ({
	consumeDrillSeeds: (): string[] => []
}));

vi.mock('$lib/audio/audio', () => ({
	playChord: () => {},
	playNote: () => {},
	ensureAudioReady: async () => {}
}));

const isRotateHintDismissedMock = vi.fn(() => true);
const dismissRotateHintMock = vi.fn();
vi.mock('$lib/drills/rotateHint', () => ({
	isRotateHintDismissed: () => isRotateHintDismissedMock(),
	dismissRotateHint: (...args: unknown[]) => dismissRotateHintMock(...args)
}));

// The pool mock pins the symbol, so a constant Math.random steers only the
// kind draw: 0 -> construction, 0.99 -> identification (shuffle and copy
// variant draws tolerate the constant).
const forceConstructionCm7 = () => {
	vi.spyOn(Math, 'random').mockReturnValue(0);
};
const forceIdentificationCm7 = () => {
	vi.spyOn(Math, 'random').mockReturnValue(0.99);
};

beforeEach(() => {
	recordPracticeAnswerMock.mockClear();
	flushQueueMock.mockClear();
	fetchStatsMock.mockClear();
	drawFromPoolMock.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * Renders the drills page and switches to the CHORDS deck (Track C
 * integration merge): these scenarios pin chord flows, and the CHORDS mode
 * consumes no MIX family draw, so the constant Math.random keeps steering
 * only pickQuestionType's direction draw exactly as before the mode row
 * existed. Session-sourced first questions (warm-up, seeds) are unaffected
 * by the click: they never re-deal and never consumed a family draw.
 */
async function renderChordsDeck() {
	render(DrillsPage);
	await fireEvent.click(screen.getByRole('button', { name: 'Chords' }));
}

describe('wrong identification answer shows the confusion contrast', () => {
	it('renders the contrast line between the correct symbol and the picked one', async () => {
		forceIdentificationCm7();
		await renderChordsDeck();

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
		await renderChordsDeck();

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
		await renderChordsDeck();

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
		await renderChordsDeck();

		await fireEvent.click(screen.getByRole('button', { name: 'Answer: Cm7' }));

		expect(screen.queryByTestId('reveal-insight')).not.toBeInTheDocument();
	});
});

describe('Next clears the picked symbol', () => {
	it('a wrong pick followed by Next and a new wrong pick contrasts the NEW pick', async () => {
		forceIdentificationCm7();
		await renderChordsDeck();

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
