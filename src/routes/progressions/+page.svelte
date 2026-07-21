<script lang="ts">
	import ProgressionDrill from '$lib/components/ProgressionDrill.svelte';
	import { t } from '$lib/i18n/locale.svelte';
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">{t('progressions.page.title')}</h1>
	<p class="text-muted mt-2">
		{t('progressions.page.subtitle')}
	</p>

	<div class="border-ink bg-paper-bright mt-4 border-2 px-2 py-6 sm:px-6">
		<ProgressionDrill />
	</div>
</main>
