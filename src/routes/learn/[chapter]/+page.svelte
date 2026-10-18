<script lang="ts">
	import Chapter from '$lib/components/Chapter.svelte';
	import ShellsConcept from '$lib/components/ShellsConcept.svelte';
	import ShellCycleDrill from '$lib/components/ShellCycleDrill.svelte';
	import { chapterById, SHELL_CYCLE_CHECK, SHELLS_CHAPTER } from '$lib/path/chapters';
	import { t } from '$lib/i18n/locale.svelte';
	import type { PageProps } from './$types';

	/**
	 * /learn/[chapter]: one method-book chapter on the `Chapter.svelte`
	 * template. The chapter's data (repertoire, checklist) comes from
	 * `chapters.ts`; its concept picture and exercise are mapped from its id
	 * here, so `chapters.ts` stays pure data.
	 */
	let { data }: PageProps = $props();

	const chapter = $derived(chapterById(data.chapterId));
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<!-- max-w must stay an arbitrary value: the Print Shop @theme defines
	     --spacing-2xl: 48px, so a named max-w-2xl utility resolves to 48px. -->
	<div class="mx-auto flex max-w-[42rem] flex-col gap-8">
		{#if chapter?.id === SHELLS_CHAPTER.id}
			<Chapter {chapter}>
				{#snippet concept()}
					<p class="text-body">{t('book.ch15.concept.body')}</p>
					<ShellsConcept />
					<p class="text-label text-muted">{t('book.ch15.concept.caption')}</p>
					<p class="text-body">{t('book.ch15.concept.flat5')}</p>
				{/snippet}
				{#snippet piano(tick)}
					<p class="text-body">{t('book.ch15.piano.intro')}</p>
					<ShellCycleDrill onClean={(form) => tick(SHELL_CYCLE_CHECK[form])} />
				{/snippet}
			</Chapter>
		{/if}
	</div>
</main>
