import { expect, test } from '@playwright/test';
import { PHONE, SCREENSHOT_DIR } from './helpers';

/**
 * Deterministic entry into the guide tones and voice leading lesson on
 * /learn (guided-path unit 11).
 *
 * WHY THIS EXISTS: the app already shipped the shell-voicing drill (the 3rd
 * + 7th guide tones, `shellVoicing.ts`) without ever teaching WHY those two
 * notes carry a chord change, and one prior commit taught the wrong
 * rationale (a global "3rd + 7th tritone" claim, false for 3 of 5 seventh
 * families, fixed in 6a13ade). This unit is the missing reason: the 7th of
 * one chord in a ii V I falls a half step to become the 3rd of the next,
 * while the other voice holds still. Like scale-lesson.spec.ts's surface,
 * this needs no deck seeding or rng pinning: it is a plain, always-available
 * picker on /learn, not a queue draw. Real-browser counterpart to
 * src/lib/components/theoryLessons.test.ts's component-level coverage.
 */

test.use({ viewport: PHONE });

test('opens the guide tones lesson from /learn, walks ii V I, and hears the shells move', async ({
	page
}) => {
	await page.goto('/learn');

	const section = page.getByTestId('section-guide-tones');
	await expect(section).toBeVisible();

	const pickRow = section.getByTestId('guide-tone-pick-row');
	await expect(pickRow.getByRole('button', { name: /Dm7/ })).toBeVisible();
	await expect(pickRow.getByRole('button', { name: /G7/ })).toBeVisible();
	await expect(pickRow.getByRole('button', { name: /Cmaj7/ })).toBeVisible();

	// Defaults to the ii chord: just its two guide tones, F and C.
	await expect(section.getByTestId('guide-tone-caption')).toContainText(
		'F is the 3rd. It says Dm7 is minor. C is the 7th.'
	);

	// V: the held voice (F) and the falling voice (C to B).
	await pickRow.getByRole('button', { name: /G7/ }).click();
	await expect(section.getByTestId('guide-tone-caption')).toContainText(
		"F holds: it was Dm7's 3rd, now it is G7's 7th. C falls one half step to B"
	);

	// I: the held voice (B) and the falling voice (F to E).
	await pickRow.getByRole('button', { name: /Cmaj7/ }).click();
	await expect(section.getByTestId('guide-tone-caption')).toContainText(
		"B holds: it was G7's 3rd, now it is Cmaj7's 7th. F falls one half step to E"
	);

	// Nothing here creates a card: the shell voicing drill on /practice
	// remains the unit's proof, not this lesson.
	await expect(section.getByRole('link', { name: 'Recall It Now' })).toHaveCount(0);

	await section.getByRole('button', { name: 'Hear it move' }).click();

	const overflow = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

	await page.screenshot({ path: `${SCREENSHOT_DIR}/learn-guide-tones-lesson.png`, fullPage: true });
});
