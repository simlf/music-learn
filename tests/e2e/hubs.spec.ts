import { expect, test } from '@playwright/test';
import { DESKTOP, HUBS, PHONE, SCREENSHOT_DIR } from './helpers';

/**
 * Phone-first layout checks for the four hubs.
 *
 * Retires the recurring "do the hubs render on a phone / does the tab bar show
 * / does anything overflow sideways" half of the manual visual UAT backlog.
 * These are the checks a component test structurally cannot make: they need a
 * real viewport, real Tailwind CSS, and real layout.
 */

test.describe('phone viewport 375x812', () => {
	test.use({ viewport: PHONE });

	for (const hub of HUBS) {
		test(`${hub.name} renders with the bottom tab bar and no sideways scroll`, async ({
			page
		}) => {
			await page.goto(hub.path);

			await expect(page.getByRole('heading', { level: 1, name: hub.heading })).toBeVisible();
			await expect(page.getByTestId('masthead')).toBeVisible();

			// The phone tab bar is the primary nav below the 640px `sm:` breakpoint.
			const tabBar = page.getByTestId('bottom-tab-bar');
			await expect(tabBar).toBeVisible();
			await expect(tabBar.getByRole('link')).toHaveCount(4);

			/*
			 * Horizontal overflow check. Compared against clientWidth, not
			 * window.innerWidth: clientWidth already excludes any vertical
			 * scrollbar, so this cannot false-positive by a scrollbar's width.
			 */
			const overflow = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth
			}));
			expect(
				overflow.scrollWidth,
				`${hub.path} scrolls horizontally at ${PHONE.width}px`
			).toBeLessThanOrEqual(overflow.clientWidth);
		});
	}

	test('the active tab is the one matching the current route', async ({ page }) => {
		await page.goto('/practice');
		const active = page.locator('.bottom-tab-bar__item--active');
		await expect(active).toHaveCount(1);
		await expect(active).toContainText('Practice');
	});
});

test.describe('desktop viewport 1280x800', () => {
	test.use({ viewport: DESKTOP });

	for (const hub of HUBS) {
		test(`${hub.name} renders with the masthead nav and no sideways scroll`, async ({ page }) => {
			await page.goto(hub.path);

			await expect(page.getByRole('heading', { level: 1, name: hub.heading })).toBeVisible();
			// Above `sm:`, the tab bar is display:none and the masthead links show.
			await expect(page.getByTestId('bottom-tab-bar')).toBeHidden();

			const overflow = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth
			}));
			expect(
				overflow.scrollWidth,
				`${hub.path} scrolls horizontally at ${DESKTOP.width}px`
			).toBeLessThanOrEqual(overflow.clientWidth);
		});
	}
});

/**
 * Screenshot capture. Not assertions: artifacts written to a gitignored
 * directory so a future agent or the owner can eyeball a change without
 * holding a phone. See playwright.config.ts for why pixel-diff snapshots are
 * deliberately NOT enabled.
 */
test.describe('screenshot capture', () => {
	for (const [label, viewport] of [
		['phone', PHONE],
		['desktop', DESKTOP]
	] as const) {
		test(`captures the four hubs at ${label} width`, async ({ page }) => {
			await page.setViewportSize(viewport);
			for (const hub of HUBS) {
				await page.goto(hub.path);
				await expect(page.getByRole('heading', { level: 1, name: hub.heading })).toBeVisible();
				await page.screenshot({
					path: `${SCREENSHOT_DIR}/${label}-${hub.name}.png`,
					fullPage: true
				});
			}
		});
	}
});
