import { expect, test } from '@playwright/test';
import { PHONE, SCREENSHOT_DIR } from './helpers';

/**
 * Deterministic entry into the major-scale build lesson on /learn
 * (x3-scale-lesson).
 *
 * WHY THIS EXISTS: a pedagogy audit found that `createScaleConstruction`
 * (src/lib/practice/construction.ts) plus BuildSession's scale branch
 * produced the app's only statement of the major-scale step pattern
 * (W-W-H-W-W-W-H), but were unreachable in production - both BuildSession
 * mount sites (`/practice`, RecallSession) only ever passed a CHORD
 * embedFact. Unlike the practice-hub families in drill-entry.spec.ts, this
 * surface needs no deck seeding or rng pinning to reach deterministically:
 * it is a plain, always-available picker on /learn, not a queue draw. This
 * spec is the real-browser counterpart to
 * src/lib/components/theoryLessons.test.ts's component-level coverage.
 */

test.use({ viewport: PHONE });

test('opens the major-scale build lesson from /learn, states the exact ruler pattern on completion, and never scrolls the phone sideways', async ({
	page
}) => {
	await page.goto('/learn');

	const section = page.getByTestId('section-scale');
	await expect(section).toBeVisible();

	const tonicRow = section.getByTestId('scale-tonic-row');
	await expect(tonicRow.getByRole('button', { name: 'C major' })).toBeVisible();
	await expect(tonicRow.getByRole('button', { name: 'G major' })).toBeVisible();
	await expect(tonicRow.getByRole('button', { name: 'F major' })).toBeVisible();

	await tonicRow.getByRole('button', { name: 'G major' }).click();

	const build = section.getByTestId('build-session');
	await expect(build).toBeVisible();
	await expect(build.getByTestId('build-register')).toHaveText('STEP 1 OF 7');
	await expect(build.getByTestId('build-step-line')).toHaveText('Take a whole step up from G.');

	// Step through G major: A, B, C, D, E, F♯, G (the octave). This lesson
	// embeds BuildSession at the PHONE viewport, where the tapping keyboard
	// now self-measures a ONE-octave span (260730-x0l) instead of pinning
	// two, so most of these degrees only have ONE physical key: the target
	// above the board's ceiling (see `construction.ts`'s `foldToBoard`) folds
	// down onto that same single key rather than requiring a second,
	// higher-register instance. 'C key' is the one exception that STILL has
	// two instances even on a one-octave board (the board's own trailing C,
	// one octave above the root C) - and G major's C degree (C5) sits exactly
	// AT the one-octave ceiling, so it is the one degree that still needs the
	// SECOND (higher) instance, not a folded tap of the first. The closing
	// octave-up G tap folds onto the SAME physical key the root G already
	// used. A correct tap sets `feedback`, which BuildSession does not clear
	// (and therefore ignores every further tap) until its own 650ms pacing
	// timer fires - so each step needs a real wait, not just Playwright's
	// default actionability wait, or the next click silently no-ops.
	async function tapAndPace(name: string, index = 0) {
		await build.getByRole('button', { name }).nth(index).click();
		await page.waitForTimeout(700);
	}
	await tapAndPace('A key');
	await tapAndPace('B key');
	await tapAndPace('C key', 1);
	await tapAndPace('D key');
	await tapAndPace('E key');
	await tapAndPace('F♯ key');
	await tapAndPace('G key');

	await expect(build.getByTestId('build-complete-rule')).toHaveText(
		'G major: whole, whole, half, whole, whole, whole, half.'
	);
	// No card was created by this lesson, so there is nothing to recall.
	await expect(build.getByRole('link', { name: 'Recall It Now' })).toHaveCount(0);
	await expect(build.getByTestId('build-fsrs-status')).toHaveCount(0);

	const overflow = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

	await page.screenshot({ path: `${SCREENSHOT_DIR}/learn-scale-lesson-complete.png`, fullPage: true });
});
