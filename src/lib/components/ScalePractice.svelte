<script lang="ts">
	import { playNote } from '$lib/audio/audio';
	import { toAscendingPitches } from '$lib/audio/voicing';
	import { createScaleDrillState, gradeTap, type ScaleDrillState } from '$lib/practice/scaleDrill';
	import type { SpelledNote } from '$lib/theory/types';

	/**
	 * Ascending scale tap drill (sketch 004, winner A: degree ladder). Given a
	 * scale's seven spelled degrees, renders:
	 * - a 1-7 ladder that fills as correct taps land and outlines the next rung
	 * - a row of the same seven degrees (reusing ScaleDegreeStrip's colored
	 *   degree-role cells) as the tap surface
	 * Tapping the expected next degree plays it at its true ascending pitch
	 * (toAscendingPitches, so wrapped degrees sound higher) and fills the
	 * ladder; any other tap flashes wrong and does not advance. Completing all
	 * seven shows a short congratulation and a "Run it again" reset.
	 *
	 * Pure ScaleDrillState (scaleDrill.ts) drives progress; this component only
	 * owns rendering, sound, and the wrong-tap flash timer.
	 */
	interface Props {
		/** The seven spelled scale degrees, degree 1 first. */
		notes: SpelledNote[];
		/** The scale tonic (degree 1's letter). */
		tonic: string;
	}

	let { notes, tonic }: Props = $props();

	function freshState(): ScaleDrillState {
		return createScaleDrillState(notes.map((note) => note.letter));
	}

	let drill = $state(freshState());
	/** Index of the cell currently flashing wrong; cleared after a short beat. */
	let wrongIndex = $state<number | null>(null);
	let wrongTimer: ReturnType<typeof setTimeout> | undefined;

	/** Ascending pitches for the degrees, so a wrapped degree sounds higher. */
	const pitches = $derived(toAscendingPitches(notes.map((note) => note.letter)));

	// A new tonic/scale (or "Run it again") starts the drill over.
	$effect(() => {
		notes;
		tonic;
		reset();
	});

	function reset() {
		drill = freshState();
		wrongIndex = null;
		clearTimeout(wrongTimer);
	}

	function tap(note: SpelledNote, index: number) {
		if (drill.done) return;
		const result = gradeTap(drill, note.letter);
		drill = result.state;
		if (result.correct) {
			wrongIndex = null;
			clearTimeout(wrongTimer);
			playNote(pitches[index] ?? `${note.letter}4`);
		} else {
			wrongIndex = index;
			clearTimeout(wrongTimer);
			wrongTimer = setTimeout(() => {
				wrongIndex = null;
			}, 320);
		}
	}
</script>

<div class="scale-practice" data-testid="scale-practice">
	<div class="ladder" data-testid="drill-ladder" role="group" aria-label="Progress, degrees 1 to 7">
		{#each drill.letters as _letter, index (index)}
			<div
				class="rung"
				class:done={index < drill.step}
				class:now={index === drill.step && !drill.done}
				data-testid="rung"
				data-done={index < drill.step}
				data-now={index === drill.step && !drill.done}
			>
				{index + 1}
			</div>
		{/each}
	</div>

	<div class="row" data-testid="drill-row" role="group" aria-label="Tap the scale, bottom to top">
		{#each notes as note, index (note.letter + index)}
			<button
				type="button"
				class="cell cell--{note.role}"
				class:filled={index < drill.step}
				class:wrong={wrongIndex === index}
				aria-label={`${note.letter} degree ${index + 1}`}
				disabled={drill.done}
				onclick={() => tap(note, index)}
			>
				<span class="note">{note.letter}</span>
				<span class="solf">{note.solfege}</span>
			</button>
		{/each}
	</div>

	{#if drill.done}
		<div class="complete" data-testid="drill-complete">
			<p class="msg">Voila. {tonic} major, clean.</p>
			<button type="button" class="reset" onclick={reset}>Run it again</button>
		</div>
	{/if}
</div>

<style>
	.scale-practice {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
	.ladder,
	.row {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 3px;
	}
	.rung {
		border: 2px solid var(--color-ink);
		min-height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		font: 700 var(--text-body) / 1 var(--font-mono);
		background: var(--color-paper-bright);
		color: var(--color-faint, var(--color-ink));
	}
	.rung.done {
		background: var(--color-root);
		color: var(--color-on-root);
	}
	.rung.now {
		box-shadow: inset 0 0 0 3px var(--color-vermilion);
		color: var(--color-ink);
	}

	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		min-height: 72px;
		padding: var(--spacing-sm);
		border: 2px solid var(--color-ink);
		background: var(--color-paper-bright);
		color: var(--color-ink);
		cursor: pointer;
		font-family: var(--font-sans);
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
	.cell:disabled {
		cursor: default;
	}
	.cell.filled {
		background: var(--color-root);
		color: var(--color-on-root);
	}
	.cell.wrong {
		background: var(--color-wrong);
		color: var(--color-ink);
	}
	@media (prefers-reduced-motion: reduce) {
		.cell:active {
			transform: none;
			filter: none;
		}
	}
	.note {
		font: 700 var(--text-heading) / 1 var(--font-serif);
	}
	.solf {
		font: 400 11px / 1 var(--font-mono);
		opacity: 0.85;
	}

	.complete {
		border-top: 2px solid var(--color-ink);
		padding-top: var(--spacing-sm);
	}
	.msg {
		font: 700 var(--text-heading) / 1.2 var(--font-serif);
		color: var(--color-verdigris);
		margin: 0 0 var(--spacing-sm);
	}
	.reset {
		font: 700 var(--text-label) / 1 var(--font-mono);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border: 2px solid var(--color-ink);
		background: var(--color-vermilion);
		color: var(--color-paper);
		padding: var(--spacing-sm) var(--spacing-md);
		cursor: pointer;
		min-height: 44px;
		min-width: 44px;
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
