<script lang="ts">
	import BuildSession from '$lib/components/BuildSession.svelte';
	import { t } from '$lib/i18n/locale.svelte';
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">{t('build.page.title')}</h1>
	<p class="text-muted mt-2">{t('build.page.subtitle')}</p>

	<div class="border-ink bg-paper-bright mt-8 border-2 p-6">
		<BuildSession />
	</div>
</main>
