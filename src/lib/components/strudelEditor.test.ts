import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import StrudelEditor from './StrudelEditor.svelte';

/**
 * A real CodeMirror 6 EditorView mounts fine under jsdom (verified: it only
 * needs DOM APIs jsdom already provides for a plain, unmeasured document),
 * so this exercises the actual editor rather than a stand-in - same
 * discipline as the rest of the comping loop's tests.
 */

function content(): HTMLElement {
	return screen.getByTestId('editor');
}

/** CodeMirror's DOM observer reads the real mutated `.cm-content`, not a synthetic `.value` - see strudelPianoroll's sibling module for why. */
async function typeInEditor(text: string): Promise<void> {
	const el = content();
	el.textContent = text;
	await fireEvent.input(el);
}

describe('StrudelEditor', () => {
	it('renders the initial value', () => {
		render(StrudelEditor, { value: 'note("c e g")', dataTestId: 'editor' });

		expect(content().textContent).toBe('note("c e g")');
	});

	it('reports an edit back through the bound value', async () => {
		render(StrudelEditor, { value: 'note("c")', dataTestId: 'editor' });

		await typeInEditor('note("c e g")');

		expect(content().textContent).toBe('note("c e g")');
	});

	it('pushes an externally-changed value into the editor', async () => {
		const { rerender } = render(StrudelEditor, { value: 'note("c")', dataTestId: 'editor' });

		await rerender({ value: 'note("d")', dataTestId: 'editor' });

		expect(content().textContent).toBe('note("d")');
	});

	it('applies the data-testid to the editable content element', () => {
		render(StrudelEditor, { value: '', dataTestId: 'editor' });

		expect(content()).toHaveClass('cm-content');
	});
});
