import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appHtml = readFileSync('src/app.html', 'utf-8');
const manifest = JSON.parse(readFileSync('static/manifest.webmanifest', 'utf-8'));

describe('src/app.html iOS add-to-home-screen meta tags', () => {
	it('marks the app as apple-mobile-web-app-capable', () => {
		expect(appHtml).toMatch(/name="apple-mobile-web-app-capable"\s+content="yes"/);
	});

	it('includes the newer mobile-web-app-capable meta tag', () => {
		expect(appHtml).toContain('name="mobile-web-app-capable"');
	});

	it('sets the apple-mobile-web-app-title to Music Learn', () => {
		expect(appHtml).toMatch(/name="apple-mobile-web-app-title"\s+content="Music Learn"/);
	});

	it('sets an apple-mobile-web-app-status-bar-style', () => {
		expect(appHtml).toContain('name="apple-mobile-web-app-status-bar-style"');
	});

	it('links an apple-touch-icon referencing the 180 asset', () => {
		expect(appHtml).toMatch(/apple-touch-icon[\s\S]*?apple-touch-icon-180\.png/);
	});
});

describe('static/manifest.webmanifest installability preconditions', () => {
	it('has non-empty name and short_name', () => {
		expect(manifest.name).toBeTruthy();
		expect(manifest.short_name).toBeTruthy();
	});

	/**
	 * B6: start_url used to be "/", the Lookup tool (a chord-symbol text box),
	 * so every cold launch of the installed app opened the one screen where
	 * nothing gets practiced. It now points at /practice. scope stays "/" so
	 * every route still runs inside the installed app.
	 */
	it('launches into /practice, with a scope of "/" that still covers every route', () => {
		expect(manifest.start_url).toBe('/practice');
		expect(manifest.scope).toBe('/');
	});

	it('has display "standalone"', () => {
		expect(manifest.display).toBe('standalone');
	});

	it('includes a 192x192 and a 512x512 icon', () => {
		const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
		expect(sizes).toContain('192x192');
		expect(sizes).toContain('512x512');
	});

	it('includes at least one maskable icon', () => {
		const hasMaskable = manifest.icons.some((icon: { purpose?: string }) =>
			icon.purpose?.includes('maskable')
		);
		expect(hasMaskable).toBe(true);
	});
});

/**
 * B6: home-screen icon long-press shortcuts. With start_url on /practice, the
 * Lookup tool needs a one-tap route back that is not "launch the app, then
 * navigate", since Lookup is the thing you reach for with sheet music in front
 * of you.
 */
describe('static/manifest.webmanifest launch shortcuts (B6)', () => {
	interface Shortcut {
		name: string;
		short_name?: string;
		description?: string;
		url: string;
		icons?: { src: string; sizes: string; type: string }[];
	}
	const shortcuts: Shortcut[] = manifest.shortcuts;

	it('declares a shortcuts array', () => {
		expect(Array.isArray(shortcuts)).toBe(true);
		expect(shortcuts.length).toBeGreaterThanOrEqual(2);
	});

	it('includes a Practice shortcut pointing at /practice', () => {
		const practice = shortcuts.find((shortcut) => shortcut.url === '/practice');
		expect(practice).toBeDefined();
		expect(practice?.name).toBe('Practice');
	});

	it('includes a chord-lookup shortcut pointing at /', () => {
		const lookup = shortcuts.find((shortcut) => shortcut.url === '/');
		expect(lookup).toBeDefined();
		expect(lookup?.name).toBe('Look up a chord');
	});

	it('gives every shortcut a name and an in-scope url', () => {
		for (const shortcut of shortcuts) {
			expect(shortcut.name).toBeTruthy();
			expect(shortcut.url.startsWith('/')).toBe(true);
		}
	});

	it('uses no em dashes in any shortcut copy (standing copy rule)', () => {
		for (const shortcut of shortcuts) {
			const copy = [shortcut.name, shortcut.short_name ?? '', shortcut.description ?? ''].join(' ');
			expect(copy).not.toContain('—');
		}
	});
});
