<script lang="ts">
	import { untrack } from 'svelte';
	import { Note } from 'tonal';
	import {
		PROGRESSION_TEMPLATES,
		buildProgression,
		nameChoices,
		randomProgression,
		type ProgressionBar,
		type RomanFunction
	} from '$lib/practice/progressions';
	import { matchChord } from '$lib/drills/matchChord';
	import { spellChord } from '$lib/theory/chord';
	import type { SpelledNote } from '$lib/theory/types';
	import { toAsciiAccidentals } from '$lib/theory/interval';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import { buildProvenanceIndex, songsForSymbol } from '$lib/practice/songProvenance';
	import { getAllCards, type CardRecord } from '$lib/srs/deck';
	import { voicingStageForChord, type VoicingStage } from '$lib/practice/shellVoicing';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import ChordGlyph from './ChordGlyph.svelte';
	import Button from './Button.svelte';
	import SongMark from './SongMark.svelte';
	import CountingChipRow from './CountingChipRow.svelte';
	import { t, currentLocale } from '$lib/i18n/locale.svelte';

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

	/**
	 * Embedding seam (27-02): when `embedTemplateId` + `embedKey` are both
	 * provided, the shown progression is buildProgression(embedTemplateId,
	 * embedKey) instead of a fresh randomProgression() draw - the two-step
	 * earn-the-symbol flow and matchChord grading are unchanged (REG-01).
	 * `onComplete` (when provided alongside) replaces the standalone
	 * completion card's fresh-draw "Again" control: when the progression
	 * completes, the embedded component calls onComplete() (advance the host
	 * queue) instead of drawing a new random progression, mirroring
	 * BuildSession's embedFact/onComplete precedent. Omitting all three props
	 * leaves every render byte-identical to this component's pre-embedding
	 * behavior.
	 */
	interface Props {
		embedTemplateId?: string;
		embedKey?: string;
		/**
		 * `firstTry` (B3) reports whether every bar in the grid was earned with
		 * no wrong name pick and no wrong play. Naming or playing wrong retries
		 * and never gates, so every completion is eventually correct and the
		 * host cannot read "completed" as "right" - it needs this to grade the
		 * item honestly.
		 */
		onComplete?: (firstTry: boolean) => void;
	}

	let { embedTemplateId, embedKey, onComplete }: Props = $props();

	type Step = 'name' | 'play';

	/** A fresh random progression + its bars, mirroring randomProgression()'s own return shape. */
	function drawProgression(): { templateId: string; key: string; bars: ProgressionBar[] } {
		return randomProgression();
	}

	/**
	 * Plain (non-rune) local so its initial `.bars` read below doesn't trip
	 * Svelte's state_referenced_locally analysis - `earned`'s length must
	 * match this exact draw, but only ever needs its INITIAL bar count, never
	 * a live/reactive one. embedTemplateId/embedKey are read once via untrack
	 * (mirrors BuildSession's embedFact read): when both are present,
	 * randomProgression() is never called, per REG-01/T-27-02-01. */
	const initialProgression = untrack(() =>
		embedTemplateId && embedKey
			? { templateId: embedTemplateId, key: embedKey, bars: buildProgression(embedTemplateId, embedKey) }
			: drawProgression()
	);

	let progression = $state(initialProgression);
	let cursor = $state(0);
	let earned = $state<boolean[]>(initialProgression.bars.map(() => false));
	let step = $state<Step>('name');
	let nameRetry = $state(false);
	let playRetry = $state(false);
	/**
	 * Sticky across the whole grid (B3): set by ANY wrong name pick or wrong
	 * play, cleared only by a fresh progression draw. nameRetry/playRetry are
	 * transient per bar, so neither can answer "was this progression earned
	 * clean", which is what the embedding host grades on.
	 */
	let missedOnce = $state(false);
	let selected = $state<Set<string>>(new Set());
	let pulseToken = $state(0);
	let functionReveal = $state<RomanFunction | null>(null);

	/** Built once at mount (mirrors /recall's own init-time buildProvenanceIndex() call). */
	const provenanceIndex = buildProvenanceIndex();

	const currentBar = $derived(progression.bars[cursor] as ProgressionBar | undefined);
	const complete = $derived(progression.bars.length > 0 && earned.every((bar) => bar));

	/**
	 * Self-contained FSRS maturity read (SCAF-02), mirroring
	 * ShellVoicingDrill's proven pattern: read-only (getAllCards is the only
	 * new deck call - no write/recordGrade/advanceQueue), staleness-guarded,
	 * and keyed off the CURRENT BAR's own symbol (not a single top-level
	 * symbol) so a cursor advance re-reads maturity for the new bar.
	 */
	let cards = $state<CardRecord[]>([]);
	/** False while the current bar's deck read is in flight; gates only the beginner caption's visibility (the octave count reads `stage` directly, an unloaded deck resolving to "meet" -> one octave, the correct cold-beginner default). */
	let cardsLoaded = $state(false);

	/**
	 * Loads the deck records for `forSymbol` (the bar that was current when
	 * this call started), guarded against staleness: by the time getAllCards
	 * resolves, the cursor may have advanced to a different bar, so a
	 * response for a symbol that no longer matches the current bar's symbol
	 * is dropped.
	 */
	async function loadCards(forSymbol: string) {
		cardsLoaded = false;
		try {
			const all = await getAllCards();
			if (forSymbol !== currentBar?.symbol) return; // stale response: the cursor moved on
			cards = all.filter((card) => card.factId === `chord-formula:${forSymbol}`);
		} catch {
			// A rejected Dexie/IndexedDB read (quota, blocked upgrade, private-mode
			// restrictions) fails closed to the cold-beginner default: one octave,
			// all rungs. Never an unhandled rejection.
			if (forSymbol === currentBar?.symbol) cards = [];
		} finally {
			// A stale response must NOT flip cardsLoaded (the current bar's own read
			// is still in flight); only the read for the current bar marks it loaded.
			if (forSymbol === currentBar?.symbol) cardsLoaded = true;
		}
	}

	$effect(() => {
		const symbol = currentBar?.symbol;
		if (symbol === undefined) return;
		void loadCards(symbol);
	});

	/** The current bar's pedagogy/span stage (voicingStageForChord reused verbatim, no parallel maturity function). */
	const stage = $derived.by((): VoicingStage => voicingStageForChord(cards));
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
	/** Lowercase in-sentence mode word for the hint ladder's degree rung (distinct from the uppercase banner word above). */
	const hintModeWord = $derived(
		currentTemplate?.mode === 'minor' ? t('progressions.hint.mode.minor') : t('progressions.hint.mode.major')
	);

	/**
	 * Escalating optional hint ladder (SCAF-01, Phase 34 Plan 02): inline in
	 * this component (not an extension of the shared HintLadder.svelte, per
	 * 34-UI-SPEC §1 - that component's fixed family/formula/keyboard/spelling
	 * layer kinds don't fit this drill's degree->count->ghost rungs). Reuses
	 * HintLadder's proven escalating-cumulative interaction grammar and CSS
	 * verbatim, and CountingChipRow (Phase 32) as the single count-rung
	 * source. Never touches checkPlay grading, the roman display, the
	 * function reveal, or the completion/embed seam (REG-01).
	 */
	type HintLayer = 'degree' | 'count' | 'ghost';

	const ORDINALS_EN = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
	const ORDINALS_FR = ['1ʳᵉ', '2ᵉ', '3ᵉ', '4ᵉ', '5ᵉ', '6ᵉ', '7ᵉ'];

	/** Locale-aware ordinal word for a 1-7 scale degree; empty string for an out-of-range/unmapped roman. */
	function ordinalWord(degree: number): string {
		const table = currentLocale() === 'fr' ? ORDINALS_FR : ORDINALS_EN;
		return table[degree - 1] ?? '';
	}

	/**
	 * Keyed quality word for the current bar's quality suffix, superseding
	 * 34-UI-SPEC's mnemonicFor suggestion for sentence fit and en/fr parity
	 * (per the plan's explicit discretion grant). Reads the ENGINE's own fixed
	 * suffix vocabulary (maj7 / m7 / 7 / m7b5 on ProgressionBar.quality), never
	 * a suffix sliced off tonal's canonical re-spelling. An unmapped suffix is
	 * a programming error (a new engine quality without matching copy), not a
	 * runtime input, so it is surfaced loudly in dev rather than silently
	 * collapsed to the dominant wording.
	 */
	function qualityWord(qualitySuffix: string): string {
		switch (qualitySuffix) {
			case 'maj7':
				return t('progressions.hint.quality.maj7');
			case 'm7':
				return t('progressions.hint.quality.m7');
			case 'm7b5':
				return t('progressions.hint.quality.m7b5');
			case '7':
				return t('progressions.hint.quality.dom7');
			default:
				if (import.meta.env.DEV) {
					console.warn(`qualityWord: unmapped engine quality suffix "${qualitySuffix}"`);
				}
				return t('progressions.hint.quality.dom7');
		}
	}

	/** The current bar's spelled chord, or undefined before a bar exists. */
	const currentChord = $derived(currentBar ? spellChord(currentBar.symbol) : undefined);

	const KEYBOARD_BASE_OCTAVE = 4;
	const GHOST_MARKER_BY_ROLE: Partial<Record<SpelledNote['role'], string>> = {
		root: 'R',
		third: '3',
		fifth: '5',
		seventh: '7'
	};

	/** R/3/5/7 ghost markers for the current bar's chord tones, pinned to the keyboard's fixed base octave (extends shellVoicing.ts's R/5-only vocabulary to all four roles). */
	const ghostKeysForCurrentBar = $derived.by(() => {
		if (!currentChord?.recognized) return [];
		return currentChord.notes.flatMap((note) => {
			const marker = GHOST_MARKER_BY_ROLE[note.role];
			return marker ? [{ letter: note.letter, octave: KEYBOARD_BASE_OCTAVE, marker }] : [];
		});
	});

	/** The rungs offered at the current bar's maturity stage (34-UI-SPEC §4): meet offers all 3, subtract drops the degree rung, drill offers none. */
	const offeredRungs = $derived.by((): HintLayer[] => {
		if (stage === 'meet') return ['degree', 'count', 'ghost'];
		if (stage === 'subtract') return ['count', 'ghost'];
		return [];
	});

	/** How many of `offeredRungs` are currently revealed; reset to 0 whenever the cursor (current bar) changes, but NOT on a wrong Check within the same bar. */
	let hintDepth = $state(0);

	$effect(() => {
		void cursor;
		hintDepth = 0;
	});

	/** Reveals the next offered rung, capped at the number actually offered at this stage. */
	function revealHint(): void {
		hintDepth = Math.min(hintDepth + 1, offeredRungs.length);
	}

	const HINT_TIER_TITLE: Record<HintLayer, string> = $derived({
		degree: t('progressions.hint.tier.degree'),
		count: t('progressions.hint.tier.count'),
		ghost: t('progressions.hint.tier.ghost')
	});

	/** Tier tags renumber sequentially from whichever rungs are actually offered (mirrors HintLadder's tierLabel/renumbering precedent). */
	function hintTierLabel(index: number): string {
		return `${t('progressions.hint.tier.prefix')} ${index + 1} · ${HINT_TIER_TITLE[offeredRungs[index]]}`;
	}

	const HINT_REVEAL_LABEL: Record<HintLayer, string> = $derived({
		degree: t('progressions.hint.reveal.start'),
		count: t('progressions.hint.reveal.count'),
		ghost: t('progressions.hint.reveal.ghost')
	});

	/** Depth-0 is always the "show a hint" control; after that, the label names the next rung to reveal. */
	const hintControlLabel = $derived(
		hintDepth === 0 ? t('progressions.hint.reveal.start') : HINT_REVEAL_LABEL[offeredRungs[hintDepth] ?? 'degree']
	);

	/** True once the ghost rung (always last in offeredRungs) has actually been revealed - gates ghostKeys so no ghost hint ever shows before that tap. */
	const ghostHintRevealed = $derived(offeredRungs.includes('ghost') && hintDepth >= offeredRungs.length);

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
			missedOnce = true;
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

	/** Step 2: Check. Correct chroma match (matchChord) earns the bar and plays it back (mirrors ShellVoicingDrill's check()); wrong retries gently, never gates. */
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
			missedOnce = true;
			return;
		}

		playRetry = false;
		const nextEarned = [...earned];
		nextEarned[cursor] = true;
		earned = nextEarned;
		pulseToken += 1;
		functionReveal = currentBar.functionLabel;
		void ensureAudioReady();
		playChord(target.notes.map((note) => note.letter));

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
		missedOnce = false;
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

	{#if !complete && currentBar && step === 'play' && cardsLoaded && stage !== 'drill'}
		<p class="beginner-caption" data-testid="beginner-caption">
			{t('progressions.keyboard.beginnerCaption')}
		</p>
	{/if}

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
				<PianoKeyboard
					notes={[]}
					interactive
					{selected}
					onToggle={toggleKey}
					octaves={stage === 'drill' ? 2 : 1}
					ghostKeys={ghostHintRevealed ? ghostKeysForCurrentBar : []}
				/>
				<Button type="button" variant="primary" onclick={checkPlay}>
					{t('progressions.button.check')}
				</Button>
			</div>
			{#if playRetry}
				<p class="retry" data-testid="play-retry">{t('progressions.retry.wrongPlay')}</p>
			{/if}

			{#if cardsLoaded && offeredRungs.length > 0 && currentBar && currentChord}
				<div class="hint-ladder" data-testid="progression-hint-ladder">
					<div class="hints">
						{#each offeredRungs.slice(0, hintDepth) as layer, index (layer)}
							<div class="hint stamp" data-testid="progression-hint-layer" data-layer={layer}>
								<p class="text-label text-muted font-mono uppercase">{hintTierLabel(index)}</p>
								{#if layer === 'degree'}
									<p class="text-body mt-2">
										{t('progressions.hint.degree.lead')} {currentBar.roman}
										{t('progressions.hint.degree.builtOn')} {ordinalWord(currentBar.degree)}
										{t('progressions.hint.degree.noteOf')} {progression.key} {hintModeWord}.
										{t('progressions.hint.degree.rootLabel')} {currentChord.root}.
									</p>
								{:else if layer === 'count'}
									<p class="text-body mt-2">
										{t('progressions.hint.count.lead')} {currentBar.roman}, {t(
											'progressions.hint.count.mid'
										)} {qualityWord(currentBar.quality)}. {t('progressions.hint.count.closing')}
									</p>
									<div class="mt-2">
										<CountingChipRow chord={currentChord} />
									</div>
								{:else if layer === 'ghost'}
									<p class="text-body mt-2">{t('progressions.hint.ghost.body')}</p>
								{/if}
							</div>
						{/each}
					</div>

					{#if hintDepth < offeredRungs.length}
						<div class="hint-cta mt-6" data-testid="progression-hint-cta">
							<Button type="button" variant="ghost" onclick={revealHint}>{hintControlLabel}</Button>
						</div>
					{:else}
						<p class="hint-closing-line text-label mt-6" data-testid="progression-hint-closing-line">
							{t('progressions.hint.closing')}
						</p>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}

	{#if complete}
		<div class="completion-card" data-testid="progression-complete">
			<h2 class="completion-title">{t('progressions.completion.title')}</h2>
			<p>{t('progressions.completion.body')}</p>
			{#if onComplete}
				<Button type="button" variant="primary" onclick={() => onComplete?.(!missedOnce)}>
					{t('progressions.button.next')}
				</Button>
			{:else}
				<Button type="button" variant="primary" onclick={again}>
					{t('progressions.button.again')}
				</Button>
			{/if}
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

	.beginner-caption {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		color: var(--color-muted);
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

	/* Escalating hint ladder (SCAF-01): interaction/CSS mirrored verbatim from
	   HintLadder.svelte's proven shape (34-UI-SPEC §1), not imported - this
	   drill's rungs (degree/count/ghost) don't fit that shared component's
	   fixed layer-kind API. */
	.hint-ladder {
		margin-top: var(--spacing-lg);
	}

	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	.hints {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.hint {
		background: var(--color-paper-bright);
		padding: var(--spacing-md);
	}

	.hint-closing-line {
		color: var(--color-muted);
		font-style: italic;
	}

	.hint-cta :global(.ps-button--ghost) {
		border-style: dashed;
		border-color: var(--color-faint);
		color: var(--color-muted);
		width: 100%;
	}
	.hint-cta:hover :global(.ps-button--ghost),
	.hint-cta:focus-within :global(.ps-button--ghost) {
		border-style: solid;
		border-color: var(--color-ink);
		color: var(--color-ink);
	}
</style>
