<script lang="ts">
	import ScaleExplorer from '$lib/components/ScaleExplorer.svelte';
	import { t } from '$lib/i18n/locale.svelte';
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">{t('scales.page.title')}</h1>
	<p class="text-muted mt-2">
		{t('scales.page.subtitle')}
	</p>

	<ScaleExplorer />
</main>
