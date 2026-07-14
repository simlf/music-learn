<script lang="ts">
	import type { InspectPayload } from './PianoKeyboard.svelte';

	/**
	 * One-line mono interval register (R4): the readout for keyboard/formula
	 * inspect taps, in the Print Shop status-register voice. Reserves its
	 * line height so filling it never shifts the layout. Reads
	 * "E♭ · Mi · m3 · tierce mineure · 3 demi-tons"; before the first tap it
	 * shows a quiet invitation.
	 */
	interface Props {
		/** The latest inspect tap, or null before the first one. */
		payload: InspectPayload | null;
		/** Idle line shown while payload is null. */
		idleText?: string;
	}

	let { payload, idleText = 'Tap a key to inspect it.' }: Props = $props();

	function lineFor(inspected: InspectPayload): string {
		const base = `${inspected.letter} · ${inspected.solfege}`;
		if (!inspected.info || inspected.info.short === '') return base;
		const semitones = inspected.info.semitones;
		const demi = `${semitones} demi-ton${semitones > 1 ? 's' : ''}`;
		return `${base} · ${inspected.info.short} · ${inspected.info.longFr} · ${demi}`;
	}
</script>

<p
	class="inspect-register text-label font-mono uppercase"
	class:inspect-register--idle={payload === null}
	data-testid="inspect-register"
	aria-live="polite"
>
	{payload === null ? idleText : lineFor(payload)}
</p>

<style>
	.inspect-register {
		/* Reserve one line so the first tap never shifts the layout below. */
		min-height: calc(var(--text-label) * 1.4);
		margin-top: var(--spacing-sm);
		color: var(--color-ink);
	}

	.inspect-register--idle {
		color: var(--color-muted);
	}
</style>
