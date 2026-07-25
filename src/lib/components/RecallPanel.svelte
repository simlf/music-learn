<script lang="ts">
	import RecallSession from '$lib/components/RecallSession.svelte';
	import RecallMap from '$lib/components/RecallMap.svelte';
	import Button from '$lib/components/Button.svelte';
	import { buildProvenanceIndex } from '$lib/practice/songProvenance';
	import { readSongFilter } from '$lib/practice/songFilterPref';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Phase 29-03: the /recall composition (Review|Map toggle + RecallSession +
	 * RecallMap) extracted verbatim into a bare fragment, so /recall and the
	 * future Progress hub (29-04) share one source of truth. `mode` is exposed
	 * via a $bindable prop so a host `<main>` can gate data-review-dock on the
	 * nested Review/Map state (the dock coupling itself lives in the host, not
	 * here - see /recall/+page.svelte and the hub).
	 */
	type Mode = 'review' | 'map';
	let { mode = $bindable<Mode>('review') }: { mode?: Mode } = $props();

	/**
	 * Quick task 260720-v9u: Recall no longer owns its own filter toggle. It
	 * simply reads the shared global preference at init; RecallSession still
	 * owns the queue restriction and the empty-active-songs fallback (its own
	 * applySongFilter), so that behavior is unchanged here.
	 */
	const provenanceIndex = buildProvenanceIndex();
	let songFilterOn = $state(readSongFilter());
</script>

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
