import { createRawSnippet } from 'svelte';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.svelte';

/**
 * Component test for Button (Phase 19 REVIEW WR-01/WR-03): the two render
 * branches (plain `<button>` vs `href`-driven `<a>`) must stay behaviorally
 * equivalent for onclick firing and `...rest` attribute passthrough - the
 * anchor branch previously dropped every `rest` attribute silently (WR-01).
 */

function textSnippet(text: string) {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`
	}));
}

describe('Button', () => {
	it('button branch: renders a real <button> and fires onclick', async () => {
		const onclick = vi.fn();
		render(Button, { children: textSnippet('Click me'), onclick });

		const button = screen.getByRole('button', { name: 'Click me' });
		await fireEvent.click(button);

		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('button branch: spreads rest attributes (id, aria-label, disabled) onto the button', () => {
		render(Button, {
			children: textSnippet('Click me'),
			id: 'my-button',
			'aria-label': 'Custom label',
			disabled: true
		});

		const button = screen.getByRole('button', { name: 'Custom label' });
		expect(button).toHaveAttribute('id', 'my-button');
		expect(button).toBeDisabled();
	});

	it('href branch: renders a real <a href> and fires onclick', async () => {
		const onclick = vi.fn();
		render(Button, { children: textSnippet('Go'), href: '/drills', onclick });

		const link = screen.getByRole('link', { name: 'Go' });
		expect(link).toHaveAttribute('href', '/drills');
		await fireEvent.click(link);

		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('href branch: spreads rest attributes (id, aria-label) onto the anchor (locks WR-01)', () => {
		render(Button, {
			children: textSnippet('Go'),
			href: '/drills',
			id: 'my-link',
			'aria-label': 'Custom link label'
		});

		const link = screen.getByRole('link', { name: 'Custom link label' });
		expect(link).toHaveAttribute('id', 'my-link');
	});

	it('href branch: a disabled Button renders aria-disabled and blocks onclick, instead of an invalid disabled attribute', async () => {
		const onclick = vi.fn();
		render(Button, {
			children: textSnippet('Go'),
			href: '/drills',
			onclick,
			disabled: true
		});

		const link = screen.getByRole('link', { name: 'Go' });
		expect(link).toHaveAttribute('aria-disabled', 'true');
		expect(link).not.toHaveAttribute('disabled');

		await fireEvent.click(link);

		expect(onclick).not.toHaveBeenCalled();
	});
});
