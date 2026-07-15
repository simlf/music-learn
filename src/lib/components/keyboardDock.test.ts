import { createRawSnippet } from 'svelte';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import KeyboardDock from './KeyboardDock.svelte';
import { createDockRegistry, DOCK_CONTEXT_KEY, type DockKeyboardConfig } from '$lib/keyboard/dockContext.svelte';

/**
 * Component test for KeyboardDock (Phase 15, Plan 02, Task 1). Rather than a
 * wrapper .svelte component calling `setDockRegistry`, this supplies the
 * registry directly through Svelte 5's `mount`/`render` `context` option
 * (a `Map` keyed by `DOCK_CONTEXT_KEY`) - the same context-provision seam
 * `setDockRegistry` itself uses, exercised without an extra file. The
 * keyboard/register snippets are built with `createRawSnippet` so no
 * PianoKeyboard/InspectRegister dependency is needed to prove the dock
 * hosts whatever it is handed.
 */

const STORAGE_KEY = 'music-learn:docked-keyboard-collapsed';

function makeConfig(): DockKeyboardConfig {
	const keyboard = createRawSnippet(() => ({
		render: () => '<button type="button">Test Note C4</button>'
	}));
	const register = createRawSnippet(() => ({
		render: () => '<span>Tap a key to hear it.</span>'
	}));
	return { token: Symbol('page'), keyboard, register };
}

function renderDock(config: DockKeyboardConfig | null) {
	const registry = createDockRegistry();
	if (config) registry.register(config);
	const context = new Map([[DOCK_CONTEXT_KEY, registry]]);
	return render(KeyboardDock, { context });
}

describe('KeyboardDock (KBD-02)', () => {
	afterEach(() => {
		localStorage.removeItem(STORAGE_KEY);
	});

	it('renders nothing when no keyboard is registered', () => {
		renderDock(null);

		expect(screen.queryByTestId('keyboard-dock')).not.toBeInTheDocument();
	});

	it('with a config registered and expanded, shows the collapse label plus the hosted keyboard and register content', () => {
		renderDock(makeConfig());

		expect(screen.getByRole('button', { name: 'Keyboard · tap to collapse' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Test Note C4' })).toBeInTheDocument();
		expect(screen.getByText('Tap a key to hear it.')).toBeInTheDocument();
	});

	it('clicking the handle collapses: label flips, keyboard/register content leaves the DOM, and the choice persists', async () => {
		renderDock(makeConfig());

		await fireEvent.click(screen.getByRole('button', { name: 'Keyboard · tap to collapse' }));

		expect(screen.getByRole('button', { name: 'Keyboard · tap to expand' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Test Note C4' })).not.toBeInTheDocument();
		expect(screen.queryByText('Tap a key to hear it.')).not.toBeInTheDocument();
		expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
	});

	it('a second KeyboardDock mounted after the first collapses initializes collapsed (persistence read at init)', async () => {
		const first = renderDock(makeConfig());
		await fireEvent.click(screen.getByRole('button', { name: 'Keyboard · tap to collapse' }));
		first.unmount();

		renderDock(makeConfig());

		expect(screen.getByRole('button', { name: 'Keyboard · tap to expand' })).toBeInTheDocument();
	});

	it('the dock outer element is fixed to the viewport bottom, and no sound-toggle control is rendered', () => {
		renderDock(makeConfig());

		const dock = screen.getByTestId('keyboard-dock');
		expect(dock).toHaveClass('keyboard-dock');
		expect(screen.queryByLabelText(/sound/i)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /sound/i })).not.toBeInTheDocument();
	});

	it('the grip mark is aria-hidden', () => {
		renderDock(makeConfig());

		const grip = screen.getByTestId('keyboard-dock').querySelector('.keyboard-dock__grip');
		expect(grip).toHaveAttribute('aria-hidden', 'true');
	});
});
