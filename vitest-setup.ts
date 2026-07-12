import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// Node 22+ ships its own built-in `globalThis.localStorage` (a no-backing-file
// stub unless `--localstorage-file` is passed). Vitest's jsdom environment
// only copies window keys onto the test global that don't already exist on
// `global` (see vitest's populateGlobal/getWindowKeys) - since Node's stub
// already occupies `localStorage`, vitest never copies over jsdom's real,
// working implementation, and even `window.localStorage` from inside a test
// resolves through that same filtered proxy back to Node's inert stub.
// Reach into jsdom's actual internal window (exposed as `window.jsdom.window`
// by vitest's jsdom environment setup) to get the real implementation and
// force globalThis.localStorage to it, so persistence modules behave the
// same in tests as they do in a real browser.
interface JsdomGlobal {
	jsdom?: { window?: Window };
}
const realWindow = (globalThis as unknown as JsdomGlobal).jsdom?.window;
if (realWindow?.localStorage) {
	Object.defineProperty(globalThis, 'localStorage', {
		value: realWindow.localStorage,
		configurable: true,
		writable: true
	});
}

// @testing-library/svelte does not auto-cleanup between tests like its
// React counterpart's default export does - without this, each test's
// rendered component stays mounted, causing "multiple elements found"
// failures once more than one test in a file renders the same page.
afterEach(() => {
	cleanup();
});
