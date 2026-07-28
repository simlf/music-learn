/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		/*
		 * tests/e2e/ holds the Playwright suite (real Chromium, production
		 * build). Its specs import from '@playwright/test', which cannot run
		 * under Vitest/jsdom, so they are excluded here rather than renamed:
		 * `tests/**` above would otherwise match them. Run them with
		 * `npm run test:e2e`.
		 */
		exclude: ['tests/e2e/**', 'node_modules/**', 'build/**', '.svelte-kit/**']
	}
});
