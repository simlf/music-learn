<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { shouldAutofocusLookup } from '$lib/lookup/entryFocus';
	import { spellChord } from '$lib/theory/chord';
	import { setDrillSeeds } from '$lib/practice/drillSeeds';
	import { pickHint, pickSuggestionHint } from '$lib/copy/hints';
	import { didYouMean } from '$lib/theory/didYouMean';
	import { detectCasingAmbiguity, type CasingAmbiguity } from '$lib/lookup/casingAmbiguity';
	import { ensureAudioReady, playChord, playNote } from '$lib/audio/audio';
	import { intervalFromRoot, toAsciiAccidentals } from '$lib/theory/interval';
	import { aliasLine, displaySymbol, type FormulaEntry } from '$lib/lookup/chordPresentation';
	import { getRecentLookups, addRecentLookup } from '$lib/lookup/recentLookups';
	import type { ChordResult } from '$lib/theory/types';
	import PianoKeyboard, { type InspectPayload } from '$lib/components/PianoKeyboard.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import IntervalView from '$lib/components/IntervalView.svelte';
	import InspectRegister from '$lib/components/InspectRegister.svelte';
	import SongHook from '$lib/components/SongHook.svelte';
	import SongMark from '$lib/components/SongMark.svelte';
	import Button from '$lib/components/Button.svelte';
	import RecentChipRow from '$lib/components/RecentChipRow.svelte';
	import WhyTheseNotes from '$lib/components/WhyTheseNotes.svelte';
	import { buildProvenanceIndex, songsForSymbol } from '$lib/practice/songProvenance';
	import { t } from '$lib/i18n/locale.svelte';

	/** Starter chords for the empty state (D-09): zero-friction first success. */
	const STARTER_CHORDS = ['Cm7', 'Fmaj7', 'G7'];

	/**
	 * Built once at component init (SONG-01): the shared provenance index
	 * driving the SongMark beside the resolved chord's name. Lookup carries
	 * no filter control (SONG-02 is Drills/Recall only) - this index is
	 * read-only here.
	 */
	const provenanceIndex = buildProvenanceIndex();

	let symbol = $state('');
	let result = $state<ChordResult | null>(null);
	let hint = $state('');
	let suggestion = $state<string | null>(null);
	let recent = $state<string[]>(getRecentLookups());
	let inputEl: HTMLInputElement | undefined = $state();

	/**
	 * Sketch 016-B: the pending casing-disambiguation prompt, set BEFORE a
	 * result commits when the input is genuinely ambiguous (e.g. "am7"/"AM7").
	 * Rendered in place of the result until a chip is picked.
	 */
	let ambiguity = $state<CasingAmbiguity | null>(null);

	/** Placeholder token substituted with the didYouMean candidate in suggestion copy. */
	const SYMBOL_PLACEHOLDER = '{SYMBOL}';

	/** Splits the hint on the {SYMBOL} placeholder so the candidate can render as an inline element. */
	function splitHintOnPlaceholder(text: string): [string, string] {
		const index = text.indexOf(SYMBOL_PLACEHOLDER);
		if (index === -1) {
			return [text, ''];
		}
		return [text.slice(0, index), text.slice(index + SYMBOL_PLACEHOLDER.length)];
	}

	/** Selects the input's full content so the next keystroke types over it. */
	function focusAndSelectInput() {
		inputEl?.focus({ preventScroll: true });
		inputEl?.select();
	}

	/** The latest keyboard/formula inspect tap (Track C register); reset per chord. */
	let inspectPayload = $state<InspectPayload | null>(null);

	function handleInspect(payload: InspectPayload) {
		inspectPayload = payload;
	}

	/** Tapping a formula column does the same as tapping its key: play + fill the register. */
	function inspectFormulaEntry(entry: FormulaEntry) {
		if (!result) return;
		playNote(`${toAsciiAccidentals(entry.letter)}4`);
		inspectPayload = {
			letter: entry.letter,
			solfege: entry.solfege,
			octave: 4,
			info: intervalFromRoot(result.root, entry.letter),
			inChord: true
		};
	}

	function showChord(input: string) {
		// Trim once at the entry point: mobile keyboards routinely append a
		// trailing space via autocomplete, and tonal rejects "Cm7 " outright.
		const cleaned = input.trim();

		// Sketch 016-B: intercept BEFORE committing a result when the input's
		// m/maj casing is genuinely ambiguous (e.g. "am7"/"AM7") - the
		// disambiguation prompt renders in place of the result until a chip is
		// picked. A non-null ambiguity always clears any prior hint/suggestion.
		const detected = detectCasingAmbiguity(cleaned);
		if (detected) {
			ambiguity = detected;
			hint = '';
			suggestion = null;
			return;
		}
		ambiguity = null;

		const spelled = spellChord(cleaned);
		if (spelled.recognized) {
			// Non-blocking success: replace the rendered result and clear any hint.
			result = spelled;
			hint = '';
			suggestion = null;
			inspectPayload = null;
			recent = addRecentLookup(spelled.symbol);
			focusAndSelectInput();
		} else {
			// Non-blocking error (D-08): keep the previously rendered chord visible,
			// never clear `result` here. Try a confident single-candidate
			// suggestion first; otherwise fall back to the existing rotating hint.
			const candidate = didYouMean(cleaned);
			if (candidate) {
				suggestion = candidate;
				hint = pickSuggestionHint();
			} else {
				suggestion = null;
				hint = pickHint();
			}
		}
	}

	/** Sketch 016-B: a disambiguation chip resolves to its candidate symbol and clears the prompt. */
	function pickAmbiguityCandidate(candidateSymbol: string) {
		ambiguity = null;
		showChordFromSymbol(candidateSymbol);
	}

	function showChordFromSymbol(input: string) {
		symbol = input;
		showChord(input);
	}

	/**
	 * Sketch 016-A: the m/maj counterpart symbol for the why-panel's folded
	 * duo, derived (never hardcoded) by swapping only a minor-seventh/minor-
	 * triad quality for its major reading or vice versa. Every other quality
	 * (dominant 7, dim, ø, sus, altered...) has no meaningful m/maj
	 * counterpart, so this returns null and the panel gracefully omits the
	 * duo/escape hatch (WhyTheseNotes's own contract).
	 */
	function counterpartSymbolFor(chord: ChordResult): string | null {
		const asciiRoot = toAsciiAccidentals(chord.root);
		const suffix = chord.symbol.startsWith(asciiRoot) ? chord.symbol.slice(asciiRoot.length) : '';
		if (suffix === 'm7') return `${chord.root}maj7`;
		if (suffix === 'm') return `${chord.root}maj`;
		if (suffix === 'maj7') return `${chord.root}m7`;
		if (suffix === 'maj') return `${chord.root}m`;
		return null;
	}

	/** The resolved counterpart ChordResult for the why-panel's duo, or undefined when none exists. */
	const whyCounterpartSymbol = $derived(result ? counterpartSymbolFor(result) : null);
	const whyCounterpart = $derived.by(() => {
		if (!whyCounterpartSymbol) return undefined;
		const spelled = spellChord(whyCounterpartSymbol);
		return spelled.recognized ? spelled : undefined;
	});

	/**
	 * Plays the rendered chord through the app audio engine (D-11, Track A):
	 * synth instantly, sampled piano once loaded. The click is the user
	 * gesture that unlocks the audio context.
	 */
	function hearIt() {
		if (!result) return;
		void ensureAudioReady();
		// result.notes is canonical root-position order (spellChord re-sorts a
		// slash chord's notes into role order), so for an inversion rotate the
		// letters until the bass leads - otherwise playChord would voice C/E as
		// C4-E4-G4 (root position), contradicting the "E at the bottom" line.
		// Both notes and result.bass are glyph form, so indexOf matches.
		const letters = result.notes.map((note) => note.letter);
		if (result.bass) {
			const i = letters.indexOf(result.bass);
			if (i > 0) letters.push(...letters.splice(0, i));
		}
		playChord(letters);
	}

	/** Seeds the resolved chord into the one-shot drill queue and navigates to /practice. */
	function drillIt() {
		if (!result) return;
		setDrillSeeds([result.symbol]);
		void goto('/practice');
	}

	/**
	 * Builds the slash-chord bass explanation line: the base symbol (before
	 * the "/") and bass letter render verbatim regardless of locale per the
	 * theory-engine symbol-immunity rule, substituted into the localized
	 * template.
	 */
	function slashExplainLine(chord: ChordResult): string {
		const base = displaySymbol(chord).split('/')[0];
		return t('home.slash.explain').replaceAll('{BASS}', chord.bass ?? '').replaceAll('{CHORD}', base);
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		showChord(symbol);
	}

	/** Inserts a glyph at the input's current caret position, then refocuses. */
	function insertGlyph(glyph: string) {
		const el = inputEl;
		const start = el?.selectionStart ?? symbol.length;
		const end = el?.selectionEnd ?? symbol.length;
		symbol = symbol.slice(0, start) + glyph + symbol.slice(end);
		const caret = start + glyph.length;
		queueMicrotask(() => {
			el?.focus();
			el?.setSelectionRange(caret, caret);
		});
	}

	/**
	 * Focus the input so the piano-side user can type immediately, but ONLY
	 * when Lookup was reached by a deliberate in-app navigation (B6).
	 *
	 * On a cold entry (`type === 'enter'`: the installed app launching, a
	 * bookmark, a shared link) the focus is skipped, because on a phone
	 * focusing an input pops the soft keyboard over the page before the user
	 * has asked to type anything. Navigating here from the tab bar mid-session
	 * still focuses, unchanged.
	 *
	 * preventScroll keeps the masthead in view: without it the browser scrolls
	 * the focused input to the top and hides the nav entirely.
	 */
	afterNavigate(({ type }) => {
		if (!shouldAutofocusLookup(type)) return;
		inputEl?.focus({ preventScroll: true });
	});
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">{t('home.title')}</h1>

	<form class="mt-8 flex items-center gap-2" onsubmit={handleSubmit}>
		<input
			type="text"
			bind:value={symbol}
			bind:this={inputEl}
			placeholder={t('home.input.placeholder')}
			class="border-ink bg-paper-bright min-w-0 flex-1 border-2 p-2"
		/>
		<Button
			type="button"
			variant="ghost"
			aria-label={t('home.insert.sharp')}
			onclick={() => insertGlyph('♯')}
		>
			♯
		</Button>
		<Button
			type="button"
			variant="ghost"
			aria-label={t('home.insert.flat')}
			onclick={() => insertGlyph('♭')}
		>
			♭
		</Button>
		<Button type="submit">{t('home.action.stamp')}</Button>
	</form>

	<RecentChipRow {recent} onselect={showChordFromSymbol} />

	{#if hint}
		<p class="bg-ink text-mustard mt-4 p-3 font-mono text-label uppercase" data-testid="error-bar">
			{#if suggestion}
				{@const [before, after] = splitHintOnPlaceholder(hint)}
				{before}<button
					type="button"
					class="suggestion-tap underline"
					data-testid="suggestion"
					onclick={() => showChordFromSymbol(suggestion!)}
				>{suggestion}</button>{after}
			{:else}
				{hint}
			{/if}
		</p>
	{/if}

	{#if ambiguity}
		<div class="disambig mt-8" data-testid="disambig-prompt">
			<p class="text-label font-mono uppercase" style="color: var(--color-vermilion)">
				{t('home.disambig.heading-prefix')}{symbol}{t('home.disambig.heading-suffix')}
			</p>
			<p class="mt-2">{t('home.disambig.body')}</p>
			<div class="mt-2 flex flex-wrap gap-2">
				<button
					type="button"
					class="disambig-chip"
					data-testid="disambig-chip-minor"
					onclick={() => pickAmbiguityCandidate(ambiguity!.minorSymbol)}
				>
					{ambiguity.minorSymbol}
					{t('home.disambig.chip-minor-prefix')}{t('home.disambig.chip-minor-suffix')}
				</button>
				<button
					type="button"
					class="disambig-chip"
					data-testid="disambig-chip-major"
					onclick={() => pickAmbiguityCandidate(ambiguity!.majorSymbol)}
				>
					{ambiguity.majorSymbol}
					{t('home.disambig.chip-major-prefix')}{t('home.disambig.chip-major-suffix')}
				</button>
			</div>
		</div>
	{/if}

	{#if !result && !ambiguity}
		<div class="mt-8">
			<p class="text-heading font-bold">{t('home.empty.title')}</p>
			<p class="text-muted mt-2">
				{t('home.empty.body')}
			</p>
			<div class="mt-4 flex gap-2">
				{#each STARTER_CHORDS as starter (starter)}
					<Button
						type="button"
						variant="ghost"
						data-testid="starter-chord"
						onclick={() => showChordFromSymbol(starter)}
					>
						{starter}
					</Button>
				{/each}
			</div>
		</div>
	{/if}

	{#if result?.recognized && !ambiguity}
		<div class="stamp mt-8" data-testid="chord-result">
			<div class="flex items-start gap-4">
				<ChordGlyph root={result.root} quality={displaySymbol(result).slice(result.root.length)} />
				<SongMark songs={songsForSymbol(result.symbol, provenanceIndex)} />
				<Button type="button" variant="ghost" onclick={hearIt}>{t('home.action.hear-it')}</Button>
				{#if !result.bass}
					<Button type="button" variant="ghost" data-testid="drill-it" onclick={drillIt}>
						{t('home.action.drill-it')}
					</Button>
				{/if}
			</div>

			{#if result.aliases.length > 0 && !result.bass}
				<p class="text-label text-muted mt-2 font-mono" data-testid="alias-line">
					{aliasLine(result)}
				</p>
			{/if}

			{#if result.bass}
				<p class="text-label text-muted mt-2 font-mono" data-testid="slash-explain">
					{slashExplainLine(result)}
				</p>
			{/if}

			<div class="mt-6">
				<PianoKeyboard
					notes={result.notes}
					inspectable
					onInspect={handleInspect}
					showIntervalBadges
				/>
			</div>

			<InspectRegister payload={inspectPayload} />

			<SongHook short={inspectPayload?.info?.short ?? ''} />

			<div class="mt-6">
				<IntervalView chord={result} onInspectTone={inspectFormulaEntry} />
			</div>

			<WhyTheseNotes
				chord={result}
				counterpart={whyCounterpart}
				counterpartSymbol={whyCounterpartSymbol ?? undefined}
				onLookupCounterpart={showChordFromSymbol}
			/>
		</div>
	{/if}
</main>

<style>
	/* 44px minimum touch target for the inline did-you-mean suggestion (the
	   primary tap in the error-recovery flow, phone-first). Padding grows the
	   hit area to the minimum; the matching negative margin keeps the error
	   bar's visual height and text flow unchanged. */
	.suggestion-tap {
		min-height: 44px;
		min-width: 44px;
		padding: var(--spacing-sm);
		margin: calc(-1 * var(--spacing-sm));
		vertical-align: middle;
		cursor: pointer;
	}

	.stamp {
		animation: stamp-in 240ms ease-out;
	}

	/* Sketch 016-B: the disambiguation prompt, vermilion-bordered so it reads
	   as a distinct "pay attention" state from the ordinary result card. */
	.disambig {
		border: 2px solid var(--color-vermilion);
		background: var(--color-paper-bright);
		padding: var(--spacing-md);
	}

	.disambig-chip {
		font-family: var(--font-mono);
		font-size: var(--text-label);
		border: 2px solid var(--color-ink);
		padding: var(--spacing-sm);
		cursor: pointer;
		background: var(--color-paper);
		color: var(--color-ink);
		min-height: 44px;
		transition:
			background-color 150ms ease-out,
			color 150ms ease-out;
	}

	.disambig-chip:hover,
	.disambig-chip:focus-visible {
		background-color: var(--color-ink);
		color: var(--color-paper);
	}

	@keyframes stamp-in {
		0% {
			transform: scale(0.96);
			opacity: 0;
		}
		60% {
			transform: scale(1.02);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}
</style>
