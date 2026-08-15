import { expect, test } from '@playwright/test';

/**
 * The masthead MIDI chip's connect lifecycle and self-hiding behavior, in
 * real Chromium (Phase 38 Plan 04, MIDI-01/MIDI-04).
 *
 * THE BOUNDARY THIS SPEC DELIBERATELY DOES NOT CROSS: Chromium has a Web
 * MIDI implementation but no physical instrument attached in this
 * environment, so `WebMidi.inputs` is always empty here. This spec therefore
 * proves the connect lifecycle, the terminal-state guarantee, and the
 * no-chrome path on an unsupported browser - and it deliberately proves
 * NOTHING about a real device name, real plug/unplug, or real hot-plug
 * timing. Those three are manual-only and covered by this plan's
 * checkpoint:human-verify task, recorded in 38-UAT.md with the physical USB
 * piano attached.
 */

/*
 * 'midi' ONLY, never 'midi-sysex'. Granting sysex here would mean T-38-01
 * ("never request system-exclusive access") was verified nowhere but against a
 * fake namespace in webmidi.test.ts: if production regressed to
 * `enable({ sysex: true })`, a suite that pre-granted sysex would stay green.
 * With only 'midi' granted, the sysex-recording spec at the bottom of this file
 * observes the real options object handed to navigator.requestMIDIAccess.
 */
test.use({ permissions: ['midi'] });

test('tapping the chip always reaches a terminal connection state', async ({ page }) => {
	await page.goto('/');

	const chip = page.getByTestId('midi-status');
	await expect(chip).toBeVisible();
	await expect(chip).toHaveAttribute('data-midi-state', 'idle');

	await chip.click();

	// Assert the TERMINAL-VALUE FORM, not one hardcoded value, on purpose:
	// whether headless Chromium's MIDI stack resolves granted-with-zero-inputs
	// or refuses outright is an environment detail. The real product
	// guarantee - the one the Chrome 124 permission-prompt change threatens -
	// is that a connect click never leaves the user staring at a chip stuck
	// on "connecting". Do not tighten this into a single expected value; that
	// would make the test flaky against an environment detail this app does
	// not control.
	await expect
		.poll(() => chip.getAttribute('data-midi-state'), { timeout: 5_000 })
		.toMatch(/^(no-device|connected|denied|error)$/);
});

test('a browser without Web MIDI shows no MIDI chrome and every existing flow still works', async ({
	page
}) => {
	// Must be an init script (runs before the app's own code) and must target
	// Navigator.prototype (not the navigator instance), since some engines
	// resolve requestMIDIAccess through the prototype chain.
	await page.addInitScript(() => {
		Object.defineProperty(Navigator.prototype, 'requestMIDIAccess', {
			value: undefined,
			configurable: true
		});
	});

	await page.goto('/');

	await expect(page.getByTestId('midi-status')).toHaveCount(0);

	// The real-browser proof of the ROADMAP's third success criterion: no
	// MIDI chrome, and the non-MIDI on-screen-keyboard path is not a
	// degraded fallback - it still works end to end.
	await page.getByTestId('starter-chord').first().click();
	await expect(page.getByTestId('chord-result')).toBeVisible();
});

test('navigating away during a connect attempt leaves the app healthy', async ({ page }) => {
	const pageErrors: Error[] = [];
	page.on('pageerror', (err) => pageErrors.push(err));

	await page.goto('/');
	await page.getByTestId('midi-status').click();

	/*
	 * CLIENT-SIDE navigation, on purpose. `page.goto('/learn')` would be a full
	 * document navigation: it tears the JS realm down, so the module-scope
	 * state and the in-flight enableMidi() promise are DESTROYED rather than
	 * raced, and the assertion below would hold even if midi.svelte.ts's
	 * stale-promise guard did not exist at all. Clicking a SvelteKit link
	 * preserves the realm, so the pending promise really does resolve into a
	 * still-live module while the user is on another route.
	 */
	await page.getByRole('link', { name: 'Learn' }).click();
	await expect(page.getByRole('heading', { name: 'Learn' })).toBeVisible();

	// The chip is still mounted (it lives in the masthead, which every route
	// shares), so the observable guarantee is assertable: the connect attempt
	// resolved into a terminal state rather than getting stuck on "connecting".
	const chip = page.getByTestId('midi-status');
	await expect
		.poll(() => chip.getAttribute('data-midi-state'), { timeout: 5_000 })
		.toMatch(/^(no-device|connected|denied|error)$/);

	expect(pageErrors).toEqual([]);
});

test('the connect path never requests system-exclusive access (T-38-01, real browser)', async ({
	page
}) => {
	/*
	 * The real-browser half of T-38-01. webmidi.test.ts asserts
	 * `enable({ sysex: false })` against a FAKE namespace, which proves what
	 * this app asks the library for but nothing about what the library then
	 * asks the browser for. This records the actual options object reaching
	 * navigator.requestMIDIAccess, then delegates to the real implementation so
	 * the connect lifecycle is unchanged.
	 */
	await page.addInitScript(() => {
		const recorded: Array<{ sysex?: boolean } | null> = [];
		(window as unknown as { __midiRequests: typeof recorded }).__midiRequests = recorded;

		const original = Navigator.prototype.requestMIDIAccess;
		Object.defineProperty(Navigator.prototype, 'requestMIDIAccess', {
			configurable: true,
			writable: true,
			value: function (this: Navigator, options?: { sysex?: boolean }) {
				recorded.push(options ?? null);
				return original.call(this, options as never);
			}
		});
	});

	await page.goto('/');

	const chip = page.getByTestId('midi-status');
	await expect(chip).toHaveAttribute('data-midi-state', 'idle');
	await chip.click();

	await expect
		.poll(() => chip.getAttribute('data-midi-state'), { timeout: 5_000 })
		.toMatch(/^(no-device|connected|denied|error)$/);

	const requests = await page.evaluate(
		() => (window as unknown as { __midiRequests: Array<{ sysex?: boolean } | null> }).__midiRequests
	);

	// A vacuous pass is the failure mode to guard against here: if the stub was
	// never reached, "no request asked for sysex" is trivially true.
	expect(requests.length).toBeGreaterThan(0);
	for (const options of requests) {
		expect(options?.sysex).not.toBe(true);
	}
});
