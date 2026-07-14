<script lang="ts">
	import { spellChord } from '$lib/theory/chord';
	import { pickHint, pickSuggestionHint } from '$lib/copy/hints';
	import { didYouMean } from '$lib/theory/didYouMean';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import { formulaFor, aliasLine } from '$lib/lookup/chordPresentation';
	import { getRecentLookups, addRecentLookup } from '$lib/lookup/recentLookups';
	import type { ChordResult } from '$lib/theory/types';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
	import ChordGlyph from '$lib/components/ChordGlyph.svelte';
	import IntervalChip from '$lib/components/IntervalChip.svelte';
	import Button from '$lib/components/Button.svelte';
	import RecentChipRow from '$lib/components/RecentChipRow.svelte';

	/** Starter chords for the empty state (D-09): zero-friction first success. */
	const STARTER_CHORDS = ['Cm7', 'Fmaj7', 'G7'];

	let symbol = $state('');
	let result = $state<ChordResult | null>(null);
	let hint = $state('');
	let suggestion = $state<string | null>(null);
	let recent = $state<string[]>(getRecentLookups());
	let inputEl: HTMLInputElement | undefined = $state();

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
		inputEl?.focus();
		inputEl?.select();
	}

	function showChord(input: string) {
		// Trim once at the entry point: mobile keyboards routinely append a
		// trailing space via autocomplete, and tonal rejects "Cm7 " outright.
		const cleaned = input.trim();
		const spelled = spellChord(cleaned);
		if (spelled.recognized) {
			// Non-blocking success: replace the rendered result and clear any hint.
			result = spelled;
			hint = '';
			suggestion = null;
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

	function showChordFromSymbol(input: string) {
		symbol = input;
		showChord(input);
	}

	/**
	 * Plays the rendered chord through the app audio engine (D-11, Track A):
	 * synth instantly, sampled piano once loaded. The click is the user
	 * gesture that unlocks the audio context.
	 */
	function hearIt() {
		if (!result) return;
		void ensureAudioReady();
		playChord(result.notes.map((note) => note.letter));
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

	/** Autofocus on mount so the piano-side user can type immediately. */
	function autofocus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<main class="bg-paper text-ink min-h-screen px-2 py-8 font-sans sm:px-8">
	<h1 class="text-heading mt-2 font-bold">Chord lookup</h1>

	<form class="mt-8 flex items-center gap-2" onsubmit={handleSubmit}>
		<input
			type="text"
			bind:value={symbol}
			bind:this={inputEl}
			use:autofocus
			placeholder="Type a chord: Cm7, F♯ø7, B♭maj7..."
			class="border-ink bg-paper-bright min-w-0 flex-1 border-2 p-2"
		/>
		<Button
			type="button"
			variant="ghost"
			aria-label="Insert sharp"
			onclick={() => insertGlyph('♯')}
		>
			♯
		</Button>
		<Button
			type="button"
			variant="ghost"
			aria-label="Insert flat"
			onclick={() => insertGlyph('♭')}
		>
			♭
		</Button>
		<Button type="submit">Stamp</Button>
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

	{#if !result}
		<div class="mt-8">
			<p class="text-heading font-bold">No chord yet</p>
			<p class="text-muted mt-2">
				Type a symbol like Cm7 and press Stamp to see its notes in ink and color.
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

	{#if result?.recognized}
		<div class="stamp mt-8" data-testid="chord-result">
			<div class="flex items-start gap-4">
				<ChordGlyph root={result.root} quality={result.symbol.slice(result.root.length)} />
				<Button type="button" variant="ghost" onclick={hearIt}>Hear it</Button>
			</div>

			{#if result.aliases.length > 0}
				<p class="text-label text-muted mt-2 font-mono" data-testid="alias-line">
					{aliasLine(result)}
				</p>
			{/if}

			<div class="mt-6">
				<PianoKeyboard notes={result.notes} />
			</div>

			<div class="mt-6 flex gap-4" data-testid="interval-formula">
				{#each formulaFor(result) as entry (entry.role + entry.letter)}
					<div class="flex flex-col items-center gap-1">
						<IntervalChip role={entry.role} label={entry.label} />
						<span class="text-label font-mono">{entry.letter}</span>
						<span class="text-label font-mono">{entry.solfege}</span>
					</div>
				{/each}
			</div>
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
