<script lang="ts">
	import { spellChord } from '$lib/theory/chord';
	import { formulaFor } from '$lib/lookup/chordPresentation';
	import { ensureAudioReady, playChord } from '$lib/audio/audio';
	import PianoKeyboard from './PianoKeyboard.svelte';
	import IntervalChip from './IntervalChip.svelte';
	import Button from './Button.svelte';

	/**
	 * Shape-first lesson example for the /theory route (Track D): one chord
	 * shown as its actual keys on a display-only PianoKeyboard, its interval
	 * formula in the fixed color language, and a Hear it tap through the
	 * audio contract. Every lesson shows real shapes, not prose about them.
	 *
	 * Total component: an unrecognized symbol renders nothing rather than a
	 * broken frame (mirrors spellChord's recognized:false path).
	 */
	interface Props {
		/** Chord symbol to exhibit, ASCII or glyph accidentals, e.g. "Cmaj7", "F#m7b5". */
		symbol: string;
		/** Optional one-line caption under the shape, e.g. "Major triad + ♭7. Pushes." */
		caption?: string;
	}

	let { symbol, caption }: Props = $props();

	const chord = $derived(spellChord(symbol));

	/** tonal echoes symbol in ASCII; rebuild it on the glyph root for display. */
	const displayName = $derived.by(() => {
		const asciiRoot = chord.root.replace(/♯/g, '#').replace(/♭/g, 'b');
		return chord.symbol.startsWith(asciiRoot)
			? chord.root + chord.symbol.slice(asciiRoot.length)
			: chord.symbol;
	});

	function hearIt() {
		ensureAudioReady();
		playChord(chord.notes.map((note) => note.letter));
	}
</script>

{#if chord.recognized}
	<div class="chord-example flex flex-col gap-4" data-testid="chord-example">
		<div class="flex items-center justify-between gap-4">
			<span class="text-heading font-serif font-bold">{displayName}</span>
			<Button type="button" variant="ghost" onclick={hearIt}>Hear it</Button>
		</div>

		<!-- Lesson keys play on tap (inspectable, no register) so each note is audible. -->
		<PianoKeyboard notes={chord.notes} inspectable />

		<div class="flex flex-wrap gap-4" data-testid="example-formula">
			{#each formulaFor(chord) as entry (entry.role + entry.letter)}
				<div class="flex flex-col items-center gap-1">
					<IntervalChip role={entry.role} label={entry.label} />
					<span class="text-label font-mono">{entry.letter}</span>
					<span class="text-label font-mono">{entry.solfege}</span>
				</div>
			{/each}
		</div>

		{#if caption}
			<p class="text-body text-muted">{caption}</p>
		{/if}
	</div>
{/if}
