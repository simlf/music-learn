<script lang="ts">
	import ProgressStats from '$lib/components/ProgressStats.svelte';
	import RecallPanel from '$lib/components/RecallPanel.svelte';
	import SongManager from '$lib/components/SongManager.svelte';
	import Button from '$lib/components/Button.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Phase 29-04 (PROG-01): the Progress hub. One surface presenting Stats
	 * (streak/weak-spots/accuracy/calibration - ProgressStats), Recall (the
	 * nested Review|Map toggle + RecallSession + RecallMap - RecallPanel),
	 * and Songs (song CRUD/presets/filter - SongManager), absorbing the
	 * former `/recall` and `/songs` display surfaces. Only the active tab's
	 * section is mounted at a time (a switch, not a scroll-anchor list) -
	 * this keeps the Recall review-action dock's fixed-bottom coupling
	 * correct: it must never remain visible while the user is on Stats or
	 * Songs. `/recall` and `/songs` keep working unchanged this phase
	 * (their redirects to `/progress` are Phase 30).
	 */
	type Tab = 'stats' | 'recall' | 'songs';
	let activeTab = $state<Tab>('stats');
	let recallMode = $state<'review' | 'map'>('review');
</script>

<main
	class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8"
	data-review-dock={activeTab === 'recall' && recallMode === 'review' ? '' : undefined}
>
	<h1 class="text-heading mt-2 font-bold">{t('progress.page.title')}</h1>

	<div class="mt-8 flex gap-2" data-testid="hub-tabs" role="group" aria-label={t('progress-hub.aria.tabs')}>
		<Button
			type="button"
			variant={activeTab === 'stats' ? 'primary' : 'ghost'}
			aria-pressed={activeTab === 'stats'}
			onclick={() => (activeTab = 'stats')}
		>
			{t('progress-hub.tab.stats')}
		</Button>
		<Button
			type="button"
			variant={activeTab === 'recall' ? 'primary' : 'ghost'}
			aria-pressed={activeTab === 'recall'}
			onclick={() => (activeTab = 'recall')}
		>
			{t('progress-hub.tab.recall')}
		</Button>
		<Button
			type="button"
			variant={activeTab === 'songs' ? 'primary' : 'ghost'}
			aria-pressed={activeTab === 'songs'}
			onclick={() => (activeTab = 'songs')}
		>
			{t('progress-hub.tab.songs')}
		</Button>
	</div>

	<div class="mt-4">
		{#if activeTab === 'stats'}
			<div class="border-ink bg-paper-bright border-2 px-2 py-6 sm:px-6">
				<ProgressStats />
			</div>
		{:else if activeTab === 'recall'}
			<RecallPanel bind:mode={recallMode} />
		{:else}
			<div class="border-ink bg-paper-bright border-2 px-2 py-6 sm:px-6">
				<SongManager heading={false} />
			</div>
		{/if}
	</div>
</main>
