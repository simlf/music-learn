import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BottomSheet from './BottomSheet.svelte';
import { createRawSnippet } from 'svelte';

/**
 * Task 1 (Phase 23, Plan 01): the shared bottom-sheet primitive's own
 * mount/dismiss contract, independent of any consumer (Drills strip or the
 * future 1A More sheet).
 */

function childrenSnippet(text = 'Sheet body') {
	return createRawSnippet(() => ({
		render: () => `<p data-testid="sheet-body">${text}</p>`
	}));
}

afterEach(() => {
	cleanup();
});

describe('BottomSheet mount/unmount (open prop)', () => {
	it('renders nothing when open is false', () => {
		render(BottomSheet, { open: false, onClose: vi.fn(), children: childrenSnippet() });
		expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
	});

	it('renders the dialog surface with children when open is true', () => {
		render(BottomSheet, { open: true, onClose: vi.fn(), children: childrenSnippet() });
		const surface = screen.getByTestId('bottom-sheet');
		expect(surface).toBeInTheDocument();
		expect(surface).toHaveAttribute('role', 'dialog');
		expect(surface).toHaveAttribute('aria-modal', 'true');
		expect(screen.getByTestId('sheet-body')).toHaveTextContent('Sheet body');
	});

	it('applies the provided ariaLabel to the dialog surface', () => {
		render(BottomSheet, {
			open: true,
			onClose: vi.fn(),
			children: childrenSnippet(),
			ariaLabel: 'Level and mode settings'
		});
		expect(screen.getByTestId('bottom-sheet')).toHaveAttribute(
			'aria-label',
			'Level and mode settings'
		);
	});
});

describe('BottomSheet dismiss paths', () => {
	it('calls onClose when the backdrop is clicked', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: true, onClose, children: childrenSnippet() });

		await fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('calls onClose when the Close control is clicked', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: true, onClose, children: childrenSnippet() });

		await fireEvent.click(screen.getByTestId('bottom-sheet-close'));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does NOT call onClose when clicking inside the surface', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: true, onClose, children: childrenSnippet() });

		await fireEvent.click(screen.getByTestId('sheet-body'));

		expect(onClose).not.toHaveBeenCalled();
	});

	it('calls onClose on Escape while open', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: true, onClose, children: childrenSnippet() });

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does not call onClose on Escape when closed', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: false, onClose, children: childrenSnippet() });

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).not.toHaveBeenCalled();
	});

	it('calls onClose on Escape fired from inside the surface (WR-01, 23-REVIEW)', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: true, onClose, children: childrenSnippet() });

		// Escape must still bubble to window even though the surface stops
		// propagation of clicks - it must not stop propagation of keydown.
		await fireEvent.keyDown(screen.getByTestId('sheet-body'), { key: 'Escape' });

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('calls onClose on Escape fired from the Close button inside the surface', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: true, onClose, children: childrenSnippet() });

		await fireEvent.keyDown(screen.getByTestId('bottom-sheet-close'), { key: 'Escape' });

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does not call onClose on Space pressed inside a focused element in the sheet body (WR-02 regression guard)', async () => {
		const onClose = vi.fn();
		render(BottomSheet, { open: true, onClose, children: childrenSnippet() });

		// Space bubbling from a focused descendant must not be mistaken for
		// the backdrop's own Enter/Space-to-close activation.
		await fireEvent.keyDown(screen.getByTestId('sheet-body'), { key: ' ' });

		expect(onClose).not.toHaveBeenCalled();
	});
});

describe('BottomSheet focus management (WR-02, 23-REVIEW)', () => {
	it('moves focus into the dialog surface when it opens', async () => {
		const onClose = vi.fn();
		const { rerender } = render(BottomSheet, {
			open: false,
			onClose,
			children: childrenSnippet()
		});
		expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();

		await rerender({ open: true, onClose, children: childrenSnippet() });

		await waitFor(() => expect(screen.getByTestId('bottom-sheet')).toHaveFocus());
	});

	it('returns focus to the element that opened the sheet when it closes', async () => {
		const opener = document.createElement('button');
		document.body.appendChild(opener);
		opener.focus();
		expect(opener).toHaveFocus();

		const onClose = vi.fn();
		const { rerender } = render(BottomSheet, {
			open: false,
			onClose,
			children: childrenSnippet()
		});

		await rerender({ open: true, onClose, children: childrenSnippet() });
		await waitFor(() => expect(screen.getByTestId('bottom-sheet')).toHaveFocus());

		await rerender({ open: false, onClose, children: childrenSnippet() });
		await waitFor(() => expect(opener).toHaveFocus());

		document.body.removeChild(opener);
	});

	it('traps Tab forward from the last focusable back to the surface\'s first (the Close button)', async () => {
		const onClose = vi.fn();
		const withButton = createRawSnippet(() => ({
			render: () =>
				`<div data-testid="sheet-body"><button data-testid="last-focusable">Last</button></div>`
		}));
		render(BottomSheet, { open: true, onClose, children: withButton });

		const lastButton = screen.getByTestId('last-focusable');
		lastButton.focus();
		expect(lastButton).toHaveFocus();

		await fireEvent.keyDown(lastButton, { key: 'Tab' });

		// jsdom does not implement native Tab focus movement, so the trap's
		// own preventDefault + explicit .focus() call is what must fire here,
		// wrapping forward-Tab from the last focusable to the Close button
		// (the surface's first focusable, always rendered above children).
		expect(screen.getByTestId('bottom-sheet-close')).toHaveFocus();
	});

	it('traps Shift+Tab backward from the first focusable (the Close button) to the last', async () => {
		const onClose = vi.fn();
		const withButton = createRawSnippet(() => ({
			render: () =>
				`<div data-testid="sheet-body"><button data-testid="last-focusable">Last</button></div>`
		}));
		render(BottomSheet, { open: true, onClose, children: withButton });

		const closeButton = screen.getByTestId('bottom-sheet-close');
		closeButton.focus();
		expect(closeButton).toHaveFocus();

		await fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });

		expect(screen.getByTestId('last-focusable')).toHaveFocus();
	});
});
