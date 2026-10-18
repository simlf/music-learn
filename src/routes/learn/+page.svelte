<script lang="ts">
	import TheoryLessons from '$lib/components/TheoryLessons.svelte';
	import CompingLoop from '$lib/components/CompingLoop.svelte';
	import ScaleExplorer from '$lib/components/ScaleExplorer.svelte';
	import IntervalView from '$lib/components/IntervalView.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import Button from '$lib/components/Button.svelte';
	import { spellChord } from '$lib/theory/chord';
	import { CHAPTERS } from '$lib/path/chapters';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * /learn (LEARN-01): the Learn hub, a single phone-first sectioned scroll
	 * composing three reused parts: the extracted TheoryLessons (Phase 28 Plan
	 * 01), the extracted ScaleExplorer in exploreOnly mode (Plan 02), and a new
	 * Interval Reference block rendering the shared IntervalView (Phase 26)
	 * five times for the five representative seventh qualities. Pure client
	 * render, prerender-safe (inherits `prerender = true` from
	 * src/routes/+layout.ts, no load function here).
	 *
	 * onInspectTone is omitted on every IntervalView instance below: this
	 * block is a reference/shape teacher, not a tap-to-inspect drill, so tones
	 * render inert per IntervalView's gated-prop contract.
	 */
	const INTERVAL_REFERENCE_CHORDS = [
		{ symbol: 'Cmaj7', quality: 'maj7', labelKey: 'learn.interval.maj7' },
		{ symbol: 'C7', quality: '7', labelKey: 'learn.interval.dom7' },
		{ symbol: 'Cm7', quality: 'm7', labelKey: 'learn.interval.m7' },
		{ symbol: 'Cm7b5', quality: 'm7b5', labelKey: 'learn.interval.m7b5' },
		{ symbol: 'Cdim7', quality: 'dim7', labelKey: 'learn.interval.dim7' }
	] as const;
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<!-- max-w must stay an arbitrary value: the Print Shop @theme defines
	     --spacing-2xl: 48px, so a named max-w-2xl utility resolves to 48px. -->
	<div class="mx-auto flex max-w-[42rem] flex-col gap-8">
		<header>
			<h1 class="text-heading mt-2 font-bold">{t('learn.page.title')}</h1>
			<p class="text-body text-muted mt-2">
				{t('learn.page.subtitle')}
			</p>
		</header>

		<!--
			The comping loop leads the page deliberately: it is the one block here
			you open with the intent to USE it at the piano, and burying it under
			seven lesson sections would mean scrolling past all of them on a phone
			every time. It is a peer of the lesson blocks, never a drill: it enters
			no practice queue, creates no card, and grades nothing.
		-->
		<section
			data-testid="learn-comping"
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
		>
			<CompingLoop />
		</section>

		<!--
			Part II of the method book (.planning/design/method-book.md): each
			chapter is its own page on the four-block template. It sits right
			under the loop, above the theory lessons it builds on, because a
			chapter is the other thing you open here to USE at the piano; the
			theory lessons are what Part I will be built from.
		-->
		<section data-testid="learn-book" class="flex flex-col gap-4">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('book.part.2')}
			</p>
			{#each CHAPTERS as chapter (chapter.id)}
				<a
					class="chapter-row border-ink bg-paper-bright flex flex-col gap-2 border-2 px-4 py-4"
					href="/learn/{chapter.id}"
					data-testid="learn-chapter-row"
				>
					<span class="text-label text-muted font-mono uppercase">
						{t('book.chapter.label')} {chapter.number}
					</span>
					<span class="text-heading font-bold">{t(chapter.titleKey)}</span>
					<span class="text-body">{t(chapter.ideaKey)}</span>
					<span class="text-label font-mono uppercase underline">{t('book.learn.open')}</span>
				</a>
			{/each}
		</section>

		<section data-testid="learn-theory" class="flex flex-col gap-4">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('learn.section.theory.label')}
			</p>
			<TheoryLessons />
		</section>

		<section data-testid="learn-explore" class="flex flex-col gap-4">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('learn.section.explore.label')}
			</p>
			<h2 class="text-heading font-bold">{t('learn.section.explore.heading')}</h2>
			<ScaleExplorer exploreOnly />
		</section>

		<section
			data-testid="learn-interval-reference"
			class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
		>
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('learn.section.interval.label')}
			</p>
			<h2 class="text-heading font-bold">{t('learn.section.interval.heading')}</h2>
			<p class="text-body">{t('learn.section.interval.intro')}</p>

			{#each INTERVAL_REFERENCE_CHORDS as entry (entry.symbol)}
				<div class="mt-8 flex flex-col gap-4 last:mb-0">
					<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
						{t(entry.labelKey)}
					</p>
					<ChordGlyph root="C" quality={entry.quality} />
					<IntervalView chord={spellChord(entry.symbol)} />
				</div>
			{/each}
		</section>

		<div class="flex justify-center pb-8">
			<Button href="/practice">{t('learn.footer.practiceButton')}</Button>
		</div>
	</div>
</main>

<style>
	.chapter-row {
		color: var(--color-ink);
		text-decoration: none;
		box-shadow: 3px 3px 0 var(--color-ink);
	}

	.chapter-row:hover,
	.chapter-row:focus-visible {
		box-shadow: 5px 5px 0 var(--color-ink);
	}
</style>
