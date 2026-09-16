<script lang="ts">
	import { onDestroy } from 'svelte';
	import { mnemonicFor } from '$lib/copy/mnemonics';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import ChordExample from '$lib/components/ChordExample.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import NoteLabel from '$lib/components/NoteLabel.svelte';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import Button from '$lib/components/Button.svelte';
	import InteractiveLesson from '$lib/components/InteractiveLesson.svelte';
	import BuildSession from '$lib/components/BuildSession.svelte';
	import SpellIntervalDrill from '$lib/components/SpellIntervalDrill.svelte';
	import ChordScaleConcept from '$lib/components/ChordScaleConcept.svelte';
	import { GUIDE_TONE_BARS, shellPitches, type GuideToneBar } from '$lib/lessons/guideTones';
	import { INTERVAL_NAMING_LESSON } from '$lib/lessons/intervalNamingLesson';
	import { CHORD_SCALE_LESSON, CHORD_SCALE_LESSON_DRILL_SEEDS } from '$lib/lessons/chordScaleLesson';
	import { t, type MessageKey } from '$lib/i18n/locale.svelte';

	/**
	 * TheoryLessons: the shape-first lessons decoding jazz chord symbols
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

	/**
	 * The diatonic sevenths of C major, each carrying the roman numeral its
	 * degree is written as. The numeral rides on the button (not only in the
	 * caption prose) because /learn is the ONLY place the numeral system is
	 * ever defined, and ProgressionDrill then requires numeral literacy
	 * ("STEP 1: NAME THE ii"). Numerals are immune display values, exactly
	 * like chord symbols: never routed through t().
	 */
	const ANCHOR_CHORDS: { roman: string; symbol: string; captionKey: MessageKey }[] = [
		{ roman: 'I', symbol: 'Cmaj7', captionKey: 'theory.anchor.caption.i' },
		{ roman: 'ii', symbol: 'Dm7', captionKey: 'theory.anchor.caption.ii' },
		{ roman: 'iii', symbol: 'Em7', captionKey: 'theory.anchor.caption.iii' },
		{ roman: 'IV', symbol: 'Fmaj7', captionKey: 'theory.anchor.caption.iv' },
		{ roman: 'V', symbol: 'G7', captionKey: 'theory.anchor.caption.v7' },
		{ roman: 'vi', symbol: 'Am7', captionKey: 'theory.anchor.caption.vi' },
		{ roman: 'viiø7', symbol: 'Bm7b5', captionKey: 'theory.anchor.caption.vii' }
	];

	/**
	 * The three bars of the jazz sentence in C, numeral + symbol, for the
	 * function lesson. Roman numerals and chord symbols are both immune
	 * display values, so nothing here routes through t(). Three of the three
	 * templates in `progressions.ts` are ii-V-I derivatives, which is why this
	 * shape earns its own worked example rather than a passing mention.
	 */
	const JAZZ_SENTENCE = [
		{ roman: 'ii', root: 'D', quality: 'm7', notes: ['D', 'F', 'A', 'C'] },
		{ roman: 'V', root: 'G', quality: '7', notes: ['G', 'B', 'D', 'F'] },
		{ roman: 'I', root: 'C', quality: 'maj7', notes: ['C', 'E', 'G', 'B'] }
	];

	/**
	 * The three tonics offered by the major-scale build lesson (audit fix:
	 * `createScaleConstruction`/BuildSession's scale branch produced the
	 * app's only statement of W-W-H-W-W-W-H, but were unreachable - both
	 * BuildSession mount sites only ever passed a chord embedFact). C (no
	 * accidentals, the reference case), G (one sharp) and F (one flat): one
	 * tonic on each side of C already proves the pattern transposes in both
	 * directions, which is the whole point, without burying that point under
	 * a phone-width wall of all 12 MAJOR_SCALE_ROOTS. Reuses
	 * createScaleConstruction (via BuildSession's own scale branch) for all
	 * three; nothing here re-derives scale spelling.
	 */
	const SCALE_LESSON_TONICS = ['C', 'G', 'F'] as const;

	let scaleLessonTonic = $state<string | undefined>();

	/**
	 * Unit 4 (interval naming): flips once `INTERVAL_NAMING_LESSON` finishes
	 * its steps, revealing the inline "Prove it" spelling drill below. Mirrors
	 * the thirds lesson's own completion signal, but the proof lives on
	 * /learn instead of handing off to /practice (owner decision: this drill
	 * does not enter the FSRS deck), so it is driven by `onComplete` rather
	 * than the handoff card (`showHandoff={false}` below).
	 */
	let intervalNamingDone = $state(false);

	/**
	 * Returns to the tonic row so the reader can build a different (or the
	 * same) scale. Passed as BuildSession's `onComplete`, which replaces its
	 * standalone "Build Another"/"Recall It Now" completion CTAs with a
	 * single "Next" - appropriate here since `noCard` (below) means there is
	 * nothing to recall: no card is ever created by this embed.
	 */
	function resetScaleLesson() {
		scaleLessonTonic = undefined;
	}

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

	/**
	 * Unit 11 (guide tones and voice leading): which of the fixed three bars
	 * (ii, V, I in C, from `guideTones.ts`) is currently shown. The bars and
	 * their shells are computed, never hand-typed - see that module's own doc
	 * comment for why. Roman numeral maps to its caption key since the
	 * caption differs per bar (the first has no incoming motion to describe).
	 */
	let guideTonePick = $state(GUIDE_TONE_BARS[0]);

	const GUIDE_TONE_CAPTION_KEYS: Record<string, MessageKey> = {
		ii: 'theory.guideTones.caption.ii',
		V: 'theory.guideTones.caption.v',
		I: 'theory.guideTones.caption.i'
	};

	function guideToneCaptionKey(bar: GuideToneBar): MessageKey {
		return GUIDE_TONE_CAPTION_KEYS[bar.roman] ?? 'theory.guideTones.caption.ii';
	}

	/** The V7 to I demo: G7 first, C major on the next beat. */
	let resolutionTimer: ReturnType<typeof setTimeout> | undefined;
	function hearResolution() {
		void ensureAudioReady();
		playChord(['G', 'B', 'D', 'F']);
		clearTimeout(resolutionTimer);
		resolutionTimer = setTimeout(() => playChord(['C', 'E', 'G']), 800);
	}

	/**
	 * The ii V I demo: one bar per 800ms beat, matching hearResolution's
	 * pacing so the two demos feel like the same instrument. Timers are
	 * tracked in an array and cleared on re-press and on destroy, so a double
	 * tap never stacks two overlapping sentences.
	 */
	let sentenceTimers: ReturnType<typeof setTimeout>[] = [];
	function clearSentenceTimers() {
		for (const timer of sentenceTimers) clearTimeout(timer);
		sentenceTimers = [];
	}
	function hearSentence() {
		void ensureAudioReady();
		clearSentenceTimers();
		playChord(JAZZ_SENTENCE[0].notes);
		sentenceTimers = JAZZ_SENTENCE.slice(1).map((bar, i) =>
			setTimeout(() => playChord(bar.notes), (i + 1) * 800)
		);
	}

	/**
	 * Unit 11's "Hear it move": the three SHELLS (never the full triads) in
	 * sequence, same 800ms pacing as hearSentence so the two demos feel like
	 * the same instrument. This is the audible half of the lesson - two notes
	 * at a time, the falling voice landing on each beat.
	 */
	let guideToneTimers: ReturnType<typeof setTimeout>[] = [];
	function clearGuideToneTimers() {
		for (const timer of guideToneTimers) clearTimeout(timer);
		guideToneTimers = [];
	}
	function hearGuideTones() {
		void ensureAudioReady();
		clearGuideToneTimers();
		playChord(shellPitches(GUIDE_TONE_BARS[0]));
		guideToneTimers = GUIDE_TONE_BARS.slice(1).map((bar, i) =>
			setTimeout(() => playChord(shellPitches(bar)), (i + 1) * 800)
		);
	}

	onDestroy(() => {
		clearTimeout(resolutionTimer);
		clearSentenceTimers();
		clearGuideToneTimers();
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
	data-testid="section-scale"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.scale.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.scale.heading')}</h2>
	<p class="text-body">
		{t('theory.scale.body')}
	</p>
	<p class="text-label font-mono uppercase">{t('build.caption.tonic')}</p>
	<div class="flex flex-wrap gap-2" data-testid="scale-tonic-row">
		{#each SCALE_LESSON_TONICS as tonic (tonic)}
			<Button
				type="button"
				variant={scaleLessonTonic === tonic ? 'primary' : 'ghost'}
				aria-pressed={scaleLessonTonic === tonic}
				onclick={() => (scaleLessonTonic = tonic)}
			>
				{tonic} {t('build.word.major')}
			</Button>
		{/each}
	</div>
	{#if scaleLessonTonic}
		{#key scaleLessonTonic}
			<BuildSession
				embedFact={{ kind: 'scale', tonic: scaleLessonTonic }}
				onComplete={resetScaleLesson}
				noCard
			/>
		{/key}
	{/if}
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-interval-naming"
>
	<InteractiveLesson
		steps={INTERVAL_NAMING_LESSON}
		previewRole="second"
		subtitleKey="theory.intervalNaming.subtitle"
		showHandoff={false}
		onComplete={() => (intervalNamingDone = true)}
	/>
	{#if intervalNamingDone}
		<div class="border-ink mt-2 border-t-2 pt-6" data-testid="interval-naming-prove-it">
			<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
				{t('theory.lesson.handoff.tag')}
			</p>
			<h3 class="text-heading mt-2 font-serif font-bold">
				{t('theory.intervalNaming.prove.heading')}
			</h3>
			<p class="text-body mt-2">{t('theory.intervalNaming.prove.body')}</p>
			<div class="mt-4">
				<SpellIntervalDrill />
			</div>
		</div>
	{/if}
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
	<div class="flex flex-wrap gap-2" data-testid="anchor-pick-row">
		{#each ANCHOR_CHORDS as chord (chord.symbol)}
			<Button
				type="button"
				variant={anchorPick.symbol === chord.symbol ? 'primary' : 'ghost'}
				onclick={() => (anchorPick = chord)}
			>
				<span class="anchor-pick flex flex-col items-center">
					<span class="text-label font-mono">{chord.roman}</span>
					<span>{chord.symbol}</span>
				</span>
			</Button>
		{/each}
	</div>
	{#key anchorPick.symbol}
		<ChordExample symbol={anchorPick.symbol} caption={t(anchorPick.captionKey)} />
	{/key}
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-function"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.function.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.function.heading')}</h2>
	<p class="text-body">
		{t('theory.function.body')}
	</p>
	<p class="text-body">
		{t('theory.function.sentence')}
	</p>
	<div class="flex flex-wrap items-end gap-4" data-testid="jazz-sentence-row">
		{#each JAZZ_SENTENCE as bar (bar.roman)}
			<div class="flex flex-col items-start gap-1">
				<span class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
					{bar.roman}
				</span>
				<ChordGlyph root={bar.root} quality={bar.quality} />
			</div>
		{/each}
	</div>
	<div>
		<Button type="button" variant="ghost" onclick={hearSentence}
			>{t('theory.function.hearButton')}</Button
		>
	</div>
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-guide-tones"
>
	<p class="text-label font-mono uppercase" style="letter-spacing: 0.08em;">
		{t('theory.guideTones.label')}
	</p>
	<h2 class="text-heading font-bold">{t('theory.guideTones.heading')}</h2>
	<p class="text-body">
		{t('theory.guideTones.body')}
	</p>
	<div class="flex flex-wrap gap-2" data-testid="guide-tone-pick-row">
		{#each GUIDE_TONE_BARS as bar (bar.symbol)}
			<Button
				type="button"
				variant={guideTonePick.symbol === bar.symbol ? 'primary' : 'ghost'}
				onclick={() => (guideTonePick = bar)}
			>
				<span class="anchor-pick flex flex-col items-center">
					<span class="text-label font-mono">{bar.roman}</span>
					<span>{bar.symbol}</span>
				</span>
			</Button>
		{/each}
	</div>
	{#key guideTonePick.symbol}
		<div class="flex items-start gap-4">
			<ChordGlyph root={guideTonePick.root} quality={guideTonePick.quality} />
		</div>
		<div style="max-width: 100%;">
			<PianoKeyboard notes={guideTonePick.shell} />
		</div>
		<p class="text-body" data-testid="guide-tone-caption">
			{t(guideToneCaptionKey(guideTonePick))}
		</p>
	{/key}
	<div>
		<Button type="button" variant="ghost" onclick={hearGuideTones}
			>{t('theory.guideTones.hearButton')}</Button
		>
	</div>
	<p class="text-body text-muted">{t('theory.guideTones.practiceNote')}</p>
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-chord-scale"
>
	<ChordScaleConcept />
</section>

<section
	class="border-ink bg-paper-bright flex flex-col gap-4 border-2 px-4 py-6"
	data-testid="section-chord-scale-lesson"
>
	<InteractiveLesson
		steps={CHORD_SCALE_LESSON}
		seeds={CHORD_SCALE_LESSON_DRILL_SEEDS}
		previewRole="second"
		subtitleKey="theory.chordScaleLesson.subtitle"
	/>
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

<style>
	/* The numeral sits tight above its chord symbol so a two-line pick button
	   stays the same height as the one-line seventh-shape buttons beside it. */
	.anchor-pick {
		line-height: 1.15;
	}
</style>
