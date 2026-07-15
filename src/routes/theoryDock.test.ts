import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDockRegistry, DOCK_CONTEXT_KEY } from '$lib/keyboard/dockContext.svelte';
import KeyboardDock from '$lib/components/KeyboardDock.svelte';

/**
 * Dock-registration test for Theory (Phase 15, Plan 03, Task 2). Theory
 * previously had no playable keyboard at all - this is a pure addition, not
 * a relocation (Scope Decision 2). Mirrors lookupDock.test.ts's harness:
 * `KeyboardDock` doubles as the host that renders the page's captured
 * keyboard/register snippets for the tap-to-hear + idle-text assertions.
 */

const playChordMock = vi.fn();
const ensureAudioReadyMock = vi.fn(() => Promise.resolve());
const playNoteMock = vi.fn();
vi.mock('$lib/audio/audio', () => ({
	ensureAudioReady: () => ensureAudioReadyMock(),
	playChord: (...args: unknown[]) => playChordMock(...args),
	playNote: (...args: unknown[]) => playNoteMock(...args)
}));

const { default: TheoryPage } = await import('./theory/+page.svelte');

function renderPageWithDock() {
	const registry = createDockRegistry();
	const context = new Map([[DOCK_CONTEXT_KEY, registry]]);
	const page = render(TheoryPage, { context });
	return { registry, page, context };
}

beforeEach(() => {
	playNoteMock.mockClear();
	playChordMock.mockClear();
	ensureAudioReadyMock.mockClear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('Theory docked keyboard (KBD-01, Scope Decision 2)', () => {
	it('registers a dock config on mount whose keyboard renders an inspectable piano keyboard', () => {
		const { registry } = renderPageWithDock();

		expect(registry.current).not.toBeNull();
		expect(registry.current?.keyboard).toBeTypeOf('function');
	});

	it('tapping a docked key invokes the mocked playNote', async () => {
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

	it('leaves the existing ChordExample sections and lesson controls unchanged', () => {
		renderPageWithDock();

		expect(screen.getByTestId('section-symbol')).toBeInTheDocument();
		expect(screen.getByTestId('section-sevenths')).toBeInTheDocument();
		expect(screen.getByTestId('section-anchor')).toBeInTheDocument();
		expect(screen.getByTestId('section-dominant')).toBeInTheDocument();
		expect(screen.getByTestId('section-diminished')).toBeInTheDocument();
		expect(screen.getByTestId('section-solfege')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Hear G7 resolve' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Take it to the drills' })).toBeInTheDocument();
	});

	it('clears its registration on unmount', () => {
		const { registry, page } = renderPageWithDock();

		expect(registry.current).not.toBeNull();
		page.unmount();

		expect(registry.current).toBeNull();
	});
});
