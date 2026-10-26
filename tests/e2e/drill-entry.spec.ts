import { expect, test } from '@playwright/test';
import { FAMILY_TESTID, openPracticeFamily, PHONE, SCREENSHOT_DIR, type Family } from './helpers';

/**
 * Deterministic entry into every practice drill surface.
 *
 * WHY THIS EXISTS: a previous phase's visual UAT for the progression drill was
 * abandoned as BLOCKED, on the grounds that there was no deterministic way to
 * open a progression bar. That was true by hand. /practice plans one bounded
 * round from FSRS-due cards plus synthetic (applied) items, shuffles with
 * `Math.random`, and never opens a round on an applied item while a carded one
 * is due -- so a human tapping Start could never guarantee reaching one.
 *
 * `openPracticeFamily` closes that by controlling the three real inputs:
 *   - the deck (seeded straight into the app's own IndexedDB store, MATURE, so
 *     the applied families' maturity gate is open),
 *   - the daily intro budget (exhausted, so the page cannot top the deck up),
 *   - `Math.random` (pinned to a constant before any app script runs),
 * and then answering the NAME IT questions ahead of an applied family.
 * No production code was added or changed to enable any of this. See helpers.ts
 * for the per-family recipes and the exact tie-break reasoning.
 */

test.use({ viewport: PHONE });

const FAMILIES = Object.keys(FAMILY_TESTID) as Family[];

for (const family of FAMILIES) {
	test(`opens the ${family} drill deterministically`, async ({ page }) => {
		await openPracticeFamily(page, family);

		const drill = page.getByTestId(FAMILY_TESTID[family]);
		await expect(
			drill,
			`expected the ${family} drill (data-testid="${FAMILY_TESTID[family]}") to be the first ` +
				`question past the NAME IT items. If the round planner's rules changed, re-pick the recipe in helpers.ts RECIPES.`
		).toBeVisible();

		/*
		 * Artifact for eyeballing: this is the only automated way anyone has had
		 * to look at a progression bar or an inversion prompt on a phone.
		 */
		await page.screenshot({ path: `${SCREENSHOT_DIR}/drill-${family}.png`, fullPage: true });
	});
}

/**
 * The progression bar specifically, since it is the surface whose UAT was
 * blocked. Asserts the drill's structural parts actually laid out, rather than
 * only that the container exists.
 */
test('the progression bar renders its key banner and its measures', async ({ page }) => {
	await openPracticeFamily(page, 'progression');

	await expect(page.getByTestId('progression-drill')).toBeVisible();
	const banner = page.getByTestId('key-banner');
	await expect(banner).toBeVisible();

	/*
	 * Bar count is template-dependent (a ii-V-I is 3 bars, a turnaround is
	 * more), so it is read off the banner's own "1/N" progress label rather
	 * than hardcoded. That keeps the check honest if the seeded template
	 * changes: it asserts the grid and the banner AGREE.
	 */
	const bannerText = (await banner.innerText()).replace(/\s+/g, ' ');
	const declared = Number(/\b1\s*\/\s*(\d+)\b/.exec(bannerText)?.[1]);
	expect(declared, `could not read bar count from key banner: "${bannerText}"`).toBeGreaterThan(1);

	const measures = page.getByTestId('measures').locator('> *');
	await expect(measures).toHaveCount(declared);

	// Every bar must have laid out with real area, not collapsed to zero width.
	const boxes = await page.$$eval('[data-testid="measures"] > *', (elements) =>
		elements.map((element) => {
			const rect = element.getBoundingClientRect();
			return { width: rect.width, height: rect.height };
		})
	);
	for (const [index, box] of boxes.entries()) {
		expect(box.width, `measure ${index} width`).toBeGreaterThan(0);
		expect(box.height, `measure ${index} height`).toBeGreaterThan(0);
	}

	// And the bar must not push the phone layout sideways.
	const overflow = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});
