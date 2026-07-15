import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDockRegistry, DOCK_CONTEXT_KEY } from '$lib/keyboard/dockContext.svelte';
import KeyboardDock from '$lib/components/KeyboardDock.svelte';

/**
 * Dock-registration test for Lookup (Phase 15, Plan 03, Task 1). Lookup's
 * keyboard used to render inline in the result block; it now registers with
 * the shared dock on mount instead. Mirrors keyboardDock.test.ts's own
 * context-injection seam: a real `createDockRegistry()` supplied via the
 * `mount`/`render` `context` option, no wrapper .svelte host needed. Since
 * `KeyboardDock` already renders whatever the registry's `current` config
 * holds, it doubles here as the harness that renders the page's captured
 * keyboard/register snippets for the tap-to-hear + idle-text assertions.
 */

const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: vi.fn(),
	playChord: vi.fn(),
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const { default: Page } = await import('./+page.svelte');

function renderPageWithDock() {
	const registry = createDockRegistry();
	const context = new Map([[DOCK_CONTEXT_KEY, registry]]);
	const page = render(Page, { context });
	return { registry, page, context };
}

beforeEach(() => {
	playNoteMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('Lookup docked keyboard (KBD-01)', () => {
	it('registers a dock config on mount whose keyboard renders even pre-search (notes empty)', () => {
		const { registry } = renderPageWithDock();

		expect(registry.current).not.toBeNull();
		expect(registry.current?.keyboard).toBeTypeOf('function');
	});

	it('tapping a docked key invokes the mocked playNote (sound path inherited from PianoKeyboard inspectable mode)', async () => {
		const { registry, context } = renderPageWithDock();
		render(KeyboardDock, { context });

		expect(registry.current).not.toBeNull();
		const key = screen.getAllByRole('button', { name: 'C key' })[0];
		await fireEvent.click(key);

		expect(playNoteMock).toHaveBeenCalled();
	});

	it('shows the idle register text "Tap a key to hear it." before any tap', () => {
		const { context } = renderPageWithDock();
		render(KeyboardDock, { context });

		expect(screen.getByText('Tap a key to hear it.')).toBeInTheDocument();
	});

	it('renders no PianoKeyboard in the page document flow itself (it lives only in the dock snippet)', () => {
		renderPageWithDock();

		// The page's own render tree has no piano key buttons; the keyboard
		// only exists inside the (unrendered-here) dock snippet.
		expect(screen.queryByRole('img', { name: /Piano keyboard/i })).not.toBeInTheDocument();
	});

	it('clears its registration on unmount (clear(dockToken) fires, guarding against a stale docked keyboard)', () => {
		const { registry, page } = renderPageWithDock();

		expect(registry.current).not.toBeNull();
		page.unmount();

		expect(registry.current).toBeNull();
	});
});
