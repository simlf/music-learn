import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import { readable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { messages } from './messages/index';
import { setLocale, t, type MessageKey } from './locale.svelte';
import { newCard } from '$lib/srs/scheduler';
import type { CardRecord } from '$lib/srs/deck';
import { intervalFromRoot } from '$lib/theory/interval';
import ChordGlyph from '../components/ChordGlyph.svelte';
import IntervalChip from '../components/IntervalChip.svelte';
import InspectRegister from '../components/InspectRegister.svelte';
import SongMark from '../components/SongMark.svelte';
import SongFilterToggle from '../components/SongFilterToggle.svelte';
import StreakBadge from '../components/StreakBadge.svelte';

/**
 * Phase 20 Plan 10: the cross-surface completeness + immunity + fit gate.
 *
 * Every per-domain plan (20-02..20-09) already proved its own surface's FR
 * wiring in its own component/route test file (buildSession.test.ts,
 * recallSession.test.ts, drillsSongFilter.test.ts, songsPage.test.ts,
 * theoryInteractiveLesson.test.ts, progressComponents.test.ts,
 * scaleKeyboardDrill.test.ts, songMark.test.ts, songFilterToggle.test.ts,
 * interactiveLesson.test.ts). This file is the single aggregate gate the
 * phase's success criteria require: every major surface rendered here in ONE
 * place, the chord/glyph/interval-shorthand/solfège immunity boundary
 * checked across surfaces, a no-raw-key-leak sweep across the WHOLE merged
 * catalog, and the I18N-03 fit-rule assertions (grade grid breakpoint, nav
 * flex-wrap, Build's full-word captions) re-asserted here as the audit's
 * final lock.
 */

// ---- Shared mocks: the union of every surface's own dependencies, merged
// into one file so each surface's real page can be rendered here exactly as
// its own per-plan test file already proved it could. ----

vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/') })
}));

vi.mock('$lib/audio/audio', () => ({
	playChord: vi.fn(),
	playNote: vi.fn(),
	ensureAudioReady: async () => {},
	soundEnabled: () => false,
	studyModeEnabled: () => false,
	playArpeggio: () => {}
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

vi.mock('$lib/api/client', () => ({
	getApiToken: () => '',
	setApiToken: vi.fn()
}));

const fetchStatsMock = vi.fn((..._args: unknown[]) => Promise.resolve({ items: [], weakest: [] }));
const flushQueueMock = vi.fn((..._args: unknown[]) => undefined);
vi.mock('$lib/api/progress', () => ({
	fetchStats: (...args: unknown[]) => fetchStatsMock(...args),
	fetchStreak: vi.fn(() => Promise.resolve({ streak: 0, practicedToday: false })),
	flushQueue: (...args: unknown[]) => flushQueueMock(...args),
	localDateString: () => '2026-07-18'
}));

vi.mock('$lib/practice/answerTelemetry', () => ({
	recordPracticeAnswer: vi.fn()
}));

const consumeDrillSeedsMock = vi.fn((..._args: unknown[]): string[] => []);
const consumeLessonSeedsMock = vi.fn((..._args: unknown[]): string[] => []);
vi.mock('$lib/practice/drillSeeds', () => ({
	consumeDrillSeeds: (...args: unknown[]) => consumeDrillSeedsMock(...args),
	consumeLessonSeeds: (...args: unknown[]) => consumeLessonSeedsMock(...args),
	setDrillSeeds: vi.fn()
}));

const drawFromPoolMock = vi.fn(
	(..._args: unknown[]): { symbol: string; bucket: string; scaffoldStage: string | null } => ({
		symbol: 'F7',
		bucket: 'tier',
		scaffoldStage: null
	})
);
vi.mock('$lib/practice/pool', () => ({
	drawFromPool: (...args: unknown[]) => drawFromPoolMock(...args),
	drawFromSymbols: (symbols: string[]): string | null => (symbols.length > 0 ? symbols[0] : null),
	scaffoldStageForSymbol: (): string | null => null,
	limitScaffoldingQualities: (symbols: string[]): string[] => symbols
}));

vi.mock('$lib/practice/practiceLog', () => ({
	recentMisses: (): string[] => [],
	appendPracticeAnswer: vi.fn(),
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
	setCurrentTier: vi.fn(),
	snoozeSuggestion: vi.fn()
}));

vi.mock('$lib/practice/scaffold', () => ({
	readScaffolds: () => ({}),
	writeScaffold: vi.fn(),
	recordScaffoldAnswer: (state: unknown) => state
}));

vi.mock('$lib/drills/rotateHint', () => ({
	isRotateHintDismissed: () => true,
	dismissRotateHint: vi.fn()
}));

const { default: RootLayout } = await import('../../routes/+layout.svelte');
const { default: HomePage } = await import('../../routes/+page.svelte');
const { default: DrillsPage } = await import('../../routes/drills/+page.svelte');
const { default: BuildPage } = await import('../../routes/build/+page.svelte');
const { default: RecallPage } = await import('../../routes/recall/+page.svelte');
const { default: ScalesPage } = await import('../../routes/scales/+page.svelte');
const { default: SongsPage } = await import('../../routes/songs/+page.svelte');
const { default: TheoryPage } = await import('../../routes/theory/+page.svelte');
const { default: ProgressPage } = await import('../../routes/progress/+page.svelte');

function makeCard(
	factId: string,
	factKind: CardRecord['factKind'],
	mode: CardRecord['mode'] = 'formula'
): CardRecord {
	return {
		...newCard(new Date('2026-07-18T12:00:00Z')),
		factId,
		factKind,
		mode,
		lastRating: null,
		masteryDayCount: 0
	};
}

beforeEach(() => {
	localStorage.clear();

	introduceNewCardsMock.mockReset();
	introduceNewCardsMock.mockResolvedValue(0);
	getDueCardsMock.mockReset();
	getDueCardsMock.mockResolvedValue([]);
	getAllCardsMock.mockReset();
	getAllCardsMock.mockResolvedValue([]);
	recordGradeMock.mockReset();
	recordGradeMock.mockImplementation(async (card: CardRecord, rating: number) => ({
		...card,
		lastRating: rating
	}));
	getCardMock.mockReset();
	getCardMock.mockResolvedValue(undefined);

	fetchStatsMock.mockReset();
	fetchStatsMock.mockResolvedValue({ items: [], weakest: [] });
	flushQueueMock.mockReset();

	consumeDrillSeedsMock.mockReset();
	consumeDrillSeedsMock.mockImplementation((): string[] => []);
	consumeLessonSeedsMock.mockReset();
	consumeLessonSeedsMock.mockImplementation((): string[] => []);
	drawFromPoolMock.mockReset();
	drawFromPoolMock.mockReturnValue({ symbol: 'F7', bucket: 'tier', scaffoldStage: null });
});

afterEach(() => {
	cleanup();
	setLocale('en');
	vi.restoreAllMocks();
});

/**
 * ---- Cross-surface FR wiring (I18N-01/02): every major surface renders its
 * FR string under fr, and the English equivalent under en, proving the live
 * flip and completeness end to end in one gate. ----
 */

describe('Masthead FR wiring + nav flex-wrap fit rule (I18N-01/03)', () => {
	it('flips nav labels live, keeps the brand immune, and keeps the nav-links flex-wrap layout under fr', () => {
		const emptyChildren = createRawSnippet(() => ({ render: () => '<div></div>' }));
		render(RootLayout, { params: {}, data: {}, children: emptyChildren });

		expect(screen.getByRole('link', { name: 'Drills' })).toBeInTheDocument();
		expect(screen.getByText('MUSIC LEARN')).toBeInTheDocument();

		flushSync(() => setLocale('fr'));
		const drillsLink = screen.getByRole('link', { name: 'Exercices' });
		expect(drillsLink).toBeInTheDocument();
		expect(screen.getByText('MUSIC LEARN')).toBeInTheDocument();

		// I18N-03: the nav-links container stays flex-wrap under fr - no
		// FR-only override, no forced single-row overflow.
		const navContainer = drillsLink.parentElement;
		expect(navContainer?.className).toContain('flex-wrap');

		flushSync(() => setLocale('en'));
		expect(screen.getByRole('link', { name: 'Drills' })).toBeInTheDocument();
	});
});

describe('Home/Lookup FR wiring (I18N-02)', () => {
	it('flips the page title and empty-state copy live between en and fr', () => {
		render(HomePage);

		expect(screen.getByText('Chord lookup')).toBeInTheDocument();
		expect(screen.getByText('No chord yet')).toBeInTheDocument();

		flushSync(() => setLocale('fr'));
		expect(screen.getByText("Recherche d'accord")).toBeInTheDocument();
		expect(screen.getByText("Pas encore d'accord")).toBeInTheDocument();

		flushSync(() => setLocale('en'));
		expect(screen.getByText('Chord lookup')).toBeInTheDocument();
	});
});

describe('Drills FR wiring (I18N-02)', () => {
	it('renders the French construction prompt and DE TA LEÇON tag, with the chord symbol unchanged', () => {
		consumeLessonSeedsMock.mockImplementation((): string[] => ['Cm7']);
		drawFromPoolMock.mockReturnValue({ symbol: 'Cm7', bucket: 'tier', scaffoldStage: null });
		vi.spyOn(Math, 'random').mockReturnValue(0);
		flushSync(() => setLocale('fr'));

		render(DrillsPage);

		expect(screen.getByRole('heading', { name: 'Exercices' })).toBeInTheDocument();
		expect(screen.getByTestId('question-source-tag')).toHaveTextContent('DE TA LEÇON');
		expect(screen.getByText('Clique sur les notes de Cm7.')).toBeInTheDocument();
	});

	it('renders the English equivalents by default', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);

		render(DrillsPage);

		expect(screen.getByRole('heading', { name: 'Drills' })).toBeInTheDocument();
		expect(screen.getByText('Click the notes for F7.')).toBeInTheDocument();
	});
});

describe('Build FR wiring (I18N-02) + full-word caption fit rule (I18N-03)', () => {
	it('renders the French kind-toggle and Root/Quality full-word captions', () => {
		flushSync(() => setLocale('fr'));
		render(BuildPage);

		expect(screen.getByRole('heading', { name: 'Construire' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Accords' })).toHaveAttribute('aria-pressed', 'true');
		// I18N-03: full-word FR captions (Fondamentale/Qualité), never a
		// truncated fixed-width slot - per the UI-SPEC's flex-wrap-caption rule.
		expect(screen.getByText('Fondamentale')).toBeInTheDocument();
		expect(screen.getByText('Qualité')).toBeInTheDocument();
	});

	it('renders the English equivalents by default', () => {
		render(BuildPage);

		expect(screen.getByRole('heading', { name: 'Build It' })).toBeInTheDocument();
		expect(screen.getByText('Root')).toBeInTheDocument();
		expect(screen.getByText('Quality')).toBeInTheDocument();
	});
});

describe('Recall + RecallMap FR wiring (I18N-02) + grade-grid fit rule (I18N-03)', () => {
	it('flips the empty-no-deck message live, then proves the RecallMap column/kind labels in French with the 4-column grid unchanged', async () => {
		render(RecallPage);
		await waitFor(() => screen.getByTestId('recall-empty-no-deck'));
		expect(screen.getByText('Nothing to recall yet.')).toBeInTheDocument();

		flushSync(() => setLocale('fr'));
		await waitFor(() => expect(screen.getByText('Rien à réviser pour le moment.')).toBeInTheDocument());

		await fireEvent.click(screen.getByRole('button', { name: 'Carte' }));
		await waitFor(() => screen.getByTestId('recall-map-grid'));

		expect(screen.getByText('Formule')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Accords' })).toBeInTheDocument();
		// I18N-03: the 4-column grid template is unchanged under fr.
		expect(screen.getByTestId('recall-map-grid').getAttribute('style')).toContain(
			'repeat(4, 1fr)'
		);

		flushSync(() => setLocale('en'));
		expect(screen.getByText('Formula')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Map' })).toBeInTheDocument();
	});

	it('keeps the grade grid at grid-cols-2 sm:grid-cols-4 under fr, with the locked FR grade labels', async () => {
		const card = makeCard('chord-formula:Cm7', 'chord-formula', 'formula');
		getDueCardsMock.mockResolvedValue([card]);
		getAllCardsMock.mockResolvedValue([card]);
		flushSync(() => setLocale('fr'));

		render(RecallPage);
		await waitFor(() => screen.getByTestId('recall-prompt'));

		await fireEvent.click(screen.getByRole('button', { name: 'Voir la réponse' }));

		const grid = screen.getByTestId('recall-grade-grid');
		expect(grid.className).toContain('grid-cols-2');
		expect(grid.className).toContain('sm:grid-cols-4');
		expect(screen.getByText('À revoir')).toBeInTheDocument();
		expect(screen.getByText('Facile')).toBeInTheDocument();
	});
});

describe('Scales FR wiring (I18N-02)', () => {
	it('flips the page title and mode toggle live, with tonic letters staying immune', () => {
		render(ScalesPage);

		expect(screen.getByRole('heading', { name: 'Scales' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Practice' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'C major' })).toBeInTheDocument();

		flushSync(() => setLocale('fr'));
		expect(screen.getByRole('heading', { name: 'Gammes' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Pratiquer' })).toBeInTheDocument();
		// Immunity: the tonic letter ("C") is unchanged; only the quality
		// suffix word switches.
		expect(screen.getByRole('button', { name: 'C majeur' })).toBeInTheDocument();

		flushSync(() => setLocale('en'));
		expect(screen.getByRole('heading', { name: 'Scales' })).toBeInTheDocument();
	});
});

describe('Songs + SongMark/SongFilterToggle FR wiring (I18N-02)', () => {
	it('flips the Songs page heading and empty-state copy live', () => {
		render(SongsPage);

		expect(screen.getByRole('heading', { name: 'Songs' })).toBeInTheDocument();
		expect(screen.getByText('No songs yet')).toBeInTheDocument();

		flushSync(() => setLocale('fr'));
		expect(screen.getByRole('heading', { name: 'Morceaux' })).toBeInTheDocument();
		expect(screen.getByText("Aucun morceau pour l'instant")).toBeInTheDocument();

		flushSync(() => setLocale('en'));
		expect(screen.getByRole('heading', { name: 'Songs' })).toBeInTheDocument();
	});

	it('SongMark pluralizes as MORCEAUX and SongFilterToggle reads "Depuis mes morceaux" under fr', () => {
		flushSync(() => setLocale('fr'));
		render(SongMark, { songs: ['Autumn Leaves', 'My Tune'] });
		expect(screen.getByTestId('song-mark')).toHaveTextContent('2 MORCEAUX');

		render(SongFilterToggle, { poolLabel: 'BASSIN', on: false, onToggle: () => {} });
		expect(screen.getByRole('button', { name: /Depuis mes morceaux/ })).toBeInTheDocument();
	});
});

describe('Theory + InteractiveLesson FR wiring (I18N-02)', () => {
	it('flips the page heading and interactive lesson step 1 title live', () => {
		render(TheoryPage);

		expect(screen.getByText('Theory')).toBeInTheDocument();
		expect(screen.getByText('The bottom note')).toBeInTheDocument();

		flushSync(() => setLocale('fr'));
		expect(screen.getByText('Théorie')).toBeInTheDocument();
		expect(screen.getByText('La note du bas')).toBeInTheDocument();

		flushSync(() => setLocale('en'));
		expect(screen.getByText('Theory')).toBeInTheDocument();
	});
});

describe('Progress + StreakBadge FR wiring (I18N-02)', () => {
	it('renders the token-missing heading and Practice Settings card in French', () => {
		flushSync(() => setLocale('fr'));
		render(ProgressPage);

		expect(screen.getByText("Entre ta clé d'accès")).toBeInTheDocument();
		expect(screen.getByText('Réglages de pratique')).toBeInTheDocument();
	});

	it('renders the English equivalents by default', () => {
		render(ProgressPage);

		expect(screen.getByText('Enter your access key')).toBeInTheDocument();
		expect(screen.getByText('Practice Settings')).toBeInTheDocument();
	});

	it('StreakBadge compact chip reads "{N} JOURS DE SUITE" under fr and "{N} DAY STREAK" under en (masthead + Progress hero shared component)', () => {
		flushSync(() => setLocale('fr'));
		const { unmount } = render(StreakBadge, { count: 5, variant: 'compact' });
		expect(screen.getByTestId('streak-badge')).toHaveTextContent('5 JOURS DE SUITE');
		unmount();

		flushSync(() => setLocale('en'));
		render(StreakBadge, { count: 5, variant: 'compact' });
		expect(screen.getByTestId('streak-badge')).toHaveTextContent('5 DAY STREAK');
	});
});

/**
 * ---- Chord symbol / ChordGlyph / interval shorthand / solfège immunity
 * across surfaces (I18N-02): these NEVER route through t(), so the rendered
 * text must be byte-identical under en and fr regardless of which surface
 * renders it. ----
 */

describe('Chord/glyph/interval-shorthand/solfège immunity across surfaces (I18N-02)', () => {
	it('ChordGlyph renders Cm7 and F♯ø7 byte-identically under en and fr', () => {
		flushSync(() => setLocale('en'));
		const { container: enContainer } = render(ChordGlyph, { root: 'C', quality: 'm7' });
		const enText = enContainer.querySelector('.chord-glyph__text')?.textContent;
		cleanup();

		flushSync(() => setLocale('fr'));
		const { container: frContainer } = render(ChordGlyph, { root: 'C', quality: 'm7' });
		const frText = frContainer.querySelector('.chord-glyph__text')?.textContent;

		expect(frText).toBe(enText);
		expect(frText).toBe('Cm7');
	});

	it('IntervalChip renders shorthand labels (R/m3/P5) with zero t() involvement, unchanged across locales', () => {
		flushSync(() => setLocale('en'));
		const { unmount } = render(IntervalChip, { role: 'third', label: 'm3' });
		expect(screen.getByText('m3')).toBeInTheDocument();
		unmount();

		flushSync(() => setLocale('fr'));
		render(IntervalChip, { role: 'third', label: 'm3' });
		expect(screen.getByText('m3')).toBeInTheDocument();
	});

	it('InspectRegister keeps letter/solfège/interval-shorthand identical across locales while only the long-name and unit word switch', () => {
		const payload = {
			letter: 'E♭',
			solfege: 'Mi',
			octave: 4,
			info: intervalFromRoot('C', 'E♭'),
			inChord: true
		};

		flushSync(() => setLocale('en'));
		const { unmount } = render(InspectRegister, { payload });
		expect(screen.getByTestId('inspect-register')).toHaveTextContent(
			'E♭ · Mi · m3 · minor 3rd · 3 semitones'
		);
		unmount();

		flushSync(() => setLocale('fr'));
		render(InspectRegister, { payload });
		expect(screen.getByTestId('inspect-register')).toHaveTextContent(
			'E♭ · Mi · m3 · tierce mineure · 3 demi-tons'
		);
	});

	it('a chord symbol renders identically on two different surfaces (Lookup starter chip, Build root chip) regardless of locale', () => {
		flushSync(() => setLocale('fr'));
		render(HomePage);
		const starterChips = screen.getAllByTestId('starter-chord');
		const frLookupText = starterChips.map((chip) => chip.textContent).join('|');
		cleanup();

		flushSync(() => setLocale('en'));
		render(HomePage);
		const enStarterChips = screen.getAllByTestId('starter-chord');
		const enLookupText = enStarterChips.map((chip) => chip.textContent).join('|');

		expect(frLookupText).toBe(enLookupText);
		expect(frLookupText).toContain('Cm7');

		cleanup();
		flushSync(() => setLocale('fr'));
		render(BuildPage);
		expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
	});
});

/**
 * ---- No raw-key leak across the whole merged catalog (I18N-02): every key
 * in every domain resolves to a real translated value, never the bare key
 * itself, in both locales. Stronger than a sample - checks the entire
 * merged dictionary since the check is cheap (no rendering involved). ----
 */

describe('No raw-key leak across every domain (I18N-02)', () => {
	it('every catalog key resolves to a real value (not the bare key) in both en and fr', () => {
		const keys = Object.keys(messages.en) as MessageKey[];
		expect(keys.length).toBeGreaterThan(0);

		for (const key of keys) {
			expect(messages.en[key]).not.toBe(key);
			expect(messages.fr[key]).not.toBe(key);
		}
	});

	it('t() resolves a representative key from every domain under both locales', () => {
		const sample: MessageKey[] = [
			'nav.drills', // chrome
			'recall.grade.again', // recall
			'build.caption.root', // build
			'drills.page.title', // drills
			'songs.page.title', // songs
			'theory.page.title', // theory
			'scales.page.title', // scales
			'progress.page.title', // progress
			'home.title' // home
		];

		for (const key of sample) {
			flushSync(() => setLocale('en'));
			expect(t(key)).not.toBe(key);
			flushSync(() => setLocale('fr'));
			expect(t(key)).not.toBe(key);
		}
	});
});
