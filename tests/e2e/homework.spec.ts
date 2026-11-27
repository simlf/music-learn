import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, PHONE, SCREENSHOT_DIR } from './helpers';

/**
 * Homework (/homework) in real Chromium against the production build:
 * page + exercise entry, the metronome, and tap scoring.
 *
 * TIMING IS DETERMINISTIC: the rhythm tests install Playwright's fake clock
 * before the app loads, so `performance.now()` and `setTimeout` (the two
 * things the metronome grid and the tap timestamps run on) only move when the
 * test calls `clock.runFor`. A "perfect" run is therefore exactly perfect, and
 * a late one is exactly late, with no flakiness from a loaded machine.
 */

const PREFS_KEY = 'music-learn:homework-prefs';

async function presetPrefs(page: Page, bpm: number, countInBars: number): Promise<void> {
	await page.addInitScript(
		([key, value]) => {
			// Only seed once, so a reload test can see what the app itself saved.
			if (!localStorage.getItem(key)) localStorage.setItem(key, value);
		},
		[PREFS_KEY, JSON.stringify({ bpm, countInBars })]
	);
}

async function openExercise(page: Page, kind: 'reading' | 'rhythm', pageNo: string, ex: string) {
	await page.getByTestId(`kind-${kind}`).click();
	await page.getByTestId('homework-page').fill(pageNo);
	await page.getByTestId('homework-exercise').fill(ex);
	await page.getByTestId('homework-exercise').press('Enter');
}

const tap = (page: Page) => page.getByTestId('rhythm-tap').dispatchEvent('pointerdown');

test.describe('page and exercise entry', () => {
	test.use({ viewport: DESKTOP });

	test('typing a page and an exercise number opens that exercise', async ({ page }) => {
		await page.goto('/homework');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Homework');

		await openExercise(page, 'reading', '5', '2');
		await expect(page.getByTestId('homework-exercise-title')).toHaveText('Page 5, exercise 2');
		await expect(page.getByTestId('reading-drill')).toBeVisible();
		// Exercise 2 is two lines of 14 quarter notes.
		await expect(page.getByTestId('reading-line-0')).toBeVisible();
		await expect(page.getByTestId('reading-line-1')).toBeVisible();
		await expect(page.getByTestId('reading-progress')).toContainText('Note 1 of 28');

		await openExercise(page, 'rhythm', '4', '21');
		await expect(page.getByTestId('homework-exercise-title')).toHaveText('Page 4, exercise 21');
		await expect(page.getByTestId('rhythm-drill')).toBeVisible();
		await expect(page.getByTestId('reading-drill')).toHaveCount(0);
	});

	test('a page or exercise that is not in the app says what is', async ({ page }) => {
		await page.goto('/homework');
		await openExercise(page, 'reading', '99', '1');
		await expect(page.getByTestId('homework-error')).toContainText('Pages available: 5, 6, 18');
		await openExercise(page, 'reading', '5', '9');
		await expect(page.getByTestId('homework-error')).toContainText('available on that page: 1, 2');
		await openExercise(page, 'reading', 'x', '');
		await expect(page.getByTestId('homework-error')).toContainText('whole numbers');
		await expect(page.getByTestId('homework-exercise-view')).toHaveCount(0);
	});

	test('the shortcuts open an exercise and the URL carries it, so a reload returns to it', async ({ page }) => {
		await page.goto('/homework');
		await page.getByTestId('kind-rhythm').click();
		await page.getByTestId('pick-3-17').click();
		await expect(page.getByTestId('homework-exercise-title')).toHaveText('Page 3, exercise 17');
		await expect(page).toHaveURL(/book=rhythm&page=3&ex=17/);

		await page.reload();
		await expect(page.getByTestId('homework-exercise-title')).toHaveText('Page 3, exercise 17');
		await expect(page.getByTestId('rhythm-drill')).toBeVisible();
	});

	test('Practice links to it', async ({ page }) => {
		await page.goto('/practice');
		await page.getByTestId('practice-homework-link').click();
		await expect(page).toHaveURL(/\/homework/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Homework');
	});
});

test.describe('note reading', () => {
	test.use({ viewport: DESKTOP });

	test('answering by note name scores the exercise', async ({ page }) => {
		await page.goto('/homework');
		await openExercise(page, 'reading', '5', '1');

		const note0 = page.getByTestId('reading-note-0');
		await expect(note0).toHaveAttribute('data-note', 'G4');
		await expect(note0).toHaveAttribute('data-state', 'current');

		await page.getByTestId('answer-G').click();
		await expect(note0).toHaveAttribute('data-state', 'correct');
		await expect(page.getByTestId('reading-feedback')).toHaveText('Yes, G.');

		// Second note is C5: answer wrongly with D.
		await page.getByTestId('answer-D').click();
		await expect(page.getByTestId('reading-note-1')).toHaveAttribute('data-state', 'wrong');
		await expect(page.getByTestId('reading-feedback')).toContainText('that note is C');
	});

	test('answering with the keyboard works and a full run ends with a summary and a remembered score', async ({
		page
	}) => {
		await page.goto('/homework');
		await openExercise(page, 'reading', '18', '1');
		await expect(page.getByTestId('reading-staff')).toHaveAttribute('data-clef', 'bass');

		// Exercise 18/1 spelled out, letter by letter, straight from the engraved data.
		const letters = await page.locator('[data-testid^="reading-note-"]').evaluateAll((els) =>
			els
				.map((el) => ({
					id: Number((el.getAttribute('data-testid') ?? '').replace('reading-note-', '')),
					note: el.getAttribute('data-note') ?? ''
				}))
				.sort((a, b) => a.id - b.id)
				.map((n) => n.note[0].toLowerCase())
		);
		expect(letters.length).toBe(29);
		for (const l of letters) await page.keyboard.press(l);

		await expect(page.getByTestId('reading-summary')).toBeVisible();
		await expect(page.getByTestId('reading-accuracy')).toContainText('100%');
		await expect(page.getByTestId('reading-record')).toContainText('Best 100%, attempts: 1');

		// Remembered: reopening the exercise shows the last result.
		await page.reload();
		await expect(page.getByTestId('homework-last')).toContainText('Best 100%, attempts: 1');
	});

	test('a connected MIDI piano answers, and the octave counts', async ({ page, context }) => {
		await context.grantPermissions(['midi']);
		await page.addInitScript(() => {
			const input = {
				id: 'fake-piano',
				name: 'Fake Piano',
				manufacturer: 'Test',
				type: 'input',
				state: 'connected',
				connection: 'open',
				version: '1',
				onmidimessage: null as null | ((e: unknown) => void),
				onstatechange: null,
				open: async () => input,
				close: async () => input,
				addEventListener: () => {},
				removeEventListener: () => {}
			};
			const access = {
				inputs: new Map([['fake-piano', input]]),
				outputs: new Map(),
				sysexEnabled: false,
				onstatechange: null,
				addEventListener: () => {},
				removeEventListener: () => {}
			};
			Object.defineProperty(Navigator.prototype, 'requestMIDIAccess', {
				value: async () => access,
				configurable: true
			});
			(window as unknown as { __play: (n: number) => void }).__play = (n) =>
				input.onmidimessage?.({ data: new Uint8Array([0x90, n, 100]), timeStamp: 0, target: input });
		});
		await page.goto('/homework');
		await openExercise(page, 'reading', '5', '1');
		await page.getByTestId('reading-connect-midi').click();
		await expect(page.getByTestId('reading-midi')).toContainText('Fake Piano');

		// Note 0 is G4 (MIDI 67): play it.
		await page.evaluate(() => (window as unknown as { __play: (n: number) => void }).__play(67));
		await expect(page.getByTestId('reading-note-0')).toHaveAttribute('data-state', 'correct');

		// Note 1 is C5 (72): play C4 (60), the right letter an octave down.
		await page.evaluate(() => (window as unknown as { __play: (n: number) => void }).__play(60));
		await expect(page.getByTestId('reading-note-1')).toHaveAttribute('data-state', 'wrong-octave');
		await expect(page.getByTestId('reading-feedback')).toContainText('wrong octave');
	});

	test('fits a phone: no sideways page scroll', async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto('/homework');
		await openExercise(page, 'reading', '6', '3');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/homework-reading-phone.png`, fullPage: true });
	});
});

test.describe('rhythm: metronome and tap scoring', () => {
	test.use({ viewport: DESKTOP });

	test.beforeEach(async ({ page }) => {
		await presetPrefs(page, 120, 1); // 500 ms per beat, one-bar count-in
		await page.clock.install({ time: 0 });
	});

	/**
	 * Freezes the page clock after load. Without this the installed clock keeps
	 * flowing with real time between steps, and "exactly on the beat" would
	 * depend on how fast the machine ran each Playwright call. Paused far past
	 * any plausible load time, then moved only by `runFor`.
	 */
	async function freeze(page: Page): Promise<void> {
		await page.clock.pauseAt(600_000);
	}

	test('exercise 4 (ten half notes): tapping exactly on every note scores 100%', async ({ page }) => {
		await page.goto('/homework');
		await freeze(page);
		await openExercise(page, 'rhythm', '1', '4');
		await page.getByTestId('rhythm-start').click();

		// Count-in: one 2/4 bar, two beats of 500 ms, counted down on screen.
		await expect(page.getByTestId('rhythm-countin')).toHaveText('2');
		await page.clock.runFor(500);
		await expect(page.getByTestId('rhythm-countin')).toHaveText('1');
		await page.clock.runFor(500);
		await expect(page.getByTestId('rhythm-countin')).toHaveCount(0);

		// Ten half notes, one per 2/4 bar: a tap every 1000 ms from the first beat.
		for (let i = 0; i < 10; i++) {
			await tap(page);
			await page.clock.runFor(1000);
		}
		await page.clock.runFor(1000);

		await expect(page.getByTestId('rhythm-score')).toContainText('100%');
		await expect(page.getByTestId('rhythm-perfect')).toHaveText('Spot on: 10');
		await expect(page.getByTestId('rhythm-missed')).toHaveText('Missed: 0');
		await expect(page.getByTestId('rhythm-note-0')).toHaveAttribute('data-state', 'perfect');
		await expect(page.getByTestId('rhythm-record')).toContainText('Best 100%, attempts: 1');
		await page.screenshot({ path: `${SCREENSHOT_DIR}/homework-rhythm-result.png`, fullPage: true });
	});

	test('taps that are late show as dragging, and the missed notes are marked', async ({ page }) => {
		await page.goto('/homework');
		await freeze(page);
		await openExercise(page, 'rhythm', '1', '4');
		await page.getByTestId('rhythm-start').click();
		await page.clock.runFor(1000); // count-in over, at the first beat

		// Tap the first five notes 90 ms late, skip the other five.
		for (let i = 0; i < 5; i++) {
			await page.clock.runFor(90);
			await tap(page);
			await page.clock.runFor(910);
		}
		await page.clock.runFor(6000);

		await expect(page.getByTestId('rhythm-missed')).toHaveText('Missed: 5');
		await expect(page.getByTestId('rhythm-tendency')).toHaveAttribute('data-tendency', 'dragging');
		await expect(page.getByTestId('rhythm-tendency')).toContainText('90 ms late');
		await expect(page.getByTestId('rhythm-note-9')).toHaveAttribute('data-state', 'missed');
		await expect(page.getByTestId('rhythm-result')).toHaveAttribute('data-passed', 'false');

		// A failed run offers a slower tempo, and taking it changes the metronome.
		await page.getByTestId('rhythm-slower').click();
		await expect(page.getByTestId('metronome-bpm')).toContainText('110');
	});

	test('the click-only metronome beats, changes tempo live and stops', async ({ page }) => {
		await page.goto('/homework');
		await freeze(page);
		await openExercise(page, 'rhythm', '1', '1');
		await page.getByTestId('rhythm-click-only').click();

		await expect(page.getByTestId('beat-dot-0')).toHaveAttribute('data-active', 'true');
		await page.clock.runFor(500);
		await expect(page.getByTestId('beat-dot-1')).toHaveAttribute('data-active', 'true');
		await expect(page.getByTestId('beat-dot-0')).toHaveAttribute('data-active', 'false');

		// Live tempo change from the preset row, no restart.
		await page.getByTestId('metronome-presets').getByRole('button', { name: '60' }).click();
		await expect(page.getByTestId('metronome-bpm')).toContainText('60');
		await expect(page.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'practice');

		await page.getByTestId('rhythm-stop').click();
		await expect(page.getByTestId('rhythm-drill')).toHaveAttribute('data-phase', 'idle');
		await expect(page.getByTestId('beat-dots')).toHaveCount(0);
		await expect(page.getByTestId('rhythm-result')).toHaveCount(0);
	});

	test('tempo and count-in are controllable and remembered after a reload', async ({ page }) => {
		await page.goto('/homework');
		await freeze(page);
		await openExercise(page, 'rhythm', '1', '1');
		await expect(page.getByTestId('metronome-bpm')).toContainText('120');
		await page.getByRole('button', { name: 'Slower' }).click();
		await page.getByRole('button', { name: 'Slower' }).click();
		await expect(page.getByTestId('metronome-bpm')).toContainText('110');
		await page.getByTestId('metronome-countin').getByRole('button', { name: '2 bars' }).click();

		await page.reload();
		await openExercise(page, 'rhythm', '1', '1');
		await expect(page.getByTestId('metronome-bpm')).toContainText('110');
		await expect(
			page.getByTestId('metronome-countin').getByRole('button', { name: '2 bars' })
		).toHaveAttribute('aria-pressed', 'true');
	});

	test('the Space bar taps', async ({ page }) => {
		await page.goto('/homework');
		await freeze(page);
		await openExercise(page, 'rhythm', '1', '4');
		await page.getByTestId('rhythm-start').click();
		await page.clock.runFor(1000);
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press('Space');
			await page.clock.runFor(1000);
		}
		await page.clock.runFor(1000);
		await expect(page.getByTestId('rhythm-score')).toContainText('100%');
	});

	test('a tied exercise only asks for the struck notes (exercise 19)', async ({ page }) => {
		await page.goto('/homework');
		await freeze(page);
		await openExercise(page, 'rhythm', '4', '19');
		await page.getByTestId('rhythm-start').click();
		await page.clock.runFor(2000); // count-in: one 4/4 bar, now at beat 0

		// The five tie continuations are shown as held, never as something to tap.
		const states = await page.locator('[data-testid^="rhythm-note-"]').evaluateAll((els) =>
			els.map((el) => el.getAttribute('data-state'))
		);
		expect(states.filter((s) => s === 'held')).toHaveLength(5);

		// Beats (quarter notes from the first beat) of the struck notes, read off the page:
		// bars 'q q q q~' 'q q h~' 'q h q' 'h h~' 'h. q~' 'q q h' 'w~' 'w'.
		const struck = [0, 1, 2, 3, 5, 6, 9, 11, 12, 14, 19, 21, 22, 24];
		expect(states.filter((s) => s === 'pending')).toHaveLength(struck.length);
		let at = 0;
		for (const beat of struck) {
			await page.clock.runFor((beat - at) * 500);
			at = beat;
			await tap(page);
		}
		await page.clock.runFor(10_000);

		await expect(page.getByTestId('rhythm-score')).toContainText('100%');
		await expect(page.getByTestId('rhythm-perfect')).toHaveText('Spot on: 14');
		await expect(page.getByTestId('rhythm-extra')).toHaveText('Extra taps: 0');
	});
});
