<script lang="ts">
	import { getDockRegistry } from '$lib/keyboard/dockContext.svelte';
	import { readDockedKeyboardCollapsed, setDockedKeyboardCollapsed } from '$lib/keyboard/dockCollapse';

	/**
	 * The shared keyboard dock chrome (KBD-02). Renders whichever keyboard
	 * (plus optional register line) the current page has registered with
	 * `getDockRegistry()`, fixed to the viewport bottom above scrolling page
	 * content. Renders nothing when no page has registered a keyboard.
	 *
	 * The handle bar toggles collapsed/expanded and persists the choice
	 * device-locally via `dockCollapse` (read once at init, matching every
	 * other `music-learn:*` defensive-read flag in the codebase). Collapsing
	 * removes the keyboard surface and register line from layout entirely
	 * (not just visually hidden) - no ResizeObserver measuring a
	 * `display: none` element, no stray audio wiring while collapsed.
	 *
	 * Writes the dock's live rendered height to the `--dock-height` custom
	 * property, which +layout.svelte's content-clearance padding consumes so
	 * scrolling content is never permanently hidden behind the dock.
	 *
	 * No sound-toggle control lives here (Scope Decision 5, UI-SPEC) - the
	 * app already has exactly one sound toggle (on /progress); the dock only
	 * hosts whatever keyboard/register snippet a page wires to the existing
	 * audio engine.
	 */

	const registry = getDockRegistry();
	const config = $derived(registry.current);

	let collapsed = $state(readDockedKeyboardCollapsed());
	let dockEl: HTMLDivElement | undefined = $state();
	let dockHeight = $state(0);

	// When the registered surface is the sole answer-input for the current
	// flow (Drills construction, BuildSession Mode C, ScaleKeyboardDrill,
	// RecallSession Mode A) the dock must never hide it: the persisted
	// collapsed state is ignored and the collapse handle is suppressed, so a
	// user who collapsed the dock on a passive page (or in a prior session -
	// the flag persists device-locally) can't land on a question whose only
	// answer surface is a hidden keyboard (WR-01).
	const inputRequired = $derived(Boolean(config?.inputRequired));
	const surfaceVisible = $derived(inputRequired || !collapsed);

	function toggleCollapsed() {
		collapsed = !collapsed;
		setDockedKeyboardCollapsed(collapsed);
	}

	// Measures the dock's own outer element, mirroring PianoKeyboard's
	// established ResizeObserver guard (`typeof ResizeObserver === 'undefined'`
	// short-circuits in jsdom/older browsers) rather than Svelte's built-in
	// `bind:offsetHeight`, which unconditionally constructs a ResizeObserver
	// internally and throws in a jsdom test environment that has none.
	$effect(() => {
		if (!dockEl) return;
		dockHeight = dockEl.offsetHeight;

		if (typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver(() => {
			if (dockEl) dockHeight = dockEl.offsetHeight;
		});
		observer.observe(dockEl);

		return () => observer.disconnect();
	});

	// Live --dock-height, consumed by +layout.svelte's content-clearance
	// padding (Task 2). Browser-guarded: `document` is unavailable during
	// SSR, and this defensively no-ops if it's ever missing. Zero when
	// nothing is docked (config is null) or once this component tears down.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.style.setProperty('--dock-height', config ? `${dockHeight}px` : '0px');

		return () => {
			document.documentElement.style.setProperty('--dock-height', '0px');
		};
	});
</script>

{#if config}
	<div class="keyboard-dock" data-testid="keyboard-dock" bind:this={dockEl}>
		{#if !inputRequired}
			<button
				type="button"
				class="keyboard-dock__handle text-label font-mono uppercase"
				onclick={toggleCollapsed}
			>
				<span class="keyboard-dock__grip" aria-hidden="true"></span>
				{collapsed ? 'Keyboard · tap to expand' : 'Keyboard · tap to collapse'}
			</button>
		{/if}
		{#if surfaceVisible}
			<div class="keyboard-dock__surface">
				{@render config.keyboard()}
				{#if config.register}
					<div class="keyboard-dock__register">
						{@render config.register()}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.keyboard-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		border-top: 2px solid var(--color-ink);
		/* Soft non-directional lift, deliberately not Button's 3px-offset
		   motif - the dock is chrome, not a button (UI-SPEC Dock Chrome
		   Contract). */
		box-shadow: 0 -4px 0 color-mix(in srgb, var(--color-ink) 6%, transparent);
		/* Keeps the handle/keys clear of an installed PWA's iOS home
		   indicator strip. */
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}

	.keyboard-dock__handle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-sm);
		min-height: 44px;
		background: var(--color-ink);
		color: var(--color-paper-bright);
		border: none;
		cursor: pointer;
	}

	.keyboard-dock__grip {
		width: 34px;
		height: 4px;
		background: var(--color-paper-bright);
	}

	.keyboard-dock__surface {
		background: var(--color-paper-bright);
		border-top: 2px solid var(--color-ink);
		/* No overflow:hidden - a hosted strip wider than the viewport (e.g.
		   Scales' two-octave key row, Plan 04/06) must be able to scroll
		   horizontally on its own terms, not get clipped here. */
	}

	.keyboard-dock__register {
		padding: var(--spacing-sm) var(--spacing-md);
	}
</style>
