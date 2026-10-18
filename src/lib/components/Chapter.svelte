<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { chordLabel, spellChord } from '$lib/theory/chord';
	import { setCompSongSeed } from '$lib/practice/compSongSeed';
	import { setDrillSeeds } from '$lib/practice/drillSeeds';
	import { checklistTicks, setChecklistTick } from '$lib/path/pathState';
	import type { ChapterDef, ExerciseGrading, TuneExcerpt } from '$lib/path/chapters';
	import Button from './Button.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * The method-book chapter template: four blocks, always in this order,
	 * Concept / At the piano / In the repertoire / Practice checklist
	 * (`.planning/design/method-book.md`). The chapter's own concept picture
	 * and exercise come in as snippets; repertoire and checklist are rendered
	 * from the chapter's data, so every chapter gets them alike.
	 *
	 * The `piano` snippet receives `tick(itemId)`, the one way an exercise
	 * ticks an app-checked checklist line. Ticks persist per device through
	 * `pathState.ts` and are only ever shown here, as ticks: no count, no
	 * fraction, no badge anywhere else.
	 */
	interface Props {
		chapter: ChapterDef;
		concept: Snippet;
		piano: Snippet<[(itemId: string) => void]>;
	}

	let { chapter, concept, piano }: Props = $props();

	const GRADING_KEY: Record<ExerciseGrading, MessageKey> = {
		checked: 'book.grading.checked',
		guided: 'book.grading.guided'
	};

	let ticks = $state<string[]>([]);

	onMount(() => {
		ticks = checklistTicks(chapter.id);
	});

	function setTick(itemId: string, ticked: boolean): void {
		ticks = setChecklistTick(chapter.id, itemId, ticked);
	}

	function tick(itemId: string): void {
		setTick(itemId, true);
	}

	function uniqueSymbols(tune: TuneExcerpt): string[] {
		return [...new Set(tune.bars.map((bar) => bar.symbol))];
	}

	function playOver(tune: TuneExcerpt): void {
		setCompSongSeed(tune.title, tune.bars.map((bar) => bar.symbol));
		void goto('/learn');
	}

	function drill(tune: TuneExcerpt): void {
		setDrillSeeds(uniqueSymbols(tune));
		void goto('/practice');
	}
</script>

<article class="flex flex-col gap-8" data-testid="chapter" data-chapter={chapter.id}>
	<header class="flex flex-col gap-2">
		<a class="back text-label font-mono uppercase" href="/learn">{t('book.chapter.back')}</a>
		<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
			{t(chapter.partKey)} · {t('book.chapter.label')} {chapter.number}
		</p>
		<h1 class="text-heading font-bold">{t(chapter.titleKey)}</h1>
		<p class="text-body idea" data-testid="chapter-idea">{t(chapter.ideaKey)}</p>
	</header>

	<section class="block flex flex-col gap-4" data-testid="chapter-concept">
		<p class="block-label text-label font-mono uppercase">1 · {t('book.block.concept')}</p>
		{@render concept()}
	</section>

	<section class="block flex flex-col gap-4" data-testid="chapter-piano">
		<p class="block-label text-label font-mono uppercase">2 · {t('book.block.piano')}</p>
		<p class="grading text-label font-mono uppercase" data-testid="chapter-grading">
			{t(GRADING_KEY[chapter.grading])}
		</p>
		{@render piano(tick)}
	</section>

	<section class="block flex flex-col gap-4" data-testid="chapter-repertoire">
		<p class="block-label text-label font-mono uppercase">3 · {t('book.block.repertoire')}</p>
		{#each chapter.repertoire as tune (tune.id)}
			<div class="tune border-ink bg-paper-bright flex flex-col gap-3 border-2 px-4 py-4" data-testid="chapter-tune">
				<div class="flex flex-col gap-1">
					<h3 class="text-body font-bold">{tune.title}</h3>
					<p class="text-label text-muted font-mono uppercase">
						{tune.composer} · {tune.year} · {t('book.repertoire.changesOnly')}
					</p>
				</div>
				<p class="text-label font-mono uppercase">{t(tune.barsKey)}</p>
				<div class="strip" data-testid="chapter-tune-strip">
					{#each tune.bars as bar, index (index)}
						<div class="strip-bar">
							<span class="strip-symbol">{chordLabel(spellChord(bar.symbol))}</span>
							<span class="strip-roman">{bar.roman}</span>
						</div>
					{/each}
				</div>
				<p class="text-body">{t(tune.noteKey)}</p>
				<div class="flex flex-wrap gap-2">
					<Button type="button" variant="primary" onclick={() => playOver(tune)}>
						{t('book.repertoire.playOver')}
					</Button>
					<Button type="button" variant="ghost" onclick={() => drill(tune)}>
						{t('book.repertoire.drill')}
					</Button>
				</div>
			</div>
		{/each}
	</section>

	<section class="block flex flex-col gap-4" data-testid="chapter-checklist">
		<p class="block-label text-label font-mono uppercase">4 · {t('book.block.checklist')}</p>
		<ul class="checklist flex flex-col gap-3">
			{#each chapter.checklist as item (item.id)}
				{@const ticked = ticks.includes(item.id)}
				<li class="check-line" data-testid="checklist-item" data-item={item.id} data-ticked={ticked}>
					{#if item.by === 'app'}
						<span class="box" class:box--ticked={ticked} aria-hidden="true">{ticked ? '✓' : ''}</span>
						<span class="flex flex-col gap-1">
							<span class="text-body">{t(item.labelKey)}</span>
							<span class="text-label text-muted font-mono uppercase">{t('book.checklist.byApp')}</span>
						</span>
					{:else}
						<label class="self-check">
							<input
								type="checkbox"
								class="box-input"
								checked={ticked}
								onchange={(event) => setTick(item.id, event.currentTarget.checked)}
							/>
							<span class="box" class:box--ticked={ticked} aria-hidden="true">{ticked ? '✓' : ''}</span>
							<span class="flex flex-col gap-1">
								<span class="text-body">{t(item.labelKey)}</span>
								<span class="text-label text-muted font-mono uppercase">{t('book.checklist.byYou')}</span>
							</span>
						</label>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="text-label text-muted note">{t('book.checklist.note')}</p>
	</section>
</article>

<style>
	.back {
		color: var(--color-ink);
		text-decoration: underline;
		align-self: flex-start;
	}

	.idea {
		font-size: 1.125rem;
	}

	.block {
		border-top: 2px solid var(--color-ink);
		padding-top: var(--spacing-md);
	}

	.block-label {
		letter-spacing: 0.08em;
		font-weight: 700;
	}

	.grading {
		align-self: flex-start;
		border: 1.5px solid var(--color-ink);
		padding: var(--spacing-xs) var(--spacing-sm);
		letter-spacing: 0.04em;
	}

	.strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		border-top: 2px solid var(--color-ink);
		border-left: 2px solid var(--color-ink);
	}

	.strip-bar {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm);
		border-right: 2px solid var(--color-ink);
		border-bottom: 2px solid var(--color-ink);
	}

	.strip-symbol {
		font-weight: 700;
	}

	.strip-roman {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
	}

	.check-line,
	.self-check {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-sm);
	}

	.self-check {
		cursor: pointer;
	}

	.box-input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}

	.box {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		font-weight: 700;
	}

	.box--ticked {
		background: var(--color-verdigris);
		border-color: var(--color-verdigris);
		color: var(--color-on-third);
	}

	.box-input:focus-visible + .box {
		outline: 2px solid var(--color-ink);
		outline-offset: 2px;
	}

	.note {
		font-style: italic;
	}
</style>
