<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import TheoryLessons from '$lib/components/TheoryLessons.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * /theory (Track D): thin wrapper around the shared TheoryLessons
	 * component (Phase 28 Plan 01 DRY extraction). Keeps its own page shell,
	 * header, and the /drills footer CTA; the lesson body itself lives in
	 * $lib/components/TheoryLessons.svelte so /learn (Plan 04) can render
	 * the same lessons without copy-pasting markup.
	 */
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<!-- max-w must stay an arbitrary value: the Print Shop @theme defines
	     --spacing-2xl: 48px, so a named max-w-2xl utility resolves to 48px. -->
	<div class="mx-auto flex max-w-[42rem] flex-col gap-8">
		<header>
			<h1 class="text-heading mt-2 font-bold">{t('theory.page.title')}</h1>
			<p class="text-body text-muted mt-2">
				{t('theory.page.subtitle')}
			</p>
		</header>

		<TheoryLessons />

		<div class="flex justify-center pb-8">
			<Button href="/drills">{t('theory.footer.drillsButton')}</Button>
		</div>
	</div>
</main>
