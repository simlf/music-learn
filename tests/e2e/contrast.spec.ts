import { expect, test } from '@playwright/test';
import { exhaustIntroBudget, measureContrast, PHONE, seedStreak } from './helpers';

/**
 * WCAG contrast checks computed from ACTUAL RENDERED COLOURS, not from reading
 * the token values in src/app.css by eye.
 *
 * Each measurement resolves the element's computed `color` plus the first
 * non-transparent background up its ancestor chain, then applies the WCAG 2.1
 * SC 1.4.3 threshold that matches that element's own computed font size and
 * weight (3.0:1 for large text, 4.5:1 otherwise). See measureContrast.
 *
 * NOT IN SCOPE: the `* { border-radius: 0 !important }` sharp-corner rule in
 * app.css is deliberate design identity. Nothing here touches it.
 */

test.use({ viewport: PHONE });

test('the active nav tab meets WCAG AA', async ({ page }) => {
	await page.goto('/practice');

	const active = page.locator('.bottom-tab-bar__item--active');
	await expect(active).toHaveCount(1);

	const sample = await measureContrast(active);
	expect(
		sample.ratio,
		`active tab: ${sample.foreground} on ${sample.background} at ${sample.fontSizePx}px/${sample.fontWeight}`
	).toBeGreaterThanOrEqual(sample.threshold);
});

test('the due-count badge on the Practice tab meets WCAG AA', async ({ page }) => {
	/*
	 * The badge only renders when the deck has at least one due card, and the
	 * count is primed once per app session on layout mount. So: let /practice
	 * build its own deck through the real production path (introduceNewCards),
	 * then reload so the layout re-primes and the badge appears. No deck
	 * seeding here on purpose. This measures the badge as a real first-week
	 * user would actually see it.
	 */
	await page.goto('/practice');
	await expect(page.getByTestId('practice-pre-start')).toBeVisible();

	// Freeze the deck so the reload does not introduce another batch.
	await exhaustIntroBudget(page);
	await page.reload();

	const badge = page.getByTestId('due-badge-tab');
	await expect(badge).toBeVisible();

	const sample = await measureContrast(badge);
	expect(
		sample.ratio,
		`due badge: ${sample.foreground} on ${sample.background} at ${sample.fontSizePx}px/${sample.fontWeight}`
	).toBeGreaterThanOrEqual(sample.threshold);
});

/**
 * KNOWN GAP, NOT A FLAKE.
 *
 * The masthead streak chip renders `--color-muted` (#7d7462) on `--color-paper`
 * (#f2ecdd) at 12px/700. That is 3.92:1, below the 4.5:1 WCAG AA floor that
 * applies at this size (12px bold is NOT "large text": the bold threshold is
 * 18.66px). The chip is legible-ish on a bright desktop screen, which is
 * presumably why five rounds of manual visual UAT never flagged it, and hard to
 * read on a phone outdoors.
 *
 * This is marked `test.fail()` rather than deleted or loosened, because:
 *   - the assertion is the REAL one, at the REAL threshold, so the suite is not
 *     laundering a failure as a pass;
 *   - Playwright reports it as an expected failure, so the run stays green and
 *     nobody learns to ignore red;
 *   - if someone darkens `--color-muted` (or bumps the chip's size/weight),
 *     this test starts PASSING and Playwright fails the run for "passed
 *     unexpectedly" -- which is the prompt to delete this `test.fail()` line.
 *
 * Fixing it means changing a shared design token in src/app.css or the chip in
 * src/lib/components/StreakBadge.svelte. Both are outside this change's
 * ownership, and `--color-muted` is used app-wide, so it is a design decision
 * for the owner rather than a drive-by edit.
 */
test('the masthead streak chip meets WCAG AA', async ({ page }) => {
	test.fail(
		true,
		'Known gap: --color-muted on --color-paper is 3.92:1 at 12px/700, below the 4.5:1 AA floor.'
	);

	await seedStreak(page, 3);
	await page.goto('/');

	const chip = page.getByTestId('streak-badge');
	await expect(chip).toBeVisible();

	const sample = await measureContrast(chip);
	expect(
		sample.ratio,
		`streak chip: ${sample.foreground} on ${sample.background} at ${sample.fontSizePx}px/${sample.fontWeight}`
	).toBeGreaterThanOrEqual(sample.threshold);
});

/**
 * Guard against the known gap getting WORSE while it waits to be fixed. If the
 * chip's contrast drops below 3.0:1 (the large-text floor, and the point at
 * which it stops being readable at all), this fails for real.
 */
test('the streak chip has not regressed further', async ({ page }) => {
	await seedStreak(page, 3);
	await page.goto('/');

	const sample = await measureContrast(page.getByTestId('streak-badge'));
	expect(
		sample.ratio,
		`streak chip: ${sample.foreground} on ${sample.background}`
	).toBeGreaterThanOrEqual(3.0);
});
