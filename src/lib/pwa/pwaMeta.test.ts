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

	it('has start_url and scope of "/"', () => {
		expect(manifest.start_url).toBe('/');
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
