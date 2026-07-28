import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, PHONE, PHONE_LANDSCAPE, PHONE_NARROW } from './helpers';

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

/**
 * Stamps a chord on the Lookup hub, which reveals a PianoKeyboard
 * deterministically, then WAITS FOR THE REVEAL ANIMATION TO SETTLE.
 *
 * The settle step is load-bearing, not politeness. The lookup result animates in
 * under `stamp-in`, which scales the whole block (`transform: matrix(0.9647, ...)`
 * on the way to 1). `getBoundingClientRect` reports post-transform boxes, so
 * measuring as soon as the keyboard is merely VISIBLE measures a shrunken
 * keyboard: 44.875px keys read as 43.29px, and two separate tests sampling two
 * different animation frames disagree with each other (43.80 vs 43.32) even
 * though the layout is identical. Every box check in this file has to wait for
 * the transform to reach identity or it is measuring an animation, not a layout.
 */
async function revealKeyboard(page: Page): Promise<void> {
	await page.goto('/');
	await page.getByRole('textbox').first().fill('Cm7');
	await page.getByRole('button', { name: 'Stamp', exact: true }).click();
	await expect(page.locator('.piano-keyboard')).toBeVisible();

	await page
		.locator('.piano-keyboard')
		.evaluate((element) =>
			Promise.all(
				element
					.getAnimations({ subtree: true })
					.concat(
						(function ancestors(node: Element | null): Animation[] {
							return node
								? node.getAnimations().concat(ancestors(node.parentElement))
								: [];
						})(element)
					)
					.map((animation) => animation.finished.catch(() => undefined))
			).then(() => undefined)
		);
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
 * The keyboard is checked at four widths because octave count is width-derived:
 * one octave on a portrait phone, two once the available width clears 15 * 44px.
 * The two-octave case is the one the manual backlog kept asking about, and
 * portrait phone never reaches it -- landscape does. The NARROW phone (320px) is
 * where the one-octave span genuinely runs out of room, so it is the case that
 * pins the board's minimum width and its horizontal scroll.
 */
for (const [label, viewport] of [
	['phone narrow', PHONE_NARROW],
	['phone portrait', PHONE],
	['phone landscape', PHONE_LANDSCAPE],
	['desktop', DESKTOP]
] as const) {
	test.describe(`piano keyboard, ${label}`, () => {
		test.use({ viewport });

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
			await revealKeyboard(page);

			const whites = await boxesOf(page, '.piano-keyboard__key--white');
			for (const [index, box] of whites.entries()) {
				expect(box.width, `white key ${index} width`).toBeGreaterThanOrEqual(FINGERTIP_PX);
				expect(box.height, `white key ${index} height`).toBeGreaterThanOrEqual(FINGERTIP_PX);
			}
		});

		test('white key pitch clears the fingertip floor', async ({ page }) => {
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

		/** Records the measured numbers so the geometry is quantified, not just asserted. */
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

		/**
		 * The keyboard may scroll inside itself to hold the floor, but the PAGE
		 * must never scroll sideways (the same invariant hubs.spec asserts). This
		 * is what makes "widen the board and scroll it" a legitimate answer to a
		 * container that is too narrow.
		 */
		test('a keyboard wider than its container never makes the page scroll sideways', async ({
			page
		}) => {
			await revealKeyboard(page);

			const doc = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth
			}));
			expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth);
		});
	});
}

/**
 * WHAT THE ONE-OCTAVE FLOOR ACTUALLY MEASURES (corrected)
 * -------------------------------------------------------
 * An earlier revision of this file recorded a "375px portrait gap": 43.80px keys
 * on a 43.32px pitch, first marked `test.fail()`, then re-marked `test.fixme()`
 * on the theory that the gap was PLATFORM DEPENDENT, because macOS measured
 * under 44px while ubuntu CI cleared it on the same viewport (guessed at as
 * differing font metrics or scrollbar reservation).
 *
 * It is not platform dependent, and neither number was layout. Both were
 * measurement artifacts. The lookup result animates in under `stamp-in`, which
 * scales the block from 0.9647 to 1, and `getBoundingClientRect` reports
 * post-transform boxes -- so measuring the instant the keyboard became visible
 * measured a keyboard mid-shrink. The tell is that the two figures disagreed
 * with each other (43.80 width vs 43.32 pitch): a white key's width and its
 * pitch are the SAME 12.5% of the board, so no layout can separate them. Two
 * tests simply sampled two different animation frames, and the platform split
 * was the two machines animating at different speeds, not measuring different
 * geometry.
 *
 * `revealKeyboard` now waits for every animation on the keyboard and its
 * ancestors to finish, so the measurement is of a layout rather than of a
 * transition. The assertions are plain `test()` again, hard on every viewport
 * and every platform: verified passing on macOS locally and on ubuntu in CI.
 *
 * Settled geometry, measured in real Chromium at four widths, BEFORE the
 * keyboardLayout fix:
 *
 *   viewport   keyboard container   white key / pitch
 *   320px      304px                38.00px   under the floor
 *   360px      344px                43.00px   under the floor
 *   375px      359px                44.875px  fine all along
 *   390px      374px                46.75px   fine
 *
 * So the defect was real but a class narrower than reported: `octavesForWidth`
 * only ever tested the TWO-octave span and returned 1 as an unconditional
 * fallback, so nothing checked that one octave's 8 white keys still need
 * 8 * 44 = 352px. 375px happened to clear it; 320px and 360px did not.
 *
 * The board now carries `minBoardWidthPx` as a px min-width and the keyboard
 * scrolls horizontally when its container cannot supply it, so all four widths
 * measure >= 44px (320px and 360px land at exactly 44.00px) and the page still
 * never scrolls sideways.
 */
