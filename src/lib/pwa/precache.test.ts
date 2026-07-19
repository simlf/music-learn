import { describe, expect, it } from 'vitest';
import { SALAMANDER_BASE_URL } from '$lib/audio/samples';
import { cacheName, installPrecacheList, isSampleAsset } from './precache';

describe('isSampleAsset', () => {
	it('is true for a Salamander sample mp3 path', () => {
		expect(isSampleAsset('/samples/salamander/C4.mp3')).toBe(true);
	});

	it('is false for an icon path', () => {
		expect(isSampleAsset('/icons/icon-192.png')).toBe(false);
	});

	it('is false for a hashed build chunk path', () => {
		expect(isSampleAsset('/_app/immutable/chunk.js')).toBe(false);
	});
});

describe('installPrecacheList', () => {
	it('returns every build entry and every prerendered entry unchanged', () => {
		const build = ['/_app/immutable/entry.js', '/_app/immutable/chunk.js'];
		const prerendered = ['/', '/lessons'];
		const result = installPrecacheList(build, [], prerendered);
		for (const entry of [...build, ...prerendered]) {
			expect(result).toContain(entry);
		}
	});

	it('includes small static files but excludes sample mp3s', () => {
		const files = ['/samples/salamander/A0.mp3', '/icons/icon-192.png', '/manifest.webmanifest'];
		const result = installPrecacheList([], files, []);
		expect(result).toContain('/icons/icon-192.png');
		expect(result).toContain('/manifest.webmanifest');
		expect(result).not.toContain('/samples/salamander/A0.mp3');
	});

	it('never contains an entry that includes SALAMANDER_BASE_URL', () => {
		const files = [
			'/samples/salamander/A0.mp3',
			'/samples/salamander/C4.mp3',
			'/icons/icon-512.png'
		];
		const result = installPrecacheList([], files, []);
		for (const entry of result) {
			expect(entry.includes(SALAMANDER_BASE_URL)).toBe(false);
		}
	});

	it('de-duplicates entries that appear more than once', () => {
		const build = ['/_app/immutable/entry.js'];
		const files = ['/_app/immutable/entry.js', '/manifest.webmanifest'];
		const prerendered = ['/'];
		const result = installPrecacheList(build, files, prerendered);
		const occurrences = result.filter((e) => e === '/_app/immutable/entry.js').length;
		expect(occurrences).toBe(1);
	});
});

describe('cacheName', () => {
	it('is deterministic for the same version', () => {
		expect(cacheName('abc123')).toBe(cacheName('abc123'));
	});

	it('embeds the version string', () => {
		expect(cacheName('abc123')).toContain('abc123');
	});

	it('produces different names for different versions', () => {
		expect(cacheName('abc123')).not.toBe(cacheName('def456'));
	});
});
