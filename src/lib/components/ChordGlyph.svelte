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
		/** Adds the entrance-stamp class; omit to stay static (e.g. the picking-state glyph). */
		stamped?: boolean;
		/** Bump this number to re-trigger one shared reveal-pulse animation cycle. */
		pulseToken?: number;
	}

	let { root, quality, stamped, pulseToken }: Props = $props();

	/**
	 * Reveal chord-strike pulse (Phase 16, HEAR-01): flips off then on
	 * whenever `pulseToken` changes to a new value, mirroring
	 * PianoKeyboard.svelte's own pulseToken retrigger (Plan 16-02) so the
	 * shared reveal-pulse class is genuinely removed-then-re-added, forcing
	 * its keyframe animation to restart, rather than staying statically
	 * applied across bumps. The 0ms timer creates the DOM-commit boundary
	 * between the off write and the on write; the 200ms timer matches the
	 * shared keyframe's own animation duration and clears the flag once the
	 * cycle finishes. Any prior timer is cleared before scheduling a new
	 * one, so a rapid re-bump or unmount can never pile up timers.
	 */
	let pulsing = $state(false);
	let pulseRestartTimer: ReturnType<typeof setTimeout> | undefined;
	let pulseOffTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const token = pulseToken;
		if (token === undefined) return;

		clearTimeout(pulseRestartTimer);
		clearTimeout(pulseOffTimer);
		pulsing = false;

		pulseRestartTimer = setTimeout(() => {
			pulsing = true;
			pulseOffTimer = setTimeout(() => {
				pulsing = false;
			}, 200);
		}, 0);

		return () => {
			clearTimeout(pulseRestartTimer);
			clearTimeout(pulseOffTimer);
		};
	});

	const stampedClass = $derived(stamped ? 'chord-glyph--stamped' : '');
	const pulseClass = $derived(pulsing ? 'pulse-once' : '');
</script>

<span class="chord-glyph {stampedClass} {pulseClass}">
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
