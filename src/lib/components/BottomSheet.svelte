<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n/locale.svelte';
	import Button from './Button.svelte';

	/**
	 * Generic bottom-sheet primitive (Phase 23 1B): a phone-only dialog anchored
	 * to the bottom of the viewport, shared by BOTH the 1B Drills strip (this
	 * plan) and the 1A More sheet (plan 23-04) — deliberately dependency-free
	 * and drills-agnostic, per the phase CONTEXT's "avoid duplicating sheet
	 * mechanics" discretion note.
	 *
	 * Renders nothing when `open` is false: the backdrop/surface markup is
	 * gated behind `{#if open}`, so a closed (or desktop-unmounted) sheet never
	 * touches the DOM.
	 */
	interface Props {
		open: boolean;
		onClose: () => void;
		children: Snippet;
		/** Labels the dialog for assistive tech (e.g. the drills strip's open aria-label). */
		ariaLabel?: string;
	}

	let { open, onClose, children, ariaLabel }: Props = $props();

	/** Escape closes the sheet regardless of where focus currently sits. */
	function handleWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') onClose();
	}

	/** Tapping the surface must never bubble to the backdrop's close handler. */
	function stopPropagation(event: MouseEvent) {
		event.stopPropagation();
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<!--
		The backdrop is a genuine keyboard-operable close control (role=button +
		onkeydown mirrors ScaleKeyboardDrill's existing tap-target idiom), not a
		bare click-only div, so Escape/Enter/Space and a screen-reader tab stop
		all reach it alongside the explicit Close button below.
	-->
	<div
		class="bottom-sheet__backdrop"
		data-testid="bottom-sheet-backdrop"
		role="button"
		tabindex="0"
		aria-label={t('chrome.sheet.close')}
		onclick={onClose}
		onkeydown={handleBackdropKeydown}
	>
		<div
			class="bottom-sheet__surface"
			data-testid="bottom-sheet"
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			tabindex="-1"
			onclick={stopPropagation}
			onkeydown={stopPropagation as unknown as (event: KeyboardEvent) => void}
		>
			<div class="bottom-sheet__closeRow">
				<Button
					type="button"
					variant="ghost"
					data-testid="bottom-sheet-close"
					aria-label={t('chrome.sheet.close')}
					onclick={onClose}
				>
					{t('chrome.sheet.close')}
				</Button>
			</div>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	/*
	 * z-index ordering (UI-SPEC 1A): the backdrop and surface must sit above
	 * page content AND above the future fixed bottom tab bar (plan 23-04).
	 * 100/101 are generously above every other z-index in the app today
	 * (PianoKeyboard/ScaleKeyboardDrill use 1-2, UpdatePrompt uses 50) —
	 * plan 23-04's tab bar must stay below this pair.
	 */
	.bottom-sheet__backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: color-mix(in srgb, var(--color-ink) 45%, transparent);
		border: none;
		padding: 0;
		display: flex;
		align-items: flex-end;
		cursor: pointer;
	}

	.bottom-sheet__surface {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 101;
		max-height: 85vh;
		overflow-y: auto;
		background: var(--color-paper-bright);
		border-top: 2px solid var(--color-ink);
		padding: var(--spacing-md);
		padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
		cursor: default;
		animation: bottom-sheet-slide-in 200ms ease-out;
	}

	.bottom-sheet__closeRow {
		display: flex;
		justify-content: flex-end;
		margin-bottom: var(--spacing-sm);
	}

	@keyframes bottom-sheet-slide-in {
		0% {
			transform: translateY(100%);
			opacity: 0;
		}
		100% {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bottom-sheet__surface {
			animation: none;
		}
	}
</style>
