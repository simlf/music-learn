<script lang="ts">
	import RecallSession from '$lib/components/RecallSession.svelte';
	import RecallMap from '$lib/components/RecallMap.svelte';
	import Button from '$lib/components/Button.svelte';

	/**
	 * /recall (MEM-01/MEM-02/MEM-04): the Review/Map mode toggle, mirroring
	 * /scales' Explore/Practice pattern. Review (default) is the 11-05
	 * reveal-then-grade session; Map (11-06) is the fact x mode recall map.
	 * The session-complete card's "View Recall Map" CTA switches this same
	 * mode state in place, no navigation.
	 */
	type Mode = 'review' | 'map';
	let mode = $state<Mode>('review');
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">Recall</h1>
	<p class="text-muted mt-2">
		The stack that's earning its keep. Every fact, every way you've met it.
	</p>

	<div class="mt-8 flex gap-2" data-testid="mode-toggle" role="group" aria-label="Recall mode">
		<Button
			type="button"
			variant={mode === 'review' ? 'primary' : 'ghost'}
			aria-pressed={mode === 'review'}
			onclick={() => (mode = 'review')}
		>
			Review
		</Button>
		<Button
			type="button"
			variant={mode === 'map' ? 'primary' : 'ghost'}
			aria-pressed={mode === 'map'}
			onclick={() => (mode = 'map')}
		>
			Map
		</Button>
	</div>

	<div class="border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6">
		{#if mode === 'review'}
			<RecallSession onViewMap={() => (mode = 'map')} />
		{:else}
			<RecallMap />
		{/if}
	</div>
</main>
