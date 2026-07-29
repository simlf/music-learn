import { expect, test } from '@playwright/test';

/**
 * The opt-in "check it on your piano" mic panel (Spike 025) on the Lookup
 * page. This suite never depends on real audio input or a real detection
 * verdict (no automated test can confirm the DSP against a real piano in a
 * real room - see the PR description) - it only proves the panel's
 * lifecycle is safe: no auto-start, a calm fallback on permission denial,
 * and clean start/stop with a granted (fake) device.
 *
 * `http://localhost` is a secure context, so the panel is available at all
 * in this suite (the deployed app is https; see micInput.ts).
 */

async function lookUpCm7(page: import('@playwright/test').Page): Promise<void> {
	await page.goto('/');
	// The empty-state starter chips (D-09) are the deterministic zero-typing
	// path into a recognized, non-slash chord result.
	await page.getByTestId('starter-chord').first().click();
	await expect(page.getByTestId('chord-result')).toBeVisible();
	await expect(page.getByTestId('mic-check-panel')).toBeVisible();
}

/*
 * This file covers the permission-DENIED path only. `launchOptions` for the
 * granted/fake-device path must be set top-level in a file (Playwright
 * forces a dedicated worker for a differing `launchOptions`, and refuses it
 * inside a `describe` block), so that path lives in its own sibling file,
 * mic-check-granted.spec.ts, which sets it at the top level instead.
 */

test('permission denied shows a calm fallback and never breaks the rest of the page', async ({
	page
}) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (err) => pageErrors.push(String(err)));

	await lookUpCm7(page);

	const startButton = page.getByTestId('mic-check-start');
	await expect(startButton).toBeVisible();
	await expect(startButton).toBeEnabled();
	await startButton.click();

	// Chromium auto-denies getUserMedia when no permission was granted and
	// there is no way to answer a prompt in an automated context.
	await expect(page.getByTestId('mic-check-status')).toBeVisible({ timeout: 5000 });
	await expect(page.getByTestId('mic-check-status')).toContainText(/denied|micro/i);

	// The rest of the page still works: no broken state, no crash.
	await expect(page.getByRole('heading', { name: 'Chord lookup' })).toBeVisible();
	await expect(page.getByTestId('mic-check-stop')).toHaveCount(0);
	expect(pageErrors).toEqual([]);
});
