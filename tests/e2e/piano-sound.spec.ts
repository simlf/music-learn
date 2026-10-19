import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { SALAMANDER_BASE_URL, SALAMANDER_URLS } from '../../src/lib/audio/samples';

/**
 * The keyboard sounds like a piano in the production build: every Salamander
 * file the engine asks for is in the build output and served as audio, and a
 * key tap is voiced by a decoded sample, never by the PolySynth fallback.
 *
 * Audio is observed at the Web Audio boundary through `page.addInitScript`
 * (no app hook): the sampler starts an AudioBufferSourceNode holding a
 * multi-second recording, the synth starts OscillatorNodes. The one oscillator
 * started while Tone loads is standardized-audio-context's own feature probe,
 * which is why only starts AFTER the tap count.
 */

test('every mapped piano sample is in the build output and served as audio', async ({
	request
}) => {
	// Checked on disk too: `vite preview` falls back to static/, so an HTTP 200
	// here alone would not catch a build that dropped the samples, while
	// production nginx serves build/ and nothing else.
	const buildDir = resolve(test.info().project.testDir, '../../build', SALAMANDER_BASE_URL.slice(1));
	for (const file of [...Object.values(SALAMANDER_URLS), 'LICENSE.txt']) {
		const onDisk = join(buildDir, file);
		expect(existsSync(onDisk), `missing from build output: ${file}`).toBe(true);
		expect(statSync(onDisk).size).toBeGreaterThan(100);
		const response = await request.get(`${SALAMANDER_BASE_URL}${file}`);
		expect(response.status(), `not served: ${file}`).toBe(200);
		if (file.endsWith('.mp3')) {
			expect(response.headers()['content-type']).toContain('audio/mpeg');
			expect((await response.body()).length).toBeGreaterThan(10_000);
		}
	}
});

test('a key tap plays a piano sample, not the synth fallback', async ({ page }) => {
	// Room for the first tap's wait on all 30 samples to download and decode.
	test.setTimeout(30_000);
	await page.addInitScript(() => {
		const log: string[] = [];
		(window as unknown as { __audioStarts: string[] }).__audioStarts = log;
		const startBuffer = AudioBufferSourceNode.prototype.start;
		AudioBufferSourceNode.prototype.start = function (...args) {
			if (this.buffer && this.buffer.duration > 1) log.push('sample');
			return startBuffer.apply(this, args);
		};
		const startOscillator = OscillatorNode.prototype.start;
		OscillatorNode.prototype.start = function (...args) {
			log.push('oscillator');
			return startOscillator.apply(this, args);
		};
	});
	const starts = () =>
		page.evaluate(() => (window as unknown as { __audioStarts: string[] }).__audioStarts);

	await page.goto('/');
	await page.getByRole('textbox').fill('C');
	await page.keyboard.press('Enter');
	const key = page.locator('.piano-keyboard__key[aria-label]').first();
	await expect(key).toBeVisible();

	// The first tap unlocks audio and waits for the samples to load before it
	// sounds; the second is the steady state every later tap is in.
	await key.click();
	await expect.poll(async () => (await starts()).includes('sample'), { timeout: 15_000 }).toBe(true);
	const before = (await starts()).length;
	await page.waitForTimeout(100);
	await key.click();
	await expect.poll(async () => (await starts()).length, { timeout: 5_000 }).toBeGreaterThan(before);

	const afterLoad = (await starts()).slice((await starts()).indexOf('sample'));
	expect(afterLoad).not.toContain('oscillator');
	expect(afterLoad.filter((start) => start === 'sample')).toHaveLength(2);
});
