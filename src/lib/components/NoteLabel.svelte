<script lang="ts">
	/**
	 * Dual note naming: letter name primary (bold, larger, UI sans), French
	 * solfege below (smaller, mono). Used standalone and inside PianoKeyboard
	 * key labels.
	 */
	interface Props {
		/** Letter name with accidental glyph, e.g. "C", "E♭". */
		letter: string;
		/** French solfège syllable, e.g. "Do", "Mi♭". */
		solfege: string;
		/** Whether this label sits on a highlighted (interval-colored) surface. */
		highlighted?: boolean;
	}

	let { letter, solfege, highlighted = false }: Props = $props();
</script>

<span class="note-label" class:note-label--highlighted={highlighted}>
	<span class="note-label__letter">{letter}</span>
	<span class="note-label__solfege">{solfege}</span>
</span>

<style>
	.note-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.25;
		font-family: var(--font-sans);
		color: var(--color-faint);
	}

	.note-label--highlighted {
		color: inherit;
	}

	.note-label__letter {
		font-weight: 700;
		font-size: var(--text-label);
	}

	.note-label__solfege {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 10px;
	}
</style>
