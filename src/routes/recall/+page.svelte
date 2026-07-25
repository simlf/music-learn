<script lang="ts">
	import RecallPanel from '$lib/components/RecallPanel.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	let recallMode = $state<'review' | 'map'>('review');
</script>

<main
	class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8"
	data-review-dock={recallMode === 'review' ? '' : undefined}
>
	<h1 class="text-heading mt-2 font-bold">{t('recall.page.title')}</h1>
	<p class="text-muted mt-2">
		{t('recall.page.subtitle')}
	</p>

	<RecallPanel bind:mode={recallMode} />
</main>
