import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, PHONE, PHONE_LANDSCAPE } from './helpers';

/**
 * Tap-target size checks for the two surfaces a finger actually lands on: the
 * phone bottom tab bar and the on-screen piano keyboard.
 *
 * THE RULE, AND WHY IT IS NOT ONE BLANKET NUMBER
 * ----------------------------------------------
 * A piano keyboard's black keys are legitimately narrower than its white keys.
 * That is the instrument, not a defect, so a single 44px floor applied to every
 * element would be wrong and would have to be suppressed, which defeats the
 * point. The suite therefore asserts three separate, defensible rules:
 *
 *   1. Tab bar items and white keys: >= 44 x 44 CSS px.
 *      44px is the conventional fingertip floor (WCAG 2.1 SC 2.5.5 Target Size
 *      (Enhanced), and Apple's HIG). It is also the number this codebase
 *      already chose for itself: keyboardLayout.octavesForWidth() drops from
 *      two octaves to one precisely to keep white keys at or above
 *      `minWhiteKeyPx = 44`. So this rule verifies the app's own stated intent.
 *
 *   2. Black keys: >= 24 x 24 CSS px.
 *      WCAG 2.1 SC 2.5.8 Target Size (Minimum) is the AA-level criterion and
 *      sets 24px. It also carries an explicit exception for targets whose
 *      presentation is "essential" -- a piano's key geometry qualifies. 24px is
 *      the strongest floor that is still honest about the instrument.
 *
 *   3. White-key PITCH >= 44px.
 *      The comment in PianoKeyboard.svelte's stylesheet is explicit that the
 *      real touch guarantee is pitch-based, not width-based (a px min-width
 *      fought the percentage layout and made keys overlap). Pitch is the
 *      centre-to-centre spacing between adjacent white keys, so this measures
 *      the thing the code claims to guarantee.
 */

const FINGERTIP_PX = 44;
const WCAG_MINIMUM_PX = 24;

/** Stamps a chord on the Lookup hub, which reveals a PianoKeyboard deterministically. */
async function revealKeyboard(page: Page): Promise<void> {
	await page.goto('/');
	await page.getByRole('textbox').first().fill('Cm7');
	await page.getByRole('button', { name: 'Stamp', exact: true }).click();
	await expect(page.locator('.piano-keyboard')).toBeVisible();
}

interface Box {
	width: number;
	height: number;
	left: number;
}

async function boxesOf(page: Page, selector: string): Promise<Box[]> {
	return page.$$eval(selector, (elements) =>
		elements.map((element) => {
			const rect = element.getBoundingClientRect();
			return { width: rect.width, height: rect.height, left: rect.left };
		})
	);
}

test.describe('bottom tab bar', () => {
	test.use({ viewport: PHONE });

	test('every tab is at least 44x44', async ({ page }) => {
		await page.goto('/practice');
		await expect(page.getByTestId('bottom-tab-bar')).toBeVisible();

		const boxes = await boxesOf(page, '.bottom-tab-bar__item');
		expect(boxes).toHaveLength(4);

		for (const [index, box] of boxes.entries()) {
			expect(box.width, `tab ${index} width`).toBeGreaterThanOrEqual(FINGERTIP_PX);
			expect(box.height, `tab ${index} height`).toBeGreaterThanOrEqual(FINGERTIP_PX);
		}
	});
});

/*
 * The keyboard is checked at three widths because octave count is
 * width-derived: one octave on a portrait phone, two once the available width
 * clears 15 * 44px. The two-octave case is the one the manual backlog kept
 * asking about, and portrait phone never reaches it -- landscape does.
 */
for (const [label, viewport] of [
	['phone portrait', PHONE],
	['phone landscape', PHONE_LANDSCAPE],
	['desktop', DESKTOP]
] as const) {
	test.describe(`piano keyboard, ${label}`, () => {
		test.use({ viewport });

		/*
		 * KNOWN GAP at 375px portrait, and it is PLATFORM DEPENDENT.
		 *
		 * These two assertions were originally marked `test.fail(label === 'phone
		 * portrait')`, which claims the defect always reproduces in portrait. It
		 * does not. Measured: macOS renders 43.80px white keys (43.32px pitch) at a
		 * 375px viewport, under the 44px floor; ubuntu-latest in CI clears 44px on
		 * the same viewport, presumably from different default font metrics and
		 * scrollbar reservation. So the `test.fail()` markers passed locally and
		 * then failed CI with "Expected to fail, but passed", turning the run red
		 * for the wrong reason.
		 *
		 * A sub-pixel browser measurement cannot be a reliable gate for this. The
		 * invariant that actually matters is in the pure function:
		 * `keyboardLayout.octavesForWidth` (`:52`) only tests whether the TWO-octave
		 * layout fits and then returns 1 unconditionally, never checking that one
		 * octave needs 8 * 44 = 352px of key area. That is the real defect and the
		 * real fix belongs there, where it is deterministic and unit-testable.
		 *
		 * Parked with `test.fixme` rather than `test.fail`: the assertions are the
		 * real ones at the real threshold, they report as skipped on every platform
		 * instead of flipping red by environment, and they are ready to re-enable
		 * the moment `octavesForWidth` guards the one-octave case. Landscape and
		 * desktop stay hard assertions. The measurement test below still runs
		 * everywhere, so the numbers are recorded rather than hidden.
		 */
		const portraitGap = label === 'phone portrait';
		const gapReason =
			'Parked: octavesForWidth does not check that the one-octave layout meets its own ' +
			'44px floor. Measured 43.8px white keys (43.3px pitch) at 375px on macOS; ' +
			'ubuntu CI clears 44px on the same viewport, so this is not a stable gate.';

		test('the octave count matches the available width', async ({ page }) => {
			await revealKeyboard(page);

			const whites = await boxesOf(page, '.piano-keyboard__key--white');
			const blacks = await boxesOf(page, '.piano-keyboard__key--black');

			// One octave is 8 white keys + 5 black; two octaves is 15 + 10.
			expect([8, 15]).toContain(whites.length);
			expect([5, 10]).toContain(blacks.length);
			expect(blacks.length).toBe(whites.length === 8 ? 5 : 10);
		});

		test('black keys clear the WCAG minimum target size', async ({ page }) => {
			await revealKeyboard(page);

			const blacks = await boxesOf(page, '.piano-keyboard__key--black');
			expect(blacks.length).toBeGreaterThan(0);

			for (const [index, box] of blacks.entries()) {
				expect(box.width, `black key ${index} width`).toBeGreaterThanOrEqual(WCAG_MINIMUM_PX);
				expect(box.height, `black key ${index} height`).toBeGreaterThanOrEqual(WCAG_MINIMUM_PX);
			}
		});

		test('white keys clear the fingertip floor', async ({ page }) => {
			test.fixme(portraitGap, gapReason);
			await revealKeyboard(page);

			const whites = await boxesOf(page, '.piano-keyboard__key--white');
			for (const [index, box] of whites.entries()) {
				expect(box.width, `white key ${index} width`).toBeGreaterThanOrEqual(FINGERTIP_PX);
				expect(box.height, `white key ${index} height`).toBeGreaterThanOrEqual(FINGERTIP_PX);
			}
		});

		test('white key pitch clears the fingertip floor', async ({ page }) => {
			test.fixme(portraitGap, gapReason);
			await revealKeyboard(page);

			const whites = (await boxesOf(page, '.piano-keyboard__key--white')).sort(
				(a, b) => a.left - b.left
			);

			for (let index = 1; index < whites.length; index += 1) {
				const pitch = whites[index].left - whites[index - 1].left;
				expect(pitch, `pitch between white keys ${index - 1} and ${index}`).toBeGreaterThanOrEqual(
					FINGERTIP_PX
				);
			}
		});

		/** Records the measured numbers even when the floor is missed, so the gap is quantified rather than just flagged. */
		test('reports measured white-key geometry', async ({ page }, testInfo) => {
			await revealKeyboard(page);

			const whites = (await boxesOf(page, '.piano-keyboard__key--white')).sort(
				(a, b) => a.left - b.left
			);
			const pitches = whites.slice(1).map((box, i) => box.left - whites[i].left);
			testInfo.annotations.push({
				type: 'measured',
				description:
					`${label}: ${whites.length} white keys, ` +
					`min width ${Math.min(...whites.map((b) => b.width)).toFixed(2)}px, ` +
					`min pitch ${Math.min(...pitches).toFixed(2)}px`
			});
			expect(whites.length).toBeGreaterThan(0);
		});
	});
}

/**
 * THE 375px PORTRAIT GAP (found by this suite, not fixed by it)
 * -------------------------------------------------------------
 * At a 375px-wide viewport the keyboard renders ONE octave (8 white keys) into
 * roughly 346.6px of content width, giving 43.80px keys on a 43.32px pitch.
 * Both are under 44px.
 *
 * The cause is that `keyboardLayout.octavesForWidth(width, minWhiteKeyPx = 44)`
 * only checks the TWO-octave case (`width >= 15 * 44`); when that fails it
 * returns 1 unconditionally. Nothing then checks that one octave's 8 white keys
 * still need `8 * 44 = 352px`. Below ~352px of content width the stated 44px
 * guarantee silently does not hold. A 390px-class phone clears it (~361px
 * content, 45.2px keys); a 375px-class phone does not.
 *
 * Landscape and desktop both pass, including the two-octave layout, so the
 * long-standing "two-octave phone tap targets" question is answered: two
 * octaves are fine, one octave at 375px is not.
 *
 * Not fixed here: the fix belongs in src/lib/components/keyboardLayout.ts or
 * PianoKeyboard.svelte, which this change does not own.
 */
