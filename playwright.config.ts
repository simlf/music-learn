import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the visual-verification suite (tests/e2e/).
 *
 * WHY THIS RUNS AGAINST THE PRODUCTION BUILD, NOT `vite dev`:
 * the app ships as a fully prerendered static site (`@sveltejs/adapter-static`
 * with `strict: true`). Prerendering is where adapter-static problems actually
 * surface, and the built CSS is what real users see. So `webServer` below
 * builds first, then serves `build/` via `vite preview`. A dev-server-only
 * suite would miss a prerender failure entirely.
 *
 * DELIBERATELY NOT ENABLED: `toHaveScreenshot()` pixel-snapshot comparison.
 * Three reasons, all specific to this app:
 *   1. Baselines are committed binaries. The owner asked not to commit
 *      screenshots.
 *   2. Several surfaces are randomized by design (practice queue order,
 *      random chord prompts, FSRS due dates that move with the clock), so a
 *      pixel baseline would go stale daily rather than catch regressions.
 *   3. Font rasterization differs between this machine and any CI container,
 *      so baselines would need per-platform variants to avoid false failures.
 * Instead the suite makes *computed* assertions (contrast ratios, box sizes,
 * scroll widths) which are stable and meaningful, and separately captures
 * screenshots as artifacts under `screenshots/` for a human or agent to
 * eyeball. Computed assertions catch what humans kept being asked to check;
 * artifacts cover what only an eye can judge.
 */
export default defineConfig({
	testDir: 'tests/e2e',
	/*
	 * Each test gets its own browser context (fresh IndexedDB + localStorage),
	 * so parallelism is safe. Capped at 2 workers: the suite is small and this
	 * repo already has one timeout-under-parallel-load flake in the Vitest
	 * suite, so there is no appetite for saturating the machine.
	 */
	fullyParallel: true,
	workers: 2,
	forbidOnly: !!process.env.CI,
	retries: 0,
	/*
	 * 15s per test. Every spec seeds its own state and asserts on a single
	 * page, so anything slower than this is a real hang, not slowness. Kept
	 * well above the ~2-4s these actually take.
	 */
	timeout: 15_000,
	expect: { timeout: 5_000 },
	reporter: process.env.CI ? [['list'], ['github']] : [['list']],
	outputDir: 'test-results',
	use: {
		baseURL: 'http://localhost:4173',
		/*
		 * The app registers a service worker in production builds
		 * (src/service-worker.ts). Blocking it here removes a whole class of
		 * nondeterminism (install/activate races, cache-first responses
		 * shadowing a fresh build) without touching the shipped worker. The
		 * SW's own behavior is covered by unit tests in src/lib/pwa/.
		 */
		serviceWorkers: 'block',
		/* Deterministic clock-independent locale/timezone for date-derived UI. */
		locale: 'en-US',
		timezoneId: 'UTC',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'npm run build && npx vite preview --port 4173 --strictPort',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		stdout: 'pipe',
		stderr: 'pipe'
	}
});
