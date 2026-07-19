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
		// WR-01 removed the surface's blanket keydown stopPropagation, so a
		// keydown fired on a focused descendant (e.g. Space on a toggle button
		// inside the sheet body) genuinely bubbles up to this handler too -
		// `event.target`/`currentTarget` are the only reliable way to restrict
		// this Enter/Space-to-close behavior to the backdrop itself actually
		// being focused, matching the documented intent.
		if (event.target !== event.currentTarget) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClose();
		}
	}

	// ---- Focus management (WR-02, 23-REVIEW) ----------------------------
	// Minimal WAI-ARIA APG modal dialog pattern: move focus into the dialog
	// on open, trap Tab/Shift+Tab within it while open, and restore focus to
	// the element that opened it on close.
	let surfaceEl: HTMLDivElement | undefined = $state();
	let previouslyFocusedEl: HTMLElement | null = null;

	$effect(() => {
		if (open) {
			previouslyFocusedEl =
				document.activeElement instanceof HTMLElement ? document.activeElement : null;
			surfaceEl?.focus();
		} else if (previouslyFocusedEl) {
			previouslyFocusedEl.focus();
			previouslyFocusedEl = null;
		}
	});

	function focusableElements(): HTMLElement[] {
		if (!surfaceEl) return [];
		return Array.from(
			surfaceEl.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	/** Traps Tab/Shift+Tab within the surface; never stops propagation so Escape still bubbles to window (WR-01). */
	function handleSurfaceKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const focusables = focusableElements();
		if (focusables.length === 0) return;
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
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
		<!--
			svelte-ignore a11y_click_events_have_key_events -- this onclick is
			purely an event-bubbling guard (stop clicks inside the dialog from
			reaching the backdrop's close handler), not a click-to-activate
			affordance. The paired onkeydown below (WR-02's Tab trap) never
			calls stopPropagation, so Escape (the modal's real keyboard
			interaction, handled by svelte:window's handleWindowKeydown above)
			is still allowed to bubble past this element uninterrupted (WR-01).
		-->
		<div
			bind:this={surfaceEl}
			class="bottom-sheet__surface"
			data-testid="bottom-sheet"
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			tabindex="-1"
			onclick={stopPropagation}
			onkeydown={handleSurfaceKeydown}
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
