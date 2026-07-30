import { expect, test } from '@playwright/test';
import { openPracticeFamily } from './helpers';

/**
 * BuildSession's mic mode start/stop/teardown lifecycle with microphone
 * permission GRANTED and a fake capture device
 * (`--use-fake-device-for-media-stream`), so this never depends on real
 * audio input or a real detection verdict - no automated test can confirm
 * the DSP against a real piano in a real room (see the PR description).
 * This only proves the lifecycle is safe with an actual (fake) MediaStream
 * and AudioContext, inside the real embedded build-it drill.
 *
 * Split into its own file, separate from build-mic.spec.ts's permission-
 * denied case, because a differing `launchOptions` forces Playwright to use
 * a dedicated worker and must be declared top-level in a file, not inside a
 * `describe` block (same constraint mic-check-granted.spec.ts documents).
 */

test.use({
	permissions: ['microphone'],
	launchOptions: {
		args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
	}
});

test('starts listening, then stops and releases cleanly', async ({ page }) => {
	await openPracticeFamily(page, 'build-it');
	await page.getByRole('button', { name: 'Microphone' }).click();

	await page.getByTestId('build-mic-start').click();
	await expect(page.getByTestId('build-mic-stop')).toBeVisible();
	await expect(page.getByTestId('build-mic-start')).toHaveCount(0);

	await page.getByTestId('build-mic-stop').click();
	await expect(page.getByTestId('build-mic-start')).toBeVisible();
	await expect(page.getByTestId('build-mic-stop')).toHaveCount(0);
});

test('navigating away while listening does not leave the app in a broken state', async ({ page }) => {
	await openPracticeFamily(page, 'build-it');
	await page.getByRole('button', { name: 'Microphone' }).click();
	await page.getByTestId('build-mic-start').click();
	await expect(page.getByTestId('build-mic-stop')).toBeVisible();

	// Route away entirely (SvelteKit unmounts BuildSession; onDestroy tears
	// down the stream/AudioContext). The destination page must render fine.
	await page.goto('/learn');
	await expect(page.getByRole('heading', { name: 'Learn' })).toBeVisible();
});

test('switching back to Keyboard mid-listen stops the mic session without breaking the drill', async ({
	page
}) => {
	await openPracticeFamily(page, 'build-it');
	await page.getByRole('button', { name: 'Microphone' }).click();
	await page.getByTestId('build-mic-start').click();
	await expect(page.getByTestId('build-mic-stop')).toBeVisible();

	await page.getByRole('button', { name: 'Keyboard' }).click();

	await expect(page.getByTestId('build-mic-panel')).toHaveCount(0);
	await expect(page.getByTestId('build-session')).toBeVisible();
});
