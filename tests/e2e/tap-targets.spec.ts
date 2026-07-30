import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, openPracticeFamily, PHONE, PHONE_LANDSCAPE, PHONE_NARROW } from './helpers';

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
 * The floor a ONE-octave board holds instead of `FINGERTIP_PX` (260730-q3f,
 * `keyboardLayout.MIN_ONE_OCTAVE_WHITE_KEY_PX`): 40px, the width below which a
 * black key (60% of a white key) would breach WCAG 2.1 SC 2.5.5's 24px
 * minimum. Such a board no longer wraps to two rows, so it fits its container
 * down to this floor rather than imposing 352px on it - that min-width is what
 * pushed the keyboard, and inside a grid track its whole card, off the right
 * edge of the screen. A white key is also 160px TALL, so the tappable area
 * stays far larger than a 40px square.
 */
const ONE_OCTAVE_FIT_FLOOR_PX = 40;

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
/*
 * `floorPx` is per-viewport since 260730-q3f: the Lookup keyboard self-measures
 * a ONE-octave span at every phone width, and a one-octave board now fits its
 * container rather than imposing a 352px min-width on it. At 375px and up the
 * container already supplies 44px keys, so the fingertip floor still holds
 * there; only the 320px-class container (~304px, 38px keys) falls back to
 * `ONE_OCTAVE_FIT_FLOOR_PX`.
 */
for (const [label, viewport, floorPx] of [
	['phone narrow', PHONE_NARROW, ONE_OCTAVE_FIT_FLOOR_PX],
	['phone portrait', PHONE, FINGERTIP_PX],
	['phone landscape', PHONE_LANDSCAPE, FINGERTIP_PX],
	['desktop', DESKTOP, FINGERTIP_PX]
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
				expect(box.width, `white key ${index} width`).toBeGreaterThanOrEqual(floorPx);
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
					floorPx
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
		 * The keyboard wraps into two stacked rows to hold the floor rather than
		 * scrolling horizontally (LOCKED user decision, replacing the old
		 * "may scroll inside itself" behavior) - so the PAGE must never scroll
		 * sideways (the same invariant hubs.spec asserts), and neither should the
		 * keyboard element itself once the two-row wrap is available.
		 */
		test('a keyboard too narrow for one row never makes the page scroll sideways', async ({
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
 * Two-row wrap check (replaces horizontal scroll, LOCKED user decision): at
 * phone widths narrow enough that a single row cannot hold the 44px
 * fingertip floor, `PianoKeyboard` now stacks into two independently-correct
 * mini-keyboards instead of growing past its container and scrolling.
 *
 * Uses `/practice`'s "Build it" drill (`openPracticeFamily(page, 'build-it')`
 * -> `BuildSession.svelte` -> `PianoKeyboard octaves={2}`) rather than the
 * Lookup page's `revealKeyboard` helper: Lookup's keyboard has NO explicit
 * `octaves` prop and self-measures a 1-OCTAVE span at these viewports (its
 * own 352px unstacked floor is either already met - 375px viewport's ~359px
 * container - or, at 320px's ~304px container, is genuinely too narrow even
 * to benefit from stacking, since row 1 there is 7 keys/308px). The
 * `octaves={2}` case is the one that actually reproduces the live-browser
 * defect this suite exists to catch (every real construction/voicing drill
 * pins `octaves={2}`), and its floors differ from the 1-octave case:
 *
 *   viewport         measured container   2-oct unstacked floor   stacks?
 *   320px (narrow)   ~304px               660px (no)               NO -
 *     304px is also below the STACKED row-2 floor (352px, 8 keys), so
 *     stacking would not help either - genuinely too narrow for this
 *     app's phone-first target range; stays single-row (falls back to
 *     the pre-existing scroll wrapper for the remaining gap).
 *   375px (portrait) ~359px               660px (no)               YES -
 *     359px clears the stacked floor (352px).
 *   812x375 (landscape) ~748px            660px (yes, already fits)  NO
 *   1280px (desktop)    ~1216px           660px (yes)                NO
 *
 * (Verified live via a throwaway diagnostic Playwright test against this
 * exact page/viewport matrix before writing these expectations - see
 * 260729-ert-SUMMARY.md's Issues Encountered section.)
 */
for (const [label, viewport, expectStacked] of [
	['phone narrow', PHONE_NARROW, false],
	['phone portrait', PHONE, true],
	['phone landscape', PHONE_LANDSCAPE, false],
	['desktop', DESKTOP, false]
] as const) {
	test.describe(`piano keyboard row-stacking (octaves=2 pinned), ${label}`, () => {
		test.use({ viewport });

		test(`renders ${expectStacked ? 'two stacked rows' : 'a single unstacked row'}, and (when stacked) the keyboard element itself never needs to scroll`, async ({
			page
		}) => {
			await openPracticeFamily(page, 'build-it');
			await expect(page.getByTestId('build-session')).toBeVisible();
			await page.locator('.piano-keyboard').first().waitFor();

			const rowsWrapper = page.locator('.piano-keyboard__rows');
			await expect(rowsWrapper).toHaveCount(expectStacked ? 1 : 0);

			// Only meaningful to assert "never scrolls" once stacking actually
			// applies - the phone-narrow case is a genuine degraded single-row
			// case that legitimately still needs its scroll-wrap fallback (see
			// the doc comment above), so this assertion is scoped to the
			// stacked case rather than every viewport.
			if (expectStacked) {
				const keyboard = page.locator('.piano-keyboard').first();
				const overflow = await keyboard.evaluate((element) => ({
					scrollWidth: element.scrollWidth,
					clientWidth: element.clientWidth
				}));
				expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
			}
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
 * The board originally carried `minBoardWidthPx` as a px min-width and the
 * keyboard scrolled horizontally when its container could not supply it, so
 * all four widths measured >= 44px (320px and 360px landed at exactly
 * 44.00px) and the page never scrolled sideways. That single-row/scroll
 * behavior has since been replaced (LOCKED user decision, quick task
 * 260729-ert): the practice page's voicing card needed the full note range
 * visible with zero horizontal scrolling, so a container too narrow for one
 * row now wraps into two stacked mini-keyboards instead - each row
 * independently clears the 44px floor at the SAME widths this always
 * measured, with no horizontal scroll needed on either row.
 *
 * Narrowed once more in 260730-q3f: two-row wrapping now applies to the
 * TWO-octave span only. A one-octave board fits its container in a single row
 * (its split would have left a lone C on row 2), at the `floorPx` recorded per
 * viewport above.
 */

/**
 * The voicing card's "meet" stage, at phone widths (260730-q3f regression).
 *
 * This is the surface the user reported as clipped, and it is worth its own
 * test because it failed in a way no keyboard-only test could catch: `.vcards`
 * used a bare `1fr` grid track, whose item takes its MIN-CONTENT width as a
 * floor, and a `PianoKeyboard`'s min-content width included the board's own
 * `min-width` px floor. The pre-measurement default span is two octaves, so
 * that floor was 660px: measured live at a 390px viewport, the cards rendered
 * 680px wide holding 660px boards, and the PAGE scrolled sideways to 688px.
 * The keyboard then measured 660px and concluded two octaves fit, so every
 * keyboard-internal assertion looked perfectly healthy while the card hung off
 * the screen.
 */
for (const [label, viewport, keyboardFitsContainer] of [
	// 320px is the documented degraded class: its ~284px card interior is below
	// the one-octave board's own 320px floor, so the keyboard still scrolls
	// INSIDE itself there. The page and the cards must fit at every width.
	['phone narrow', PHONE_NARROW, false],
	['phone portrait', PHONE, true],
	['phone 390', { width: 390, height: 844 }, true]
] as const) {
	test.describe(`voicing meet stage, ${label}`, () => {
		test.use({ viewport });

		test('fits the viewport: no sideways page scroll, no card wider than the page, one row per keyboard', async ({
			page
		}) => {
			await openPracticeFamily(page, 'voicing');
			await page.getByTestId('step-meet').click();
			await expect(page.getByTestId('stage-meet')).toBeVisible();

			const measured = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
				cardWidths: [...document.querySelectorAll('.vcard')].map(
					(card) => card.getBoundingClientRect().width
				),
				stackedKeyboards: document.querySelectorAll('.piano-keyboard__rows').length,
				keyboardOverflow: [...document.querySelectorAll('.piano-keyboard')].map(
					(keyboard) => keyboard.scrollWidth - keyboard.clientWidth
				)
			}));

			expect(measured.scrollWidth).toBeLessThanOrEqual(measured.clientWidth);
			expect(measured.cardWidths).toHaveLength(2);
			for (const width of measured.cardWidths) {
				expect(width).toBeLessThanOrEqual(measured.clientWidth);
			}
			expect(measured.stackedKeyboards).toBe(0);
			if (keyboardFitsContainer) {
				for (const overflow of measured.keyboardOverflow) {
					expect(overflow).toBeLessThanOrEqual(0);
				}
			}
		});
	});
}
