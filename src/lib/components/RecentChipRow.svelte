<script lang="ts">
	/**
	 * Row of up to 5 recent-lookup ghost chips (most-recent-first). Wraps
	 * rather than scrolling so every chip stays visible and tappable without
	 * a scroll gesture (mid-song speed tool). Renders nothing when there is
	 * no history yet, per the mobile-portrait above-the-fold budget.
	 */
	import Button from './Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	interface Props {
		recent: string[];
		onselect: (symbol: string) => void;
	}

	let { recent, onselect }: Props = $props();

	/** Substitutes the chord symbol (kept verbatim, never translated) into the locale's aria-label template. */
	function chipAriaLabel(symbol: string): string {
		return t('home.recent.chip-aria').replace('{symbol}', symbol);
	}
</script>

{#if recent.length > 0}
	<div
		class="mt-4 flex flex-wrap gap-2"
		data-testid="recent-chip-row"
		role="group"
		aria-label={t('home.recent.heading')}
	>
		{#each recent as symbol (symbol)}
			<Button
				type="button"
				variant="ghost"
				data-testid="recent-chip"
				aria-label={chipAriaLabel(symbol)}
				onclick={() => onselect(symbol)}
			>
				<span class="font-mono text-label">{symbol}</span>
			</Button>
		{/each}
	</div>
{/if}
