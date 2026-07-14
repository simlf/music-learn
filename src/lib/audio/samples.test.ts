import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SALAMANDER_BASE_URL, SALAMANDER_URLS } from './samples';

const SAMPLES_DIR = join(__dirname, '../../../static/samples/salamander');

describe('Salamander sample map', () => {
	it('covers 30 samples at minor-third spacing from A0 to C8', () => {
		const names = Object.keys(SALAMANDER_URLS);
		expect(names).toHaveLength(30);
		expect(names[0]).toBe('A0');
		expect(names[names.length - 1]).toBe('C8');
	});

	it('spells sharps as "s" in file names (Tone.js conversion convention)', () => {
		for (const [note, file] of Object.entries(SALAMANDER_URLS)) {
			expect(file).toBe(`${note.replace('#', 's')}.mp3`);
		}
	});

	it('serves from the adapter-static path for the committed folder', () => {
		expect(SALAMANDER_BASE_URL).toBe('/samples/salamander/');
	});

	it('every mapped file is committed in static/samples/salamander and is non-trivial', () => {
		for (const file of Object.values(SALAMANDER_URLS)) {
			const path = join(SAMPLES_DIR, file);
			expect(existsSync(path), `missing sample file: ${file}`).toBe(true);
			expect(statSync(path).size).toBeGreaterThan(10_000);
		}
	});

	it('ships the CC-BY attribution next to the samples', () => {
		expect(existsSync(join(SAMPLES_DIR, 'LICENSE.txt'))).toBe(true);
	});
});
