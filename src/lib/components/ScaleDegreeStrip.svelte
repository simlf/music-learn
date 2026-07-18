<script module lang="ts">
	export type { InspectPayload } from './PianoKeyboard.svelte';
</script>

<script lang="ts">
	import { playNote } from '$lib/audio/audio';
	import { toAscendingPitches } from '$lib/audio/voicing';
	import { intervalFromRoot } from '$lib/theory/interval';
	import type { SpelledNote } from '$lib/theory/types';
	import type { InspectPayload } from './PianoKeyboard.svelte';
	import { t } from '$lib/i18n/locale.svelte';

	/**
	 * Tonic-anchored scale strip (Sketch 002 winner B). Renders a major scale
	 * as equal degree cells, degree 1 (the tonic) always at the left edge,
	 * ascending left to right, each colored by its degree-class role. Replaces
	 * the piano keyboard on the /scales page, which rendered every scale on a
	 * fixed C-to-C span and so stranded non-C scales across the octave boundary
	 * (E major put its 6th and 7th at the far left and its 4th and 5th at the
	 * far right). A strip reads as one clean run in every key.
	 *
	 * Each cell is a button: tapping plays the degree at its true ascending
	 * pitch (via the Track A audio contract) and emits the same InspectPayload
	 * the keyboard did, so the InspectRegister and its interval read are
	 * unchanged. Playback octaves come from toAscendingPitches, so a scale that
	 * crosses the octave (C# and D# in E major) still sounds higher, not lower.
	 */
	interface Props {
		/** The seven spelled scale degrees, degree 1 first. */
		notes: SpelledNote[];
		/** The scale tonic (degree 1's letter), the interval reference point. */
		tonic: string;
		/** Called with the tapped degree's InspectPayload. */
		onInspect?: (payload: InspectPayload) => void;
	}

	let { notes, tonic, onInspect }: Props = $props();

	/** Ascending pitches for the degrees, so wrapped degrees sound higher. */
	const pitches = $derived(toAscendingPitches(notes.map((note) => note.letter)));

	function octaveOf(pitch: string): number {
		const match = pitch.match(/(-?\d+)$/);
		return match ? parseInt(match[1], 10) : 4;
	}

	function tap(note: SpelledNote, index: number) {
		const pitch = pitches[index] ?? `${note.letter}4`;
		playNote(pitch);
		onInspect?.({
			letter: note.letter,
			solfege: note.solfege,
			octave: octaveOf(pitch),
			info: intervalFromRoot(tonic, note.letter),
			inChord: true
		});
	}
</script>

<div
	class="degree-strip"
	data-testid="degree-strip"
	role="group"
	aria-label={t('scales.degreeStrip.groupLabel')}
>
	{#each notes as note, index (note.letter)}
		{@const info = intervalFromRoot(tonic, note.letter)}
		<button
			type="button"
			class="cell cell--{note.role}"
			aria-label={`${note.letter} ${t('scales.degreeStrip.degreeLabel')} ${index + 1}`}
			onclick={() => tap(note, index)}
		>
			<span class="deg">{index + 1}</span>
			<span class="note">{note.letter}</span>
			<span class="solf">{note.solfege}</span>
			<span class="iv">{info.short}</span>
		</button>
	{/each}
</div>

<style>
	.degree-strip {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 3px;
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		min-height: 96px;
		padding: var(--spacing-sm);
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		color: var(--color-ink);
		cursor: pointer;
		font-family: var(--font-sans);
		/* Gesture hygiene, mirrors PianoKeyboard. */
		touch-action: manipulation;
		-webkit-touch-callout: none;
		user-select: none;
		transition:
			transform 90ms ease-out,
			filter 90ms ease-out;
	}
	.cell:active {
		transform: scale(0.96);
		filter: brightness(0.94);
	}
	@media (prefers-reduced-motion: reduce) {
		.cell:active {
			transform: none;
			filter: none;
		}
	}
	.deg {
		font: var(--text-label--font-weight, 700) 10px / 1 var(--font-mono);
		letter-spacing: 0.1em;
		border: 1.5px solid currentColor;
		padding: 2px 5px;
	}
	.note {
		font: 700 var(--text-heading) / 1 var(--font-serif);
	}
	.solf {
		font: 400 11px / 1 var(--font-mono);
		opacity: 0.85;
	}
	.iv {
		font: 700 10px / 1 var(--font-mono);
		letter-spacing: 0.06em;
		opacity: 0.85;
	}

	.cell--root {
		background: var(--color-root);
		color: var(--color-on-root);
	}
	.cell--second {
		background: var(--color-second);
		color: var(--color-on-second);
	}
	.cell--third {
		background: var(--color-third);
		color: var(--color-on-third);
	}
	.cell--fourth {
		background: var(--color-fourth);
		color: var(--color-on-fourth);
	}
	.cell--fifth {
		background: var(--color-fifth);
		color: var(--color-on-fifth);
	}
	.cell--sixth {
		background: var(--color-sixth);
		color: var(--color-on-sixth);
	}
	.cell--seventh {
		background: var(--color-seventh);
		color: var(--color-on-seventh);
	}
</style>
