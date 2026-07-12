import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// @testing-library/svelte does not auto-cleanup between tests like its
// React counterpart's default export does - without this, each test's
// rendered component stays mounted, causing "multiple elements found"
// failures once more than one test in a file renders the same page.
afterEach(() => {
	cleanup();
});
