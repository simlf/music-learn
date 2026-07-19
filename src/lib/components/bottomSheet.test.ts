import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
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
});
