import { expect, test } from '@playwright/test';
import { openPracticeFamily } from './helpers';

/**
 * The mic mode input toggle inside BuildSession's REAL embedded build-it
 * drill (Spike 025 Phase 2: the microphone as an alternative to tapping the
 * on-screen keyboard, chords only). Mirrors mic-check.spec.ts's own split:
 * `launchOptions` for the granted/fake-device path must be set top-level in
 * its own file, so that path lives in build-mic-granted.spec.ts. This suite
 * never depends on real audio input or a real detection verdict - no
 * automated test can confirm the DSP against a real piano in a real room
 * (see chromaDetector.test.ts / buildSession.test.ts for that coverage,
 * against synthesized frames) - it only proves the toggle's lifecycle is
 * safe inside the actual production bundle: chords-only, never auto-starts,
 * and a calm fallback on permission denial.
 *
 * `openPracticeFamily(page, 'build-it')` deterministically seeds a MATURE
 * 'formula-build' card for the bare "C" triad as the first practice
 * question, so every test here lands on a real, embedded (embedFact-driven)
 * BuildSession instance without a picker step.
 */

test('the input toggle appears only for chords, defaults to Keyboard, and never requests the mic merely by opening the drill', async ({
	page
}) => {
	await openPracticeFamily(page, 'build-it');

	await expect(page.getByTestId('build-session')).toBeVisible();
	await expect(page.getByTestId('build-input-toggle')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Keyboard' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'Microphone' })).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByTestId('build-mic-panel')).toHaveCount(0);
});

test('switching to Microphone shows a Start control without requesting the microphone yet', async ({
	page
}) => {
	await openPracticeFamily(page, 'build-it');

	await page.getByRole('button', { name: 'Microphone' }).click();

	await expect(page.getByTestId('build-mic-panel')).toBeVisible();
	await expect(page.getByTestId('build-mic-start')).toBeVisible();
	await expect(page.getByTestId('build-mic-stop')).toHaveCount(0);
});

test('permission denied shows a calm fallback and never breaks the rest of the drill', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (err) => pageErrors.push(String(err)));

	await openPracticeFamily(page, 'build-it');
	await page.getByRole('button', { name: 'Microphone' }).click();

	const startButton = page.getByTestId('build-mic-start');
	await expect(startButton).toBeVisible();
	await startButton.click();

	// Chromium auto-denies getUserMedia when no permission was granted and
	// there is no way to answer a prompt in an automated context.
	await expect(page.getByTestId('build-mic-status')).toBeVisible({ timeout: 5000 });
	await expect(page.getByTestId('build-mic-status')).toContainText(/denied|micro/i);

	// The rest of the drill still works: the build session and its always-
	// tappable keyboard are still there, no broken state, no crash.
	await expect(page.getByTestId('build-session')).toBeVisible();
	await expect(page.getByTestId('build-mic-stop')).toHaveCount(0);
	expect(pageErrors).toEqual([]);
});
