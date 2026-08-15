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
 * FIXED 2026-07-29. This was a `test.fail()` recording a real, measured gap.
 *
 * The masthead streak chip renders `--color-muted` on `--color-paper` at
 * 12px/700. At the old token value (#7d7462) that measured 3.92:1, below the
 * 4.5:1 WCAG AA floor that applies at this size (12px bold is NOT "large text":
 * the bold threshold is 18.66px). It was legible-ish on a bright desktop
 * screen, which is presumably why five rounds of manual visual UAT never
 * flagged it, and hard to read on a phone outdoors.
 *
 * The token was darkened to #716856 on the same hue, which clears 4.67:1 on
 * `--color-paper` and 5.09:1 on `--color-paper-bright`. The old value failed on
 * BOTH backgrounds (4.28:1 on paper-bright), so this was never chip-specific:
 * `--color-muted` carries body copy in 13 files, and every one of them was
 * under the floor. That is why the shared token moved rather than the chip.
 *
 * `--color-faint` (#9a907f) is deliberately still below the floor. It is
 * decorative only (rules, dividers, disabled affordances) and must never carry
 * body copy. If a future change puts text on it, that text needs its own token.
 */
test('the masthead streak chip meets WCAG AA', async ({ page }) => {
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

/**
 * WR-10. The masthead MIDI chip is a SECOND `--color-muted`-on-paper masthead
 * chip at `text-label` size, sitting on the exact surface where that pairing
 * already shipped below WCAG AA once and survived five rounds of manual visual
 * UAT (see the streak-chip note above). It measures fine today; this is the
 * regression guard the streak chip, the due badge and the active nav tab all
 * have and this one did not.
 *
 * Both states are measured because they are different ELEMENTS, and one cannot
 * speak for the other: the interactive states render a <button> with a
 * `2px solid var(--color-ink)` border and `--spacing-xs` padding, while
 * `connected` renders an unbordered, unpadded <span>. The post-click state is
 * whatever headless Chromium's MIDI stack actually resolves to (no instrument
 * is attached here), which is deliberately not pinned to one value: this file
 * measures colours, and pinning an environment detail is how a contrast test
 * turns into a flake.
 *
 * NOT COVERED, and it cannot be from here: `connected` needs a real instrument,
 * so the <span> variant's colours are only measured if the environment happens
 * to reach that state. Both variants carry the same `.midi-status` colour rules,
 * so the risk this leaves is a `--color-muted` change, which the assertions
 * below would still catch.
 */
test.describe('the masthead MIDI chip meets WCAG AA', () => {
	test.use({ permissions: ['midi'] });

	test('in its idle state, before any connect attempt', async ({ page }) => {
		await page.goto('/');

		const chip = page.getByTestId('midi-status');
		await expect(chip).toHaveAttribute('data-midi-state', 'idle');

		const sample = await measureContrast(chip);
		expect(
			sample.ratio,
			`MIDI chip (idle): ${sample.foreground} on ${sample.background} at ${sample.fontSizePx}px/${sample.fontWeight}`
		).toBeGreaterThanOrEqual(sample.threshold);
	});

	test('in whatever terminal state a real connect attempt reaches', async ({ page }) => {
		await page.goto('/');

		const chip = page.getByTestId('midi-status');
		await expect(chip).toHaveAttribute('data-midi-state', 'idle');
		await chip.click();
		await expect
			.poll(() => chip.getAttribute('data-midi-state'), { timeout: 5_000 })
			.toMatch(/^(no-device|connected|denied|error)$/);

		const kind = await chip.getAttribute('data-midi-state');
		const sample = await measureContrast(chip);
		expect(
			sample.ratio,
			`MIDI chip (${kind}): ${sample.foreground} on ${sample.background} at ${sample.fontSizePx}px/${sample.fontWeight}`
		).toBeGreaterThanOrEqual(sample.threshold);
	});
});
