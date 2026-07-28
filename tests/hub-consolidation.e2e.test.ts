import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { readSongFilter } from '$lib/practice/songFilterPref';
import { resetStatsCache } from '$lib/practice/statsCache';

/**
 * REG-01 milestone capstone (Phase 31 Plan 01). Phases 26-30 each remapped
 * their own route's tests to the hub that absorbed it; this file is the ONE
 * cross-hub test that proves the consolidated four-hub topology and one core
 * user flow per hub survive together, end to end. It is deliberately narrow:
 * it does NOT re-run the per-quality IntervalView matrix
 * (src/lib/components/intervalView.test.ts), the full five-family Practice
 * interleave or the single-type-due gate (tests/practice-hub-mix.e2e.test.ts),
 * or the detailed per-route redirect suite
 * (src/routes/redirectShims.test.ts) - see
 * .planning/phases/31-no-regression-gate-test-remap/31-COVERAGE-MATRIX.md
 * for the full REG-02 item-to-test-file map. This file asserts only:
 *
 *   1. Topology: exactly 4 hubs (Lookup/Practice/Learn/Progress) render on
 *      both the desktop masthead and the phone bottom tab bar, with no More
 *      control anywhere (HUB-01).
 *   2. Redirects: each of the 8 old routes 308-redirects to its absorbing
 *      hub (HUB-03), in one compact data-driven loop.
 *   3. One representative flow per hub: Lookup decodes a chord and shows its
 *      IntervalView (stacked, then Formula); Practice starts a session and
 *      grades one chroma-based build-it question to a completed round;
 *      Learn shows theory + Explore + the interval reference on one
 *      surface; Progress shows Stats by default, reveals the recall map via
 *      Recall, and performs a real song-filter write via Songs.
 *
 * Mock scaffolding below is reused (not re-derived) from the harnesses each
 * per-hub suite already proved: tests/masthead.e2e.test.ts (layout +
 * $app/stores), tests/lookup.e2e.test.ts (audio contract), src/routes/
 * learn.test.ts (audio contract), tests/practice-hub-mix.e2e.test.ts (deck/
 * introBudget/telemetry/audio/practiceQueue mocks + the build-it key-tap
 * sequence), and tests/progress-hub.e2e.test.ts (api/progress, api/client,
 * levelState, audio, deck mocks). Because every describe block below shares
 * one file, `vi.mock` calls are hoisted once and apply across all of them;
 * each mock's shape is the union of what every hub page needs, so no hub's
 * real logic is stubbed away.
 */

vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

// afterNavigate is stubbed as a no-op: the Lookup page registers a callback
// through it to decide whether its input autofocuses (B6), and a factory mock
// must expose every export the components under test import.
vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve()),
	afterNavigate: vi.fn()
}));

const introduceNewCardsMock = vi.fn();
const getDueCardsMock = vi.fn();
const getAllCardsMock = vi.fn();
const recordGradeMock = vi.fn();
const getCardMock = vi.fn();
vi.mock('$lib/srs/deck', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/srs/deck')>();
	return {
		...actual,
		introduceNewCards: (...args: unknown[]) => introduceNewCardsMock(...args),
		getDueCards: (...args: unknown[]) => getDueCardsMock(...args),
		getAllCards: (...args: unknown[]) => getAllCardsMock(...args),
		recordGrade: (...args: unknown[]) => recordGradeMock(...args),
		getCard: (...args: unknown[]) => getCardMock(...args)
	};
});

const remainingIntroBudgetMock = vi.fn();
const consumeIntroBudgetMock = vi.fn();
vi.mock('$lib/srs/introBudget', () => ({
	remainingIntroBudget: (...args: unknown[]) => remainingIntroBudgetMock(...args),
	consumeIntroBudget: (...args: unknown[]) => consumeIntroBudgetMock(...args)
}));

const recordPracticeAnswerMock = vi.fn();
vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: (...args: unknown[]) => recordPracticeAnswerMock(...args)
}));

const playChordMock = vi.fn();
const playNoteMock = vi.fn();
const ensureAudioReadyMock = vi.fn();
const setSoundEnabledMock = vi.fn();
const setStudyModeEnabledMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args),
	ensureAudioReady: (...args: unknown[]) => ensureAudioReadyMock(...args),
	playArpeggio: () => {},
	soundEnabled: () => false,
	setSoundEnabled: (...args: unknown[]) => setSoundEnabledMock(...args),
	studyModeEnabled: () => false,
	setStudyModeEnabled: (...args: unknown[]) => setStudyModeEnabledMock(...args)
}));

const fetchStatsMock = vi.fn();
const fetchStreakMock = vi.fn();
vi.mock('$lib/api/progress', () => ({
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	fetchStreak: (...args: unknown[]) => fetchStreakMock(...args),
	localDateString: () => '2026-07-25'
}));

let storedToken = '';
const getApiTokenMock = vi.fn(() => storedToken);
const setApiTokenMock = vi.fn((token: string) => {
	storedToken = token;
});
vi.mock('$lib/api/client', () => ({
	getApiToken: () => getApiTokenMock(),
	setApiToken: (token: string) => setApiTokenMock(token)
}));

let currentTier = 1;
vi.mock('$lib/practice/levelState', () => ({
	getLevelState: () => ({
		currentTier,
		unlockedTiers: [1, 2, 3, 4].filter((id) => id <= currentTier)
	}),
	setCurrentTier: (tier: number) => {
		currentTier = tier;
	}
}));

// The Practice flow drives exactly one due card (a build-it item) so the
// round completes after one question. The synthetic builders (voicing/
// progression/inversion) are stubbed to `[]` here, isolating this test to
// the one carded family under test - the REAL five-family weave, the
// single-type-due gate, and the synthetic grade-commit split are already
// proven end-to-end in tests/practice-hub-mix.e2e.test.ts (and the sixth,
// inversion, family in src/routes/practiceInversionsReg.test.ts, 35-06).
const syntheticVoicingItemsMock = vi.fn((..._args: unknown[]) => [] as unknown[]);
const syntheticProgressionItemsMock = vi.fn((..._args: unknown[]) => [] as unknown[]);
const syntheticInversionItemsMock = vi.fn((..._args: unknown[]) => [] as unknown[]);
vi.mock('$lib/practice/practiceQueue', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/practice/practiceQueue')>();
	return {
		...actual,
		syntheticVoicingItems: (...args: unknown[]) => syntheticVoicingItemsMock(...args),
		syntheticProgressionItems: (...args: unknown[]) => syntheticProgressionItemsMock(...args),
		syntheticInversionItems: (...args: unknown[]) => syntheticInversionItemsMock(...args)
	};
});

import RootLayout from '../src/routes/+layout.svelte';
import LookupPage from '../src/routes/+page.svelte';
import PracticePage from '../src/routes/practice/+page.svelte';
import LearnPage from '../src/routes/learn/+page.svelte';
import ProgressPage from '../src/routes/progress/+page.svelte';

const NOW = new Date('2026-07-25T12:00:00Z');

function makeCard(
	factId: string,
	factKind: CardRecord['factKind'],
	mode: CardRecord['mode']
): CardRecord {
	return {
		...newCard(NOW),
		factId,
		factKind,
		mode,
		lastRating: null,
		masteryDayCount: 0
	};
}

/** First occurrence of a natural-letter key by its accessible name (mirrors tests/practice-hub-mix.e2e.test.ts's clickKey convention). */
function clickKey(letter: string) {
	return fireEvent.click(screen.getAllByRole('button', { name: `${letter} key` })[0]);
}

beforeEach(() => {
	localStorage.clear();
	resetStatsCache();
	storedToken = '';
	currentTier = 1;

	introduceNewCardsMock.mockReset().mockResolvedValue(0);
	getDueCardsMock.mockReset().mockResolvedValue([]);
	getAllCardsMock.mockReset().mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: number) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset().mockResolvedValue(undefined);
	remainingIntroBudgetMock.mockReset().mockReturnValue(0);
	consumeIntroBudgetMock.mockReset();
	recordPracticeAnswerMock.mockReset();
	playChordMock.mockReset();
	playNoteMock.mockReset();
	ensureAudioReadyMock.mockReset().mockResolvedValue(undefined);
	setSoundEnabledMock.mockReset();
	setStudyModeEnabledMock.mockReset();
	syntheticVoicingItemsMock.mockReset().mockReturnValue([]);
	syntheticProgressionItemsMock.mockReset().mockReturnValue([]);
	syntheticInversionItemsMock.mockReset().mockReturnValue([]);
	fetchStatsMock.mockReset().mockResolvedValue({ items: [], weakest: [] });
	fetchStreakMock.mockReset().mockResolvedValue({ streak: 0, practicedToday: false });
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('Topology: exactly 4 hubs, no More, on desktop and phone (HUB-01)', () => {
	it('desktop masthead exposes exactly Lookup/Practice/Learn/Progress and no More control', () => {
		const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const masthead = within(screen.getByTestId('masthead'));
		const links = masthead.getAllByRole('link');
		expect(links.map((link) => link.textContent?.trim())).toEqual([
			'Lookup',
			'Practice',
			'Learn',
			'Progress'
		]);
		expect(masthead.queryByRole('link', { name: /more/i })).not.toBeInTheDocument();
		expect(masthead.queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
	});

	it('phone bottom tab bar exposes the same 4 hubs and no More button', () => {
		const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		const bar = within(screen.getByTestId('bottom-tab-bar'));
		expect(bar.getByRole('link', { name: 'Lookup' })).toHaveAttribute('href', '/');
		expect(bar.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
		expect(bar.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
		expect(bar.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
		expect(bar.queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
		expect(bar.queryByRole('link', { name: /more/i })).not.toBeInTheDocument();
	});
});

type RedirectLike = { status: number; location: string };

function captureRedirect(load: () => unknown): RedirectLike {
	try {
		load();
	} catch (e) {
		return e as RedirectLike;
	}
	throw new Error('load() did not throw a redirect');
}

/**
 * The 8 old-route shims and their absorbing hub. This loop is the capstone's
 * own compact topology assertion; src/routes/redirectShims.test.ts remains
 * the detailed per-route suite, so this stays a loop rather than 8 repeated
 * `it` blocks.
 */
const REDIRECTS: { target: string; load: () => Promise<{ load: () => unknown }> }[] = [
	{ target: '/practice', load: () => import('../src/routes/drills/+page') },
	{ target: '/practice', load: () => import('../src/routes/build/+page') },
	{ target: '/practice', load: () => import('../src/routes/voicings/+page') },
	{ target: '/practice', load: () => import('../src/routes/progressions/+page') },
	{ target: '/learn', load: () => import('../src/routes/scales/+page') },
	{ target: '/learn', load: () => import('../src/routes/theory/+page') },
	{ target: '/progress', load: () => import('../src/routes/recall/+page') },
	{ target: '/progress', load: () => import('../src/routes/songs/+page') }
];

describe('Redirects: all 8 old routes 308-redirect to their absorbing hub (HUB-03)', () => {
	it('every old route throws a 308 redirect to the hub that now owns it', async () => {
		for (const { target, load } of REDIRECTS) {
			const { load: pageLoad } = await load();
			const redirectError = captureRedirect(pageLoad);
			expect(redirectError.status).toBe(308);
			expect(redirectError.location).toBe(target);
		}
	});
});

describe('Lookup: decode a chord and show its IntervalView (stacked, then Formula) (REG-01)', () => {
	it('stamping Cm7 renders the chord result with the stacked-thirds IntervalView by default, toggling to Formula', async () => {
		render(LookupPage);

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Cm7' } });
		await fireEvent.click(screen.getByRole('button', { name: /stamp/i }));

		expect(screen.getByTestId('chord-result')).toBeInTheDocument();

		const view = screen.getByTestId('interval-view');
		expect(view.getAttribute('data-view')).toBe('stacked');
		expect(within(view).getByTestId('interval-stacked')).toBeInTheDocument();

		await fireEvent.click(within(view).getByRole('button', { name: 'Formula view' }));

		expect(view.getAttribute('data-view')).toBe('formula');
		const formula = within(view).getByTestId('interval-formula');
		expect(within(formula).getByText('R')).toBeInTheDocument();
		expect(within(formula).getByText('m3')).toBeInTheDocument();
	});
});

describe('Practice: start -> grade one chroma-based build-it question -> round complete (REG-01)', () => {
	it('starts the session, drives the build-it drill through a real chroma key-tap sequence, and commits an FSRS grade', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		const buildCard = makeCard('chord-formula:Cm7', 'chord-formula', 'formula-build');
		getDueCardsMock.mockResolvedValue([buildCard]);
		getCardMock.mockImplementation(async (factId: string, mode: string) =>
			factId === 'chord-formula:Cm7' && mode === 'formula-build' ? buildCard : undefined
		);

		render(PracticePage);
		await screen.findByTestId('practice-pre-start');
		expect(screen.getByTestId('practice-due-register')).toHaveTextContent('1 CARD DUE TODAY');
		await fireEvent.click(screen.getByRole('button', { name: 'Start practice' }));

		expect(screen.getByTestId('build-session')).toBeInTheDocument();
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('BUILD IT');

		// Cm7 = C, E♭, G, B♭; the drill's root is pre-filled, so the graded
		// taps are the third/fifth/seventh, matched by chroma
		// (tests/practice-hub-mix.e2e.test.ts's proven completeBuildIt sequence).
		for (const letter of ['D♯', 'G', 'A♯']) {
			await clickKey(letter);
			await new Promise((resolve) => setTimeout(resolve, 700));
		}
		await fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(screen.getByTestId('session-end-card')).toHaveTextContent('ROUND COMPLETE');
		// BuildSession commits its own FSRS grade internally via the same
		// mocked deck.recordGrade (T-31-01: never a stubbed grade path).
		expect(recordGradeMock).toHaveBeenCalled();
	});
});

describe('Learn: theory + Explore + interval reference on one surface (REG-01)', () => {
	it('renders the Theory section, the exploreOnly Scale Explore, and 5 IntervalView instances', () => {
		render(LearnPage);

		expect(screen.getByTestId('learn-theory')).toBeInTheDocument();

		const exploreSection = screen.getByTestId('learn-explore');
		expect(exploreSection).toBeInTheDocument();
		expect(within(exploreSection).queryByTestId('mode-toggle')).not.toBeInTheDocument();

		const intervalSection = screen.getByTestId('learn-interval-reference');
		expect(within(intervalSection).getAllByTestId('interval-view')).toHaveLength(5);
	});
});

describe('Progress: stats + recall map + a real song-filter write (REG-01)', () => {
	it('shows Stats by default, reveals the recall map via Recall, and writes the song filter via Songs', async () => {
		render(ProgressPage);

		const tabs = within(screen.getByRole('group', { name: /progress hub sections/i }));
		expect(tabs.getByRole('button', { name: /stats/i })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('practice-settings')).toBeInTheDocument();

		await fireEvent.click(tabs.getByRole('button', { name: /recall/i }));
		const modeToggle = within(screen.getByTestId('mode-toggle'));
		await fireEvent.click(modeToggle.getByRole('button', { name: 'Map' }));
		await waitFor(() => expect(screen.getByTestId('recall-map-grid')).toBeInTheDocument());

		await fireEvent.click(tabs.getByRole('button', { name: /songs/i }));
		expect(readSongFilter()).toBe(false);
		const bar = within(screen.getByTestId('song-filter-toggle-bar'));
		await fireEvent.click(bar.getByRole('button'));
		expect(readSongFilter()).toBe(true);
	});
});
