import { expect, test } from '@playwright/test';
import { PHONE, SCREENSHOT_DIR } from './helpers';

/**
 * Deterministic entry into the interval-naming lesson on /learn (guided-path
 * unit 4, "interval = number + quality").
 *
 * WHY THIS EXISTS: a pedagogy audit called this the highest-value single
 * addition in the whole curriculum, generalizing the thirds lesson's
 * number+quality mechanism to every interval and adding the missing
 * "spell it" drill direction (the app could already ask the user to NAME an
 * interval and to TAP one, never to SPELL one). Like scale-lesson.spec.ts and
 * guide-tones-lesson.spec.ts, the LESSON half needs no deck seeding or rng
 * pinning: it is a plain, always-available step picker on /learn. The
 * spelling drill that follows it draws a root and shuffles its 6-entry pool
 * with Math.random, so this spec pins it to a constant before any app script
 * runs (same idiom as tests/e2e/drill-entry.spec.ts), which resolves to the
 * same deterministic "minor 3rd above C" first question the component-level
 * SpellIntervalDrill.test.ts locks (worked by hand against the exact
 * Fisher-Yates shuffle, see that file's own header comment).
 */

test.use({ viewport: PHONE });

test('opens the interval-naming lesson from /learn, walks the four steps, and reveals the spelling drill', async ({
	page
}) => {
	await page.addInitScript(() => {
		Math.random = () => 0;
	});
	await page.goto('/learn');

	const section = page.getByTestId('section-interval-naming');
	await expect(section).toBeVisible();
	await expect(section.getByText('The bottom note, again')).toBeVisible();

	// Step 1: anchor on C. Step 2: major 2nd (D). Step 3: augmented 2nd (D♯),
	// replacing D under the shared 'second' role. Step 4: hear-then-continue
	// payoff (no tap).
	await section.getByRole('button', { name: 'C key' }).first().click();
	await section.getByRole('button', { name: 'D key' }).click();
	await section.getByRole('button', { name: 'D♯ key' }).click();
	await section.getByRole('button', { name: 'Continue' }).click();

	// No /practice handoff: this unit's proof lives inline on /learn.
	await expect(section.getByTestId('lesson-handoff')).toHaveCount(0);
	await expect(section.getByRole('link', { name: /try this in a drill/i })).toHaveCount(0);

	const proveIt = section.getByTestId('interval-naming-prove-it');
	await expect(proveIt).toBeVisible();
	await expect(proveIt.getByText('Spell a few')).toBeVisible();

	const drill = section.getByTestId('spell-interval-drill');
	await expect(drill).toBeVisible();
	await expect(drill.getByTestId('spell-prompt')).toContainText('Spell the minor 3rd above C');

	// Answer the flagship enharmonic trap wrong on purpose (D♯ instead of E♭,
	// the exact same piano key) to prove the drill catches it, then move on.
	await drill.getByRole('button', { name: 'D', exact: true }).click();
	await drill.getByRole('button', { name: '♯', exact: true }).click();
	await drill.getByRole('button', { name: 'Check' }).click();

	await expect(drill.getByTestId('spell-incorrect-line')).toBeVisible();
	await expect(drill.getByTestId('spell-letter-trap-line')).toContainText('D');
	await expect(drill.getByTestId('spell-letter-trap-line')).toContainText('E');

	await drill.getByRole('button', { name: 'Next' }).click();
	await expect(drill.getByTestId('spell-prompt')).toContainText('augmented 4th');

	const overflow = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

	await page.screenshot({
		path: `${SCREENSHOT_DIR}/learn-interval-naming-lesson.png`,
		fullPage: true
	});
});
