<script lang="ts">
	/**
	 * Row of up to 5 recent-lookup ghost chips (most-recent-first). Wraps
	 * rather than scrolling so every chip stays visible and tappable without
	 * a scroll gesture (mid-song speed tool). Renders nothing when there is
	 * no history yet, per the mobile-portrait above-the-fold budget.
	 */
	import Button from './Button.svelte';

	interface Props {
		recent: string[];
		onselect: (symbol: string) => void;
	}

	let { recent, onselect }: Props = $props();
</script>

{#if recent.length > 0}
	<div class="mt-4 flex flex-wrap gap-2" data-testid="recent-chip-row">
		{#each recent as symbol (symbol)}
			<Button
				type="button"
				variant="ghost"
				data-testid="recent-chip"
				aria-label={`Look up ${symbol} again`}
				onclick={() => onselect(symbol)}
			>
				<span class="font-mono text-label">{symbol}</span>
			</Button>
		{/each}
	</div>
{/if}
