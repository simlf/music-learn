import type { Locator, Page } from '@playwright/test';

/**
 * Shared fixtures for the Playwright visual-verification suite.
 *
 * Everything here is TEST-ONLY and lives entirely outside `src/`. No
 * production code was added or modified to make the app testable: the seams
 * used are (a) the app's own localStorage keys, (b) the app's own IndexedDB
 * schema, and (c) `page.addInitScript`, which is a browser-level hook, not an
 * app hook. There is no `window.__TEST__` flag and nothing to strip from a
 * production bundle.
 */

/* ------------------------------------------------------------------ *
 * Viewports
 * ------------------------------------------------------------------ */

/** iPhone-class portrait. The width the phone-first UX backlog items are about. */
export const PHONE = { width: 375, height: 812 };

/**
 * The narrowest phone class still in real use (iPhone SE 1st gen, small
 * Androids). Kept as its own viewport because it is where the one-octave
 * keyboard actually ran out of room: at 375px the keyboard's container is 359
 * layout px (8 keys at 44.875px, above the floor), but at 320px it is 304px,
 * which is 38px per key. That is the width the `octavesForWidth` one-octave
 * blind spot showed up at, not 375px.
 */
export const PHONE_NARROW = { width: 320, height: 568 };

/**
 * Phone held sideways. Matters because PianoKeyboard renders TWO octaves once
 * the available width clears `15 * 44px` (keyboardLayout.octavesForWidth), so
 * this is the viewport where the "two-octave tap targets on a phone" question
 * is actually answerable.
 */
export const PHONE_LANDSCAPE = { width: 812, height: 375 };

/** Laptop width. Above the `sm:` (640px) breakpoint, so the masthead shows and the tab bar hides. */
export const DESKTOP = { width: 1280, height: 800 };

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

/** The four hubs, as the nav lists them (src/routes/+layout.svelte navLinks). */
export const HUBS = [
	{ path: '/', name: 'lookup', heading: 'Chord lookup' },
	{ path: '/practice', name: 'practice', heading: 'Practice' },
	{ path: '/learn', name: 'learn', heading: 'Learn' },
	{ path: '/progress', name: 'progress', heading: 'Progress' }
] as const;

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

/**
 * Replaces `Math.random` with a CONSTANT function before any app script runs.
 *
 * Why a constant rather than a seeded sequence: every shuffle in the practice
 * pipeline is a Fisher-Yates driven by an injected `rng` (see
 * practiceQueue.shuffleWithRng and srs/rotation.interleaveQueue). With a
 * seeded *sequence*, the result depends on how many times each call site draws
 * -- so an unrelated edit that adds one `Math.random()` anywhere upstream
 * silently reshuffles everything. With a CONSTANT, `j = floor(c * (i + 1))` is
 * a pure function of the array length alone, so the permutation is stable
 * against call-order changes. Two useful anchors:
 *   - `RNG_IDENTITY` (0.99): `j === i`, so every shuffle is the identity.
 *   - `RNG_ZERO` (0): `j === 0`, a fixed rotation.
 * These two are enough to steer which family wins composePracticeQueue's
 * tie-break (it prefers the family with the most items remaining, breaking
 * ties by position in the shuffled family order).
 */
export async function pinRandom(page: Page, value: number): Promise<void> {
	await page.addInitScript((v) => {
		Math.random = () => v;
	}, value);
}

/** Every shuffle becomes the identity permutation. */
export const RNG_IDENTITY = 0.99;

/** Every shuffle becomes a fixed rotation of the input. */
export const RNG_ZERO = 0;

/**
 * A middle constant. Needed because both RNG_IDENTITY and RNG_ZERO happen to
 * leave `progression` ahead of `inversion` in a 3-family order, so neither can
 * surface an inversion first. At c = 0.4 the two Fisher-Yates draws over a
 * 3-element array are `floor(3c) = 1` then `floor(2c) = 0`, which rotates
 * `inversion` to the front.
 */
export const RNG_MID = 0.4;

/* ------------------------------------------------------------------ *
 * localStorage seeding (the app's own keys)
 * ------------------------------------------------------------------ */

/*
 * Both seeders below compute their YYYY-MM-DD day strings INSIDE the page,
 * never in Node. The app derives its calendar day from the BROWSER's local
 * time (practiceDays / introBudget both use getFullYear/getMonth/getDate),
 * and playwright.config.ts pins the browser context to UTC while the Node
 * process runs in the machine's own zone. Computing the date in Node would
 * therefore disagree with the app by one day for part of every day, silently
 * breaking the seed.
 */

/**
 * Seeds `music-learn:practice-days` (practiceDays.PRACTICE_DAYS_KEY) with a
 * run of consecutive days ending today, so the masthead streak chip renders.
 * The chip self-hides at zero, which is why it has to be seeded before it can
 * be measured at all.
 */
export async function seedStreak(page: Page, days: number): Promise<void> {
	await page.addInitScript((count: number) => {
		const pad = (n: number) => String(n).padStart(2, '0');
		const values: string[] = [];
		for (let i = 0; i < count; i += 1) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			values.push(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
		}
		window.localStorage.setItem('music-learn:practice-days', JSON.stringify(values));
	}, days);
}

/**
 * Exhausts today's new-card intro budget (`music-learn:intro-budget`,
 * introBudget.MAX_NEW_CARDS_PER_DAY = 10) so `/practice` never calls
 * `introduceNewCards`. Without this the page tops the deck up with fresh
 * cards on mount, which would change the family mix out from under a seeded
 * deck and make queue composition non-deterministic.
 */
export async function exhaustIntroBudget(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const pad = (n: number) => String(n).padStart(2, '0');
		const now = new Date();
		const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		window.localStorage.setItem('music-learn:intro-budget', JSON.stringify({ date, count: 10 }));
	});
}

/* ------------------------------------------------------------------ *
 * IndexedDB deck seeding (the app's own schema)
 * ------------------------------------------------------------------ */

/** Dexie 4 maps `version(1)` onto IndexedDB version 10. Verified against a live DB. */
const DECK_DB = 'music-learn-recall';
const DECK_DB_VERSION = 10;
const CARDS_STORE = 'cards';

/** ts-fsrs `State.Review` -- a "mature" card. */
export const STATE_REVIEW = 2;

/** The FSRS modes a chord-formula card can carry (srs/deck.Mode). */
export type SeedMode = 'formula' | 'formula-build' | 'see-play' | 'hear-name';

export interface SeedCard {
	factId: string;
	mode: SeedMode;
}

/**
 * Writes a deck of MATURE, already-due cards straight into the app's own
 * IndexedDB store, replacing whatever was there.
 *
 * Mature (`state: STATE_REVIEW`) matters for more than realism: a deck of all
 * -New cards makes `practiceQueue.isLowMasterySession` true, which tells
 * `composePracticeQueue` to keep a scaffold-heavy family (progression,
 * inversion) out of the FIRST queue slot. A progression can therefore never
 * lead a cold session -- which is exactly why the progression UAT was
 * unreachable by hand. Seeding mature cards is what makes it reachable.
 *
 * Must be called while the page is already on the app's origin (IndexedDB is
 * origin-scoped), and the caller must reload afterwards so the app reads the
 * seeded rows. `openPracticeFamily` below does both.
 */
export async function seedDeck(page: Page, cards: SeedCard[]): Promise<void> {
	await page.evaluate(
		async ({ dbName, version, store, rows }) => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open(dbName, version);
				request.onupgradeneeded = () => {
					const database = request.result;
					if (!database.objectStoreNames.contains(store)) {
						const objectStore = database.createObjectStore(store, {
							keyPath: ['factId', 'mode']
						});
						objectStore.createIndex('factId', 'factId');
						objectStore.createIndex('mode', 'mode');
						objectStore.createIndex('due', 'due');
					}
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});

			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(store, 'readwrite');
				const objectStore = tx.objectStore(store);
				objectStore.clear();
				for (const row of rows) objectStore.put(row);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
			db.close();
		},
		{
			dbName: DECK_DB,
			version: DECK_DB_VERSION,
			store: CARDS_STORE,
			rows: cards.map((card) => ({
				factId: card.factId,
				factKind: card.factId.startsWith('interval-size:')
					? 'interval-size'
					: 'chord-formula',
				mode: card.mode,
				// Due an hour ago, so it is due regardless of clock skew.
				due: new Date(Date.now() - 3_600_000),
				last_review: new Date(Date.now() - 90_000_000),
				stability: 12,
				difficulty: 5,
				elapsed_days: 1,
				scheduled_days: 1,
				learning_steps: 0,
				reps: 4,
				lapses: 0,
				state: STATE_REVIEW,
				lastRating: 3,
				masteryDayCount: 3
			}))
		}
	);
}

/* ------------------------------------------------------------------ *
 * Deterministic drill entry
 * ------------------------------------------------------------------ */

/** The six practice families (practiceQueue.PracticeFamily) and the testid each renders. */
export const FAMILY_TESTID = {
	'name-it': 'practice-chord-drill',
	'build-it': 'build-session',
	interval: 'practice-interval-drill',
	voicing: 'shell-voicing-drill',
	progression: 'progression-drill',
	inversion: 'inversion-drill'
} as const;

export type Family = keyof typeof FAMILY_TESTID;

/** Triads (3 notes) -- never produce a voicing item, since voicing is seventh-chords only. */
const TRIADS: SeedCard[] = ['C', 'D', 'E', 'F', 'G', 'A'].map((root) => ({
	factId: `chord-formula:${root}`,
	mode: 'formula' as SeedMode
}));

/** Seventh chords -- one voicing item each (shellVoicing.seventhChordSymbols). */
const SEVENTHS: SeedCard[] = ['Cmaj7', 'Dm7', 'E7', 'Fmaj7', 'G7', 'Am7'].map((symbol) => ({
	factId: `chord-formula:${symbol}`,
	mode: 'formula' as SeedMode
}));

/**
 * Per-family recipe: the deck shape plus the `Math.random` constant that makes
 * that family win the first queue slot.
 *
 * HOW EACH ONE IS FORCED (composePracticeQueue picks the family with the MOST
 * items remaining, breaking ties by position in the rng-shuffled family
 * order; synthetic counts are fixed by the page at 2 progressions and 2
 * inversions):
 *   - name-it   6 triads  -> name-it 6 vs prog 2 / inv 2. Strict max, any rng.
 *   - build-it  6 triads in 'formula-build' -> build-it 6. Strict max, any rng.
 *   - interval  6 interval facts -> no chord card is due, so NO synthetics are
 *               generated at all; a single-family queue is returned verbatim.
 *               Strict, any rng.
 *   - voicing   6 sevenths -> name-it 6 and voicing 6 tie; RNG_ZERO rotates
 *               the family order so voicing precedes name-it.
 *   - progression 1 triad -> name-it 1, prog 2, inv 2; prog/inv tie and
 *               RNG_IDENTITY leaves prog ahead of inv in insertion order.
 *   - inversion 1 triad -> same tie, RNG_MID rotates inv ahead of prog.
 *               (RNG_ZERO does NOT work here: over three families it lands
 *               prog first too, same as identity.)
 *
 * The three tie-broken families depend on the tie-break, so if the queue
 * composer's ordering rules change, those three tests fail loudly with a
 * "expected X, got Y" message and the constant needs re-picking. That is a
 * deliberate trade: a loud, one-line fix beats having no automated way into a
 * progression at all.
 */
const RECIPES: Record<Family, { cards: SeedCard[]; rng: number }> = {
	'name-it': { cards: TRIADS, rng: RNG_IDENTITY },
	'build-it': {
		cards: TRIADS.map((card) => ({ ...card, mode: 'formula-build' as SeedMode })),
		rng: RNG_IDENTITY
	},
	interval: {
		cards: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5'].map((short) => ({
			factId: `interval-size:${short}`,
			mode: 'formula' as SeedMode
		})),
		rng: RNG_IDENTITY
	},
	voicing: { cards: SEVENTHS, rng: RNG_ZERO },
	progression: { cards: [TRIADS[0]], rng: RNG_IDENTITY },
	inversion: { cards: [TRIADS[0]], rng: RNG_MID }
};

/**
 * Opens `/practice` with a deck and rng pinned so that `family` is the FIRST
 * question of the session, then presses "Start practice".
 *
 * Returns once the session is running. The caller asserts on
 * `FAMILY_TESTID[family]`.
 */
export async function openPracticeFamily(page: Page, family: Family): Promise<void> {
	const recipe = RECIPES[family];
	await pinRandom(page, recipe.rng);
	await exhaustIntroBudget(page);

	// Land on the origin first (Lookup never writes to the deck), seed, reload.
	await page.goto('/');
	await seedDeck(page, recipe.cards);

	await page.goto('/practice');
	await page.getByTestId('practice-pre-start').waitFor();
	await page.getByRole('button', { name: 'Start practice' }).click();
}

/* ------------------------------------------------------------------ *
 * Contrast measurement
 * ------------------------------------------------------------------ */

export interface ContrastSample {
	ratio: number;
	foreground: string;
	background: string;
	fontSizePx: number;
	fontWeight: number;
	/** WCAG 2.1 threshold that applies to this text's size and weight: 3.0 for large text, else 4.5. */
	threshold: number;
}

/**
 * Measures the real, rendered contrast ratio of an element's text against its
 * effective background.
 *
 * "Effective background" means: walk up the ancestor chain until a
 * non-transparent background-color is found. This is necessary here because
 * the chip and badge elements mostly have `background: transparent` and
 * inherit the paper colour from the masthead or the tab bar.
 *
 * The threshold is derived from the element's own computed font size and
 * weight per WCAG 2.1 SC 1.4.3: "large text" is >= 24px, or >= 18.66px when
 * bold (>= 700), and takes 3.0:1; everything else takes 4.5:1.
 */
export async function measureContrast(target: Locator): Promise<ContrastSample> {
	return target.evaluate((element) => {
		const parseColor = (value: string): [number, number, number, number] => {
			const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
			return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 1];
		};

		const channel = (raw: number): number => {
			const c = raw / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		};

		const luminance = ([r, g, b]: number[]): number =>
			0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

		const style = window.getComputedStyle(element);
		const foreground = style.color;

		let node: Element | null = element;
		let background = 'rgb(255, 255, 255)';
		while (node) {
			const nodeBackground = window.getComputedStyle(node).backgroundColor;
			if (parseColor(nodeBackground)[3] > 0) {
				background = nodeBackground;
				break;
			}
			node = node.parentElement;
		}

		const foregroundLuminance = luminance(parseColor(foreground));
		const backgroundLuminance = luminance(parseColor(background));
		const lighter = Math.max(foregroundLuminance, backgroundLuminance);
		const darker = Math.min(foregroundLuminance, backgroundLuminance);

		const fontSizePx = parseFloat(style.fontSize);
		const fontWeight = Number(style.fontWeight) || 400;
		const isLarge = fontSizePx >= 24 || (fontWeight >= 700 && fontSizePx >= 18.66);

		return {
			ratio: (lighter + 0.05) / (darker + 0.05),
			foreground,
			background,
			fontSizePx,
			fontWeight,
			threshold: isLarge ? 3.0 : 4.5
		};
	});
}

/* ------------------------------------------------------------------ *
 * Screenshots
 * ------------------------------------------------------------------ */

/**
 * Where captured screenshots land. Gitignored: these are artifacts to eyeball,
 * NOT committed pixel baselines (see the rationale in playwright.config.ts).
 */
export const SCREENSHOT_DIR = 'screenshots';
