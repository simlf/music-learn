<script lang="ts">
	import { Note } from 'tonal';
	import {
		PROGRESSION_TEMPLATES,
		nameChoices,
		randomProgression,
		type ProgressionBar,
		type RomanFunction
	} from '$lib/practice/progressions';
	import { matchChord } from '$lib/drills/matchChord';
	import { spellChord } from '$lib/theory/chord';
	import { toAsciiAccidentals } from '$lib/theory/interval';
	import { buildProvenanceIndex, songsForSymbol } from '$lib/practice/songProvenance';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import Button from './Button.svelte';
	import SongMark from './SongMark.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Sketch-017 synthesis (LOCKED, SK-017): "earn-the-symbol" lead-sheet
	 * grid. NOT a new drill chrome - a measure grid container wrapping the
	 * existing two-step drill inside each bar, over 25-01's pure
	 * `buildProgression`/`nameChoices`/`randomProgression` engine.
	 *
	 * Roman numerals are always visible; chord symbols stay hidden as "?"
	 * until the learner names the chord from its numeral (step 1, same-key
	 * multiple-choice chips from `nameChoices`) then plays it on the inline
	 * keyboard (step 2, chroma-graded via `matchChord` against
	 * `spellChord(bar.symbol)`). Naming or playing wrong never gates progress
	 * - it shows a gentle retry and stays on the same step. A correct play
	 * earns the symbol (verdigris fill + serif ChordGlyph stamp-in), reveals
	 * its harmonic function, and advances the cursor. Keyboard stays INLINE
	 * with Check directly beneath it (no fixed action dock - keyboard-inline
	 * is the locked house rule, see [[keyboard-inline-not-docked]]).
	 */

	type Step = 'name' | 'play';

	/** A fresh random progression + its bars, mirroring randomProgression()'s own return shape. */
	function drawProgression(): { templateId: string; key: string; bars: ProgressionBar[] } {
		return randomProgression();
	}

	/** Plain (non-rune) local so its initial `.bars` read below doesn't trip Svelte's
	 * state_referenced_locally analysis - `earned`'s length must match this exact
	 * draw, but only ever needs its INITIAL bar count, never a live/reactive one. */
	const initialProgression = drawProgression();

	let progression = $state(initialProgression);
	let cursor = $state(0);
	let earned = $state<boolean[]>(initialProgression.bars.map(() => false));
	let step = $state<Step>('name');
	let nameRetry = $state(false);
	let playRetry = $state(false);
	let selected = $state<Set<string>>(new Set());
	let pulseToken = $state(0);
	let functionReveal = $state<RomanFunction | null>(null);

	/** Built once at mount (mirrors /recall's own init-time buildProvenanceIndex() call). */
	const provenanceIndex = buildProvenanceIndex();

	const currentBar = $derived(progression.bars[cursor] as ProgressionBar | undefined);
	const complete = $derived(progression.bars.length > 0 && earned.every((bar) => bar));
	const currentTemplate = $derived(
		PROGRESSION_TEMPLATES.find((template) => template.id === progression.templateId)
	);
	/** Mode-aware (WR-04): a minor bar's distractor chips draw from the MINOR key's sevenths, never the parallel major's. */
	const currentChoices = $derived(
		currentBar ? nameChoices(currentBar, progression.key, currentTemplate?.mode ?? 'major') : []
	);
	const keyModeWord = $derived(
		currentTemplate?.mode === 'minor' ? t('progressions.key.minor') : t('progressions.key.major')
	);

	/** Maps a bar's RomanFunction enum value to its keyed display word. */
	function functionWord(functionLabel: RomanFunction): string {
		if (functionLabel === 'tonic') return t('progressions.function.tonic');
		if (functionLabel === 'dominant') return t('progressions.function.dominant');
		return t('progressions.function.subdominant');
	}

	/** A ChordGlyph-ready { root, quality } split of an earned bar's symbol, via spellChord. */
	function glyphParts(symbol: string): { root: string; quality: string } {
		const spelled = spellChord(symbol);
		return { root: spelled.root, quality: spelled.symbol.slice(spelled.root.length) };
	}

	/** Step 1: tapping a name choice. Correct advances to step 2; wrong retries gently, never gates. */
	function pickName(choice: string): void {
		if (!currentBar) return;
		if (choice === currentBar.symbol) {
			nameRetry = false;
			playRetry = false;
			selected = new Set();
			step = 'play';
		} else {
			nameRetry = true;
		}
	}

	function toggleKey(letter: string): void {
		const next = new Set(selected);
		if (next.has(letter)) {
			next.delete(letter);
		} else {
			next.add(letter);
		}
		selected = next;
	}

	/** Step 2: Check. Correct chroma match (matchChord) earns the bar; wrong retries gently, never gates. */
	function checkPlay(): void {
		if (!currentBar) return;
		const target = spellChord(currentBar.symbol);
		const playedChroma = new Set(
			[...selected].map((letter) => Note.chroma(toAsciiAccidentals(letter)))
		);
		const result = matchChord(playedChroma, target);
		selected = new Set();

		if (!result.correct) {
			playRetry = true;
			return;
		}

		playRetry = false;
		const nextEarned = [...earned];
		nextEarned[cursor] = true;
		earned = nextEarned;
		pulseToken += 1;
		functionReveal = currentBar.functionLabel;

		if (cursor < progression.bars.length - 1) {
			cursor += 1;
			step = 'name';
			nameRetry = false;
		}
	}

	/** Fresh-progression "Again" control (completion card): draws a new random progression, full reset. */
	function again(): void {
		progression = drawProgression();
		cursor = 0;
		earned = progression.bars.map(() => false);
		step = 'name';
		nameRetry = false;
		playRetry = false;
		selected = new Set();
		functionReveal = null;
	}
</script>

<div data-testid="progression-drill">
	<div class="key-banner" data-testid="key-banner">
		{t('progressions.key.banner.label')} {progression.key} {keyModeWord}
		<span class="bar-progress">
			{t('progressions.bar.progress.label')} {Math.min(cursor + 1, progression.bars.length)}/{progression
				.bars.length}
		</span>
	</div>

	<div class="measures" data-testid="measures">
		{#each progression.bars as bar, i (bar.index)}
			<div
				class="measure"
				class:measure--cursor={i === cursor && !complete}
				class:measure--played={earned[i]}
				class:measure--future={i > cursor}
				data-testid="measure-{i}"
			>
				<div class="msym" data-testid="symbol-{i}">
					{#if earned[i]}
						{@const parts = glyphParts(bar.symbol)}
						<ChordGlyph
							root={parts.root}
							quality={parts.quality}
							stamped
							pulseToken={i === cursor - 1 || (complete && i === cursor) ? pulseToken : undefined}
						/>
						<SongMark songs={songsForSymbol(bar.symbol, provenanceIndex)} />
					{:else}
						?
					{/if}
				</div>
				<div class="roman" data-testid="roman-{i}">{bar.roman}</div>
			</div>
		{/each}
	</div>

	<div class="step-register" data-testid="step-register">
		{#if !complete && currentBar}
			{#if step === 'name'}
				{t('progressions.register.step1Prefix')} {currentBar.roman}
			{:else}
				{t('progressions.register.step2')}
			{/if}
		{/if}
	</div>

	{#if functionReveal}
		<div class="function-reveal" data-testid="function-reveal">
			{t('progressions.function.kicker')} {functionWord(functionReveal)}
		</div>
	{/if}

	{#if !complete && currentBar}
		{#if step === 'name'}
			<p class="name-instruction">{t('progressions.name.instruction')}</p>
			<div class="name-choices" data-testid="name-choices">
				{#each currentChoices as choice (choice)}
					<Button
						type="button"
						variant="ghost"
						aria-label={`${t('progressions.aria.nameChoice')} ${choice}`}
						onclick={() => pickName(choice)}
					>
						<span class="font-serif text-heading font-bold">{choice}</span>
					</Button>
				{/each}
			</div>
			{#if nameRetry}
				<p class="retry" data-testid="name-retry">{t('progressions.retry.wrongName')}</p>
			{/if}
		{:else}
			<div class="play-step">
				<PianoKeyboard notes={[]} interactive {selected} onToggle={toggleKey} />
				<Button type="button" variant="primary" onclick={checkPlay}>
					{t('progressions.button.check')}
				</Button>
			</div>
			{#if playRetry}
				<p class="retry" data-testid="play-retry">{t('progressions.retry.wrongPlay')}</p>
			{/if}
		{/if}
	{/if}

	{#if complete}
		<div class="completion-card" data-testid="progression-complete">
			<h2 class="completion-title">{t('progressions.completion.title')}</h2>
			<p>{t('progressions.completion.body')}</p>
			<Button type="button" variant="primary" onclick={again}>
				{t('progressions.button.again')}
			</Button>
		</div>
	{/if}
</div>

<style>
	.key-banner {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-label);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin-bottom: var(--spacing-md);
		display: flex;
		gap: var(--spacing-md);
	}

	.bar-progress {
		color: var(--color-faint);
	}

	.measures {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border-radius: 0;
	}

	.measure {
		border-left: 1px solid var(--color-ink);
		padding: var(--spacing-sm) var(--spacing-xs) var(--spacing-md);
		min-height: 56px;
		position: relative;
	}

	.measure--cursor {
		background: color-mix(in srgb, var(--color-vermilion) 8%, transparent);
	}

	.measure--cursor::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--color-vermilion);
	}

	.measure--played .msym {
		color: var(--color-verdigris);
	}

	.measure--future .msym {
		color: var(--color-faint);
	}

	.msym {
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: var(--text-heading);
	}

	.roman {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-faint);
		margin-top: var(--spacing-xs);
	}

	.step-register {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-label);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-top: var(--spacing-lg);
		min-height: 1em;
	}

	.function-reveal {
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-label);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-vermilion);
		padding: var(--spacing-sm) var(--spacing-md);
		margin-top: var(--spacing-sm);
	}

	.name-instruction {
		margin-top: var(--spacing-sm);
	}

	.name-choices {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
	}

	.play-step {
		margin-top: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.retry {
		margin-top: var(--spacing-sm);
		color: var(--color-vermilion);
	}

	.completion-card {
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		padding: var(--spacing-md);
		margin-top: var(--spacing-lg);
	}

	.completion-title {
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.08em;
	}
</style>
