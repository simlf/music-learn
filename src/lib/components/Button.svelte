<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/**
	 * Print Shop button. Primary: vermilion fill, offset ink shadow. Ghost:
	 * transparent, ink border only. Both press into the paper on active
	 * (translate + reduced shadow) per DESIGN-01.
	 *
	 * Pass `href` to render a real `<a>` (e.g. "Start a Drill" / "Practice
	 * Now" navigating to /drills) instead of a `<button>`, keeping the exact
	 * same visual treatment either way. `onclick` is typed as a plain
	 * `MouseEvent` handler (rather than inherited from `HTMLButtonAttributes`)
	 * so the SAME handler prop works whichever element actually renders (e.g.
	 * Phase 19's lesson handoff CTA both writes to storage AND navigates via
	 * the anchor's own `href`, in one Button instance).
	 */
	interface Props extends Omit<HTMLButtonAttributes, 'onclick'> {
		variant?: 'primary' | 'ghost';
		href?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let { variant = 'primary', href, onclick, children, disabled, ...rest }: Props = $props();

	/**
	 * `disabled` is a valid `<button>` attribute but not a valid `<a>`
	 * attribute (a browser will happily render an invalid `disabled=""`
	 * attribute on an anchor without any of the actual disabling behavior -
	 * the link stays clickable and navigable). When `href` is set, fall back
	 * to `aria-disabled` plus blocking the click here instead, so a future
	 * `href` caller that passes `disabled` degrades sanely rather than
	 * rendering a link that looks disabled but still works.
	 */
	function handleAnchorClick(event: MouseEvent): void {
		if (disabled) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
	}
</script>

{#if href}
	<a
		{href}
		class="ps-button ps-button--{variant}"
		onclick={handleAnchorClick}
		aria-disabled={disabled ? 'true' : undefined}
		{...rest as Record<string, unknown>}
	>
		{@render children()}
	</a>
{:else}
	<button class="ps-button ps-button--{variant}" {disabled} {onclick} {...rest}>
		{@render children()}
	</button>
{/if}

<style>
	.ps-button {
		font-family: var(--font-sans);
		font-size: var(--text-body);
		font-weight: 700;
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid var(--color-ink);
		cursor: pointer;
		/* 44px minimum touch target (Phase 1 exception), load-bearing for
		   single-glyph ghost content (helper buttons, recent chips) where
		   word-length padding alone isn't guaranteed to clear it. */
		min-height: 44px;
		min-width: 44px;
		transition:
			transform 120ms ease-out,
			box-shadow 120ms ease-out;
	}

	.ps-button--primary {
		background-color: var(--color-vermilion);
		color: var(--color-paper);
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.ps-button--ghost {
		background-color: transparent;
		color: var(--color-ink);
		box-shadow: none;
	}

	.ps-button--primary:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--color-ink);
	}

	.ps-button--ghost:active {
		transform: translate(2px, 2px);
	}
</style>
