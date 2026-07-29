import { expect, test } from '@playwright/test';

/**
 * The mic check panel's start/stop/teardown lifecycle with microphone
 * permission GRANTED and a fake capture device (`--use-fake-device-for-
 * media-stream`), so this never depends on real audio input or a real
 * detection verdict - no automated test can confirm the DSP against a real
 * piano in a real room (see the PR description). This only proves the
 * lifecycle is safe with an actual (fake) MediaStream and AudioContext.
 *
 * Split into its own file, separate from mic-check.spec.ts's permission-
 * denied case, because a differing `launchOptions` forces Playwright to use
 * a dedicated worker and must be declared top-level in a file, not inside a
 * `describe` block.
 */

test.use({
	permissions: ['microphone'],
	launchOptions: {
		args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
	}
});

async function lookUpCm7(page: import('@playwright/test').Page): Promise<void> {
	await page.goto('/');
	await page.getByTestId('starter-chord').first().click();
	await expect(page.getByTestId('chord-result')).toBeVisible();
	await expect(page.getByTestId('mic-check-panel')).toBeVisible();
}

test('starts listening, then stops and releases cleanly', async ({ page }) => {
	await lookUpCm7(page);

	await page.getByTestId('mic-check-start').click();
	await expect(page.getByTestId('mic-check-stop')).toBeVisible();
	await expect(page.getByTestId('mic-check-start')).toHaveCount(0);

	await page.getByTestId('mic-check-stop').click();
	await expect(page.getByTestId('mic-check-start')).toBeVisible();
	await expect(page.getByTestId('mic-check-stop')).toHaveCount(0);
});

test('navigating away while listening does not leave the app in a broken state', async ({
	page
}) => {
	await lookUpCm7(page);
	await page.getByTestId('mic-check-start').click();
	await expect(page.getByTestId('mic-check-stop')).toBeVisible();

	// Route away entirely (SvelteKit unmounts the panel; onDestroy tears down
	// the stream/AudioContext). The destination page must render fine.
	await page.goto('/learn');
	await expect(page.getByRole('heading', { name: 'Learn' })).toBeVisible();
});
