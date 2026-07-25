<script lang="ts">
	import TheoryLessons from '$lib/components/TheoryLessons.svelte';
	import ScaleExplorer from '$lib/components/ScaleExplorer.svelte';
	import IntervalView from '$lib/components/IntervalView.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import Button from '$lib/components/Button.svelte';
	import { spellChord } from '$lib/theory/chord';
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
