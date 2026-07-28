import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const manifestPath = join(projectRoot, 'static', 'manifest.webmanifest');

interface ManifestIcon {
	src: string;
	sizes: string;
	type: string;
	purpose?: string;
}

interface ManifestShortcut {
	name: string;
	url: string;
	icons?: ManifestIcon[];
}

interface Manifest {
	name: string;
	short_name: string;
	start_url: string;
	display: string;
	background_color: string;
	theme_color: string;
	icons: ManifestIcon[];
	shortcuts?: ManifestShortcut[];
}

describe('web app manifest', () => {
	const raw = readFileSync(manifestPath, 'utf8');
	const manifest: Manifest = JSON.parse(raw);

	it('is valid JSON with the required fields', () => {
		expect(manifest.name).toBeTruthy();
		expect(manifest.short_name).toBeTruthy();
		// B6: the installed app launches into practice, not into the Lookup
		// text box.
		expect(manifest.start_url).toBe('/practice');
		expect(manifest.display).toBe('standalone');
		expect(manifest.theme_color).toBeTruthy();
		expect(manifest.background_color).toBeTruthy();
		expect(Array.isArray(manifest.icons)).toBe(true);
		expect(manifest.icons.length).toBeGreaterThan(0);
	});

	it('declares at least one maskable icon', () => {
		expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
	});

	it('every icon src resolves to a file that exists under static/', () => {
		for (const icon of manifest.icons) {
			// icon.src is a site-root path (e.g. "/icons/icon-192.png"); resolve it
			// relative to static/, which SvelteKit's adapter-static copies to the build root.
			const relativePath = icon.src.replace(/^\//, '');
			const absolutePath = join(projectRoot, 'static', relativePath);
			expect(existsSync(absolutePath), `missing icon file: ${icon.src}`).toBe(true);
		}
	});

	it('every shortcut icon src also resolves to a real file under static/ (B6)', () => {
		for (const shortcut of manifest.shortcuts ?? []) {
			for (const icon of shortcut.icons ?? []) {
				const relativePath = icon.src.replace(/^\//, '');
				const absolutePath = join(projectRoot, 'static', relativePath);
				expect(existsSync(absolutePath), `missing shortcut icon file: ${icon.src}`).toBe(true);
			}
		}
	});
});
