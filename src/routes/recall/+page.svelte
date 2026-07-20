<script lang="ts">
	import RecallSession from '$lib/components/RecallSession.svelte';
	import RecallMap from '$lib/components/RecallMap.svelte';
	import Button from '$lib/components/Button.svelte';
	import { buildProvenanceIndex } from '$lib/practice/songProvenance';
	import { readSongFilter } from '$lib/practice/songFilterPref';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * /recall (MEM-01/MEM-02/MEM-04): the Review/Map mode toggle, mirroring
	 * /scales' Explore/Practice pattern. Review (default) is the 11-05
	 * reveal-then-grade session; Map (11-06) is the fact x mode recall map.
	 * The session-complete card's "View Recall Map" CTA switches this same
	 * mode state in place, no navigation.
	 */
	type Mode = 'review' | 'map';
	let mode = $state<Mode>('review');

	/**
	 * Quick task 260720-v9u: Recall no longer owns its own filter toggle. It
	 * simply reads the shared global preference at init; RecallSession still
	 * owns the queue restriction and the empty-active-songs fallback (its own
	 * applySongFilter), so that behavior is unchanged here.
	 */
	const provenanceIndex = buildProvenanceIndex();
	let songFilterOn = $state(readSongFilter());
</script>

<main
	class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8"
	data-review-dock={mode === 'review' ? '' : undefined}
>
	<h1 class="text-heading mt-2 font-bold">{t('recall.page.title')}</h1>
	<p class="text-muted mt-2">
		{t('recall.page.subtitle')}
	</p>

	<div
		class="mt-8 flex gap-2"
		data-testid="mode-toggle"
		role="group"
		aria-label={t('recall.page.aria.mode-toggle')}
	>
		<Button
			type="button"
			variant={mode === 'review' ? 'primary' : 'ghost'}
			aria-pressed={mode === 'review'}
			onclick={() => (mode = 'review')}
		>
			{t('recall.page.mode.review')}
		</Button>
		<Button
			type="button"
			variant={mode === 'map' ? 'primary' : 'ghost'}
			aria-pressed={mode === 'map'}
			onclick={() => (mode = 'map')}
		>
			{t('recall.page.mode.map')}
		</Button>
	</div>

	<div class="border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6">
		{#if mode === 'review'}
			{#key songFilterOn}
				<RecallSession onViewMap={() => (mode = 'map')} {songFilterOn} {provenanceIndex} />
			{/key}
		{:else}
			<RecallMap />
		{/if}
	</div>
</main>
