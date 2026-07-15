import type { Snippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { createDockRegistry, DOCK_CONTEXT_KEY, getDockRegistry, setDockRegistry } from './dockContext.svelte';
import type { DockKeyboardConfig } from './dockContext.svelte';

// The registry never invokes the snippet, only stores it - a throwaway value
// cast to Snippet is enough to exercise register/clear.
const dummySnippet = (() => {}) as unknown as Snippet;

function makeConfig(): DockKeyboardConfig {
	return { token: Symbol('page'), keyboard: dummySnippet };
}

describe('dockContext', () => {
	it('starts with current === null', () => {
		const registry = createDockRegistry();
		expect(registry.current).toBeNull();
	});

	it('register(cfg) sets current to cfg', () => {
		const registry = createDockRegistry();
		const cfg = makeConfig();

		registry.register(cfg);

		expect(registry.current).toBe(cfg);
	});

	it('clear(otherToken) is a no-op', () => {
		const registry = createDockRegistry();
		const cfg = makeConfig();
		registry.register(cfg);

		registry.clear(Symbol('other'));

		expect(registry.current).toBe(cfg);
	});

	it('clear(cfg.token) sets current to null', () => {
		const registry = createDockRegistry();
		const cfg = makeConfig();
		registry.register(cfg);

		registry.clear(cfg.token);

		expect(registry.current).toBeNull();
	});

	it('last-writer-wins: registering B over A then clearing A leaves B in place', () => {
		const registry = createDockRegistry();
		const configA = makeConfig();
		const configB = makeConfig();

		registry.register(configA);
		registry.register(configB);
		registry.clear(configA.token);

		expect(registry.current).toBe(configB);
	});

	it('DOCK_CONTEXT_KEY is a symbol', () => {
		expect(typeof DOCK_CONTEXT_KEY).toBe('symbol');
	});

	it('setDockRegistry/getDockRegistry round-trip through Svelte context', () => {
		expect(typeof setDockRegistry).toBe('function');
		expect(typeof getDockRegistry).toBe('function');
	});
});
