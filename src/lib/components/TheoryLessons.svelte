<script lang="ts">
	import { onDestroy } from 'svelte';
	import { mnemonicFor } from '$lib/copy/mnemonics';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import ChordExample from '$lib/components/ChordExample.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import NoteLabel from '$lib/components/NoteLabel.svelte';
	import Button from '$lib/components/Button.svelte';
	import InteractiveLesson from '$lib/components/InteractiveLesson.svelte';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * TheoryLessons: the six shape-first lessons decoding jazz chord symbols
	 * for a returning classical pianist, extracted from /theory (Phase 28
	 * Plan 01, LEARN-01 DRY extraction) so /theory and the future /learn hub
	 * (Plan 04) can both render the same lesson body — one source of truth,
	 * no duplicated markup.
	 *
	 * Every lesson shows the actual keys on a display keyboard (ChordExample),
	 * the KEEP-rated mnemonics from R3 appear as sidebars, and examples are
	 * tappable through the audio contract. Prerender-safe: pure client
	 * rendering, no load functions, no browser APIs at init.
	 */

	/** The five seventh shapes on C, with their triad + 7th construction captions. */
	const SEVENTH_SHAPES: { symbol: string; suffix: string; captionKey: MessageKey }[] = [
		{ symbol: 'Cmaj7', suffix: 'maj7', captionKey: 'theory.sevenths.caption.maj7' },
		{ symbol: 'C7', suffix: '7', captionKey: 'theory.sevenths.caption.dom7' },
		{ symbol: 'Cm7', suffix: 'm7', captionKey: 'theory.sevenths.caption.m7' },
		{ symbol: 'Cm7b5', suffix: 'm7b5', captionKey: 'theory.sevenths.caption.m7b5' },
		{ symbol: 'Cdim7', suffix: 'dim7', captionKey: 'theory.sevenths.caption.dim7' }
	];

	/** The diatonic sevenths of C major: all white keys, four qualities, their day jobs. */
	const ANCHOR_CHORDS: { symbol: string; captionKey: MessageKey }[] = [
		{ symbol: 'Cmaj7', captionKey: 'theory.anchor.caption.i' },
		{ symbol: 'Dm7', captionKey: 'theory.anchor.caption.ii' },
		{ symbol: 'Em7', captionKey: 'theory.anchor.caption.iii' },
		{ symbol: 'Fmaj7', captionKey: 'theory.anchor.caption.iv' },
		{ symbol: 'G7', captionKey: 'theory.anchor.caption.v7' },
		{ symbol: 'Am7', captionKey: 'theory.anchor.caption.vi' },
		{ symbol: 'Bm7b5', captionKey: 'theory.anchor.caption.vii' }
	];

	/** The full letter-to-solfege map for the French reader. */
	const SOLFEGE_MAP = [
		{ letter: 'C', solfege: 'Do' },
		{ letter: 'D', solfege: 'Ré' },
		{ letter: 'E', solfege: 'Mi' },
		{ letter: 'F', solfege: 'Fa' },
		{ letter: 'G', solfege: 'Sol' },
		{ letter: 'A', solfege: 'La' },
		{ letter: 'B', solfege: 'Si' }
	];

	let seventhPick = $state(SEVENTH_SHAPES[0]);
	let anchorPick = $state(ANCHOR_CHORDS[0]);

	/** The V7 to I demo: G7 first, C major on the next beat. */
	let resolutionTimer: ReturnType<typeof setTimeout> | undefined;
	function hearResolution() {
		void ensureAudioReady();
		playChord(['G', 'B', 'D', 'F']);
		clearTimeout(resolutionTimer);
		resolutionTimer = setTimeout(() => playChord(['C', 'E', 'G']), 800);
	}

	onDestroy(() => {
		clearTimeout(resolutionTimer);
	});
</script>

{#snippet hook(suffix: string)}
	{@const line = mnemonicFor(suffix)}
	{#if line !== null}
		<aside class="border-ink mt-2 border-l-4 pl-4" data-testid="mnemonic-aside">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('theory.hook.label')}
			</p>
			<p class="text-body mt-1">{line}</p>
		</aside>
	{/if}
{/snippet}

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-interactive-lesson"
>
	<InteractiveLesson />
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-symbol"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.symbol.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.symbol.heading')}</h2>
	<div class="flex items-start gap-4">
		<ChordGlyph root="C" quality="m7" />
	</div>
	<p class="text-body">
		{t('theory.symbol.body')}
	</p>
	<ChordExample symbol="Cm7" caption={t('theory.symbol.exampleCaption')} />
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-sevenths"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.sevenths.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.sevenths.heading')}</h2>
	<p class="text-body">
		{t('theory.sevenths.body')}
	</p>
	<div class="flex flex-wrap gap-2">
		{#each SEVENTH_SHAPES as shape (shape.symbol)}
			<Button
				type="button"
				variant={seventhPick.symbol === shape.symbol ? 'primary' : 'ghost'}
				onclick={() => (seventhPick = shape)}
			>
				{shape.symbol}
			</Button>
		{/each}
	</div>
	{#key seventhPick.symbol}
		<ChordExample symbol={seventhPick.symbol} caption={t(seventhPick.captionKey)} />
	{/key}
	{@render hook(seventhPick.suffix)}
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-anchor"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.anchor.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.anchor.heading')}</h2>
	<p class="text-body">
		{t('theory.anchor.body')}
	</p>
	<div class="flex flex-wrap gap-2">
		{#each ANCHOR_CHORDS as chord (chord.symbol)}
			<Button
				type="button"
				variant={anchorPick.symbol === chord.symbol ? 'primary' : 'ghost'}
				onclick={() => (anchorPick = chord)}
			>
				{chord.symbol}
			</Button>
		{/each}
	</div>
	{#key anchorPick.symbol}
		<ChordExample symbol={anchorPick.symbol} caption={t(anchorPick.captionKey)} />
	{/key}
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-dominant"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.dominant.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.dominant.heading')}</h2>
	<p class="text-body">
		{t('theory.dominant.body')}
	</p>
	<ChordExample symbol="G7" caption={t('theory.dominant.exampleCaption')} />
	<div>
		<Button type="button" variant="ghost" onclick={hearResolution}
			>{t('theory.dominant.hearButton')}</Button
		>
	</div>
	{@render hook('7')}
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-diminished"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.diminished.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.diminished.heading')}</h2>
	<p class="text-body">
		{t('theory.diminished.body')}
	</p>
	<ChordExample symbol="Bm7b5" caption={t('theory.diminished.halfCaption')} />
	{@render hook('m7b5')}
	<ChordExample symbol="Bdim7" caption={t('theory.diminished.fullCaption')} />
	{@render hook('dim7')}
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-solfege"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.solfege.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.solfege.heading')}</h2>
	<p class="text-body">
		{t('theory.solfege.body')}
	</p>
	<div class="flex flex-wrap gap-4">
		{#each SOLFEGE_MAP as entry (entry.letter)}
			<NoteLabel letter={entry.letter} solfege={entry.solfege} />
		{/each}
	</div>
</section>
