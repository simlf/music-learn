<script lang="ts">
	/**
	 * Print Shop chord glyph: serif chord symbol with a misregistered vermilion
	 * print shadow behind it. Purely presentational - the shadow duplicate is
	 * decorative only (aria-hidden, non-selectable) so assistive tech and text
	 * selection see the chord once.
	 */
	interface Props {
		/** Chord root letter with accidental glyph, e.g. "C", "F♯", "B♭". */
		root: string;
		/** Chord quality suffix rendered as a superscript, e.g. "m7", "maj7", "ø7", "°7". */
		quality: string;
	}

	let { root, quality }: Props = $props();
</script>

<span class="chord-glyph">
	<span class="chord-glyph__shadow" aria-hidden="true" data-testid="chord-glyph-shadow">
		{root}<sup>{quality}</sup>
	</span>
	<span class="chord-glyph__text">
		{root}<sup>{quality}</sup>
	</span>
</span>

<style>
	.chord-glyph {
		position: relative;
		display: inline-block;
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: var(--text-display);
		line-height: var(--text-display--line-height);
		color: var(--color-ink);
	}

	.chord-glyph sup {
		font-size: 0.43em;
	}

	.chord-glyph__shadow {
		position: absolute;
		left: 3px;
		top: 3px;
		z-index: -1;
		color: var(--color-vermilion);
		user-select: none;
	}

	.chord-glyph__text {
		position: relative;
	}
</style>
